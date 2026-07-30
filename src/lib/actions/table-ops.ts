"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { resolveOutletId } from "@/lib/outlet";

async function recompute(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, outlet: true },
  });
  if (!order) return;
  const subtotal = order.items.filter((i) => !i.voided).reduce((s, i) => s + i.lineTotal, 0);
  const discount =
    order.discountPercent > 0
      ? (subtotal * order.discountPercent) / 100
      : order.discountAmount;
  const net = Math.max(0, subtotal - discount);
  const serviceCharge =
    (order.outlet.serviceChargePercent ?? 0) > 0
      ? Math.round(((net * order.outlet.serviceChargePercent) / 100) * 100) / 100
      : order.serviceCharge;
  const taxable =
    Math.max(0, subtotal - discount) +
    order.packingCharge +
    order.deliveryCharge +
    order.containerCharge +
    serviceCharge;
  const cgstAmount = (taxable * order.outlet.cgstPercent) / 100;
  const sgstAmount = (taxable * order.outlet.sgstPercent) / 100;
  const beforeRound = taxable + cgstAmount + sgstAmount;
  const roundedTotal = Math.round(beforeRound);
  const roundOff = Math.round((roundedTotal - beforeRound) * 100) / 100;
  await prisma.order.update({
    where: { id: orderId },
    data: {
      subtotal: Math.round(subtotal * 100) / 100,
      discountAmount: Math.round(discount * 100) / 100,
      serviceCharge: Math.round(serviceCharge * 100) / 100,
      roundOff,
      cgstAmount: Math.round(cgstAmount * 100) / 100,
      sgstAmount: Math.round(sgstAmount * 100) / 100,
      total: roundedTotal,
    },
  });
}

export async function createHall(name: string) {
  const session = await requirePermission("settings");
  const outletId = await resolveOutletId(session);
  const count = await prisma.diningHall.count({ where: { outletId } });
  await prisma.diningHall.create({
    data: { name: name.trim(), sortOrder: count + 1, outletId },
  });
  revalidatePath("/tables");
  revalidatePath("/settings");
}

/** Move entire running order to another vacant/target table */
export async function moveOrderToTable(orderId: string, targetTableId: string) {
  const session = await requirePermission("tables");
  const outletId = await resolveOutletId(session);
  const order = await prisma.order.findFirst({
    where: { id: orderId, outletId, status: "OPEN" },
  });
  if (!order?.tableId) throw new Error("Order has no table");
  if (order.tableId === targetTableId) throw new Error("Same table");

  const targetBusy = await prisma.order.findFirst({
    where: {
      tableId: targetTableId,
      status: "OPEN",
      items: { some: { voided: false } },
    },
  });
  if (targetBusy) throw new Error("Target table already has an active order");

  const sourceId = order.tableId;
  const sourceStatus = (
    await prisma.diningTable.findUnique({ where: { id: sourceId } })
  )?.status;

  await prisma.order.update({
    where: { id: orderId },
    data: { tableId: targetTableId },
  });
  await prisma.diningTable.update({
    where: { id: targetTableId },
    data: { status: sourceStatus && sourceStatus !== "FREE" ? sourceStatus : "OCCUPIED" },
  });
  await prisma.diningTable.update({
    where: { id: sourceId },
    data: { status: "FREE", mergedInto: null },
  });

  revalidatePath("/tables");
  revalidatePath(`/pos/${orderId}`);
  revalidatePath("/orders");
  return targetTableId;
}

