import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

async function main() {
  const outlets = await p.outlet.findMany({ select: { id: true, name: true } });
  const users = await p.user.findMany({ select: { email: true, outletId: true } });
  console.log("outlets", outlets);
  console.log("users", users);
}

main()
  .finally(() => p.$disconnect());
