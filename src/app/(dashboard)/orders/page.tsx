import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { OrdersHub } from "@/components/orders-hub";

export default async function OrdersHubPage({
  searchParams,
}: {
  searchParams: Promise<{ bill?: string; tab?: string }>;
}) {
  const session = await requirePermission("pos");
  const { bill, tab } = await searchParams;
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  if (bill?.trim()) {
    const q = bill.trim();
    const found = await prisma.order.findFirst({
      where: {
        outletId: session.user.outletId,
        OR: [
          { orderNumber: { equals: q } },
          { orderNumber: { contains: q } },
          { id: q },
        ],
      },
      orderBy: { createdAt: "desc" },
    });
    if (found) {
      if (found.status === "OPEN" || found.status === "HOLD") {
        redirect(`/pos/${found.id}`);
      }
      redirect(`/bill/${found.id}`);
    }
  }

  const orders = await prisma.order.findMany({
    where: {
      outletId: session.user.outletId,
      OR: [{ status: "OPEN" }, { createdAt: { gte: since } }],
    },
    include: {
      table: true,
      items: { where: { voided: false }, select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const orderIds = orders.map((o) => o.id);
  const logs = orderIds.length
    ? await prisma.auditLog.findMany({
        where: {
          outletId: session.user.outletId,
          entity: "Order",
          entityId: { in: orderIds },
        },
        orderBy: { createdAt: "asc" },
      })
    : [];

  const logsByOrder = new Map<string, typeof logs>();
  for (const log of logs) {
    if (!log.entityId) continue;
    const list = logsByOrder.get(log.entityId) ?? [];
    list.push(log);
    logsByOrder.set(log.entityId, list);
  }

  const initialTab =
    tab === "ONLINE" ||
    tab === "COMPLETED" ||
    tab === "CANCELLED" ||
    tab === "REFUNDED" ||
    tab === "CURRENT"
      ? tab
      : "CURRENT";

  return (
    <OrdersHub
      initialTab={initialTab}
      billQuery={bill?.trim() || undefined}
      orders={orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        type: o.type,
        source: o.source,
        status: o.status,
        total: o.total,
        guestCount: o.guestCount,
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        customerAddress: o.customerAddress,
        onlinePlatform: o.onlinePlatform,
        driverName: o.driverName,
        voidReason: o.voidReason,
        tableName: o.table?.name ?? null,
        itemCount: o.items.length,
        createdAt: o.createdAt.toISOString(),
        settledAt: o.settledAt?.toISOString() ?? null,
        timeline: (logsByOrder.get(o.id) ?? []).map((l) => ({
          id: l.id,
          action: l.action,
          details: l.details,
          createdAt: l.createdAt.toISOString(),
        })),
      }))}
    />
  );
}
