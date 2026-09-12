"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission, requireSession } from "@/lib/session";
import { calculateBill, roundMoney } from "@/lib/tax";
import type { OrderSource, OrderType, PaymentMethod } from "@prisma/client";

async function recomputeOrderTotals(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, outlet: true },
  });
  if (!order) return null;

  const itemsSubtotal = order.items
    .filter((i) => !i.voided)
    .reduce((sum, i) => sum + i.lineTotal, 0);

  const bill = calculateBill({
    subtotal: itemsSubtotal,
    discountAmount: order.discountAmount,
    discountPercent: order.discountPercent,
    cgstPercent: order.outlet.cgstPercent,
    sgstPercent: order.outlet.sgstPercent,
  });

  const serviceCharge =
    (order.outlet.serviceChargePercent ?? 0) > 0
      ? roundMoney((bill.taxable * order.outlet.serviceChargePercent) / 100)
      : order.serviceCharge;
  const charges = roundMoney(
    order.packingCharge +
      order.deliveryCharge +
      order.containerCharge +
      serviceCharge
  );
  const taxableWithCharges = roundMoney(bill.taxable + charges);
  const cgstAmount = roundMoney((taxableWithCharges * order.outlet.cgstPercent) / 100);
  const sgstAmount = roundMoney((taxableWithCharges * order.outlet.sgstPercent) / 100);
  const beforeRound = roundMoney(taxableWithCharges + cgstAmount + sgstAmount);
  const roundedTotal = Math.round(beforeRound);
  const roundOff = roundMoney(roundedTotal - beforeRound);

  return prisma.order.update({
    where: { id: orderId },
    data: {
      subtotal: bill.subtotal,
      discountAmount: bill.discountAmount,
      serviceCharge,
      roundOff,
      cgstAmount,
      sgstAmount,
      total: roundedTotal,
    },
  });
}

export async function openTableOrder(tableId: string, guestCount?: number) {
  const session = await requirePermission("tables");
  const table = await prisma.diningTable.findFirst({
    where: { id: tableId, outletId: session.user.outletId },
  });
  if (!table) throw new Error("Table not found");

  // Resume OPEN or HOLD on this table (avoid creating a second seat)
  const existing = await prisma.order.findFirst({
    where: {
      tableId,
      status: { in: ["OPEN", "HOLD"] },
      outletId: session.user.outletId,
    },
    include: { items: { where: { voided: false }, select: { id: true } } },
    orderBy: { updatedAt: "desc" },
  });
  if (existing) {
    if (existing.status === "HOLD") {
      await prisma.order.update({
        where: { id: existing.id },
        data: { status: "OPEN" },
      });
    }
    // Resume existing seating; restore stage from order activity
    if (existing.items.length > 0) {
      const hasKot = await prisma.kot.count({ where: { orderId: existing.id } });
      const nextStatus = existing.billPrintedAt
        ? "PRINTED"
        : hasKot > 0
          ? "RUNNING"
          : "OCCUPIED";
      if (table.status !== nextStatus && table.status !== "RESERVED") {
        await prisma.diningTable.update({
          where: { id: tableId },
          data: { status: nextStatus },
        });
      }
    }
    if (guestCount && guestCount !== existing.guestCount) {
      await prisma.order.update({
        where: { id: existing.id },
        data: { guestCount: Math.max(1, guestCount) },
      });
    }
    revalidatePath("/hold-orders");
    return existing.id;
  }

  const seats = Math.max(1, guestCount ?? table.capacity);
  const count = await prisma.order.count({ where: { outletId: session.user.outletId } });
  const order = await prisma.order.create({
    data: {
      orderNumber: `O-${String(count + 1).padStart(4, "0")}`,
      type: "DINE_IN",
      guestCount: seats,
      outletId: session.user.outletId,
      tableId,
      createdById: session.user.id,
    },
  });

  // Stay Available until the first menu item is added
  await prisma.diningTable.update({
    where: { id: tableId },
    data: { status: "FREE" },
  });

  revalidatePath("/tables");
  revalidatePath("/pos");
  revalidatePath("/orders");
  return order.id;
}

export async function updateGuestCount(orderId: string, guestCount: number) {
  const session = await requirePermission("pos");
  const order = await prisma.order.findFirst({
    where: { id: orderId, outletId: session.user.outletId, status: "OPEN" },
  });
  if (!order) throw new Error("Order not found");
  await prisma.order.update({
    where: { id: orderId },
    data: { guestCount: Math.max(1, guestCount) },
  });
  revalidatePath(`/pos/${orderId}`);
  revalidatePath("/tables");
}

export async function cancelEmptyTableOrder(orderId: string) {
  const session = await requirePermission("pos");
  const order = await prisma.order.findFirst({
    where: { id: orderId, outletId: session.user.outletId, status: "OPEN", type: "DINE_IN" },
    include: { items: { where: { voided: false } } },
  });
  if (!order) throw new Error("Order not found");
  if (order.items.length > 0) throw new Error("Order has items — void or settle instead");

  await prisma.order.delete({ where: { id: order.id } });
  if (order.tableId) await releaseTable(order.tableId);

  revalidatePath("/tables");
  revalidatePath("/pos");
  revalidatePath("/orders");
}

