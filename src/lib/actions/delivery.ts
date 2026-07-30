"use server";

import { revalidatePath } from "next/cache";
import type { DeliveryDutyStatus, DeliveryTrackStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { resolveOutletId } from "@/lib/outlet";
import { distanceKm } from "@/lib/delivery-geo";

/** Spice Garden Cafe approx — MG Road Bengaluru */
const OUTLET_LAT = 12.975;
const OUTLET_LNG = 77.606;

function revalidateDelivery() {
  revalidatePath("/delivery");
  revalidatePath("/orders");
  revalidatePath("/online-orders");
  revalidatePath("/pos");
  revalidatePath("/alerts");
}

function hashCoord(seed: string, base: number, spread: number) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const n = (h % 1000) / 1000;
  return base + (n - 0.5) * spread;
}

function destinationForOrder(address: string | null | undefined, orderId: string) {
  const seed = address || orderId;
  return {
    lat: hashCoord(seed + "-lat", OUTLET_LAT, 0.08),
    lng: hashCoord(seed + "-lng", OUTLET_LNG, 0.08),
  };
}

export async function createDeliveryPartner(input: {
  name: string;
  phone: string;
  vehicleType?: string;
  vehicleNumber?: string;
}) {
  const session = await requirePermission("pos");
  const outletId = await resolveOutletId(session);
  if (!input.name.trim() || !input.phone.trim()) throw new Error("Name and phone required");

  const offset = (Math.random() - 0.5) * 0.02;
  await prisma.deliveryBoy.create({
    data: {
      name: input.name.trim(),
      phone: input.phone.trim(),
      vehicleType: input.vehicleType?.trim() || "Bike",
      vehicleNumber: input.vehicleNumber?.trim() || null,
      outletId,
      active: true,
      dutyStatus: "AVAILABLE",
      lat: OUTLET_LAT + offset,
      lng: OUTLET_LNG + offset,
      lastSeenAt: new Date(),
    },
  });
  revalidateDelivery();
}

/** @deprecated alias */
export async function createDeliveryBoy(input: { name: string; phone: string }) {
  return createDeliveryPartner(input);
}

export async function toggleDeliveryBoy(id: string, active: boolean) {
  const session = await requirePermission("pos");
  const outletId = await resolveOutletId(session);
  await prisma.deliveryBoy.updateMany({
    where: { id, outletId },
    data: {
      active,
      dutyStatus: active ? "AVAILABLE" : "OFFLINE",
      lastSeenAt: new Date(),
    },
  });
  revalidateDelivery();
}

export async function setPartnerDutyStatus(id: string, dutyStatus: DeliveryDutyStatus) {
  const session = await requirePermission("pos");
  const outletId = await resolveOutletId(session);
  const boy = await prisma.deliveryBoy.findFirst({ where: { id, outletId } });
  if (!boy) throw new Error("Partner not found");
  if (dutyStatus === "AVAILABLE" && boy.dutyStatus === "ON_TRIP") {
    const activeTrip = await prisma.order.findFirst({
      where: {
        deliveryBoyId: id,
        deliveryStatus: { in: ["ASSIGNED", "PICKED_UP", "ON_THE_WAY", "ARRIVED"] },
        status: { in: ["OPEN", "HOLD"] },
      },
    });
    if (activeTrip) throw new Error("Partner has an active trip — complete or reassign first");
  }
  await prisma.deliveryBoy.update({
    where: { id },
    data: {
      dutyStatus,
      active: dutyStatus !== "OFFLINE",
      lastSeenAt: new Date(),
    },
  });
  revalidateDelivery();
}

