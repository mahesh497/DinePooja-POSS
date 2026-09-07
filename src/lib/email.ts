import nodemailer from "nodemailer";

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
  toEmail: string;
};

function smtpConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

/** Send daily sales report. Returns false if SMTP / recipient not configured (non-fatal). */
export async function sendDailyReportEmail(payload: DayReportPayload): Promise<boolean> {
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

  const inr = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n);

  const html = `
    <h2>DinePooja daily report — ${payload.outletName}</h2>
    <p>Business date: <strong>${payload.businessDate}</strong></p>
    <table cellpadding="6" style="border-collapse:collapse">
      <tr><td>Total sales</td><td><strong>${inr(payload.totalSales)}</strong></td></tr>
      <tr><td>Orders settled</td><td>${payload.orderCount}</td></tr>
      <tr><td>Voids</td><td>${payload.voidCount}</td></tr>
      <tr><td>Discounts</td><td>${inr(payload.discountTotal)}</td></tr>
      <tr><td>Cash</td><td>${inr(payload.cashTotal)}</td></tr>
      <tr><td>UPI</td><td>${inr(payload.upiTotal)}</td></tr>
      <tr><td>Card</td><td>${inr(payload.cardTotal)}</td></tr>
    </table>
    <p style="color:#666;font-size:12px">Finished order tickets were cleared from the local POS database after this close.</p>
  `;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: payload.toEmail.trim(),
    subject: `DinePooja daily report · ${payload.outletName} · ${payload.businessDate}`,
    html,
    text: `Sales ${payload.totalSales} | Orders ${payload.orderCount} | Cash ${payload.cashTotal} | UPI ${payload.upiTotal} | Card ${payload.cardTotal}`,
  });

  return true;
}
