import { Percent } from "lucide-react";
import { ModulePage, StatRow } from "@/components/enterprise/module-page";
import { TaxForm } from "@/components/tax-form";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { resolveOutletId } from "@/lib/outlet";

export default async function TaxPage() {
  const session = await requirePermission("settings");
  const outletId = await resolveOutletId(session);
  const outlet = await prisma.outlet.findUniqueOrThrow({ where: { id: outletId } });

  return (
    <ModulePage title="Tax" subtitle="GST, CGST, SGST, service charge" icon={Percent}>
      <StatRow
        stats={[
          { label: "CGST", value: `${outlet.cgstPercent}%` },
          { label: "SGST", value: `${outlet.sgstPercent}%` },
          { label: "Service", value: `${outlet.serviceChargePercent}%` },
          { label: "Synced", value: "Live" },
        ]}
      />
      <TaxForm
        cgstPercent={outlet.cgstPercent}
        sgstPercent={outlet.sgstPercent}
        serviceChargePercent={outlet.serviceChargePercent}
      />
    </ModulePage>
  );
}
