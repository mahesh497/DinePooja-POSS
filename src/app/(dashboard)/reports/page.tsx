import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { can } from "@/lib/permissions";
import { ReportsDashboard } from "@/components/reports-dashboard";

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export default async function ReportsPage() {
  const session = await requirePermission("reports");
  const from = startOfDay();
  const to = endOfDay();

  const [settled, voids, closes] = await Promise.all([
    prisma.order.findMany({
      where: {
        outletId: session.user.outletId,
        status: "SETTLED",
        settledAt: { gte: from, lte: to },
      },
      include: {
        payments: true,
        items: { where: { voided: false } },
      },
    }),
    prisma.order.count({
      where: {
        outletId: session.user.outletId,
        status: "VOIDED",
        updatedAt: { gte: from, lte: to },
      },
    }),
    prisma.dayClose.findMany({
      where: { outletId: session.user.outletId },
      orderBy: { closedAt: "desc" },
      take: 10,
    }),
  ]);

  let sales = 0;
  let discounts = 0;
  let cash = 0;
  let upi = 0;
  let card = 0;
  let dineIn = 0;
  let parcel = 0;
  let delivery = 0;
  const itemMap = new Map<string, { qty: number; amount: number }>();
  const hourMap = new Map<string, { orders: number; sales: number }>();

  for (const o of settled) {
    sales += o.total;
    discounts += o.discountAmount;
    if (o.type === "DINE_IN") dineIn += o.total;
    if (o.type === "PARCEL") parcel += o.total;
    if (o.type === "DELIVERY") delivery += o.total;
    for (const p of o.payments) {
      if (p.method === "CASH") cash += p.amount;
      if (p.method === "UPI") upi += p.amount;
      if (p.method === "CARD") card += p.amount;
    }
    for (const item of o.items) {
      const cur = itemMap.get(item.name) ?? { qty: 0, amount: 0 };
      cur.qty += item.quantity;
      cur.amount += item.lineTotal;
      itemMap.set(item.name, cur);
    }
    const hour = `${String(new Date(o.settledAt ?? o.createdAt).getHours()).padStart(2, "0")}:00`;
    const h = hourMap.get(hour) ?? { orders: 0, sales: 0 };
    h.orders += 1;
    h.sales += o.total;
    hourMap.set(hour, h);
  }

  const itemWise = [...itemMap.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 15);

  const hourly = [...hourMap.entries()]
    .map(([hour, v]) => ({ hour, ...v }))
    .sort((a, b) => a.hour.localeCompare(b.hour));

  return (
    <ReportsDashboard
      canClose={can(session.user.role, "day_close")}
      summary={{
        sales,
        orders: settled.length,
        voids,
        discounts,
        cash,
        upi,
        card,
        dineIn,
        parcel,
        delivery,
      }}
      itemWise={itemWise}
      hourly={hourly}
      recentCloses={closes.map((c) => ({
        id: c.id,
        closedAt: c.closedAt.toISOString(),
        totalSales: c.totalSales,
        orderCount: c.orderCount,
        cashTotal: c.cashTotal,
        upiTotal: c.upiTotal,
        cardTotal: c.cardTotal,
      }))}
    />
  );
}