/** Split selected items onto a new/empty table as a new order */
export async function splitItemsToTable(input: {
  orderId: string;
  targetTableId: string;
  orderItemIds: string[];
}) {
  const session = await requirePermission("tables");
  const outletId = await resolveOutletId(session);
  if (!input.orderItemIds.length) throw new Error("Select items to split");

  const order = await prisma.order.findFirst({
    where: { id: input.orderId, outletId, status: "OPEN" },
    include: { items: true },
  });
  if (!order) throw new Error("Order not found");

  const moving = order.items.filter(
    (i) => input.orderItemIds.includes(i.id) && !i.voided
  );
  if (!moving.length) throw new Error("No valid items");

  const targetBusy = await prisma.order.findFirst({
    where: {
      tableId: input.targetTableId,
      status: "OPEN",
      items: { some: { voided: false } },
    },
  });
  if (targetBusy) throw new Error("Target table already has an active order");

  const count = await prisma.order.count({ where: { outletId } });
  const newOrder = await prisma.order.create({
    data: {
      orderNumber: `O-${String(count + 1).padStart(4, "0")}`,
      type: "DINE_IN",
      guestCount: 1,
      outletId,
      tableId: input.targetTableId,
      createdById: session.user.id,
      occupiedAt: new Date(),
    },
  });

  await prisma.orderItem.updateMany({
    where: { id: { in: moving.map((m) => m.id) } },
    data: { orderId: newOrder.id },
  });

  // Move related kot items' parent kots stay; items move with orderItem relation
  await recompute(order.id);
  await recompute(newOrder.id);

  const remaining = await prisma.orderItem.count({
    where: { orderId: order.id, voided: false },
  });
  await prisma.diningTable.update({
    where: { id: input.targetTableId },
    data: { status: "OCCUPIED" },
  });
  if (order.tableId && remaining === 0) {
    await prisma.diningTable.update({
      where: { id: order.tableId },
      data: { status: "FREE" },
    });
  }

  revalidatePath("/tables");
  revalidatePath("/pos");
  revalidatePath("/orders");
  return newOrder.id;
}

/** Transfer items between two open orders */
export async function transferItems(input: {
  fromOrderId: string;
  toOrderId: string;
  orderItemIds: string[];
}) {
  const session = await requirePermission("tables");
  const outletId = await resolveOutletId(session);
  if (input.fromOrderId === input.toOrderId) throw new Error("Same order");
  if (!input.orderItemIds.length) throw new Error("Select items");

  const [from, to] = await Promise.all([
    prisma.order.findFirst({ where: { id: input.fromOrderId, outletId, status: "OPEN" } }),
    prisma.order.findFirst({ where: { id: input.toOrderId, outletId, status: "OPEN" } }),
  ]);
  if (!from || !to) throw new Error("Order not found");

  await prisma.orderItem.updateMany({
    where: { id: { in: input.orderItemIds }, orderId: from.id },
    data: { orderId: to.id },
  });
  await recompute(from.id);
  await recompute(to.id);

  revalidatePath("/tables");
  revalidatePath(`/pos/${from.id}`);
  revalidatePath(`/pos/${to.id}`);
  revalidatePath("/orders");
}

export async function cancelKot(kotId: string, reason?: string) {
  const session = await requirePermission("kot");
  const outletId = await resolveOutletId(session);
  const kot = await prisma.kot.findFirst({
    where: { id: kotId, order: { outletId } },
    include: { items: true },
  });
  if (!kot) throw new Error("KOT not found");

  await prisma.kot.update({ where: { id: kotId }, data: { status: "CANCELLED" } });
  await prisma.kotItem.updateMany({
    where: { kotId },
    data: { status: "CANCELLED" },
  });
  await prisma.auditLog.create({
    data: {
      action: "CANCEL_KOT",
      entity: "Kot",
      entityId: kotId,
      details: reason || "Cancelled",
      outletId,
      userId: session.user.id,
    },
  });
  revalidatePath("/kot");
}

export async function setKotDelayed(kotId: string) {
  await requirePermission("kot");
  await prisma.kot.update({ where: { id: kotId }, data: { status: "DELAYED" } });
  await prisma.kotItem.updateMany({
    where: { kotId, status: { in: ["PENDING", "PREPARING"] } },
    data: { status: "DELAYED" },
  });
  revalidatePath("/kot");
}

