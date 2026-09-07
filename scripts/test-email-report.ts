/**
 * Test SMTP + daily report email without day-close.
 * Usage: npx tsx scripts/test-email-report.ts you@example.com
 */
import "dotenv/config";
import { sendDailyReportEmail } from "../src/lib/email";

async function main() {
  const to = (process.argv[2] || process.env.REPORT_EMAIL || "").trim();
  if (!to) {
    console.error("Usage: npx tsx scripts/test-email-report.ts you@email.com");
    process.exit(1);
  }

  console.log("SMTP_HOST:", process.env.SMTP_HOST || "(missing)");
  console.log("SMTP_USER:", process.env.SMTP_USER || "(missing)");
  console.log("To:", to);

  const ok = await sendDailyReportEmail({
    outletName: "Spice Garden Cafe (test)",
    businessDate: new Date().toLocaleDateString("en-IN"),
    totalSales: 12500.5,
    orderCount: 18,
    voidCount: 1,
    discountTotal: 250,
    cashTotal: 4000,
    upiTotal: 7000.5,
    cardTotal: 1500,
    toEmail: to,
  });

  if (ok) console.log("Sent OK — check inbox/spam.");
  else {
    console.error("Not sent. Fill SMTP_* in .env and pass a recipient email.");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
