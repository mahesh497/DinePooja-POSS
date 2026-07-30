import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const outlet = await prisma.outlet.findFirst();
  const user = await prisma.user.findFirst({ where: { email: "owner@dinepooja.local" } });
  const partner = await prisma.deliveryBoy.findFirst({ where: { outletId: outlet!.id, active: true } });
  const item = await prisma.menuItem.findFirst({
    where: { available: true, category: { outletId: outlet!.id } },
  });
  if (!outlet || !user || !partner || !item) throw new Error("missing seed data");

  const stockBefore = item.stock;
  const count = await prisma.order.count({ where: { outletId: outlet.id } });
  const order = await prisma.order.create({
    data: {
      orderNumber: `D-TEST-${count + 1}`,
      type: "DELIVERY",
      status: "OPEN",
      customerName: "Test Guest",
      customerAddress: "MG Road",
      deliveryStatus: "PENDING",
      subtotal: item.price,
      total: item.price,
      outletId: outlet.id,
      createdById: user.id,
      items: {
        create: {
          name: item.name,
          quantity: 1,
          unitPrice: item.price,
          lineTotal: item.price,
          menuItemId: item.id,
        },
      },
    },
  });

  await prisma.order.update({
    where: { id: order.id },
    data: {
      deliveryBoyId: partner.id,
      driverName: partner.name,
      deliveryStatus: "ASSIGNED",
      destLat: 12.98,
      destLng: 77.61,
      riderLat: partner.lat,
      riderLng: partner.lng,
    },
  });
  await prisma.deliveryBoy.update({ where: { id: partner.id }, data: { dutyStatus: "ON_TRIP" } });

  const payAmt = item.price;
  await prisma.payment.create({
    data: { orderId: order.id, amount: payAmt, method: "CASH", takenById: user.id, reference: "test" },
  });
  await prisma.cashEntry.create({
    data: { type: "SALE_CASH", amount: payAmt, note: "test sale", outletId: outlet.id, userId: user.id },
  });
  await prisma.menuItem.update({ where: { id: item.id }, data: { stock: { decrement: 1 } } });
  await prisma.order.update({
    where: { id: order.id },
    data: {
      paidAmount: payAmt,
      status: "SETTLED",
      settledAt: new Date(),
      deliveryStatus: "DELIVERED",
      deliveredAt: new Date(),
    },
  });
  await prisma.deliveryBoy.update({ where: { id: partner.id }, data: { dutyStatus: "AVAILABLE" } });

  const updated = await prisma.order.findUnique({ where: { id: order.id } });
  const stockAfter = (await prisma.menuItem.findUnique({ where: { id: item.id } }))!.stock;
  const cash = await prisma.cashEntry.findFirst({ where: { note: "test sale" } });
  const credit = await prisma.customer.findFirst({
    where: { outletId: outlet.id, creditBalance: { gt: 0 } },
  });
  const duty = (await prisma.deliveryBoy.findUnique({ where: { id: partner.id } }))!.dutyStatus;

  console.log(
    JSON.stringify(
      {
        ok: updated?.status === "SETTLED" && updated.deliveryStatus === "DELIVERED" && !!cash && stockAfter === stockBefore - 1,
        settled: updated?.status,
        delivery: updated?.deliveryStatus,
        stockBefore,
        stockAfter,
        cashEntry: !!cash,
        creditAccounts: credit ? 1 : 0,
        partnerDuty: duty,
      },
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
