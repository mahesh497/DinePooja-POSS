import { PanelsTopLeft } from "lucide-react";
import { ModulePage } from "@/components/enterprise/module-page";
import { DualScreenBoard } from "@/components/dual-screen-board";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { resolveOutletId } from "@/lib/outlet";
import { orderTypeLabel } from "@/lib/order-types";

function kitchenStatusForItem(
  kotItems: { status: string; kot: { status: string } }[]
): string | null {
  if (!kotItems.length) return null;
  const statuses = kotItems.map((k) => k.status);
  if (statuses.every((s) => s === "SERVED")) return "SERVED";
  if (statuses.some((s) => s === "DELAYED")) return "DELAYED";
  if (statuses.some((s) => s === "PREPARING")) return "PREPARING";
  return kotItems[0]?.kot.status ?? "PENDING";
}

export default async function DualScreenPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const session = await requireSession();
  const outletId = await resolveOutletId(session);
  const { orderId } = await searchParams;

  const openOrders = await prisma.order.findMany({
    where: { outletId, status: { in: ["OPEN", "HOLD"] } },
    orderBy: { updatedAt: "desc" },
    include: { table: { select: { name: true } } },
    take: 30,
  });

  const selectedId =
    orderId && openOrders.some((o) => o.id === orderId)
      ? orderId
      : openOrders[0]?.id;

  const selected = selectedId
    ? await prisma.order.findFirst({
        where: { id: selectedId, outletId },
        include: {
          items: {
            where: { voided: false },
            orderBy: { createdAt: "asc" },
            include: { kotItems: { include: { kot: true } } },
          },
          table: { select: { name: true } },
          outlet: {
            select: { name: true, cgstPercent: true, sgstPercent: true },
          },
        },
      })
    : null;

  return (
    <ModulePage
      title="Dual Screen"
      subtitle="Second display for guests — mirrors the active POS cart"
      icon={PanelsTopLeft}
      actions={
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
          Live · 4s refresh
        </span>
      }
    >
      <DualScreenBoard
        orders={openOrders.map((o) => ({
          id: o.id,
          label: `${o.table?.name ?? orderTypeLabel(o.type)} · #${o.orderNumber}${
            o.status === "HOLD" ? " (Hold)" : ""
          }`,
        }))}
        selected={
          selected
            ? {
                id: selected.id,
                orderNumber: selected.orderNumber,
                type: orderTypeLabel(selected.type),
                tableName: selected.table?.name ?? null,
                customerName: selected.customerName,
                guestCount: selected.guestCount,
                subtotal: selected.subtotal,
                discountAmount: selected.discountAmount,
                packingCharge: selected.packingCharge,
                deliveryCharge: selected.deliveryCharge,
                serviceCharge: selected.serviceCharge,
                containerCharge: selected.containerCharge,
                cgstAmount: selected.cgstAmount,
                sgstAmount: selected.sgstAmount,
                roundOff: selected.roundOff,
                total: selected.total,
                paidAmount: selected.paidAmount,
                cgstPercent: selected.outlet.cgstPercent,
                sgstPercent: selected.outlet.sgstPercent,
                outletName: selected.outlet.name,
                items: selected.items.map((i) => ({
                  id: i.id,
                  name: i.name,
                  quantity: i.quantity,
                  unitPrice: i.unitPrice,
                  lineTotal: i.lineTotal,
                  variantName: i.variantName,
                  addonNames: i.addonNames,
                  notes: i.notes,
                  kotSent: i.kotSent,
                  kitchenStatus: kitchenStatusForItem(i.kotItems),
                })),
              }
            : null
        }
      />
    </ModulePage>
  );
}
