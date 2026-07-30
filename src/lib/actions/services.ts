"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission, requireSession } from "@/lib/session";
import { resolveOutletId } from "@/lib/outlet";
import { calculateBill, roundMoney } from "@/lib/tax";
import type { CashEntryType, CouponType, ReservationStatus } from "@prisma/client";

async function recomputeOrderTotals(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, outlet: true },
  });
  if (!order) return;

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
    order.packingCharge + order.deliveryCharge + order.containerCharge + serviceCharge
  );
  const taxableWithCharges = roundMoney(bill.taxable + charges);
  const cgstAmount = roundMoney((taxableWithCharges * order.outlet.cgstPercent) / 100);
  const sgstAmount = roundMoney((taxableWithCharges * order.outlet.sgstPercent) / 100);
  const beforeRound = roundMoney(taxableWithCharges + cgstAmount + sgstAmount);
  const roundedTotal = Math.round(beforeRound);
  const roundOff = roundMoney(roundedTotal - beforeRound);

  await prisma.order.update({
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

export async function createCustomer(input: {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  loyaltyPoints?: number;
  creditBalance?: number;
}) {
  const session = await requirePermission("pos");
  const outletId = await resolveOutletId(session);
  const phone = input.phone.trim();
  if (!input.name.trim() || !phone) throw new Error("Name and phone are required");

  await prisma.customer.create({
    data: {
      name: input.name.trim(),
      phone,
      email: input.email?.trim() || null,
      address: input.address?.trim() || null,
      notes: input.notes?.trim() || null,
      loyaltyPoints: input.loyaltyPoints ?? 0,
      creditBalance: input.creditBalance ?? 0,
      outletId,
    },
  });
  revalidatePath("/customers");
  revalidatePath("/due-payments");
  revalidatePath("/alerts");
}

export async function addCashEntry(input: {
  type: CashEntryType;
  amount: number;
  note?: string;
}) {
  const session = await requirePermission("pos");
  const outletId = await resolveOutletId(session);
  const amount = roundMoney(Math.abs(input.amount));
  if (amount <= 0) throw new Error("Amount must be greater than 0");

  await prisma.cashEntry.create({
    data: {
      type: input.type,
      amount,
      note: input.note?.trim() || null,
      outletId,
      userId: session.user.id,
    },
  });
  revalidatePath("/cash");
  revalidatePath("/currency-counter");
}

export async function addExpense(input: { category: string; amount: number; note?: string }) {
  const session = await requirePermission("pos");
  const outletId = await resolveOutletId(session);
  const amount = roundMoney(input.amount);
  if (!input.category.trim() || amount <= 0) throw new Error("Category and amount required");

  await prisma.expense.create({
    data: {
      category: input.category.trim(),
      amount,
      note: input.note?.trim() || null,
      outletId,
      userId: session.user.id,
    },
  });
  revalidatePath("/expenses");
}

export async function createReservation(input: {
  guestName: string;
  phone?: string;
  partySize: number;
  tableId?: string;
  reservedAt: string;
  notes?: string;
}) {
  const session = await requirePermission("tables");
  const outletId = await resolveOutletId(session);
  if (!input.guestName.trim()) throw new Error("Guest name required");

  await prisma.reservation.create({
    data: {
      guestName: input.guestName.trim(),
      phone: input.phone?.trim() || null,
      partySize: Math.max(1, input.partySize || 2),
      tableId: input.tableId || null,
      reservedAt: new Date(input.reservedAt),
      notes: input.notes?.trim() || null,
      outletId,
      status: "BOOKED",
    },
  });
  revalidatePath("/reservations");
}

export async function updateReservationStatus(id: string, status: ReservationStatus) {
  const session = await requirePermission("tables");
  const outletId = await resolveOutletId(session);
  await prisma.reservation.updateMany({
    where: { id, outletId },
    data: { status },
  });
  revalidatePath("/reservations");
}

export async function createCoupon(input: {
  code: string;
  type: CouponType;
  value: number;
  minOrder?: number;
  expiresAt?: string;
}) {
  const session = await requirePermission("discount");
  const outletId = await resolveOutletId(session);
  const code = input.code.trim().toUpperCase();
  if (!code || input.value <= 0) throw new Error("Valid code and value required");

  await prisma.coupon.create({
    data: {
      code,
      type: input.type,
      value: input.value,
      minOrder: input.minOrder ?? 0,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      active: true,
      outletId,
    },
  });
  revalidatePath("/coupons");
}

export async function toggleCoupon(id: string, active: boolean) {
  const session = await requirePermission("discount");
  const outletId = await resolveOutletId(session);
  await prisma.coupon.updateMany({ where: { id, outletId }, data: { active } });
  revalidatePath("/coupons");
}

export async function createDeliveryBoy(input: { name: string; phone: string }) {
  const { createDeliveryPartner } = await import("@/lib/actions/delivery");
  return createDeliveryPartner(input);
}

export async function toggleDeliveryBoy(id: string, active: boolean) {
  const { toggleDeliveryBoy: toggle } = await import("@/lib/actions/delivery");
  return toggle(id, active);
}

export async function createFeedback(input: {
  rating: number;
  comment?: string;
  customerName?: string;
  orderId?: string;
}) {
  const session = await requireSession();
  const outletId = await resolveOutletId(session);
  const rating = Math.min(5, Math.max(1, Math.round(input.rating)));

  await prisma.feedback.create({
    data: {
      rating,
      comment: input.comment?.trim() || null,
      customerName: input.customerName?.trim() || null,
      orderId: input.orderId || null,
      outletId,
    },
  });
  revalidatePath("/feedback");
}

export async function holdOrder(orderId: string) {
  const session = await requirePermission("pos");
  const outletId = await resolveOutletId(session);
  const order = await prisma.order.findFirst({
    where: { id: orderId, outletId, status: "OPEN" },
  });
  if (!order) throw new Error("Open order not found");

  await prisma.order.update({ where: { id: orderId }, data: { status: "HOLD" } });
  revalidatePath("/hold-orders");
  revalidatePath("/orders");
  revalidatePath("/tables");
  revalidatePath(`/pos/${orderId}`);
  revalidatePath("/pos");
}

export async function resumeHoldOrder(orderId: string) {
  const session = await requirePermission("pos");
  const outletId = await resolveOutletId(session);
  const order = await prisma.order.findFirst({
    where: { id: orderId, outletId, status: "HOLD" },
  });
  if (!order) throw new Error("Hold order not found");

  await prisma.order.update({ where: { id: orderId }, data: { status: "OPEN" } });
  if (order.tableId) {
    const hasKot = await prisma.kot.count({ where: { orderId } });
    const itemCount = await prisma.orderItem.count({
      where: { orderId, voided: false },
    });
    await prisma.diningTable.update({
      where: { id: order.tableId },
      data: {
        status: itemCount === 0 ? "FREE" : hasKot > 0 ? "RUNNING" : "OCCUPIED",
      },
    });
  }
  revalidatePath("/hold-orders");
  revalidatePath("/orders");
  revalidatePath("/tables");
  revalidatePath(`/pos/${orderId}`);
  revalidatePath("/pos");
}

export async function applyCouponToOrder(orderId: string, code: string) {
  const session = await requirePermission("discount");
  const outletId = await resolveOutletId(session);
  const couponCode = code.trim().toUpperCase();

  const order = await prisma.order.findFirst({
    where: { id: orderId, outletId, status: { in: ["OPEN", "HOLD"] } },
    include: { items: true },
  });
  if (!order) throw new Error("Order not found");

  const coupon = await prisma.coupon.findFirst({
    where: { code: couponCode, outletId, active: true },
  });
  if (!coupon) throw new Error("Invalid coupon");
  if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new Error("Coupon expired");

  const subtotal = order.items.filter((i) => !i.voided).reduce((s, i) => s + i.lineTotal, 0);
  if (subtotal < coupon.minOrder) {
    throw new Error(`Minimum order ${coupon.minOrder} required`);
  }

  if (coupon.type === "PERCENT") {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        discountPercent: Math.min(100, coupon.value),
        discountAmount: 0,
        discountReason: `Coupon ${coupon.code}`,
      },
    });
  } else {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        discountPercent: 0,
        discountAmount: Math.min(subtotal, coupon.value),
        discountReason: `Coupon ${coupon.code}`,
      },
    });
  }

  await recomputeOrderTotals(orderId);
  revalidatePath(`/pos/${orderId}`);
  revalidatePath("/coupons");
  revalidatePath("/orders");
}

