"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { resolveOutletId } from "@/lib/outlet";
import type { Role } from "@prisma/client";

export async function createCategory(name: string) {
  const session = await requirePermission("menu");
  await prisma.category.create({
    data: { name, outletId: session.user.outletId, sortOrder: 99 },
  });
  revalidatePath("/menu");
}

export async function toggleCategory(id: string, active: boolean) {
  await requirePermission("menu");
  await prisma.category.update({ where: { id }, data: { active } });
  revalidatePath("/menu");
}

export async function createMenuItem(input: {
  categoryId: string;
  code: string;
  name: string;
  price: number;
  isVeg: boolean;
  kitchenStation: string;
  description?: string;
}) {
  await requirePermission("menu");
  const code = input.code.trim();
  if (!code) throw new Error("Item code is required");

  const existing = await prisma.menuItem.findUnique({ where: { code } });
  if (existing) throw new Error(`Code ${code} already used by ${existing.name}`);

  await prisma.menuItem.create({
    data: {
      categoryId: input.categoryId,
      code,
      name: input.name,
      price: input.price,
      isVeg: input.isVeg,
      kitchenStation: input.kitchenStation || "Kitchen",
      description: input.description,
    },
  });
  revalidatePath("/menu");
  revalidatePath("/pos");
}

export async function updateMenuItemCode(id: string, code: string) {
  await requirePermission("menu");
  const next = code.trim();
  if (!next) throw new Error("Item code is required");
  const existing = await prisma.menuItem.findUnique({ where: { code: next } });
  if (existing && existing.id !== id) {
    throw new Error(`Code ${next} already used by ${existing.name}`);
  }
  await prisma.menuItem.update({ where: { id }, data: { code: next } });
  revalidatePath("/menu");
  revalidatePath("/pos");
}

export async function toggleMenuItem(id: string, available: boolean) {
  await requirePermission("menu");
  await prisma.menuItem.update({ where: { id }, data: { available } });
  revalidatePath("/menu");
  revalidatePath("/pos");
}

export async function updateMenuItemPrice(id: string, price: number) {
  await requirePermission("menu");
  await prisma.menuItem.update({ where: { id }, data: { price } });
  revalidatePath("/menu");
  revalidatePath("/pos");
}

export async function addVariant(menuItemId: string, name: string, priceDelta: number) {
  await requirePermission("menu");
  await prisma.menuVariant.create({ data: { menuItemId, name, priceDelta } });
  revalidatePath("/menu");
}

export async function addAddon(menuItemId: string, name: string, price: number) {
  await requirePermission("menu");
  await prisma.menuAddon.create({ data: { menuItemId, name, price } });
  revalidatePath("/menu");
}

/** Wipe all categories + menu items for this outlet (order lines keep names; FK nulled). */
export async function clearAllMenu() {
  const session = await requirePermission("menu");
  const outletId = session.user.outletId;

  const categories = await prisma.category.findMany({
    where: { outletId },
    select: { id: true },
  });
  const categoryIds = categories.map((c) => c.id);
  if (!categoryIds.length) return { deletedItems: 0, deletedCategories: 0 };

  const items = await prisma.menuItem.findMany({
    where: { categoryId: { in: categoryIds } },
    select: { id: true },
  });
  const itemIds = items.map((i) => i.id);

  if (itemIds.length) {
    await prisma.orderItem.updateMany({
      where: { menuItemId: { in: itemIds } },
      data: { menuItemId: null },
    });
    await prisma.menuAddon.deleteMany({ where: { menuItemId: { in: itemIds } } });
    await prisma.menuVariant.deleteMany({ where: { menuItemId: { in: itemIds } } });
    await prisma.menuItem.deleteMany({ where: { id: { in: itemIds } } });
  }
  await prisma.category.deleteMany({ where: { outletId } });

  revalidatePath("/menu");
  revalidatePath("/pos");
  revalidatePath("/inventory");
  revalidatePath("/menu-availability");
  return { deletedItems: itemIds.length, deletedCategories: categoryIds.length };
}

export type MenuImportRow = {
  category: string;
  code: string;
  name: string;
  price: number;
  isVeg?: boolean | string;
  kitchenStation?: string;
};

