import { Monitor } from "lucide-react";
import { ModulePage } from "@/components/enterprise/module-page";
import { LedDisplayBoard } from "@/components/led-display-board";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { resolveOutletId } from "@/lib/outlet";
import { orderTypeLabel } from "@/lib/order-types";

export default async function LedDisplayPage() {
  const session = await requireSession();
  const outletId = await resolveOutletId(session);

  const [outlet, order, readyKots, specials] = await Promise.all([
    prisma.outlet.findUnique({ where: { id: outletId } }),
    prisma.order.findFirst({
      where: { outletId, status: { in: ["OPEN", "HOLD"] } },
      orderBy: { updatedAt: "desc" },
      include: {
        items: { where: { voided: false }, orderBy: { createdAt: "asc" } },
        table: { select: { name: true } },
      },
    }),
    prisma.kot.findMany({
      where: {
        status: "READY",
        order: { outletId },
      },
      orderBy: { updatedAt: "desc" },
      take: 12,
      include: {
        order: { include: { table: { select: { name: true } } } },
      },
    }),
    prisma.menuItem.findMany({
      where: {
        category: { outletId },
        OR: [{ popular: true }, { recommended: true }],
        available: true,
      },
      take: 6,
      orderBy: { name: "asc" },
    }),
  ]);

  const tickerParts = [
    `Welcome to ${outlet?.name || "DinePooja"}`,
    ...specials.map((s) => `★ ${s.name} — ₹${s.price}`),
    "Ask staff for today's specials",
    "Thank you for dining with us",
  ];

  return (
    <ModulePage
      title="LED Display"
      subtitle="Customer-facing order & ready token board"
      icon={Monitor}
      actions={
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
          Live · 5s refresh
        </span>
      }
    >
      <LedDisplayBoard
        outletName={outlet?.name || "DinePooja"}
        ticker={tickerParts.join("   •   ")}
        order={
          order
            ? {
                id: order.id,
                orderNumber: order.orderNumber,
                type: orderTypeLabel(order.type),
                total: order.total,
                tableName: order.table?.name ?? null,
                customerName: order.customerName,
                updatedAt: order.updatedAt.toISOString(),
                items: order.items.map((i) => ({
                  id: i.id,
                  name: i.name,
                  quantity: i.quantity,
                  lineTotal: i.lineTotal,
                  variantName: i.variantName,
                })),
              }
            : null
        }
        readyTickets={readyKots.map((k) => ({
          id: k.id,
          kotNumber: k.kotNumber,
          orderNumber: k.order.orderNumber,
          tableName: k.order.table?.name ?? null,
          station: k.station,
        }))}
      />
    </ModulePage>
  );
}
