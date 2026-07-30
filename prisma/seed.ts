import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

type SeedItem = {
  code: string;
  name: string;
  price: number;
  isVeg?: boolean;
  stock?: number;
  popular?: boolean;
  recommended?: boolean;
  available?: boolean;
  station?: string;
  description?: string;
  variants?: { name: string; priceDelta: number }[];
  addons?: { name: string; price: number }[];
};

async function main() {
  await prisma.kotItem.deleteMany();
  await prisma.kot.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.feedback.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.cashEntry.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.deliveryBoy.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.menuAddon.deleteMany();
  await prisma.menuVariant.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.category.deleteMany();
  await prisma.diningTable.deleteMany();
  await prisma.diningHall.deleteMany();
  await prisma.dayClose.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.outlet.deleteMany();

  const outlet = await prisma.outlet.create({
    data: {
      name: "Spice Garden Cafe",
      address: "12 MG Road, Bengaluru",
      phone: "+91 98765 43210",
      gstin: "29ABCDE1234F1Z5",
      billPrefix: "SG",
      cgstPercent: 2.5,
      sgstPercent: 2.5,
      packingChargeDefault: 10,
      deliveryChargeDefault: 40,
      serviceChargePercent: 0,
      containerChargeDefault: 5,
    },
  });

  const passwordHash = await bcrypt.hash("password123", 10);
  const users = [];
  for (const u of [
    { name: "Asha Owner", email: "owner@dinepooja.local", role: Role.OWNER },
    { name: "Ravi Manager", email: "manager@dinepooja.local", role: Role.MANAGER },
    { name: "Neha Cashier", email: "cashier@dinepooja.local", role: Role.CASHIER },
    { name: "Amit Captain", email: "captain@dinepooja.local", role: Role.CAPTAIN },
  ]) {
    users.push(await prisma.user.create({ data: { ...u, passwordHash, outletId: outlet.id } }));
  }
  const owner = users[0];

  const hall1 = await prisma.diningHall.create({
    data: { name: "Dining Hall 1", sortOrder: 1, outletId: outlet.id },
  });
  const hall2 = await prisma.diningHall.create({
    data: { name: "Dining Hall 2", sortOrder: 2, outletId: outlet.id },
  });
  const hall3 = await prisma.diningHall.create({
    data: { name: "Dining Hall 3", sortOrder: 3, outletId: outlet.id },
  });

  const tableDefs = [
    { name: "T1", hallId: hall1.id, capacity: 4 },
    { name: "T2", hallId: hall1.id, capacity: 4 },
    { name: "T3", hallId: hall1.id, capacity: 6 },
    { name: "T4", hallId: hall1.id, capacity: 2 },
    { name: "T5", hallId: hall2.id, capacity: 4 },
    { name: "T6", hallId: hall2.id, capacity: 4 },
    { name: "T7", hallId: hall2.id, capacity: 8 },
    { name: "T8", hallId: hall2.id, capacity: 4 },
    { name: "Bar-1", hallId: hall3.id, capacity: 2 },
    { name: "Bar-2", hallId: hall3.id, capacity: 2 },
    { name: "T9", hallId: hall3.id, capacity: 4 },
    { name: "T10", hallId: hall3.id, capacity: 4 },
  ];
  for (let i = 0; i < tableDefs.length; i++) {
    await prisma.diningTable.create({
      data: {
        name: tableDefs[i].name,
        capacity: tableDefs[i].capacity,
        hallId: tableDefs[i].hallId,
        sortOrder: i,
        outletId: outlet.id,
      },
    });
  }

  const catalog: { name: string; items: SeedItem[] }[] = [
    {
      name: "Beverages",
      items: [
        { code: "101", name: "Masala Chai", price: 40, station: "Bar", popular: true },
        { code: "102", name: "Fresh Lime Soda", price: 80, station: "Bar", variants: [
          { name: "Sweet", priceDelta: 0 }, { name: "Salt", priceDelta: 0 }, { name: "Mixed", priceDelta: 0 },
        ]},
        { code: "103", name: "Cold Coffee", price: 120, station: "Bar", recommended: true },
        { code: "104", name: "Soft Drink", price: 60, station: "Bar", stock: 40 },
      ],
    },
    {
      name: "Veg Soups",
      items: [
        { code: "111", name: "Tomato Soup", price: 120 },
        { code: "112", name: "Sweet Corn Soup", price: 130, popular: true },
      ],
    },
    {
      name: "Chicken Soups",
      items: [
        { code: "121", name: "Chicken Clear Soup", price: 150, isVeg: false },
        { code: "122", name: "Hot & Sour Chicken", price: 160, isVeg: false },
      ],
    },
    {
      name: "Mutton Soups",
      items: [{ code: "131", name: "Mutton Paya Soup", price: 220, isVeg: false, recommended: true }],
    },
    {
      name: "Veg Starters",
      items: [
        { code: "141", name: "Veg Manchurian", price: 220, popular: true },
        { code: "142", name: "Crispy Corn", price: 200 },
      ],
    },
    {
      name: "Paneer Starters",
      items: [
        {
          code: "151",
          name: "Paneer Tikka",
          price: 280,
          station: "Tandoor",
          popular: true,
          variants: [
            { name: "Half", priceDelta: -80 },
            { name: "Full", priceDelta: 0 },
          ],
          addons: [
            { name: "Extra Mayo", price: 20 },
            { name: "Mint Chutney", price: 15 },
          ],
        },
        { code: "152", name: "Chilli Paneer", price: 260 },
      ],
    },
    {
      name: "Mushroom Starters",
      items: [{ code: "161", name: "Chilli Mushroom", price: 240 }],
    },
    {
      name: "Babycorn Starters",
      items: [{ code: "171", name: "Honey Chilli Babycorn", price: 230 }],
    },
    {
      name: "Egg Starters",
      items: [{ code: "181", name: "Egg 65", price: 180, isVeg: false }],
    },
    {
      name: "Chicken Starters",
      items: [
        {
          code: "191",
          name: "Chicken Wings",
          price: 320,
          isVeg: false,
          popular: true,
          variants: [
            { name: "6 pcs", priceDelta: 0 },
            { name: "12 pcs", priceDelta: 180 },
          ],
          addons: [{ name: "BBQ Dip", price: 30 }],
        },
        { code: "192", name: "Chicken 65", price: 280, isVeg: false },
      ],
    },
    {
      name: "Mutton Starters",
      items: [{ code: "201", name: "Mutton Pepper Fry", price: 380, isVeg: false }],
    },
    {
      name: "Fish Starters",
      items: [{ code: "211", name: "Apollo Fish", price: 360, isVeg: false }],
    },
    {
      name: "Prawn Starters",
      items: [{ code: "221", name: "Chilli Prawns", price: 420, isVeg: false, stock: 18 }],
    },
    {
      name: "Grill Items",
      items: [{ code: "231", name: "Grilled Chicken", price: 390, isVeg: false, station: "Grill", recommended: true }],
    },
    {
      name: "Tandoori",
      items: [
        { code: "241", name: "Tandoori Chicken", price: 420, isVeg: false, station: "Tandoor", popular: true },
        { code: "242", name: "Butter Naan", price: 50, station: "Tandoor" },
        { code: "243", name: "Garlic Naan", price: 60, station: "Tandoor" },
      ],
    },
    {
      name: "Chinese",
      items: [
        { code: "251", name: "Veg Fried Rice", price: 180 },
        { code: "252", name: "Chicken Noodles", price: 220, isVeg: false },
      ],
    },
    {
      name: "Indian",
      items: [
        {
          code: "261",
          name: "Butter Chicken",
          price: 380,
          isVeg: false,
          popular: true,
          variants: [
            { name: "Regular", priceDelta: 0 },
            { name: "Large", priceDelta: 120 },
          ],
          addons: [
            { name: "Extra Butter", price: 25 },
            { name: "Extra Gravy", price: 40 },
          ],
        },
        { code: "262", name: "Dal Makhani", price: 260 },
        { code: "263", name: "Paneer Butter Masala", price: 300, recommended: true },
      ],
    },
    {
      name: "Biryani",
      items: [
        {
          code: "30",
          name: "Hot Fry Piece Biryani",
          price: 390,
          isVeg: false,
          popular: true,
          recommended: true,
          description: "Spicy piece biryani — punch code 30",
          addons: [
            { name: "Raita", price: 40 },
            { name: "Extra Piece", price: 80 },
          ],
        },
        {
          code: "271",
          name: "Chicken Biryani",
          price: 350,
          isVeg: false,
          addons: [
            { name: "Raita", price: 40 },
            { name: "Salan", price: 30 },
          ],
        },
        { code: "272", name: "Veg Biryani", price: 280 },
      ],
    },
    {
      name: "Rice",
      items: [
        { code: "281", name: "Jeera Rice", price: 140 },
        { code: "282", name: "Steam Rice", price: 100 },
      ],
    },
    {
      name: "Noodles",
      items: [
        { code: "291", name: "Veg Hakka Noodles", price: 190 },
        { code: "292", name: "Chicken Hakka Noodles", price: 230, isVeg: false },
      ],
    },
    {
      name: "Desserts",
      items: [
        {
          code: "301",
          name: "Gulab Jamun",
          price: 90,
          popular: true,
          variants: [
            { name: "2 pcs", priceDelta: 0 },
            { name: "4 pcs", priceDelta: 70 },
          ],
        },
        { code: "302", name: "Rasmalai", price: 120 },
      ],
    },
    {
      name: "Ice Cream",
      items: [
        { code: "311", name: "Vanilla Scoop", price: 80 },
        { code: "312", name: "Chocolate Scoop", price: 90, popular: true },
      ],
    },
    {
      name: "Combos",
      items: [
        { code: "321", name: "Mini Thali", price: 249, recommended: true },
        { code: "322", name: "Family Combo", price: 799, isVeg: false },
      ],
    },
    {
      name: "Today's Specials",
      items: [
        { code: "331", name: "Chef Special Curry", price: 340, recommended: true, popular: true },
        { code: "332", name: "Sold Out Special", price: 299, available: false, stock: 0 },
      ],
    },
  ];

  let sort = 1;
  for (const cat of catalog) {
    const category = await prisma.category.create({
      data: { name: cat.name, sortOrder: sort++, outletId: outlet.id },
    });
    for (const item of cat.items) {
      await prisma.menuItem.create({
        data: {
          code: item.code,
          name: item.name,
          price: item.price,
          isVeg: item.isVeg ?? true,
          available: item.available ?? true,
          stock: item.stock ?? 100,
          popular: item.popular ?? false,
          recommended: item.recommended ?? false,
          description: item.description,
          kitchenStation: item.station ?? "Kitchen",
          categoryId: category.id,
          variants: item.variants ? { create: item.variants } : undefined,
          addons: item.addons ? { create: item.addons } : undefined,
        },
      });
    }
  }

  await prisma.customer.createMany({
    data: [
      {
        name: "Priya Sharma",
        phone: "9876500001",
        email: "priya@example.com",
        address: "Indiranagar",
        loyaltyPoints: 120,
        creditBalance: 450,
        notes: "Prefers window seat",
        outletId: outlet.id,
      },
      {
        name: "Karthik Rao",
        phone: "9876500002",
        email: "karthik@example.com",
        loyaltyPoints: 40,
        creditBalance: 0,
        outletId: outlet.id,
      },
      {
        name: "Meera Nair",
        phone: "9876500003",
        address: "Koramangala",
        loyaltyPoints: 80,
        creditBalance: 200,
        outletId: outlet.id,
      },
    ],
  });

  await prisma.deliveryBoy.createMany({
    data: [
      {
        name: "Suresh Kumar",
        phone: "9000011111",
        active: true,
        rating: 4.8,
        dutyStatus: "AVAILABLE",
        vehicleType: "Bike",
        vehicleNumber: "KA-01-AB-1234",
        lat: 12.976,
        lng: 77.605,
        lastSeenAt: new Date(),
        outletId: outlet.id,
      },
      {
        name: "Imran Ali",
        phone: "9000022222",
        active: true,
        rating: 4.6,
        dutyStatus: "AVAILABLE",
        vehicleType: "Scooter",
        vehicleNumber: "KA-03-CD-5678",
        lat: 12.974,
        lng: 77.608,
        lastSeenAt: new Date(),
        outletId: outlet.id,
      },
    ],
  });

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 30);
  await prisma.coupon.createMany({
    data: [
      {
        code: "WELCOME10",
        type: "PERCENT",
        value: 10,
        active: true,
        minOrder: 300,
        expiresAt: nextWeek,
        outletId: outlet.id,
      },
      {
        code: "FLAT50",
        type: "FLAT",
        value: 50,
        active: true,
        minOrder: 500,
        expiresAt: nextWeek,
        outletId: outlet.id,
      },
    ],
  });

  const firstTable = await prisma.diningTable.findFirst({
    where: { outletId: outlet.id },
    orderBy: { sortOrder: "asc" },
  });
  const reservedAt = new Date();
  reservedAt.setHours(reservedAt.getHours() + 3);
  await prisma.reservation.create({
    data: {
      guestName: "Ananya Iyer",
      phone: "9888877777",
      partySize: 4,
      tableId: firstTable?.id,
      reservedAt,
      status: "BOOKED",
      notes: "Birthday dinner",
      outletId: outlet.id,
    },
  });

  await prisma.cashEntry.create({
    data: {
      type: "OPENING",
      amount: 5000,
      note: "Opening float",
      outletId: outlet.id,
      userId: owner.id,
    },
  });

  await prisma.expense.create({
    data: {
      category: "Groceries",
      amount: 1250,
      note: "Vegetables & dairy",
      outletId: outlet.id,
      userId: owner.id,
    },
  });

  await prisma.feedback.create({
    data: {
      rating: 5,
      comment: "Great service and hot food!",
      customerName: "Priya Sharma",
      outletId: outlet.id,
    },
  });

  console.log("Seeded DinePooja POS demo data");
  console.log("Login: owner@dinepooja.local / password123");
  console.log("Example item code: 30 = Hot Fry Piece Biryani");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
