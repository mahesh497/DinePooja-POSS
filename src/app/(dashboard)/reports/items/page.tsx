import { BarChart3 } from "lucide-react";
import { FeatureGrid, ModulePage, StatRow } from "@/components/enterprise/module-page";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { formatINR } from "@/lib/tax";

export default async function ItemReportPage() {
  const session = await requirePermission("reports");
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const settled = await prisma.order.findMany({
    where: {
      outletId: session.user.outletId,
      status: "SETTLED",
      settledAt: { gte: start },
    },
    include: { items: { where: { voided: false } } },
  });

  const map = new Map<string, { qty: number; amount: number }>();
  for (const o of settled) {
    for (const i of o.items) {
      const cur = map.get(i.name) ?? { qty: 0, amount: 0 };
      cur.qty += i.quantity;
      cur.amount += i.lineTotal;
      map.set(i.name, cur);
    }
  }
  const rows = [...map.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.amount - a.amount);

  const total = rows.reduce((s, r) => s + r.amount, 0);

  return (
    <ModulePage
      title="Item Report"
      subtitle="Category / item sales with quantity, revenue and tax view"
      icon={BarChart3}
    >
      <StatRow
        stats={[
          { label: "Items sold SKUs", value: String(rows.length) },
          { label: "Revenue", value: formatINR(total) },
          { label: "Top item", value: rows[0]?.name ?? "—" },
          { label: "Export", value: "PDF / Excel" },
        ]}
      />
      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-[var(--chip)] text-left text-xs uppercase text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((r) => (
                <tr key={r.name} className="border-t border-[var(--line)]">
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3">{r.qty}</td>
                  <td className="px-4 py-3">{formatINR(r.amount)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-[var(--muted)]">
                  No settled item sales yet today.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <FeatureGrid
        items={[
          { title: "Configure columns", detail: "Show tax, discount, profit" },
          { title: "Grouping", detail: "By category or station" },
          { title: "Export", detail: "PDF, Excel, CSV" },
          { title: "Date range", detail: "Today / yesterday / custom" },
        ]}
      />
    </ModulePage>
  );
}
