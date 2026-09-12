/**
 * Throwaway verification for cancelOrderItem / deleteOrderItem Prisma logic.
 * Creates a scratch order, runs each cancel path, prints results, cleans up.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}

async function refreshKotsAfterItemChange(kotIds: string[]) {
  for (const kotId of [...new Set(kotIds)]) {
    const total = await prisma.kotItem.count({ where: { kotId } });
    if (total === 0) {
      await prisma.kot.delete({ where: { id: kotId } });
      continue;
    }
    const remaining = await prisma.kotItem.count({
      where: { kotId, status: { notIn: ["VOIDED", "CANCELLED"] } },
    });
    await prisma.kot.update({
      where: { id: kotId },
      data: { updatedAt: new Date(), status: remaining === 0 ? "CANCELLED" : undefined },
    });
  }
}

async function cancelLogic(orderItemId: string, reason: string, quantity?: number) {
  const item = await prisma.orderItem.findFirst({
    where: { id: orderItemId },
    include: {
      order: { select: { id: true, status: true, tableId: true } },
      kotItems: { select: { id: true, kotId: true, quantity: true, status: true, name: true } },
    },
  });
  if (!item) throw new Error("Item not found");
  if (item.voided) throw new Error("Item is already cancelled");
  if (!["OPEN", "HOLD"].includes(item.order.status)) throw new Error("Order is closed");

  const note = reason.trim() || "Cancelled";
  const cancelQty = Math.min(Math.max(1, Math.floor(quantity ?? item.quantity)), item.quantity);
  const wholeLine = cancelQty >= item.quantity;
  const kotIds = item.kotItems.map((k) => k.kotId);

  if (wholeLine && !item.kotSent) {
    await prisma.orderItem.delete({ where: { id: item.id } });
  } else if (wholeLine) {
    await prisma.orderItem.update({
      where: { id: item.id },
      data: { voided: true, voidReason: note },
    });
    await prisma.kotItem.updateMany({
      where: { orderItemId: item.id },
      data: { status: "CANCELLED" },
    });
  } else {
    const keepQty = item.quantity - cancelQty;
    await prisma.orderItem.update({
      where: { id: item.id },
      data: { quantity: keepQty, lineTotal: roundMoney(item.unitPrice * keepQty) },
    });
    let left = cancelQty;
    const live = item.kotItems.filter((k) => !["VOIDED", "CANCELLED"].includes(k.status));
    for (const kotItem of live) {
      if (left <= 0) break;
      const take = Math.min(left, kotItem.quantity);
      left -= take;
      if (take >= kotItem.quantity) {
        await prisma.kotItem.update({
          where: { id: kotItem.id },
          data: { status: "CANCELLED", notes: note },
        });
      } else {
        await prisma.kotItem.update({
          where: { id: kotItem.id },
          data: { quantity: kotItem.quantity - take },
        });
        await prisma.kotItem.create({
          data: {
            kotId: kotItem.kotId,
            orderItemId: item.id,
            name: kotItem.name,
            notes: note,
            quantity: take,
            status: "CANCELLED",
          },
        });
      }
    }
  }

  await refreshKotsAfterItemChange(kotIds);
  return { cancelQty, wholeLine };
}

async function dump(label: string, orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { kotItems: true }, orderBy: { createdAt: "asc" } },
      kots: { include: { items: true } },
    },
  });
  console.log(`\n--- ${label} ---`);
  for (const i of order!.items) {
    console.log(
      `  item ${i.name} qty=${i.quantity} lineTotal=${i.lineTotal} voided=${i.voided} reason=${i.voidReason ?? "-"} kotSent=${i.kotSent}`
    );
    for (const k of i.kotItems) console.log(`      kotItem qty=${k.quantity} status=${k.status} notes=${k.notes ?? "-"}`);
  }
  console.log(`  kots: ${order!.kots.map((k) => `#${k.kotNumber}:${k.status}(${k.items.length})`).join(", ") || "none"}`);
}

async function main() {
  const outlet = await prisma.outlet.findFirstOrThrow();
  const user = await prisma.user.findFirstOrThrow({ where: { outletId: outlet.id } });
  const menuItems = await prisma.menuItem.findMany({ take: 3 });
  if (menuItems.length < 3) throw new Error("need 3 menu items");

  const order = await prisma.order.create({
    data: {
      orderNumber: `TEST-${Date.now()}`,
      type: "PARCEL",
      outletId: outlet.id,
      createdById: user.id,
      items: {
        create: [
          { name: menuItems[0].name, quantity: 1, unitPrice: 100, lineTotal: 100, menuItemId: menuItems[0].id },
          { name: menuItems[1].name, quantity: 2, unitPrice: 50, lineTotal: 100, kotSent: true, menuItemId: menuItems[1].id },
          { name: menuItems[2].name, quantity: 3, unitPrice: 40, lineTotal: 120, kotSent: true, menuItemId: menuItems[2].id },
        ],
      },
    },
    include: { items: { orderBy: { createdAt: "asc" } } },
  });

  const sentItems = order.items.filter((i) => i.kotSent);
  await prisma.kot.create({
    data: {
      kotNumber: 1,
      orderId: order.id,
      createdById: user.id,
      items: {
        create: sentItems.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          orderItemId: i.id,
        })),
      },
    },
  });

  await dump("initial", order.id);

  const [unsent, sentFull, sentPartial] = order.items;

  console.log("\n>>> case A: cancel whole UNSENT line");
  console.log(await cancelLogic(unsent.id, "Punched by mistake"));
  await dump("after A", order.id);

  console.log("\n>>> case B: cancel whole KOT-SENT line");
  console.log(await cancelLogic(sentFull.id, "Guest changed the order"));
  await dump("after B", order.id);

  console.log("\n>>> case C: partial cancel 1 of 3 on KOT-SENT line");
  console.log(await cancelLogic(sentPartial.id, "Out of stock", 1));
  await dump("after C", order.id);

  console.log("\n>>> case D: delete the remaining line permanently");
  const remaining = await prisma.orderItem.findFirstOrThrow({
    where: { orderId: order.id, voided: false },
    include: { kotItems: { select: { kotId: true } } },
  });
  await prisma.orderItem.delete({ where: { id: remaining.id } });
  await refreshKotsAfterItemChange(remaining.kotItems.map((k) => k.kotId));
  await dump("after D", order.id);

  await prisma.order.delete({ where: { id: order.id } });
  console.log("\ncleanup ok — scratch order removed");
}

main()
  .catch((e) => {
    console.error("FAILED:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
