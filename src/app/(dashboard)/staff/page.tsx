import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { StaffAdmin } from "@/components/staff-admin";

export default async function StaffPage() {
  const session = await requirePermission("staff");
  const staff = await prisma.user.findMany({
    where: { outletId: session.user.outletId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, role: true, active: true },
  });
  return <StaffAdmin staff={staff} />;
}
