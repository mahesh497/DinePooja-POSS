import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { can, type Permission } from "@/lib/permissions";
import type { Role } from "@prisma/client";

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  return session;
}

export async function requirePermission(permission: Permission) {
  const session = await requireSession();
  if (!can(session.user.role as Role, permission)) {
    redirect("/tables");
  }
  return session;
}
