import { Bike } from "lucide-react";
import { ModulePage } from "@/components/enterprise/module-page";
import { DeliveryBoard } from "@/components/delivery-board";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { resolveOutletId } from "@/lib/outlet";

export default async function DeliveryPage() {
  const session = await requirePermission("pos");
  const outletId = await resolveOutletId(session);

  const [outlet, partners, orders] = await Promise.all([
    prisma.outlet.findUnique({ where: { id: outletId }, select: { name: true } }),
    prisma.deliveryBoy.findMany({
      where: { outletId },
      orderBy: [{ dutyStatus: "asc" }, { name: "asc" }],
      include: {
        _count: {
          select: {
            orders: {
              where: {
                status: { in: ["OPEN", "HOLD"] },
                deliveryStatus: { in: ["ASSIGNED", "PICKED_UP", "ON_THE_WAY", "ARRIVED"] },
              },
            },
          },
        },
      },
    }),
    prisma.order.findMany({
      where: {
        outletId,
        type: "DELIVERY",
        OR: [
          { status: { in: ["OPEN", "HOLD"] } },
          {
            deliveryStatus: { in: ["ASSIGNED", "PICKED_UP", "ON_THE_WAY", "ARRIVED"] },
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: 40,
    }),
  ]);

  return (
    <ModulePage
      title="Delivery Partners"
      subtitle="Assign riders · live GPS · status tracking · ETA"
      icon={Bike}
      actions={
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
          Live · 6s refresh
        </span>
      }
    >
      <DeliveryBoard
        outletName={outlet?.name || "Outlet"}
        partners={partners.map((p) => ({
          id: p.id,
          name: p.name,
          phone: p.phone,
          active: p.active,
          rating: p.rating,
          dutyStatus: p.dutyStatus,
          vehicleType: p.vehicleType,
          vehicleNumber: p.vehicleNumber,
          lat: p.lat,
          lng: p.lng,
          lastSeenAt: p.lastSeenAt?.toISOString() ?? null,
          activeTrips: p._count.orders,
        }))}
        orders={orders.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          customerName: o.customerName,
          customerPhone: o.customerPhone,
          customerAddress: o.customerAddress,
          driverName: o.driverName,
          deliveryBoyId: o.deliveryBoyId,
          deliveryStatus: o.deliveryStatus,
          destLat: o.destLat,
          destLng: o.destLng,
          riderLat: o.riderLat,
          riderLng: o.riderLng,
          total: o.total,
          paidAmount: o.paidAmount,
          createdAt: o.createdAt.toISOString(),
          pickedUpAt: o.pickedUpAt?.toISOString() ?? null,
          onlinePlatform: o.onlinePlatform,
        }))}
      />
    </ModulePage>
  );
}
