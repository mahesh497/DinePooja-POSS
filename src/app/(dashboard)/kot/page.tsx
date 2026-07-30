import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { KotBoard } from "@/components/kot-board";
import { orderTypeLabel } from "@/lib/order-types";

export default async function KotPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; kotId?: string }>;
}) {
  const session = await requirePermission("kot");
  const { q, kotId } = await searchParams;
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const kots = await prisma.kot.findMany({
    where: {
      order: { outletId: session.user.outletId },
      OR: [
        { status: { in: ["PENDING", "PREPARING", "READY", "DELAYED"] } },
        { status: { in: ["SERVED", "CANCELLED"] }, updatedAt: { gte: since } },
      ],
    },
    include: {
      items: true,
      order: { include: { table: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">KOT Management</h1>
        <p className="text-sm text-[var(--muted)]">
          Generate from POS · print · reprint · cancel · merge · split · move items · cooking status
        </p>
      </div>
      <KotBoard
        initialQuery={q?.trim() || kotId?.trim() || ""}
        kots={kots.map((k) => ({
          id: k.id,
          kotNumber: k.kotNumber,
          station: k.station,
          status: k.status,
          createdAt: k.createdAt.toISOString(),
          orderId: k.orderId,
          orderNumber: k.order.orderNumber,
          tableName: k.order.table?.name ?? null,
          orderTypeLabel: orderTypeLabel(k.order.type),
          items: k.items,
        }))}
      />
    </div>
  );
}