export async function adjustStock(menuItemId: string, stock: number) {
  const session = await requirePermission("menu");
  const outletId = await resolveOutletId(session);
  const item = await prisma.menuItem.findFirst({
    where: { id: menuItemId, category: { outletId } },
  });
  if (!item) throw new Error("Menu item not found");

  await prisma.menuItem.update({
    where: { id: menuItemId },
    data: {
      stock: Math.max(0, Math.round(stock)),
      available: Math.max(0, Math.round(stock)) > 0 ? item.available : false,
    },
  });
  revalidatePath("/inventory");
  revalidatePath("/menu");
  revalidatePath("/menu-availability");
  revalidatePath("/alerts");
  revalidatePath("/pos");
}

export async function recordSync() {
  const session = await requirePermission("settings");
  const outletId = await resolveOutletId(session);
  await prisma.auditLog.create({
    data: {
      action: "SYNC",
      entity: "Outlet",
      entityId: outletId,
      details: "Manual sync triggered",
      outletId,
      userId: session.user.id,
    },
  });
  revalidatePath("/sync");
}

export async function updateTaxSettings(input: {
  cgstPercent: number;
  sgstPercent: number;
  serviceChargePercent: number;
}) {
  const session = await requirePermission("settings");
  const outletId = await resolveOutletId(session);
  await prisma.outlet.update({
    where: { id: outletId },
    data: {
      cgstPercent: input.cgstPercent,
      sgstPercent: input.sgstPercent,
      serviceChargePercent: input.serviceChargePercent,
    },
  });
  revalidatePath("/tax");
  revalidatePath("/settings");
  revalidatePath("/pos");
  revalidatePath("/bill");
}

