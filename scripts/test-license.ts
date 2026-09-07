import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const mode = (process.argv[2] || "status").toLowerCase();

async function main() {
  if (mode === "expire") {
    const license = await prisma.appLicense.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        installedAt: new Date(),
        expiresAt: new Date(Date.now() - 60_000),
      },
      update: {
        expiresAt: new Date(Date.now() - 60_000),
      },
    });
    console.log("License FORCE-EXPIRED for testing.");
    console.log("Expires:", license.expiresAt.toISOString());
    console.log("Unlock with 6-digit code from .env LICENSE_UNLOCK_CODE (default 934666)");
    console.log("Open http://localhost:3000/activate");
    return;
  }

  if (mode === "renew") {
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 183);
    const license = await prisma.appLicense.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        installedAt: new Date(),
        expiresAt,
      },
      update: { expiresAt },
    });
    console.log("License renewed until", license.expiresAt.toISOString());
    return;
  }

  const license = await prisma.appLicense.findUnique({ where: { id: "default" } });
  if (!license) {
    console.log("No license row yet — open the app once to create it.");
    return;
  }
  console.log({
    expiresAt: license.expiresAt.toISOString(),
    expired: license.expiresAt.getTime() <= Date.now(),
    daysLeft: Math.ceil((license.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
