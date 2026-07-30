import { prisma } from "@/lib/prisma";
import type { Session } from "next-auth";

/** Resolve a valid outletId from the logged-in user (handles JWT drift after reseed). */
export async function resolveOutletId(session: Session) {
  const userId = session.user.id;
  const email = session.user.email?.toLowerCase();

  if (userId) {
    const byId = await prisma.user.findUnique({
      where: { id: userId },
      select: { outletId: true, active: true },
    });
    if (byId?.active) return byId.outletId;
  }

  if (email) {
    const byEmail = await prisma.user.findUnique({
      where: { email },
      select: { outletId: true, active: true },
    });
    if (byEmail?.active) return byEmail.outletId;
  }

  const outlet = await prisma.outlet.findFirst({ select: { id: true } });
  if (!outlet) throw new Error("No restaurant outlet found. Please re-login or reseed the database.");
  return outlet.id;
}