export async function updateStoreProfile(input: {
  name: string;
  address?: string;
  phone?: string;
  gstin?: string;
}) {
  const session = await requirePermission("settings");
  const outletId = await resolveOutletId(session);
  if (!input.name.trim()) throw new Error("Store name required");

  await prisma.outlet.update({
    where: { id: outletId },
    data: {
      name: input.name.trim(),
      address: input.address?.trim() || null,
      phone: input.phone?.trim() || null,
      gstin: input.gstin?.trim() || null,
    },
  });
  revalidatePath("/store");
  revalidatePath("/settings");
  revalidatePath("/service-renewal");
}

/** Collect customer credit (due payment). */
export async function collectCustomerCredit(input: {
  customerId: string;
  amount: number;
  method?: "CASH" | "UPI" | "CARD";
  note?: string;
}) {
  const session = await requirePermission("pos");
  const outletId = await resolveOutletId(session);
  const amount = Math.round(Number(input.amount) * 100) / 100;
  if (amount <= 0) throw new Error("Enter a valid amount");

  const customer = await prisma.customer.findFirst({
    where: { id: input.customerId, outletId },
  });
  if (!customer) throw new Error("Customer not found");
  if (customer.creditBalance <= 0) throw new Error("No credit due");

  const collect = Math.min(amount, customer.creditBalance);
  await prisma.customer.update({
    where: { id: customer.id },
    data: { creditBalance: { decrement: collect } },
  });

  if ((input.method ?? "CASH") === "CASH") {
    await prisma.cashEntry.create({
      data: {
        type: "TOPUP",
        amount: collect,
        note: input.note?.trim() || `Credit collect · ${customer.name}`,
        outletId,
        userId: session.user.id,
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      action: "CREDIT_COLLECT",
      entity: "Customer",
      entityId: customer.id,
      details: `${collect}|${input.method ?? "CASH"}|${input.note ?? ""}`,
      outletId,
      userId: session.user.id,
    },
  });

  revalidatePath("/due-payments");
  revalidatePath("/customers");
  revalidatePath("/cash");
  return collect;
}