export async function assignDeliveryPartner(orderId: string, partnerId: string) {
  const session = await requirePermission("pos");
  const outletId = await resolveOutletId(session);

  const [order, partner] = await Promise.all([
    prisma.order.findFirst({
      where: { id: orderId, outletId, type: "DELIVERY", status: { in: ["OPEN", "HOLD"] } },
    }),
    prisma.deliveryBoy.findFirst({
      where: { id: partnerId, outletId, active: true },
    }),
  ]);
  if (!order) throw new Error("Delivery order not found");
  if (!partner) throw new Error("Partner not found or inactive");
  if (partner.dutyStatus === "OFFLINE") throw new Error("Partner is offline");

  if (order.deliveryBoyId && order.deliveryBoyId !== partnerId) {
    await prisma.deliveryBoy.update({
      where: { id: order.deliveryBoyId },
      data: { dutyStatus: "AVAILABLE", lastSeenAt: new Date() },
    });
  }

  const dest = destinationForOrder(order.customerAddress, order.id);
  const riderLat = partner.lat ?? OUTLET_LAT;
  const riderLng = partner.lng ?? OUTLET_LNG;

  await prisma.order.update({
    where: { id: orderId },
    data: {
      deliveryBoyId: partner.id,
      driverName: partner.name,
      deliveryStatus: "ASSIGNED",
      destLat: dest.lat,
      destLng: dest.lng,
      riderLat,
      riderLng,
    },
  });
  await prisma.deliveryBoy.update({
    where: { id: partner.id },
    data: {
      dutyStatus: "ON_TRIP",
      lat: riderLat,
      lng: riderLng,
      lastSeenAt: new Date(),
    },
  });
  await prisma.auditLog.create({
    data: {
      action: "ASSIGN_DELIVERY",
      entity: "Order",
      entityId: orderId,
      details: `Assigned to ${partner.name}`,
      outletId,
      userId: session.user.id,
    },
  });
  revalidateDelivery();
  revalidatePath(`/pos/${orderId}`);
}

export async function updateDeliveryTrackStatus(
  orderId: string,
  deliveryStatus: DeliveryTrackStatus
) {
  const session = await requirePermission("pos");
  const outletId = await resolveOutletId(session);
  const order = await prisma.order.findFirst({
    where: { id: orderId, outletId, type: "DELIVERY" },
    include: { deliveryBoy: true },
  });
  if (!order) throw new Error("Order not found");

  const data: {
    deliveryStatus: DeliveryTrackStatus;
    pickedUpAt?: Date | null;
    deliveredAt?: Date | null;
    riderLat?: number;
    riderLng?: number;
  } = { deliveryStatus };

  if (deliveryStatus === "PICKED_UP" || deliveryStatus === "ON_THE_WAY") {
    data.pickedUpAt = order.pickedUpAt ?? new Date();
  }
  if (deliveryStatus === "ARRIVED" || deliveryStatus === "DELIVERED") {
    if (order.destLat != null && order.destLng != null) {
      data.riderLat = order.destLat;
      data.riderLng = order.destLng;
    }
  }
  if (deliveryStatus === "DELIVERED") {
    data.deliveredAt = new Date();
  }
  if (deliveryStatus === "CANCELLED" || deliveryStatus === "PENDING") {
    data.pickedUpAt = null;
    data.deliveredAt = null;
  }

  // COD settle when marked delivered
  if (deliveryStatus === "DELIVERED" && order.status === "OPEN") {
    const due = Math.round((order.total - order.paidAmount) * 100) / 100;
    if (due > 0.01) {
      await prisma.payment.create({
        data: {
          orderId,
          amount: due,
          method: "CASH",
          reference: "COD / delivery collect",
          takenById: session.user.id,
        },
      });
      await prisma.cashEntry.create({
        data: {
          type: "SALE_CASH",
          amount: due,
          note: `Delivery COD ${order.orderNumber}`,
          outletId,
          userId: session.user.id,
        },
      });
    }
    const items = await prisma.orderItem.findMany({
      where: { orderId, voided: false },
    });
    for (const item of items) {
      if (!item.menuItemId) continue;
      await prisma.menuItem.update({
        where: { id: item.menuItemId },
        data: { stock: { decrement: item.quantity } },
      });
    }
    await prisma.order.update({
      where: { id: orderId },
      data: {
        ...data,
        paidAmount: Math.max(order.paidAmount, order.total),
        status: "SETTLED",
        settledAt: new Date(),
      },
    });
  } else {
    await prisma.order.update({ where: { id: orderId }, data });
  }

  if (order.deliveryBoyId) {
    if (deliveryStatus === "DELIVERED" || deliveryStatus === "CANCELLED") {
      await prisma.deliveryBoy.update({
        where: { id: order.deliveryBoyId },
        data: {
          dutyStatus: "AVAILABLE",
          lat: data.riderLat ?? order.deliveryBoy?.lat ?? OUTLET_LAT,
          lng: data.riderLng ?? order.deliveryBoy?.lng ?? OUTLET_LNG,
          lastSeenAt: new Date(),
        },
      });
    } else if (data.riderLat != null && data.riderLng != null) {
      await prisma.deliveryBoy.update({
        where: { id: order.deliveryBoyId },
        data: {
          lat: data.riderLat,
          lng: data.riderLng,
          lastSeenAt: new Date(),
          dutyStatus: "ON_TRIP",
        },
      });
    }
  }

  await prisma.auditLog.create({
    data: {
      action: "DELIVERY_STATUS",
      entity: "Order",
      entityId: orderId,
      details: deliveryStatus,
      outletId,
      userId: session.user.id,
    },
  });
  revalidateDelivery();
  revalidatePath(`/pos/${orderId}`);
  revalidatePath("/cash");
  revalidatePath("/inventory");
  revalidatePath("/orders");
}

