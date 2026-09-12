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
  const outletId = session.user.outletId;

  const [settled, voids, closes, openCount, outlet] = await Promise.all([
    prisma.order.findMany({
      where: {
        outletId,
        status: "SETTLED",
        settledAt: { gte: from, lte: to },
      },
      include: { payments: true },
    }),
    prisma.order.count({
      where: {
        outletId,
        status: "VOIDED",
        updatedAt: { gte: from, lte: to },
      },
    }),
    prisma.dayClose.findMany({
      where: { outletId },
      orderBy: { closedAt: "desc" },
      take: 10,
    }),
    prisma.order.count({
      where: { outletId, status: { in: ["OPEN", "HOLD"] } },
    }),
    prisma.outlet.findUnique({
      where: { id: outletId },
      select: { name: true, reportEmail: true },
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
  const hourMap = new Map<string, { sales: number }>();

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
    const hour = `${String(new Date(o.settledAt ?? o.createdAt).getHours()).padStart(2, "0")}:00`;
    const h = hourMap.get(hour) ?? { sales: 0 };
    h.sales += o.total;
    hourMap.set(hour, h);
  }

  const hourly = [...hourMap.entries()]
    .map(([hour, v]) => ({ hour, sales: v.sales }))
    .sort((a, b) => a.hour.localeCompare(b.hour));

  return (
    <ReportsDashboard
      canClose={can(session.user.role, "day_close")}
      openCount={openCount}
      outletName={outlet?.name || session.user.outletName || "Outlet"}
      reportEmail={outlet?.reportEmail || process.env.REPORT_EMAIL || ""}
      businessDate={from.toLocaleDateString("en-IN")}
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
      hourly={hourly}
      recentCloses={closes.map((c) => ({
        id: c.id,
        closedAt: c.closedAt.toISOString(),
        totalSales: c.totalSales,
        cashTotal: c.cashTotal,
        upiTotal: c.upiTotal,
        cardTotal: c.cardTotal,
      }))}
    />
  );
}
