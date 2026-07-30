import { AlertsBoard, type AlertItem } from "@/components/alerts-board";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { resolveOutletId } from "@/lib/outlet";
import { formatINR } from "@/lib/tax";
import { orderTypeLabel } from "@/lib/order-types";

export default async function AlertsPage() {
  const session = await requirePermission("pos");
  const outletId = await resolveOutletId(session);
  const now = Date.now();
  const thirtyMinAgo = new Date(now - 30 * 60 * 1000);

  const [lowStock, outOfStock, creditCustomers, printedUnpaid, delayedKots, longOpen, unavailable] =
    await Promise.all([
      prisma.menuItem.findMany({
        where: {
          category: { outletId },
          available: true,
          stock: { gt: 0, lte: 10 },
        },
        orderBy: { stock: "asc" },
        take: 30,
        include: { category: { select: { name: true } } },
      }),
      prisma.menuItem.findMany({
        where: { category: { outletId }, OR: [{ stock: { lte: 0 } }, { available: false }] },
        orderBy: { name: "asc" },
        take: 30,
      }),
      prisma.customer.findMany({
        where: { outletId, creditBalance: { gt: 0 } },
        orderBy: { creditBalance: "desc" },
        take: 30,
      }),
      prisma.order.findMany({
        where: {
          outletId,
          status: "OPEN",
          billPrintedAt: { not: null },
        },
        orderBy: { billPrintedAt: "desc" },
        include: { table: { select: { name: true } } },
      }),
      prisma.kot.findMany({
        where: { status: "DELAYED", order: { outletId } },
        orderBy: { updatedAt: "desc" },
        take: 20,
        include: { order: { include: { table: { select: { name: true } } } } },
      }),
      prisma.order.findMany({
        where: {
          outletId,
          status: "OPEN",
          occupiedAt: { lte: thirtyMinAgo },
        },
        orderBy: { occupiedAt: "asc" },
        take: 20,
        include: { table: { select: { name: true } } },
      }),
      prisma.menuItem.count({
        where: { category: { outletId }, available: false },
      }),
    ]);

  const unpaidPrinted = printedUnpaid.filter((o) => o.paidAmount < o.total - 0.01);

  const alerts: AlertItem[] = [];

  for (const i of outOfStock) {
    alerts.push({
      id: `oos-${i.id}`,
      kind: "CRITICAL",
      category: "Stock",
      title: `${i.name} unavailable`,
      detail: i.stock <= 0 ? `Out of stock (qty ${i.stock}) · code #${i.code}` : `Marked off · code #${i.code}`,
      href: "/menu-availability",
    });
  }

  for (const i of lowStock) {
    alerts.push({
      id: `low-${i.id}`,
      kind: i.stock <= 3 ? "CRITICAL" : "WARN",
      category: "Stock",
      title: `Low stock · ${i.name}`,
      detail: `${i.category.name} · only ${i.stock} left · #${i.code}`,
      href: "/inventory",
    });
  }

  for (const k of delayedKots) {
    alerts.push({
      id: `kot-${k.id}`,
      kind: "WARN",
      category: "Kitchen",
      title: `Delayed KOT #${k.kotNumber}`,
      detail: `${k.station} · order #${k.order.orderNumber}${
        k.order.table?.name ? ` · table ${k.order.table.name}` : ""
      }`,
      href: "/kot",
    });
  }

  for (const o of unpaidPrinted) {
    alerts.push({
      id: `bill-${o.id}`,
      kind: "CRITICAL",
      category: "Billing",
      title: `Printed unpaid · #${o.orderNumber}`,
      detail: `${o.table?.name || orderTypeLabel(o.type)} · balance ${formatINR(o.total - o.paidAmount)}`,
      href: `/pos/${o.id}`,
    });
  }

  for (const c of creditCustomers) {
    alerts.push({
      id: `credit-${c.id}`,
      kind: c.creditBalance >= 1000 ? "CRITICAL" : "WARN",
      category: "Credit",
      title: `Due credit · ${c.name}`,
      detail: `${c.phone} · ${formatINR(c.creditBalance)} outstanding`,
      href: "/due-payments",
    });
  }

  for (const o of longOpen) {
    const mins = Math.max(
      1,
      Math.round((now - (o.occupiedAt?.getTime() || o.createdAt.getTime())) / 60000)
    );
    alerts.push({
      id: `long-${o.id}`,
      kind: mins >= 60 ? "CRITICAL" : "WARN",
      category: "Tables",
      title: `Long open order · #${o.orderNumber}`,
      detail: `${o.table?.name || orderTypeLabel(o.type)} · open ${mins} min · ${formatINR(o.total)}`,
      href: `/pos/${o.id}`,
    });
  }

  alerts.push({
    id: "renewal-info",
    kind: "INFO",
    category: "Service",
    title: "Service renewal reminder",
    detail: "Review subscription status and plan renewals for this outlet.",
    href: "/service-renewal",
  });

  if (unavailable > 0) {
    alerts.push({
      id: "menu-off-info",
      kind: "INFO",
      category: "Menu",
      title: `${unavailable} menu item(s) switched off`,
      detail: "Toggle availability from Menu Item On/Off when kitchen is ready.",
      href: "/menu-availability",
    });
  }

  const severityRank = { CRITICAL: 0, WARN: 1, INFO: 2 } as const;
  alerts.sort((a, b) => severityRank[a.kind] - severityRank[b.kind]);

  return (
    <AlertsBoard
      stats={[
        {
          label: "Critical",
          value: String(alerts.filter((a) => a.kind === "CRITICAL").length),
        },
        { label: "Low stock", value: String(lowStock.length + outOfStock.length) },
        { label: "Delayed KOTs", value: String(delayedKots.length) },
        { label: "Printed unpaid", value: String(unpaidPrinted.length) },
      ]}
      alerts={alerts}
    />
  );
}
