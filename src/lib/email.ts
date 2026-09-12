import fs from "fs/promises";
import path from "path";
import nodemailer from "nodemailer";
import PDFDocument from "pdfkit";
import { roundMoney } from "@/lib/tax";

export type DayReportPayload = {
  outletName: string;
  businessDate: string;
  totalSales: number;
  orderCount: number;
  voidCount: number;
  discountTotal: number;
  cashTotal: number;
  upiTotal: number;
  cardTotal: number;
  dineInSales?: number;
  parcelSales?: number;
  deliverySales?: number;
  toEmail: string;
  notes?: string;
};

function smtpConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

/** PDFKit Helvetica has no ₹ glyph — use ASCII-safe Rs. */
function rs(n: number) {
  const v = roundMoney(Number(n) || 0);
  return `Rs. ${v.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function buildDayReportPdf(payload: DayReportPayload): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const labelX = 50;
    const valueX = 320;

    doc.fontSize(18).fillColor("#000").text("Sampada — Daily sales report", labelX, 50);
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor("#333").text(payload.outletName, labelX);
    doc.text(`Business date: ${payload.businessDate}`);
    doc.moveDown(1);

    doc.fontSize(13).fillColor("#000").text("Summary");
    doc.moveDown(0.4);

    const rows: [string, string][] = [
      ["Total sales", rs(payload.totalSales)],
      ["Voids", String(Math.max(0, Math.floor(payload.voidCount || 0)))],
      ["Discounts", rs(payload.discountTotal)],
      ["Cash", rs(payload.cashTotal)],
      ["UPI", rs(payload.upiTotal)],
      ["Card", rs(payload.cardTotal)],
    ];

    if (payload.dineInSales != null || payload.parcelSales != null || payload.deliverySales != null) {
      rows.push(
        ["Dine-in sales", rs(payload.dineInSales ?? 0)],
        ["Parcel sales", rs(payload.parcelSales ?? 0)],
        ["Delivery sales", rs(payload.deliverySales ?? 0)]
      );
    }

    let y = doc.y;
    doc.fontSize(11);
    for (const [label, value] of rows) {
      doc.fillColor("#000").text(label, labelX, y, { lineBreak: false });
      doc.fillColor("#000").text(value, valueX, y, { lineBreak: false });
      y += 22;
    }

    doc.y = y + 8;

    if (payload.notes?.trim()) {
      doc.fontSize(11).fillColor("#000").text("Notes", labelX, doc.y);
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor("#444").text(payload.notes.trim(), { width: 500 });
      doc.moveDown(0.8);
    }

    doc
      .fontSize(9)
      .fillColor("#666")
      .text(
        "Finished order tickets included in this close were cleared from the local POS database.",
        labelX,
        doc.y + 8,
        { width: 500 }
      );

    doc.end();
  });
}

/** Save PDF under reports/archive/ on this machine (local cloud archive). */
export async function archiveDayReportPdf(
  payload: DayReportPayload,
  pdf?: Buffer
): Promise<string> {
  const buffer = pdf ?? (await buildDayReportPdf(payload));
  const dir = path.join(process.cwd(), "reports", "archive");
  await fs.mkdir(dir, { recursive: true });
  const safeDate = payload.businessDate.replace(/[^\dA-Za-z-]+/g, "-");
  const safeOutlet = payload.outletName.replace(/[^\dA-Za-z]+/g, "-").slice(0, 40) || "outlet";
  const filename = `Sampada-${safeDate}-${safeOutlet}.pdf`;
  const fullPath = path.join(dir, filename);
  await fs.writeFile(fullPath, buffer);
  return fullPath;
}

/** Send daily sales report as PDF. Returns false if SMTP / recipient not configured (non-fatal). */
export async function sendDailyReportEmail(
  payload: DayReportPayload,
  pdf?: Buffer
): Promise<boolean> {
  if (!payload.toEmail?.trim()) return false;
  if (!smtpConfigured()) {
    console.warn("[email] SMTP not configured — skipped daily report email");
    return false;
  }

  const port = Number(process.env.SMTP_PORT || 587);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const buffer = pdf ?? (await buildDayReportPdf(payload));
  const safeDate = payload.businessDate.replace(/[^\dA-Za-z-]+/g, "-");
  const filename = `Sampada-daily-report-${safeDate}.pdf`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: payload.toEmail.trim(),
    subject: `Sampada daily report · ${payload.outletName} · ${payload.businessDate}`,
    text: `Attached: daily sales PDF for ${payload.outletName} (${payload.businessDate}).\nTotal sales: ${rs(payload.totalSales)}`,
    html: `
      <p>Please find the <strong>daily sales report PDF</strong> attached.</p>
      <p>${payload.outletName} · ${payload.businessDate}<br/>
      Total sales: <strong>${rs(payload.totalSales)}</strong></p>
    `,
    attachments: [
      {
        filename,
        content: buffer,
        contentType: "application/pdf",
      },
    ],
  });

  return true;
}
