import { Receipt } from "lucide-react";
import { ModulePage, StatRow } from "@/components/enterprise/module-page";
import { ExpensesBoard } from "@/components/expenses-board";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { resolveOutletId } from "@/lib/outlet";

export default async function ExpensesPage() {
  const session = await requirePermission("pos");
  const outletId = await resolveOutletId(session);
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const expenses = await prisma.expense.findMany({
    where: { outletId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { user: { select: { name: true } } },
  });
  const todayTotal = expenses
    .filter((e) => e.createdAt >= start)
    .reduce((s, e) => s + e.amount, 0);

  return (
    <ModulePage title="Expenses" subtitle="Daily expenses & categories" icon={Receipt}>
      <StatRow
        stats={[
          { label: "Today", value: `₹${todayTotal.toFixed(0)}` },
          { label: "Records", value: String(expenses.length) },
          { label: "Open", value: "—" },
          { label: "Synced", value: "Live" },
        ]}
      />
      <ExpensesBoard
        todayTotal={todayTotal}
        expenses={expenses.map((e) => ({
          id: e.id,
          category: e.category,
          amount: e.amount,
          note: e.note,
          createdAt: e.createdAt.toISOString(),
          userName: e.user.name,
        }))}
      />
    </ModulePage>
  );
}
