import { Ticket } from "lucide-react";
import { ModulePage, StatRow } from "@/components/enterprise/module-page";
import { CouponsBoard } from "@/components/coupons-board";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { resolveOutletId } from "@/lib/outlet";

export default async function CouponsPage() {
  const session = await requirePermission("discount");
  const outletId = await resolveOutletId(session);
  const coupons = await prisma.coupon.findMany({
    where: { outletId },
    orderBy: { code: "asc" },
  });
  const active = coupons.filter((c) => c.active).length;

  return (
    <ModulePage title="Coupons" subtitle="Offers, gift cards, loyalty" icon={Ticket}>
      <StatRow
        stats={[
          { label: "Coupons", value: String(coupons.length) },
          { label: "Active", value: String(active) },
          { label: "Pending", value: "—" },
          { label: "Synced", value: "Live" },
        ]}
      />
      <CouponsBoard
        coupons={coupons.map((c) => ({
          id: c.id,
          code: c.code,
          type: c.type,
          value: c.value,
          active: c.active,
          minOrder: c.minOrder,
          expiresAt: c.expiresAt?.toISOString() ?? null,
        }))}
      />
    </ModulePage>
  );
}