export async function createChannelOrder(input: {
  type: "PARCEL" | "DELIVERY";
  source?: OrderSource;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  onlinePlatform?: string;
  packingCharge?: number;
  deliveryCharge?: number;
}) {
  const session = await requirePermission("pos");
  const outlet = await prisma.outlet.findUniqueOrThrow({
    where: { id: session.user.outletId },
  });
  const count = await prisma.order.count({ where: { outletId: session.user.outletId } });
  const prefix = input.type === "DELIVERY" ? "D" : "P";

  const packingCharge =
    input.packingCharge ??
    (input.type === "PARCEL" || input.type === "DELIVERY" ? outlet.packingChargeDefault : 0);
  const deliveryCharge =
    input.deliveryCharge ?? (input.type === "DELIVERY" ? outlet.deliveryChargeDefault : 0);

  const order = await prisma.order.create({
    data: {
      orderNumber: `${prefix}-${String(count + 1).padStart(4, "0")}`,
      type: input.type,
      source: input.source ?? (input.onlinePlatform ? "ONLINE" : "WALK_IN"),
      customerName: input.customerName || (input.type === "DELIVERY" ? "Delivery guest" : "Parcel guest"),
      customerPhone: input.customerPhone,
      customerAddress: input.type === "DELIVERY" ? input.customerAddress || null : null,
      onlinePlatform: input.onlinePlatform || null,
      packingCharge,
      deliveryCharge: input.type === "DELIVERY" ? deliveryCharge : 0,
      deliveryStatus: input.type === "DELIVERY" ? "PENDING" : undefined,
      outletId: session.user.outletId,
      createdById: session.user.id,
    },
  });

  if (input.type === "DELIVERY") {
    revalidatePath("/delivery");
  }
  await recomputeOrderTotals(order.id);
  revalidatePath("/pos");
  revalidatePath("/tables");
  revalidatePath("/orders");
  return order.id;
}

/** @deprecated use createChannelOrder — kept for compatibility */
export async function createTakeawayOrder(customerName?: string, customerPhone?: string) {
  return createChannelOrder({
    type: "PARCEL",
    source: "WALK_IN",
    customerName: customerName || "Parcel guest",
    customerPhone,
  });
}

export async function updateOrderDetails(input: {
  orderId: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  notes?: string;
  packingCharge?: number;
  deliveryCharge?: number;
  serviceCharge?: number;
  containerCharge?: number;
  source?: OrderSource;
  onlinePlatform?: string;
}) {
  const session = await requirePermission("pos");
  const order = await prisma.order.findFirst({
    where: { id: input.orderId, outletId: session.user.outletId, status: "OPEN" },
  });
  if (!order) throw new Error("Order not found");

  await prisma.order.update({
    where: { id: order.id },
    data: {
      customerName: input.customerName ?? order.customerName,
      customerPhone: input.customerPhone ?? order.customerPhone,
      customerAddress:
        order.type === "DELIVERY"
          ? (input.customerAddress ?? order.customerAddress)
          : order.customerAddress,
      notes: input.notes ?? order.notes,
      packingCharge: input.packingCharge ?? order.packingCharge,
      deliveryCharge:
        order.type === "DELIVERY"
          ? (input.deliveryCharge ?? order.deliveryCharge)
          : order.deliveryCharge,
      serviceCharge: input.serviceCharge ?? order.serviceCharge,
      containerCharge: input.containerCharge ?? order.containerCharge,
      source: input.source ?? order.source,
      onlinePlatform: input.onlinePlatform ?? order.onlinePlatform,
    },
  });
  await recomputeOrderTotals(order.id);
  revalidatePath(`/pos/${order.id}`);
  revalidatePath("/orders");
  revalidatePath(`/bill/${order.id}`);
}

export async function addOrderItem(input: {
  orderId: string;
  menuItemId: string;
  quantity: number;
  variantId?: string;
  addonIds?: string[];
  notes?: string;
}) {
  const session = await requirePermission("pos");
  const order = await prisma.order.findFirst({
    where: { id: input.orderId, outletId: session.user.outletId, status: "OPEN" },
  });
  if (!order) throw new Error("Order not found or closed");

  const menuItem = await prisma.menuItem.findUnique({
    where: { id: input.menuItemId },
    include: { variants: true, addons: true },
  });
  if (!menuItem || !menuItem.available) throw new Error("Item unavailable");

  const variant = input.variantId
    ? menuItem.variants.find((v) => v.id === input.variantId)
    : undefined;
  const addons = menuItem.addons.filter((a) => (input.addonIds ?? []).includes(a.id));
  const unitPrice =
    menuItem.price + (variant?.priceDelta ?? 0) + addons.reduce((s, a) => s + a.price, 0);
  const qty = Math.max(1, input.quantity);
  const lineTotal = unitPrice * qty;

  await prisma.orderItem.create({
    data: {
      orderId: order.id,
      menuItemId: menuItem.id,
      name: menuItem.name,
      quantity: qty,
      unitPrice,
      lineTotal,
      notes: input.notes,
      isVeg: menuItem.isVeg,
      variantName: variant?.name,
      addonNames: addons.length ? addons.map((a) => a.name).join(", ") : null,
    },
  });

  // First item → Occupied (red)
  if (order.tableId) {
    await prisma.diningTable.update({
      where: { id: order.tableId },
      data: { status: "OCCUPIED" },
    });
    if (!order.occupiedAt) {
      await prisma.order.update({
        where: { id: order.id },
        data: { occupiedAt: new Date() },
      });
    }
  }

  await recomputeOrderTotals(order.id);
  revalidatePath("/pos");
  revalidatePath(`/pos/${order.id}`);
  revalidatePath("/tables");
  revalidatePath("/orders");
}

