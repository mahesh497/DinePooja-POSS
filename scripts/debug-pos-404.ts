import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const order = await prisma.order.findUnique({
    where: { id: "cmtxz5s0n0003tjiww2lmwawa" },
  });
  const users = await prisma.user.findMany({
    select: { id: true, email: true, outletId: true, active: true },
  });
  const outlets = await prisma.outlet.findMany({ select: { id: true, name: true } });
  console.log(
    JSON.stringify(
      {
        order: order
          ? { id: order.id, status: order.status, outletId: order.outletId, tableId: order.tableId }
          : null,
        users,
        outlets,
      },
      null,
      2
    )
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