export async function assignDriver(orderId: string, driverName: string) {
  const session = await requirePermission("pos");
  const outletId = session.user.outletId;
  const name = driverName.trim();
  if (!name) {
    const { unassignDeliveryPartner } = await import("@/lib/actions/delivery");
    return unassignDeliveryPartner(orderId);
  }
  const partner = await prisma.deliveryBoy.findFirst({
    where: { outletId, name, active: true },
  });
  if (partner) {
    const { assignDeliveryPartner } = await import("@/lib/actions/delivery");
    return assignDeliveryPartner(orderId, partner.id);
  }
  await prisma.order.updateMany({
    where: { id: orderId, outletId },
    data: { driverName: name, deliveryStatus: "ASSIGNED" },
  });
  revalidatePath("/orders");
  revalidatePath("/online-orders");
  revalidatePath("/delivery");
}

export async function refundOrder(orderId: string, reason: string) {
  const session = await requirePermission("void");
  const order = await prisma.order.findFirst({
    where: { id: orderId, outletId: session.user.outletId, status: "SETTLED" },
  });
  if (!order) throw new Error("Only settled orders can be refunded");
  await prisma.order.update({
    where: { id: orderId },
    data: { status: "REFUNDED", voidReason: reason || "Refunded" },
  });
  await prisma.auditLog.create({
    data: {
      action: "REFUND_ORDER",
      entity: "Order",
      entityId: orderId,
      details: reason,
      outletId: session.user.outletId,
      userId: session.user.id,
    },
  });
  revalidatePath("/orders");
  revalidatePath("/reports");
}

export async function createCreditNote(orderId: string, amount: number, note: string) {
  const session = await requirePermission("void");
  await prisma.auditLog.create({
    data: {
      action: "CREDIT_NOTE",
      entity: "Order",
      entityId: orderId,
      details: `Amount ${amount} · ${note}`,
      outletId: session.user.outletId,
      userId: session.user.id,
    },
  });
  revalidatePath(`/bill/${orderId}`);
  revalidatePath("/orders");
}

export async function createDebitNote(orderId: string, amount: number, note: string) {
  const session = await requirePermission("void");
  await prisma.auditLog.create({
    data: {
      action: "DEBIT_NOTE",
      entity: "Order",
      entityId: orderId,
      details: `Amount ${amount} · ${note}`,
      outletId: session.user.outletId,
      userId: session.user.id,
    },
  });
  revalidatePath(`/bill/${orderId}`);
}

export async function cancelOrder(orderId: string, reason: string) {
  const session = await requirePermission("void");
  const order = await prisma.order.findFirst({
    where: { id: orderId, outletId: session.user.outletId, status: "OPEN" },
  });
  if (!order) throw new Error("Only open orders can be cancelled");
  await prisma.order.update({
    where: { id: orderId },
    data: { status: "CANCELLED", voidReason: reason || "Cancelled" },
  });
  if (order.tableId) {
    await prisma.diningTable.update({
      where: { id: order.tableId },
      data: { status: "FREE", mergedInto: null },
    });
  }
  await prisma.kot.updateMany({
    where: { orderId, status: { in: ["PENDING", "PREPARING", "READY", "DELAYED"] } },
    data: { status: "CANCELLED" },
  });
  await prisma.auditLog.create({
    data: {
      action: "CANCEL_ORDER",
      entity: "Order",
      entityId: orderId,
      details: reason,
      outletId: session.user.outletId,
      userId: session.user.id,
    },
  });
  revalidatePath("/orders");
  revalidatePath("/tables");
  revalidatePath("/kot");
  revalidatePath("/pos");
}

