import { Users } from "lucide-react";
import { ModulePage, StatRow } from "@/components/enterprise/module-page";
import { CustomersBoard } from "@/components/customers-board";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { resolveOutletId } from "@/lib/outlet";

export default async function CustomersPage() {
  const session = await requirePermission("pos");
  const outletId = await resolveOutletId(session);
  const customers = await prisma.customer.findMany({
    where: { outletId },
    orderBy: { createdAt: "desc" },
  });
  const withCredit = customers.filter((c) => c.creditBalance > 0).length;
  const loyaltyTotal = customers.reduce((s, c) => s + c.loyaltyPoints, 0);

  return (
    <ModulePage title="Customers" subtitle="Profiles, loyalty, wallet, credit" icon={Users}>
      <StatRow
        stats={[
          { label: "Customers", value: String(customers.length) },
          { label: "With credit", value: String(withCredit) },
          { label: "Loyalty pts", value: String(loyaltyTotal) },
          { label: "Synced", value: "Live" },
        ]}
      />
      <CustomersBoard customers={customers} />
    </ModulePage>
  );
}