/** Bulk upsert menu from Excel/CSV parsed rows. */
export async function importMenuRows(rows: MenuImportRow[]) {
  const session = await requirePermission("menu");
  const outletId = session.user.outletId;
  if (!rows.length) throw new Error("No rows to import");

  let created = 0;
  let updated = 0;
  const categoryCache = new Map<string, string>();

  const existingCats = await prisma.category.findMany({ where: { outletId } });
  for (const c of existingCats) categoryCache.set(c.name.trim().toLowerCase(), c.id);

  for (const raw of rows) {
    const categoryName = String(raw.category || "").trim();
    const code = String(raw.code || "").trim();
    const name = String(raw.name || "").trim();
    const price = Number(raw.price);
    if (!categoryName || !code || !name || !Number.isFinite(price)) continue;

    let categoryId = categoryCache.get(categoryName.toLowerCase());
    if (!categoryId) {
      const cat = await prisma.category.create({
        data: {
          name: categoryName,
          outletId,
          sortOrder: categoryCache.size + 1,
        },
      });
      categoryId = cat.id;
      categoryCache.set(categoryName.toLowerCase(), categoryId);
    }

    const existing = await prisma.menuItem.findUnique({ where: { code } });
    const isVeg =
      raw.isVeg === undefined
        ? true
        : typeof raw.isVeg === "boolean"
          ? raw.isVeg
          : !["n", "no", "0", "nonveg", "non-veg", "false"].includes(
              String(raw.isVeg).trim().toLowerCase()
            );

    if (existing) {
      await prisma.menuItem.update({
        where: { id: existing.id },
        data: {
          name,
          price,
          isVeg,
          categoryId,
          kitchenStation: raw.kitchenStation?.trim() || existing.kitchenStation,
          available: true,
        },
      });
      updated++;
    } else {
      await prisma.menuItem.create({
        data: {
          code,
          name,
          price,
          isVeg,
          categoryId,
          kitchenStation: raw.kitchenStation?.trim() || "Kitchen",
        },
      });
      created++;
    }
  }

  revalidatePath("/menu");
  revalidatePath("/pos");
  revalidatePath("/inventory");
  return { created, updated };
}

export async function updateReportEmail(email: string) {
  const session = await requirePermission("settings");
  const outletId = await resolveOutletId(session);
  await prisma.outlet.update({
    where: { id: outletId },
    data: { reportEmail: email.trim() || null },
  });
  revalidatePath("/settings");
  revalidatePath("/reports");
}

export async function updateOutletSettings(input: {
  name: string;
  address?: string;
  phone?: string;
  gstin?: string;
  billPrefix: string;
  cgstPercent: number;
  sgstPercent: number;
  serviceChargePercent?: number;
  packingChargeDefault?: number;
  deliveryChargeDefault?: number;
}) {
  const session = await requirePermission("settings");
  const outletId = await resolveOutletId(session);
  await prisma.outlet.update({
    where: { id: outletId },
    data: {
      name: input.name,
      address: input.address,
      phone: input.phone,
      gstin: input.gstin,
      billPrefix: input.billPrefix,
      cgstPercent: input.cgstPercent,
      sgstPercent: input.sgstPercent,
      serviceChargePercent: input.serviceChargePercent,
      packingChargeDefault: input.packingChargeDefault,
      deliveryChargeDefault: input.deliveryChargeDefault,
    },
  });
  revalidatePath("/settings");
  revalidatePath("/tax");
  revalidatePath("/store");
  revalidatePath("/bill");
  revalidatePath("/pos");
}

export async function createStaff(input: {
  name: string;
  email: string;
  password: string;
  role: Role;
}) {
  const session = await requirePermission("staff");
  const passwordHash = await bcrypt.hash(input.password, 10);
  await prisma.user.create({
    data: {
      name: input.name,
      email: input.email.toLowerCase().trim(),
      passwordHash,
      role: input.role,
      outletId: session.user.outletId,
    },
  });
  revalidatePath("/staff");
}

export async function toggleStaff(id: string, active: boolean) {
  const session = await requirePermission("staff");
  await prisma.user.updateMany({
    where: { id, outletId: session.user.outletId },
    data: { active },
  });
  revalidatePath("/staff");
}

export async function createTable(name: string, capacity: number, hallId?: string) {
  const session = await requirePermission("tables");
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Table name is required");

  const outletId = await resolveOutletId(session);
  const outlet = await prisma.outlet.findUnique({ where: { id: outletId } });
  if (!outlet) throw new Error("Restaurant not found. Please sign out and sign in again.");

  let resolvedHallId = hallId || null;
  if (resolvedHallId) {
    const hall = await prisma.diningHall.findFirst({
      where: { id: resolvedHallId, outletId },
    });
    if (!hall) throw new Error("Hall not found");
  } else {
    const firstHall = await prisma.diningHall.findFirst({
      where: { outletId },
      orderBy: { sortOrder: "asc" },
    });
    resolvedHallId = firstHall?.id ?? null;
  }

  const duplicate = await prisma.diningTable.findFirst({
    where: {
      outletId,
      name: { equals: trimmed },
    },
  });
  if (duplicate) throw new Error(`Table "${trimmed}" already exists`);

  const count = await prisma.diningTable.count({ where: { outletId } });
  await prisma.diningTable.create({
    data: {
      name: trimmed,
      capacity: Math.max(1, capacity || 4),
      sortOrder: count + 1,
      status: "FREE",
      hallId: resolvedHallId,
      outletId,
    },
  });
  revalidatePath("/tables");
  revalidatePath("/settings");
  revalidatePath("/orders");
}