/** Push live GPS (browser geolocation or manual). Also mirrors onto active order. */
export async function updatePartnerGps(input: {
  partnerId: string;
  lat: number;
  lng: number;
}) {
  const session = await requirePermission("pos");
  const outletId = await resolveOutletId(session);
  const partner = await prisma.deliveryBoy.findFirst({
    where: { id: input.partnerId, outletId },
  });
  if (!partner) throw new Error("Partner not found");

  const lat = Number(input.lat);
  const lng = Number(input.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error("Invalid coordinates");

  await prisma.deliveryBoy.update({
    where: { id: partner.id },
    data: { lat, lng, lastSeenAt: new Date() },
  });

  await prisma.order.updateMany({
    where: {
      deliveryBoyId: partner.id,
      deliveryStatus: { in: ["ASSIGNED", "PICKED_UP", "ON_THE_WAY", "ARRIVED"] },
      status: { in: ["OPEN", "HOLD"] },
    },
    data: { riderLat: lat, riderLng: lng },
  });

  revalidateDelivery();
}

/** Simulate rider moving toward destination (demo / offline GPS). */
export async function simulatePartnerGps(orderId: string) {
  const session = await requirePermission("pos");
  const outletId = await resolveOutletId(session);
  const order = await prisma.order.findFirst({
    where: { id: orderId, outletId, type: "DELIVERY" },
    include: { deliveryBoy: true },
  });
  if (!order?.deliveryBoyId) throw new Error("Assign a partner first");
  if (!order.destLat || !order.destLng) {
    const dest = destinationForOrder(order.customerAddress, order.id);
    await prisma.order.update({
      where: { id: orderId },
      data: { destLat: dest.lat, destLng: dest.lng },
    });
    order.destLat = dest.lat;
    order.destLng = dest.lng;
  }

  const curLat = order.riderLat ?? order.deliveryBoy?.lat ?? OUTLET_LAT;
  const curLng = order.riderLng ?? order.deliveryBoy?.lng ?? OUTLET_LNG;
  const nextLat = curLat + (order.destLat - curLat) * 0.22;
  const nextLng = curLng + (order.destLng - curLng) * 0.22;
  const dist = distanceKm(nextLat, nextLng, order.destLat, order.destLng);

  let deliveryStatus = order.deliveryStatus;
  if (order.deliveryStatus === "ASSIGNED") deliveryStatus = "PICKED_UP";
  else if (order.deliveryStatus === "PICKED_UP") deliveryStatus = "ON_THE_WAY";
  else if (dist < 0.35 && order.deliveryStatus === "ON_THE_WAY") deliveryStatus = "ARRIVED";
  else if (dist < 0.12) deliveryStatus = "ARRIVED";

  await prisma.order.update({
    where: { id: orderId },
    data: {
      riderLat: nextLat,
      riderLng: nextLng,
      deliveryStatus,
      pickedUpAt:
        deliveryStatus === "PICKED_UP" || deliveryStatus === "ON_THE_WAY" || deliveryStatus === "ARRIVED"
          ? order.pickedUpAt ?? new Date()
          : order.pickedUpAt,
    },
  });
  await prisma.deliveryBoy.update({
    where: { id: order.deliveryBoyId },
    data: { lat: nextLat, lng: nextLng, lastSeenAt: new Date(), dutyStatus: "ON_TRIP" },
  });

  revalidateDelivery();
  return { lat: nextLat, lng: nextLng, deliveryStatus, distanceKm: dist };
}

export async function unassignDeliveryPartner(orderId: string) {
  const session = await requirePermission("pos");
  const outletId = await resolveOutletId(session);
  const order = await prisma.order.findFirst({
    where: { id: orderId, outletId },
  });
  if (!order) throw new Error("Order not found");
  if (order.deliveryBoyId) {
    await prisma.deliveryBoy.update({
      where: { id: order.deliveryBoyId },
      data: { dutyStatus: "AVAILABLE", lastSeenAt: new Date() },
    });
  }
  await prisma.order.update({
    where: { id: orderId },
    data: {
      deliveryBoyId: null,
      driverName: null,
      deliveryStatus: "PENDING",
      riderLat: null,
      riderLng: null,
      pickedUpAt: null,
      deliveredAt: null,
    },
  });
  revalidateDelivery();
}
