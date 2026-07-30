import { Boxes } from "lucide-react";
import { ModulePage, StatRow } from "@/components/enterprise/module-page";
import { InventoryBoard } from "@/components/inventory-board";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { resolveOutletId } from "@/lib/outlet";

export default async function InventoryPage() {
  const session = await requirePermission("menu");
  const outletId = await resolveOutletId(session);
  const items = await prisma.menuItem.findMany({
    where: { category: { outletId } },
    orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }],
    include: { category: { select: { name: true } } },
  });
  const low = items.filter((i) => i.stock <= 10).length;
  const off = items.filter((i) => !i.available).length;

  return (
    <ModulePage title="Inventory" subtitle="Live item stock (auto-decrements on settle)" icon={Boxes}>
      <StatRow
        stats={[
          { label: "SKUs", value: String(items.length) },
          { label: "Low stock", value: String(low) },
          { label: "Unavailable", value: String(off) },
          { label: "Synced", value: "Live" },
        ]}
      />
      <InventoryBoard
        items={items.map((i) => ({
          id: i.id,
          code: i.code,
          name: i.name,
          stock: i.stock,
          available: i.available,
          categoryName: i.category.name,
        }))}
      />
    </ModulePage>
  );
}
