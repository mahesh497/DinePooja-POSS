import Link from "next/link";
import { ListOrdered } from "lucide-react";
import { ModulePage, StatRow } from "@/components/enterprise/module-page";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { resolveOutletId } from "@/lib/outlet";
import { formatINR } from "@/lib/tax";

export default async function OrderStatusPage() {
  const session = await requirePermission("pos");
  const outletId = await resolveOutletId(session);
  const orders = await prisma.order.findMany({
    where: { outletId, status: "OPEN" },
    orderBy: { createdAt: "asc" },
    include: {
      table: { select: { name: true, status: true } },
      kots: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true, kotNumber: true } },
      items: { where: { voided: false }, select: { id: true } },
    },
  });

  const cooking = orders.filter((o) =>
    ["PENDING", "PREPARING", "DELAYED"].includes(o.kots[0]?.status ?? "")
  ).length;
  const ready = orders.filter((o) => o.kots[0]?.status === "READY").length;

  return (
    <ModulePage
      title="Custom Order Status"
      subtitle="Pending, cooking, ready, served"
      icon={ListOrdered}
    >
      <StatRow
        stats={[
          { label: "Open", value: String(orders.length) },
          { label: "Cooking", value: String(cooking) },
          { label: "Ready", value: String(ready) },
          { label: "Synced", value: "Live" },
        ]}
      />

      <div className="space-y-2">
        {orders.map((o) => (
          <Link
            key={o.id}
            href={`/pos/${o.id}`}
            className="card flex flex-wrap items-center justify-between gap-3 p-4 hover:border-[var(--accent)]"
          >
            <div>
              <p className="font-semibold">
                #{o.orderNumber} · {o.table?.name || o.type}
              </p>
              <p className="text-sm text-[var(--muted)]">
                Table: {o.table?.status || "—"} · Kitchen: {o.kots[0]?.status || "No KOT"} ·{" "}
                {o.items.length} items
              </p>
            </div>
            <p className="font-[family-name:var(--font-display)] text-xl">{formatINR(o.total)}</p>
          </Link>
        ))}
        {orders.length === 0 ? (
          <p className="card p-8 text-center text-sm text-[var(--muted)]">No open orders</p>
        ) : null}
      </div>
    </ModulePage>
  );
}
