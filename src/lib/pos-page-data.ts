import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { resolveOutletId } from "@/lib/outlet";
import { can } from "@/lib/permissions";
import { orderTypeLabel } from "@/lib/order-types";
import type { ComponentProps } from "react";
import type { PosScreen } from "@/components/pos-screen";

type PosScreenProps = ComponentProps<typeof PosScreen>;

function kitchenStatusForItem(
  kotItems: { status: string; kot: { status: string } }[]
): string | null {
  if (!kotItems.length) return null;
  const live = kotItems.filter((k) => k.status !== "CANCELLED" && k.status !== "VOIDED");
  if (!live.length) return kotItems[0].status;
  const statuses = live.map((k) => k.status);
  if (statuses.every((s) => s === "SERVED")) return "SERVED";
  if (statuses.some((s) => s === "DELAYED")) return "DELAYED";
  if (statuses.some((s) => s === "PREPARING")) return "PREPARING";
  return live[0].kot.status ?? "PENDING";
}

export async function loadPosScreenProps(orderId?: string | null): Promise<PosScreenProps> {
  const session = await requirePermission("pos");
  const outletId = await resolveOutletId(session);

  const [categories, order, openOrders, outlet] = await Promise.all([
    prisma.category.findMany({
      where: { outletId, active: true },
      orderBy: { sortOrder: "asc" },
      include: {
        items: {
          include: { variants: true, addons: true },
          orderBy: { name: "asc" },
        },
      },
    }),
    orderId
      ? prisma.order.findFirst({
          where: { id: orderId, outletId, status: { in: ["OPEN", "HOLD"] } },
          include: {
            items: {
              orderBy: { createdAt: "asc" },
              include: { kotItems: { include: { kot: true } } },
            },
            table: true,
          },
        })
      : Promise.resolve(null),
    prisma.order.findMany({
      where: { outletId, status: { in: ["OPEN", "HOLD"] } },
      include: { table: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.outlet.findUnique({ where: { id: outletId } }),
  ]);

  if (orderId && !order) {
    const any = await prisma.order.findFirst({
      where: { id: orderId, outletId },
      select: { status: true },
    });
    if (any?.status === "SETTLED") redirect(`/bill/${orderId}`);
    redirect("/pos");
  }

  return {
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      items: c.items.map((i) => ({
        id: i.id,
        code: i.code,
        name: i.name,
        price: i.price,
        isVeg: i.isVeg,
        available: i.available,
        imageUrl: i.imageUrl,
        stock: i.stock,
        popular: i.popular,
        recommended: i.recommended,
        variants: i.variants,
        addons: i.addons,
      })),
    })),
    order: order
      ? {
          id: order.id,
          orderNumber: order.orderNumber,
          type: order.type,
          source: order.source,
          status: order.status,
          guestCount: order.guestCount,
          subtotal: order.subtotal,
          packingCharge: order.packingCharge,
          deliveryCharge: order.deliveryCharge,
          serviceCharge: order.serviceCharge,
          containerCharge: order.containerCharge,
          roundOff: order.roundOff,
          discountAmount: order.discountAmount,
          discountPercent: order.discountPercent,
          cgstAmount: order.cgstAmount,
          sgstAmount: order.sgstAmount,
          total: order.total,
          paidAmount: order.paidAmount,
          notes: order.notes,
          tableName: order.table?.name ?? null,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          customerAddress: order.customerAddress,
          onlinePlatform: order.onlinePlatform,
          items: order.items.map((item) => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
            notes: item.notes,
            isVeg: item.isVeg,
            variantName: item.variantName,
            addonNames: item.addonNames,
            voided: item.voided,
            voidReason: item.voidReason,
            kotSent: item.kotSent,
            kitchenStatus: kitchenStatusForItem(item.kotItems),
          })),
        }
      : null,
    openOrders: openOrders.map((o) => ({
      id: o.id,
      type: o.type,
      label: `${o.table?.name ?? orderTypeLabel(o.type)} · ${o.orderNumber}`,
    })),
    canVoid: can(session.user.role, "void"),
    canDiscount: can(session.user.role, "discount"),
    outletTax: {
      cgstPercent: outlet?.cgstPercent ?? 2.5,
      sgstPercent: outlet?.sgstPercent ?? 2.5,
      packingChargeDefault: outlet?.packingChargeDefault ?? 10,
      deliveryChargeDefault: outlet?.deliveryChargeDefault ?? 40,
      containerChargeDefault: outlet?.containerChargeDefault ?? 0,
    },
  };
}
