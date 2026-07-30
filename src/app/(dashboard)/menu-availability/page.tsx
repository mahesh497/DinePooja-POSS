import Link from "next/link";
import { Tag } from "lucide-react";
import { ModulePage } from "@/components/enterprise/module-page";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { formatINR } from "@/lib/tax";
import { MenuAvailabilityBoard } from "@/components/menu-availability-board";

export default async function MenuAvailabilityPage() {
  const session = await requirePermission("menu");
  const categories = await prisma.category.findMany({
    where: { outletId: session.user.outletId },
    orderBy: { sortOrder: "asc" },
    include: {
      items: { orderBy: { name: "asc" }, select: { id: true, code: true, name: true, price: true, available: true, isVeg: true } },
    },
  });

  return (
    <ModulePage
      title="Menu Item On / Off"
      subtitle="Toggle availability instantly — 86 sold-out items during rush"
      icon={Tag}
      actions={
        <Link href="/menu" className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm">
          Full menu admin
        </Link>
      }
    >
      <MenuAvailabilityBoard
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          items: c.items.map((i) => ({
            ...i,
            priceLabel: formatINR(i.price),
          })),
        }))}
      />
    </ModulePage>
  );
}
