import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { SettingsForm } from "@/components/settings-form";

export default async function SettingsPage() {
  const session = await requirePermission("settings");
  const [outlet, tables] = await Promise.all([
    prisma.outlet.findUniqueOrThrow({ where: { id: session.user.outletId } }),
    prisma.diningTable.findMany({
      where: { outletId: session.user.outletId },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  return (
    <SettingsForm
      outlet={outlet}
      tables={tables.map((t) => ({
        id: t.id,
        name: t.name,
        capacity: t.capacity,
        status: t.status,
      }))}
    />
  );
}
