import { PauseCircle } from "lucide-react";
import { ModulePage, StatRow } from "@/components/enterprise/module-page";
import { HoldOrdersBoard } from "@/components/hold-orders-board";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { resolveOutletId } from "@/lib/outlet";

export default async function HoldOrdersPage() {
  const session = await requirePermission("pos");
  const outletId = await resolveOutletId(session);
  const orders = await prisma.order.findMany({
    where: { outletId, status: "HOLD" },
    orderBy: { updatedAt: "desc" },
    include: {
      table: { select: { name: true } },
      items: { where: { voided: false }, select: { id: true } },
    },
  });

  return (
    <ModulePage title="Hold Orders" subtitle="Park and resume bills" icon={PauseCircle}>
      <StatRow
        stats={[
          { label: "Held", value: String(orders.length) },
          {
            label: "Value",
            value: `₹${orders.reduce((s, o) => s + o.total, 0).toFixed(0)}`,
          },
          { label: "Open", value: "—" },
          { label: "Synced", value: "Live" },
        ]}
      />
      <HoldOrdersBoard
        orders={orders.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          customerName: o.customerName,
          total: o.total,
          updatedAt: o.updatedAt.toISOString(),
          tableName: o.table?.name ?? null,
          itemCount: o.items.length,
        }))}
      />
    </ModulePage>
  );
}
