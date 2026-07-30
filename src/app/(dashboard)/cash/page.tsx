import { Wallet } from "lucide-react";
import { ModulePage, StatRow } from "@/components/enterprise/module-page";
import { CashBoard } from "@/components/cash-board";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { resolveOutletId } from "@/lib/outlet";

export default async function CashPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await requirePermission("pos");
  const outletId = await resolveOutletId(session);
  const { tab } = await searchParams;

  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const [entries, cashPayments] = await Promise.all([
    prisma.cashEntry.findMany({
      where: { outletId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { user: { select: { name: true } } },
    }),
    prisma.payment.findMany({
      where: {
        method: "CASH",
        createdAt: { gte: start },
        order: { outletId },
      },
    }),
  ]);

  const todayCashSales = cashPayments.reduce((s, p) => s + p.amount, 0);
  const drawerBalance = entries.reduce((s, e) => {
    if (e.type === "WITHDRAW") return s - e.amount;
    return s + e.amount;
  }, 0);

  return (
    <ModulePage title="Cash Flow" subtitle="Register, top-up, withdrawal" icon={Wallet}>
      <StatRow
        stats={[
          { label: "Entries", value: String(entries.length) },
          { label: "Today cash", value: `₹${todayCashSales.toFixed(0)}` },
          { label: "Drawer", value: `₹${drawerBalance.toFixed(0)}` },
          { label: "Synced", value: "Live" },
        ]}
      />
      <CashBoard
        defaultTab={tab}
        todayCashSales={todayCashSales}
        drawerBalance={drawerBalance}
        entries={entries.map((e) => ({
          id: e.id,
          type: e.type,
          amount: e.amount,
          note: e.note,
          createdAt: e.createdAt.toISOString(),
          userName: e.user.name,
        }))}
      />
    </ModulePage>
  );
}
