import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { can } from "@/lib/permissions";
import { PosScreen } from "@/components/pos-screen";
import { orderTypeLabel } from "@/lib/order-types";

export default async function PosIndexPage() {
  const session = await requirePermission("pos");
  const [categories, openOrders, outlet] = await Promise.all([
    prisma.category.findMany({
      where: { outletId: session.user.outletId, active: true },
      orderBy: { sortOrder: "asc" },
      include: {
        items: {
          include: { variants: true, addons: true },
          orderBy: { name: "asc" },
        },
      },
    }),
    prisma.order.findMany({
      where: { outletId: session.user.outletId, status: "OPEN" },
      include: { table: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.outlet.findUnique({ where: { id: session.user.outletId } }),
  ]);

  return (
    <PosScreen
      categories={categories.map((c) => ({
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
      }))}
      order={null}
      openOrders={openOrders.map((o) => ({
        id: o.id,
        type: o.type,
        label: `${o.table?.name ?? orderTypeLabel(o.type)} · ${o.orderNumber}`,
      }))}
      canVoid={can(session.user.role, "void")}
      canDiscount={can(session.user.role, "discount")}
      outletTax={{
        cgstPercent: outlet?.cgstPercent ?? 2.5,
        sgstPercent: outlet?.sgstPercent ?? 2.5,
        packingChargeDefault: outlet?.packingChargeDefault ?? 10,
        deliveryChargeDefault: outlet?.deliveryChargeDefault ?? 40,
        containerChargeDefault: outlet?.containerChargeDefault ?? 0,
      }}
    />
  );
}