export async function updateItemQuantity(orderItemId: string, quantity: number) {
  await requirePermission("pos");
  const item = await prisma.orderItem.findUnique({ where: { id: orderItemId } });
  if (!item || item.voided || item.kotSent) throw new Error("Cannot update item");
  const qty = Math.max(1, quantity);
  await prisma.orderItem.update({
    where: { id: orderItemId },
    data: { quantity: qty, lineTotal: item.unitPrice * qty },
  });
  await recomputeOrderTotals(item.orderId);
  revalidatePath("/pos");
  revalidatePath(`/pos/${item.orderId}`);
}

export async function removeUnsentItem(orderItemId: string) {
  await requirePermission("pos");
  const item = await prisma.orderItem.findUnique({
    where: { id: orderItemId },
    include: { order: true },
  });
  if (!item || item.kotSent) throw new Error("Cannot remove sent item");
  await prisma.orderItem.delete({ where: { id: orderItemId } });
  await recomputeOrderTotals(item.orderId);

  const remaining = await prisma.orderItem.count({
    where: { orderId: item.orderId, voided: false },
  });
  if (remaining === 0 && item.order.tableId) {
    await releaseTable(item.order.tableId);
  }

  revalidatePath("/pos");
  revalidatePath(`/pos/${item.orderId}`);
  revalidatePath("/tables");
}

/** Touch parent KOT(s) so the kitchen board picks up a cancel print in real time */
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

/** Free the table once an order has no billable items left */
async function releaseTableIfOrderEmpty(orderId: string, tableId: string | null) {
  if (!tableId) return;
  const remaining = await prisma.orderItem.count({
    where: { orderId, voided: false },
  });
  if (remaining === 0) await releaseTable(tableId);
}

/**
 * Cancel a punched item from POS. Unsent lines are removed outright; lines already
 * on a KOT are struck off with a reason so the kitchen gets a cancel slip.
 * Pass `quantity` to cancel part of a line.
 */
