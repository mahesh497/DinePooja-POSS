import { Store } from "lucide-react";
import { ModulePage, StatRow } from "@/components/enterprise/module-page";
import { StoreForm } from "@/components/store-form";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { resolveOutletId } from "@/lib/outlet";

export default async function StorePage() {
  const session = await requirePermission("settings");
  const outletId = await resolveOutletId(session);
  const outlet = await prisma.outlet.findUniqueOrThrow({ where: { id: outletId } });

  return (
    <ModulePage title="Store" subtitle="Outlet / branch profile" icon={Store}>
      <StatRow
        stats={[
          { label: "Outlet", value: outlet.name },
          { label: "Prefix", value: outlet.billPrefix },
          { label: "Phone", value: outlet.phone || "—" },
          { label: "Synced", value: "Live" },
        ]}
      />
      <StoreForm
        outlet={{
          name: outlet.name,
          address: outlet.address,
          phone: outlet.phone,
          gstin: outlet.gstin,
        }}
      />
    </ModulePage>
  );
}
