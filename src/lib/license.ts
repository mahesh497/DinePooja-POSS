import { prisma } from "@/lib/prisma";

const SIX_MONTHS_MS = 1000 * 60 * 60 * 24 * 183; // ~6 months

/** Fixed vendor unlock PIN — override with LICENSE_UNLOCK_CODE in .env */
export function getManualUnlockCode(): string {
  return (process.env.LICENSE_UNLOCK_CODE || "934666").trim();
}

export async function ensureLicense() {
  let license = await prisma.appLicense.findUnique({ where: { id: "default" } });
  if (!license) {
    const installedAt = new Date();
    license = await prisma.appLicense.create({
      data: {
        id: "default",
        installedAt,
        expiresAt: new Date(installedAt.getTime() + SIX_MONTHS_MS),
      },
    });
  }
  return license;
}

export async function getLicenseStatus() {
  const license = await ensureLicense();
  const now = Date.now();
  const expired = license.expiresAt.getTime() <= now;
  const daysLeft = Math.max(
    0,
    Math.ceil((license.expiresAt.getTime() - now) / (1000 * 60 * 60 * 24))
  );
  return {
    installedAt: license.installedAt.toISOString(),
    expiresAt: license.expiresAt.toISOString(),
    expired,
    daysLeft,
  };
}

export async function unlockWithCode(answer: string) {
  await ensureLicense();
  const expected = getManualUnlockCode();
  const given = answer.trim();
  if (given !== expected) {
    throw new Error("Wrong unlock code");
  }
  const now = new Date();
  const license = await prisma.appLicense.findUniqueOrThrow({ where: { id: "default" } });
  const base =
    license.expiresAt.getTime() > now.getTime() ? license.expiresAt.getTime() : now.getTime();
  const updated = await prisma.appLicense.update({
    where: { id: "default" },
    data: {
      expiresAt: new Date(base + SIX_MONTHS_MS),
      lastUnlockedAt: now,
    },
  });
  return {
    expiresAt: updated.expiresAt.toISOString(),
    daysLeft: Math.ceil((updated.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
  };
}
