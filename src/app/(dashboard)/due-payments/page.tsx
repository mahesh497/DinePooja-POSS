import { CreditCard } from "lucide-react";
import { ModulePage, StatRow } from "@/components/enterprise/module-page";
import { DuePaymentsBoard } from "@/components/due-payments-board";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { resolveOutletId } from "@/lib/outlet";
import { formatINR } from "@/lib/tax";

export default async function DuePaymentsPage() {
  const session = await requirePermission("pos");
  const outletId = await resolveOutletId(session);

  const [creditCustomers, openOrders] = await Promise.all([
    prisma.customer.findMany({
      where: { outletId, creditBalance: { gt: 0 } },
      orderBy: { creditBalance: "desc" },
    }),
    prisma.order.findMany({
      where: { outletId, status: { in: ["OPEN", "HOLD"] } },
      orderBy: { createdAt: "desc" },
      include: { table: { select: { name: true } } },
    }),
  ]);

  const unpaid = openOrders.filter((o) => o.paidAmount < o.total - 0.01);
  const creditTotal = creditCustomers.reduce((s, c) => s + c.creditBalance, 0);
  const unpaidTotal = unpaid.reduce((s, o) => s + (o.total - o.paidAmount), 0);

  return (
    <ModulePage title="Due Payment" subtitle="Pending & credit collections" icon={CreditCard}>
      <StatRow
        stats={[
          { label: "Credit due", value: formatINR(creditTotal) },
          { label: "Open unpaid", value: formatINR(unpaidTotal) },
          { label: "Accounts", value: String(creditCustomers.length) },
          { label: "Synced", value: "Live" },
        ]}
      />
      <DuePaymentsBoard
        customers={creditCustomers.map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          creditBalance: c.creditBalance,
        }))}
        unpaid={unpaid.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          tableName: o.table?.name ?? null,
          type: o.type,
          total: o.total,
          paidAmount: o.paidAmount,
        }))}
      />
    </ModulePage>
  );
}
