import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { resolveOutletId } from "@/lib/outlet";
import { syncAvailableTables } from "@/lib/actions/orders";
import { TablesBoard } from "@/components/tables-board";

function deriveStage(input: {
  dbStatus: string;
  itemCount: number;
  kotCount: number;
  billPrintedAt: Date | null;
}): string {
  if (input.dbStatus === "RESERVED") return "RESERVED";
  if (input.itemCount === 0) return "FREE";
  if (input.billPrintedAt || input.dbStatus === "PRINTED" || input.dbStatus === "BILLING") {
    return "PRINTED";
  }
  if (input.kotCount > 0 || input.dbStatus === "RUNNING") return "RUNNING";
  return "OCCUPIED";
}

export default async function TablesPage() {
  const session = await requirePermission("tables");
  const outletId = await resolveOutletId(session);
  await syncAvailableTables(outletId);

  const [halls, tables] = await Promise.all([
    prisma.diningHall.findMany({
      where: { outletId, active: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.diningTable.findMany({
      where: { outletId },
      orderBy: { sortOrder: "asc" },
      include: {
        hall: true,
        orders: {
          where: { status: { in: ["OPEN", "HOLD"] } },
          select: {
            id: true,
            total: true,
            orderNumber: true,
            guestCount: true,
            billPrintedAt: true,
            occupiedAt: true,
            createdAt: true,
            items: {
              where: { voided: false },
              select: { id: true, name: true, quantity: true, lineTotal: true },
            },
            kots: { select: { id: true } },
          },
          take: 1,
        },
      },
    }),
  ]);

  return (
    <TablesBoard
      halls={halls.map((h) => ({ id: h.id, name: h.name }))}
      tables={tables.map((t) => {
        const order = t.orders[0];
        const itemCount = order?.items.length ?? 0;
        const kotCount = order?.kots.length ?? 0;
        const status = deriveStage({
          dbStatus: t.status,
          itemCount,
          kotCount,
          billPrintedAt: order?.billPrintedAt ?? null,
        });
        return {
          id: t.id,
          name: t.name,
          capacity: t.capacity,
          status,
          hallId: t.hallId,
          hallName: t.hall?.name ?? "Unassigned",
          openOrder: order
            ? {
                id: order.id,
                total: order.total,
                orderNumber: order.orderNumber,
                guestCount: order.guestCount,
                itemCount,
                kotCount,
                billPrintedAt: order.billPrintedAt?.toISOString() ?? null,
                occupiedAt: order.occupiedAt?.toISOString() ?? null,
                createdAt: order.createdAt.toISOString(),
                items: order.items,
              }
            : null,
        };
      })}
    />
  );
}
