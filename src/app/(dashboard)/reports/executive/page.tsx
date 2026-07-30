import { BarChart3 } from "lucide-react";
import { FeatureGrid, ModulePage, StatRow } from "@/components/enterprise/module-page";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { formatINR } from "@/lib/tax";

export default async function ExecutiveReportPage() {
  const session = await requirePermission("reports");
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const settled = await prisma.order.findMany({
    where: {
      outletId: session.user.outletId,
      status: "SETTLED",
      settledAt: { gte: start },
    },
    include: { payments: true },
  });

  let subtotal = 0;
  let discount = 0;
  let packing = 0;
  let delivery = 0;
  let tax = 0;
  let total = 0;
  let cash = 0;
  let upi = 0;
  let card = 0;

  for (const o of settled) {
    subtotal += o.subtotal;
    discount += o.discountAmount;
    packing += o.packingCharge;
    delivery += o.deliveryCharge;
    tax += o.cgstAmount + o.sgstAmount;
    total += o.total;
    for (const p of o.payments) {
      if (p.method === "CASH") cash += p.amount;
      if (p.method === "UPI") upi += p.amount;
      if (p.method === "CARD") card += p.amount;
    }
  }

  return (
    <ModulePage
      title="Executive Sales Summary"
      subtitle="Billing success, net sales, charges and total collection"
      icon={BarChart3}
    >
      <StatRow
        stats={[
          { label: "Invoices", value: String(settled.length) },
          { label: "Net sales", value: formatINR(total) },
          { label: "Tax", value: formatINR(tax) },
          { label: "Collection", value: formatINR(cash + upi + card) },
        ]}
      />
      <div className="grid gap-3 md:grid-cols-2">
        <div className="card space-y-2 p-4 text-sm">
          <Row label="Subtotal" value={formatINR(subtotal)} />
          <Row label="Discount" value={`- ${formatINR(discount)}`} />
          <Row label="Packing charge" value={formatINR(packing)} />
          <Row label="Delivery charge" value={formatINR(delivery)} />
          <Row label="Tax (CGST+SGST)" value={formatINR(tax)} />
          <Row label="Net sales" value={formatINR(total)} bold />
        </div>
        <div className="card space-y-2 p-4 text-sm">
          <Row label="Cash" value={formatINR(cash)} />
          <Row label="UPI" value={formatINR(upi)} />
          <Row label="Card" value={formatINR(card)} />
          <Row label="Total collection" value={formatINR(cash + upi + card)} bold />
        </div>
      </div>
      <FeatureGrid
        items={[
          { title: "Captain wise", detail: "Sales by staff" },
          { title: "Time wise", detail: "Hourly peaks" },
          { title: "Print / Export", detail: "PDF & Excel" },
          { title: "Round off", detail: "Configured in settings" },
        ]}
      />
    </ModulePage>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold" : ""}`}>
      <span className="text-[var(--muted)]">{label}</span>
      <span>{value}</span>
    </div>
  );
}