export async function cancelOrderItem(
  orderItemId: string,
  reason: string,
  quantity?: number
) {
  const session = await requirePermission("pos");
  const item = await prisma.orderItem.findFirst({
    where: { id: orderItemId, order: { outletId: session.user.outletId } },
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
        // Separate struck-off line keeps the cancelled quantity visible to the kitchen
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
  await prisma.auditLog.create({
    data: {
      action: "CANCEL_ITEM",
      entity: "OrderItem",
      entityId: orderItemId,
      details: `${cancelQty}x ${item.name} — ${note}`,
      outletId: session.user.outletId,
      userId: session.user.id,
    },
  });
  await recomputeOrderTotals(item.orderId);
  await releaseTableIfOrderEmpty(item.orderId, item.order.tableId);

  revalidatePath("/pos");
  revalidatePath(`/pos/${item.orderId}`);
  revalidatePath("/kot");
  revalidatePath("/tables");
  revalidatePath("/orders");
}

/** Permanently drop a single line (including cancelled ones) from an open order. */
export async function deleteOrderItem(orderItemId: string) {
  const session = await requirePermission("void");
  const item = await prisma.orderItem.findFirst({
    where: { id: orderItemId, order: { outletId: session.user.outletId } },
    include: {
      order: { select: { id: true, status: true, tableId: true } },
      kotItems: { select: { kotId: true } },
    },
  });
  if (!item) throw new Error("Item not found");
  if (!["OPEN", "HOLD"].includes(item.order.status)) throw new Error("Order is closed");

  const kotIds = item.kotItems.map((k) => k.kotId);
  await prisma.orderItem.delete({ where: { id: item.id } });
  await refreshKotsAfterItemChange(kotIds);

  await prisma.auditLog.create({
    data: {
      action: "DELETE_ITEM",
      entity: "OrderItem",
      entityId: orderItemId,
      details: `Deleted ${item.quantity}x ${item.name}`,
      outletId: session.user.outletId,
      userId: session.user.id,
    },
  });
  await recomputeOrderTotals(item.orderId);
  await releaseTableIfOrderEmpty(item.orderId, item.order.tableId);

  revalidatePath("/pos");
  revalidatePath(`/pos/${item.orderId}`);
  revalidatePath("/kot");
  revalidatePath("/tables");
  revalidatePath("/orders");
}

export async function voidOrderItem(orderItemId: string, reason: string) {
  const session = await requirePermission("void");
  const item = await prisma.orderItem.findUnique({
    where: { id: orderItemId },
    include: { kotItems: { select: { id: true, kotId: true } } },
  });
  if (!item) throw new Error("Item not found");

  await prisma.orderItem.update({
    where: { id: orderItemId },
    data: { voided: true, voidReason: reason || "Voided" },
  });
  await prisma.kotItem.updateMany({
    where: { orderItemId },
    data: { status: "VOIDED" },
  });

  await refreshKotsAfterItemChange(item.kotItems.map((k) => k.kotId));

  await prisma.auditLog.create({
    data: {
      action: "VOID_ITEM",
      entity: "OrderItem",
      entityId: orderItemId,
      details: reason,
      outletId: session.user.outletId,
      userId: session.user.id,
    },
  });
  await recomputeOrderTotals(item.orderId);
  revalidatePath("/pos");
  revalidatePath(`/pos/${item.orderId}`);
  revalidatePath("/kot");
  revalidatePath("/tables");
}

export async function sendKot(orderId: string) {
  const session = await requirePermission("kot");
  const order = await prisma.order.findFirst({
    where: { id: orderId, outletId: session.user.outletId, status: "OPEN" },
    include: {
      items: {
        where: { kotSent: false, voided: false },
        include: { menuItem: true },
      },
      kots: { orderBy: { createdAt: "asc" } },
      table: true,
    },
  });
  if (!order) throw new Error("Order not found");
  if (!order.items.length) throw new Error("No new items to send");

  // One KOT per table/order — append new items to the open ticket (do not split by station)
  const openKot = order.kots.find((k) =>
    ["PENDING", "PREPARING", "READY", "DELAYED"].includes(k.status)
  );

  const itemCreates = order.items.map((i) => ({
    quantity: i.quantity,
    name: [i.name, i.variantName, i.addonNames].filter(Boolean).join(" · "),
    notes: i.notes,
    orderItemId: i.id,
  }));

  if (openKot) {
    await prisma.kotItem.createMany({
      data: itemCreates.map((row) => ({ ...row, kotId: openKot.id })),
    });
    await prisma.kot.update({
      where: { id: openKot.id },
      data: {
        status: openKot.status === "READY" ? "PENDING" : openKot.status,
        updatedAt: new Date(),
        station: "Kitchen",
      },
    });
  } else {
    const kotNumber = order.kots.length > 0 ? Math.max(...order.kots.map((k) => k.kotNumber)) + 1 : 1;
    await prisma.kot.create({
      data: {
        kotNumber,
        station: "Kitchen",
        orderId: order.id,
        createdById: session.user.id,
        items: { create: itemCreates },
      },
    });
  }

  await prisma.orderItem.updateMany({
    where: { id: { in: order.items.map((i) => i.id) } },
    data: { kotSent: true },
  });

  // KOT sent → Running (green)
  if (order.tableId) {
    await prisma.diningTable.update({
      where: { id: order.tableId },
      data: { status: "RUNNING" },
    });
  }

  revalidatePath("/kot");
  revalidatePath("/pos");
  revalidatePath(`/pos/${orderId}`);
  revalidatePath("/tables");
  return true;
}

/** Bill printed → Printed (yellow) */
export async function markBillPrinted(orderId: string) {
  const session = await requirePermission("pos");
  const order = await prisma.order.findFirst({
    where: { id: orderId, outletId: session.user.outletId },
  });
  if (!order) throw new Error("Order not found");

  await prisma.order.update({
    where: { id: orderId },
    data: { billPrintedAt: new Date() },
  });

  if (order.tableId && order.status === "OPEN") {
    await prisma.diningTable.update({
      where: { id: order.tableId },
      data: { status: "PRINTED" },
    });
  }

  revalidatePath("/tables");
  revalidatePath(`/bill/${orderId}`);
  revalidatePath(`/pos/${orderId}`);
}

/** Reserve vacant table → Reserved (blue) */
export async function reserveTable(tableId: string, note?: string) {
  const session = await requirePermission("tables");
  const table = await prisma.diningTable.findFirst({
    where: { id: tableId, outletId: session.user.outletId },
  });
  if (!table) throw new Error("Table not found");

  const open = await prisma.order.findFirst({
    where: { tableId, status: "OPEN", items: { some: { voided: false } } },
  });
  if (open) throw new Error("Table has an active order");

  await prisma.diningTable.update({
    where: { id: tableId },
    data: { status: "RESERVED" },
  });

  if (note) {
    await prisma.auditLog.create({
      data: {
        action: "RESERVE_TABLE",
        entity: "DiningTable",
        entityId: tableId,
        details: note,
        outletId: session.user.outletId,
        userId: session.user.id,
      },
    });
  }

  revalidatePath("/tables");
}

export async function unreserveTable(tableId: string) {
  await requirePermission("tables");
  const session = await requireSession();
  const table = await prisma.diningTable.findFirst({
    where: { id: tableId, outletId: session.user.outletId, status: "RESERVED" },
  });
  if (!table) throw new Error("Table is not reserved");
  await releaseTable(tableId);
  revalidatePath("/tables");
}

export async function updateKotItemStatus(
  kotItemId: string,
  status: "PENDING" | "PREPARING" | "SERVED" | "VOIDED" | "DELAYED" | "CANCELLED"
) {
  await requirePermission("kot");
  const kotItem = await prisma.kotItem.update({
    where: { id: kotItemId },
    data: { status },
    include: { kot: { include: { items: true } } },
  });

  const items = kotItem.kot.items;
  let kotStatus: "PENDING" | "PREPARING" | "READY" | "SERVED" | "DELAYED" | "CANCELLED" =
    "PENDING";
  if (items.every((i) => i.status === "CANCELLED" || i.status === "VOIDED"))
    kotStatus = "CANCELLED";
  else if (items.every((i) => ["SERVED", "VOIDED", "CANCELLED"].includes(i.status)))
    kotStatus = "SERVED";
  else if (items.some((i) => i.status === "DELAYED")) kotStatus = "DELAYED";
  else if (items.some((i) => i.status === "PREPARING" || i.status === "SERVED"))
    kotStatus = "PREPARING";
  else if (items.every((i) => i.status === "PENDING")) kotStatus = "PENDING";

  await prisma.kot.update({ where: { id: kotItem.kotId }, data: { status: kotStatus } });
  revalidatePath("/kot");
}

export async function applyDiscount(orderId: string, percent: number, reason?: string) {
  const session = await requirePermission("discount");
  const order = await prisma.order.findFirst({
    where: { id: orderId, outletId: session.user.outletId, status: "OPEN" },
  });
  if (!order) throw new Error("Order not found");
  await prisma.order.update({
    where: { id: orderId },
    data: {
      discountPercent: Math.min(100, Math.max(0, percent)),
      discountAmount: 0,
      discountReason: reason || null,
    },
  });
  await recomputeOrderTotals(orderId);
  revalidatePath(`/pos/${orderId}`);
}

export async function addPayment(input: {
  orderId: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
}) {
  const session = await requirePermission("pos");
  const order = await prisma.order.findFirst({
    where: { id: input.orderId, outletId: session.user.outletId, status: "OPEN" },
    include: { payments: true, table: true, items: { where: { voided: false } } },
  });
  if (!order) throw new Error("Order not found");

  const amount = Math.round(input.amount * 100) / 100;
  if (amount <= 0) throw new Error("Invalid amount");

  const due = Math.max(0, Math.round((order.total - order.paidAmount) * 100) / 100);
  const payAmount = Math.min(amount, due > 0 ? due : amount);

  await prisma.payment.create({
    data: {
      orderId: order.id,
      amount: payAmount,
      method: input.method,
      reference: input.reference,
      takenById: session.user.id,
    },
  });

  if (input.method === "CASH") {
    await prisma.cashEntry.create({
      data: {
        type: "SALE_CASH",
        amount: payAmount,
        note: `Sale ${order.orderNumber}`,
        outletId: session.user.outletId,
        userId: session.user.id,
      },
    });
  }

  const paidAmount = order.paidAmount + payAmount;
  const settled = paidAmount >= order.total - 0.01;

  await prisma.order.update({
    where: { id: order.id },
    data: {
      paidAmount,
      status: settled ? "SETTLED" : "OPEN",
      settledAt: settled ? new Date() : null,
    },
  });

  if (settled) {
    // Decrement menu stock for sold items
    for (const item of order.items) {
      if (!item.menuItemId) continue;
      await prisma.menuItem.update({
        where: { id: item.menuItemId },
        data: { stock: { decrement: item.quantity } },
      });
    }
    if (order.tableId) {
      await releaseTable(order.tableId);
    }
  }

  revalidatePath("/pos");
  revalidatePath(`/pos/${order.id}`);
  revalidatePath("/tables");
  revalidatePath("/orders");
  revalidatePath("/reports");
  revalidatePath("/cash");
  revalidatePath("/inventory");
  revalidatePath(`/bill/${order.id}`);
  return settled;
}

/** Mark table available after billing/void — clears merge link too */
export async function releaseTable(tableId: string) {
  await prisma.diningTable.update({
    where: { id: tableId },
    data: { status: "FREE", mergedInto: null },
  });
}

/** Heal tables that should be Vacant (no open/hold order with items). Keep RESERVED. */
export async function syncAvailableTables(outletId: string) {
  const stuck = await prisma.diningTable.findMany({
    where: {
      outletId,
      status: { notIn: ["FREE", "RESERVED"] },
      OR: [
        { orders: { none: { status: { in: ["OPEN", "HOLD"] } } } },
        {
          orders: {
            every: {
              OR: [
                { status: { notIn: ["OPEN", "HOLD"] } },
                { items: { none: { voided: false } } },
              ],
            },
          },
        },
      ],
    },
    select: { id: true },
  });

  if (stuck.length) {
    await prisma.diningTable.updateMany({
      where: { id: { in: stuck.map((t) => t.id) } },
      data: { status: "FREE", mergedInto: null },
    });
  }

  return stuck.length;
}

export async function voidOrder(orderId: string, reason: string) {
  const session = await requirePermission("void");
  const order = await prisma.order.findFirst({
    where: { id: orderId, outletId: session.user.outletId, status: "OPEN" },
  });
  if (!order) throw new Error("Order not found");
  await prisma.order.update({
    where: { id: orderId },
    data: { status: "VOIDED", voidReason: reason || "Voided" },
  });
  if (order.tableId) {
    await releaseTable(order.tableId);
  }
  await prisma.auditLog.create({
    data: {
      action: "VOID_ORDER",
      entity: "Order",
      entityId: orderId,
      details: reason,
      outletId: session.user.outletId,
      userId: session.user.id,
    },
  });
  revalidatePath("/tables");
  revalidatePath("/orders");
  revalidatePath("/pos");
  revalidatePath("/reports");
}

/** Permanently delete any sales order (all statuses). */
export async function deleteOrderPermanently(orderId: string) {
  const session = await requirePermission("void");
  const outletId = session.user.outletId;
  const order = await prisma.order.findFirst({
    where: { id: orderId, outletId },
  });
  if (!order) throw new Error("Order not found");

  const tableId = order.tableId;
  const orderNumber = order.orderNumber;

  await prisma.order.delete({ where: { id: order.id } });
  await prisma.auditLog.deleteMany({
    where: { outletId, entity: "Order", entityId: orderId },
  });

  if (tableId) {
    const stillOpen = await prisma.order.findFirst({
      where: { tableId, status: { in: ["OPEN", "HOLD"] } },
      select: { id: true },
    });
    if (!stillOpen) await releaseTable(tableId);
  }

  await prisma.auditLog.create({
    data: {
      action: "ORDER_DELETE",
      entity: "Order",
      entityId: orderId,
      details: `Deleted ${orderNumber}`,
      outletId,
      userId: session.user.id,
    },
  });

  revalidatePath("/orders");
  revalidatePath("/pos");
  revalidatePath("/tables");
  revalidatePath("/reports");
  revalidatePath("/bill");
  revalidatePath("/kot");
  revalidatePath("/delivery");
  revalidatePath("/cash");
  revalidatePath("/alerts");
}

/** Permanently delete several orders in one go (order history select-all). */
export async function deleteOrdersPermanently(orderIds: string[]) {
  const session = await requirePermission("void");
  const unique = [...new Set(orderIds.map((id) => id.trim()).filter(Boolean))].slice(0, 200);
  if (!unique.length) throw new Error("No orders selected");

  const orders = await prisma.order.findMany({
    where: { id: { in: unique }, outletId: session.user.outletId },
    select: { id: true, orderNumber: true, tableId: true },
  });
  if (!orders.length) throw new Error("No matching orders");

  const ids = orders.map((o) => o.id);
  const tableIds = [...new Set(orders.map((o) => o.tableId).filter((id): id is string => !!id))];

  await prisma.order.deleteMany({ where: { id: { in: ids } } });
  await prisma.auditLog.deleteMany({
    where: { outletId: session.user.outletId, entity: "Order", entityId: { in: ids } },
  });
  await prisma.auditLog.create({
    data: {
      action: "ORDER_DELETE_BULK",
      entity: "Order",
      entityId: ids[0],
      details: `Deleted ${orders.length} order(s): ${orders.map((o) => o.orderNumber).join(", ")}`,
      outletId: session.user.outletId,
      userId: session.user.id,
    },
  });

  for (const tableId of tableIds) {
    const stillOpen = await prisma.order.findFirst({
      where: { tableId, status: { in: ["OPEN", "HOLD"] } },
      select: { id: true },
    });
    if (!stillOpen) await releaseTable(tableId);
  }

  revalidatePath("/orders");
  revalidatePath("/pos");
  revalidatePath("/tables");
  revalidatePath("/reports");
  revalidatePath("/bill");
  revalidatePath("/kot");
  revalidatePath("/delivery");
  revalidatePath("/cash");
  revalidatePath("/alerts");
}

export async function mergeTables(sourceTableId: string, targetTableId: string) {
  await requirePermission("tables");
  if (sourceTableId === targetTableId) throw new Error("Same table");
  const session = await requireSession();

  const [sourceOrder, targetOrder] = await Promise.all([
    prisma.order.findFirst({
      where: { tableId: sourceTableId, status: "OPEN", outletId: session.user.outletId },
      include: { items: true },
    }),
    prisma.order.findFirst({
      where: { tableId: targetTableId, status: "OPEN", outletId: session.user.outletId },
    }),
  ]);

  if (!sourceOrder) throw new Error("Source table has no open order");
  if (!targetOrder) throw new Error("Target table has no open order");

  await prisma.orderItem.updateMany({
    where: { orderId: sourceOrder.id },
    data: { orderId: targetOrder.id },
  });
  await prisma.kot.updateMany({
    where: { orderId: sourceOrder.id },
    data: { orderId: targetOrder.id },
  });
  await prisma.order.update({
    where: { id: sourceOrder.id },
    data: { status: "CANCELLED", voidReason: "Merged into another table" },
  });
  await prisma.diningTable.update({
    where: { id: sourceTableId },
    data: { status: "FREE", mergedInto: targetTableId },
  });
  await recomputeOrderTotals(targetOrder.id);
  revalidatePath("/tables");
  revalidatePath("/pos");
  return targetOrder.id;
}

function dayBounds(d = new Date()) {
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

async function loadDayCloseCandidateOrders(outletId: string) {
  const { start, end } = dayBounds();
  const orders = await prisma.order.findMany({
    where: {
      outletId,
      OR: [
        { settledAt: { gte: start, lte: end }, status: "SETTLED" },
        {
          updatedAt: { gte: start, lte: end },
          status: { in: ["VOIDED", "CANCELLED", "REFUNDED", "SETTLED"] },
        },
      ],
    },
    include: { payments: true, table: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });
  const byId = new Map(orders.map((o) => [o.id, o]));
  return { start, orders: [...byId.values()] };
}

function summarizeDayCloseOrders(
  orders: Awaited<ReturnType<typeof loadDayCloseCandidateOrders>>["orders"]
) {
  const voids = orders.filter((o) => o.status === "VOIDED").length;
  const settled = orders.filter((o) => o.status === "SETTLED");
  let cashTotal = 0;
  let upiTotal = 0;
  let cardTotal = 0;
  let discountTotal = 0;
  let totalSales = 0;
  for (const o of settled) {
    totalSales += o.total;
    discountTotal += o.discountAmount;
    for (const p of o.payments) {
      if (p.method === "CASH") cashTotal += p.amount;
      if (p.method === "UPI") upiTotal += p.amount;
      if (p.method === "CARD") cardTotal += p.amount;
    }
  }
  return {
    totalSales,
    cashTotal,
    upiTotal,
    cardTotal,
    discountTotal,
    orderCount: settled.length,
    voidCount: voids,
  };
}

export type DayClosePreviewOrder = {
  id: string;
  orderNumber: string;
  status: string;
  type: string;
  total: number;
  cash: number;
  upi: number;
  card: number;
  discountAmount: number;
  tableName: string | null;
  createdAt: string;
};

export async function getDayClosePreview() {
  const session = await requirePermission("day_close");
  const outletId = session.user.outletId;

  const openCount = await prisma.order.count({
    where: { outletId, status: { in: ["OPEN", "HOLD"] } },
  });

  const outlet = await prisma.outlet.findUnique({
    where: { id: outletId },
    select: { name: true, reportEmail: true },
  });

  const { start, orders } = await loadDayCloseCandidateOrders(outletId);
  const totals = summarizeDayCloseOrders(orders);

  const previewOrders: DayClosePreviewOrder[] = orders.map((o) => {
    let cash = 0;
    let upi = 0;
    let card = 0;
    for (const p of o.payments) {
      if (p.method === "CASH") cash += p.amount;
      if (p.method === "UPI") upi += p.amount;
      if (p.method === "CARD") card += p.amount;
    }
    return {
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      type: o.type,
      total: o.total,
      cash,
      upi,
      card,
      discountAmount: o.discountAmount,
      tableName: o.table?.name ?? null,
      createdAt: o.createdAt.toISOString(),
    };
  });

  return {
    openCount,
    businessDate: start.toLocaleDateString("en-IN"),
    outletName: outlet?.name || "Outlet",
    reportEmail: outlet?.reportEmail || process.env.REPORT_EMAIL || "",
    totals,
    orders: previewOrders,
  };
}

export type DayCloseInput = {
  includeOrderIds: string[];
  totalSales: number;
  cashTotal: number;
  upiTotal: number;
  cardTotal: number;
  orderCount: number;
  voidCount: number;
  discountTotal: number;
  dineInSales?: number;
  parcelSales?: number;
  deliverySales?: number;
  notes?: string;
  toEmail?: string;
};

export async function dayClose(input: DayCloseInput) {
  const session = await requirePermission("day_close");
  const outletId = session.user.outletId;
  const { start } = dayBounds();

  const openCount = await prisma.order.count({
    where: { outletId, status: { in: ["OPEN", "HOLD"] } },
  });
  if (openCount > 0) {
    throw new Error(
      `Cannot day-close: ${openCount} open/hold order(s) still active. Settle, void, or cancel them first.`
    );
  }

  const { orders: candidates } = await loadDayCloseCandidateOrders(outletId);
  const candidateIds = new Set(candidates.map((o) => o.id));
  // Empty includeOrderIds = clear all finished candidates for today
  const includeOrderIds =
    input.includeOrderIds.length === 0
      ? [...candidateIds]
      : [...new Set(input.includeOrderIds)].filter((id) => candidateIds.has(id));

  const included = candidates.filter((o) => includeOrderIds.includes(o.id));
  const computed = summarizeDayCloseOrders(included);

  // Prefer modal edits when sent; otherwise use DB totals (same math as Reports)
  const hasEdits =
    input.totalSales != null ||
    input.cashTotal != null ||
    input.upiTotal != null ||
    input.cardTotal != null;

  const totalSales = roundMoney(
    hasEdits && Number.isFinite(Number(input.totalSales))
      ? Number(input.totalSales)
      : computed.totalSales
  );
  const cashTotal = roundMoney(
    hasEdits && Number.isFinite(Number(input.cashTotal)) ? Number(input.cashTotal) : computed.cashTotal
  );
  const upiTotal = roundMoney(
    hasEdits && Number.isFinite(Number(input.upiTotal)) ? Number(input.upiTotal) : computed.upiTotal
  );
  const cardTotal = roundMoney(
    hasEdits && Number.isFinite(Number(input.cardTotal)) ? Number(input.cardTotal) : computed.cardTotal
  );
  const orderCount = Math.max(
    0,
    Math.floor(
      Number.isFinite(Number(input.orderCount)) ? Number(input.orderCount) : computed.orderCount
    )
  );
  const voidCount = Math.max(
    0,
    Math.floor(
      Number.isFinite(Number(input.voidCount)) ? Number(input.voidCount) : computed.voidCount
    )
  );
  const discountTotal = roundMoney(
    Number.isFinite(Number(input.discountTotal)) ? Number(input.discountTotal) : computed.discountTotal
  );

  let dineInSales = 0;
  let parcelSales = 0;
  let deliverySales = 0;
  for (const o of included.filter((x) => x.status === "SETTLED")) {
    if (o.type === "DINE_IN") dineInSales += o.total;
    if (o.type === "PARCEL") parcelSales += o.total;
    if (o.type === "DELIVERY") deliverySales += o.total;
  }
  dineInSales = roundMoney(
    input.dineInSales != null && Number.isFinite(Number(input.dineInSales))
      ? Number(input.dineInSales)
      : dineInSales
  );
  parcelSales = roundMoney(
    input.parcelSales != null && Number.isFinite(Number(input.parcelSales))
      ? Number(input.parcelSales)
      : parcelSales
  );
  deliverySales = roundMoney(
    input.deliverySales != null && Number.isFinite(Number(input.deliverySales))
      ? Number(input.deliverySales)
      : deliverySales
  );

  const close = await prisma.dayClose.create({
    data: {
      outletId,
      businessDate: start,
      totalSales,
      cashTotal,
      upiTotal,
      cardTotal,
      orderCount,
      voidCount,
      discountTotal,
      notes:
        input.notes?.trim() ||
        `Local day close · cleared ${includeOrderIds.length} finished order(s)`,
    },
  });

  const outlet = await prisma.outlet.findUnique({
    where: { id: outletId },
    select: { name: true, reportEmail: true },
  });

  const reportPayload = {
    outletName: outlet?.name || "Outlet",
    businessDate: start.toLocaleDateString("en-IN"),
    totalSales,
    orderCount,
    voidCount,
    discountTotal,
    cashTotal,
    upiTotal,
    cardTotal,
    dineInSales,
    parcelSales,
    deliverySales,
    toEmail: (input.toEmail?.trim() || outlet?.reportEmail || process.env.REPORT_EMAIL || "").trim(),
    notes: input.notes?.trim() || undefined,
  };

  let emailSent = false;
  let archivedPath: string | null = null;
  try {
    const { buildDayReportPdf, sendDailyReportEmail, archiveDayReportPdf } = await import(
      "@/lib/email"
    );
    const pdf = await buildDayReportPdf(reportPayload);
    try {
      archivedPath = await archiveDayReportPdf(reportPayload, pdf);
    } catch (e) {
      console.error("[dayClose] archive failed", e);
    }
    try {
      emailSent = await sendDailyReportEmail(reportPayload, pdf);
    } catch (e) {
      console.error("[dayClose] email failed", e);
    }
  } catch (e) {
    console.error("[dayClose] PDF failed", e);
  }

  if (includeOrderIds.length) {
    await prisma.order.deleteMany({
      where: { id: { in: includeOrderIds }, outletId },
    });
    await prisma.auditLog.deleteMany({
      where: {
        outletId,
        entity: "Order",
        entityId: { in: includeOrderIds },
      },
    });
  }

  await prisma.diningTable.updateMany({
    where: { outletId, status: { not: "RESERVED" } },
    data: { status: "FREE", mergedInto: null },
  });
  await prisma.deliveryBoy.updateMany({
    where: { outletId, dutyStatus: "ON_TRIP" },
    data: { dutyStatus: "AVAILABLE" },
  });

  await prisma.auditLog.create({
    data: {
      action: "DAY_CLOSE",
      entity: "DayClose",
      entityId: close.id,
      details: `sales=${totalSales}|orders=${orderCount}|cleared=${includeOrderIds.length}|archived=${archivedPath ? "1" : "0"}`,
      outletId,
      userId: session.user.id,
    },
  });

  revalidatePath("/reports");
  revalidatePath("/orders");
  revalidatePath("/pos");
  revalidatePath("/tables");
  revalidatePath("/kot");
  revalidatePath("/delivery");
  revalidatePath("/bill");
  revalidatePath("/alerts");
  revalidatePath("/cash");
  return {
    id: close.id,
    clearedOrders: includeOrderIds.length,
    totalSales,
    emailSent,
    archived: !!archivedPath,
  };
}

export async function setOrderType(orderId: string, type: OrderType) {
  await requirePermission("pos");
  await prisma.order.update({ where: { id: orderId }, data: { type } });
  revalidatePath(`/pos/${orderId}`);
}
