import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { MenuAdmin } from "@/components/menu-admin";

export default async function MenuPage() {
  const session = await requirePermission("menu");
  const categories = await prisma.category.findMany({
    where: { outletId: session.user.outletId },
    orderBy: { sortOrder: "asc" },
    include: {
      items: {
        include: { variants: true, addons: true },
        orderBy: { name: "asc" },
      },
    },
  });

  return <MenuAdmin categories={categories} />;
}