/** Merge source KOT items into target KOT (same order) */
export async function mergeKots(sourceKotId: string, targetKotId: string) {
  const session = await requirePermission("kot");
  if (sourceKotId === targetKotId) throw new Error("Same KOT");
  const [source, target] = await Promise.all([
    prisma.kot.findFirst({
      where: { id: sourceKotId, order: { outletId: session.user.outletId } },
      include: { items: true },
    }),
    prisma.kot.findFirst({
      where: { id: targetKotId, order: { outletId: session.user.outletId } },
    }),
  ]);
  if (!source || !target) throw new Error("KOT not found");
  if (source.orderId !== target.orderId) throw new Error("KOTs must be on the same order");
  if (source.status === "CANCELLED" || target.status === "CANCELLED") {
    throw new Error("Cannot merge cancelled KOT");
  }

  await prisma.kotItem.updateMany({
    where: { kotId: source.id },
    data: { kotId: target.id },
  });
  await prisma.kot.update({ where: { id: source.id }, data: { status: "CANCELLED" } });
  await prisma.auditLog.create({
    data: {
      action: "MERGE_KOT",
      entity: "Kot",
      entityId: targetKotId,
      details: `Merged KOT #${source.kotNumber} into #${target.kotNumber}`,
      outletId: session.user.outletId,
      userId: session.user.id,
    },
  });
  revalidatePath("/kot");
}

/** Split selected KOT items into a new ticket on the same order */
export async function splitKotItems(kotId: string, kotItemIds: string[]) {
  const session = await requirePermission("kot");
  if (!kotItemIds.length) throw new Error("Select items to split");
  const kot = await prisma.kot.findFirst({
    where: { id: kotId, order: { outletId: session.user.outletId } },
    include: { items: true, order: { include: { kots: true } } },
  });
  if (!kot) throw new Error("KOT not found");
  const moving = kot.items.filter((i) => kotItemIds.includes(i.id));
  if (!moving.length) throw new Error("No items selected");
  if (moving.length === kot.items.length) throw new Error("Cannot split all items — use move instead");

  const nextNumber = Math.max(...kot.order.kots.map((k) => k.kotNumber), 0) + 1;
  const newKot = await prisma.kot.create({
    data: {
      kotNumber: nextNumber,
      station: kot.station,
      status: "PENDING",
      orderId: kot.orderId,
      createdById: session.user.id,
    },
  });
  await prisma.kotItem.updateMany({
    where: { id: { in: moving.map((m) => m.id) } },
    data: { kotId: newKot.id },
  });
  revalidatePath("/kot");
  return newKot.id;
}

/** Move KOT items to another KOT on the same order */
export async function moveKotItems(fromKotId: string, toKotId: string, kotItemIds: string[]) {
  const session = await requirePermission("kot");
  if (fromKotId === toKotId) throw new Error("Same KOT");
  if (!kotItemIds.length) throw new Error("Select items");
  const [from, to] = await Promise.all([
    prisma.kot.findFirst({
      where: { id: fromKotId, order: { outletId: session.user.outletId } },
    }),
    prisma.kot.findFirst({
      where: { id: toKotId, order: { outletId: session.user.outletId } },
    }),
  ]);
  if (!from || !to) throw new Error("KOT not found");
  if (from.orderId !== to.orderId) throw new Error("KOTs must be on the same order");

  await prisma.kotItem.updateMany({
    where: { id: { in: kotItemIds }, kotId: from.id },
    data: { kotId: to.id },
  });
  const remaining = await prisma.kotItem.count({ where: { kotId: from.id } });
  if (remaining === 0) {
    await prisma.kot.update({ where: { id: from.id }, data: { status: "CANCELLED" } });
  }
  revalidatePath("/kot");
}

export async function markKotReady(kotId: string) {
  await requirePermission("kot");
  await prisma.kot.update({ where: { id: kotId }, data: { status: "READY" } });
  await prisma.kotItem.updateMany({
    where: { kotId, status: { in: ["PENDING", "DELAYED"] } },
    data: { status: "PREPARING" },
  });
  revalidatePath("/kot");
}

export async function markKotServed(kotId: string) {
  await requirePermission("kot");
  await prisma.kot.update({ where: { id: kotId }, data: { status: "SERVED" } });
  await prisma.kotItem.updateMany({
    where: { kotId, status: { notIn: ["CANCELLED", "VOIDED"] } },
    data: { status: "SERVED" },
  });
  revalidatePath("/kot");
}
