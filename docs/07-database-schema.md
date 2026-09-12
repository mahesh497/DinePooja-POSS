# 7. Database schema (detailed)

Source of truth: [`prisma/schema.prisma`](../prisma/schema.prisma).  
Engine: **Prisma 6 + SQLite**.  
File: `prisma/dev.db` via `DATABASE_URL` (default `file:./dev.db`).

IDs are `cuid()` strings unless noted. Most models include `createdAt` / `updatedAt`.  
**Tenant rule:** operational rows belong to an `Outlet` through `outletId`. Staff, menu, tables, orders, cash, customers, coupons, riders, and feedback never cross outlets.

```
Outlet
 ├── User (staff)
 ├── AppLicense (install-wide, not per outlet)
 ├── Category → MenuItem → MenuVariant, MenuAddon
 ├── DiningHall → DiningTable
 ├── Customer, Reservation, Coupon, Feedback
 ├── DeliveryBoy → Order (delivery)
 ├── CashEntry, Expense, DayClose, AuditLog
 └── Order
      ├── OrderItem → KotItem
      ├── Kot → KotItem
      └── Payment
```

---

## Enums

### `Role` — staff permission set

| Value | Meaning |
|-------|---------|
| `OWNER` | Full access, including license unlock and settings |
| `MANAGER` | Menu, staff, reports, inventory, most admin |
| `CASHIER` | POS, cash, reports (limited) |
| `CAPTAIN` | Floor / take orders; no void or discount unless granted |

Used by: `User.role`.

### `OrderType`

| Value | Meaning |
|-------|---------|
| `DINE_IN` | Table service |
| `PARCEL` | Takeaway / packing |
| `DELIVERY` | Sent out with a rider |

### `OrderSource`

| Value | Meaning |
|-------|---------|
| `WALK_IN` | Guest at the counter or table |
| `PHONE` | Phone order |
| `ONLINE` | Aggregator / online (see `Order.onlinePlatform`) |

### `OrderStatus`

| Value | Meaning |
|-------|---------|
| `OPEN` | Being punched / billed |
| `HOLD` | Parked; can resume on POS |
| `SETTLED` | Paid in full |
| `VOIDED` | Whole order voided |
| `CANCELLED` | Cancelled |
| `REFUNDED` | Refunded after settle |

POS only edits `OPEN` and `HOLD`. Settled bills redirect to `/bill/[id]`.

### `KotStatus` — kitchen ticket

`PENDING` → `PREPARING` → `READY` → `SERVED`, or `DELAYED` / `CANCELLED`.

### `KotItemStatus` — line on a ticket

`PENDING`, `PREPARING`, `SERVED`, `DELAYED`, `VOIDED`, `CANCELLED`.

A partly cancelled line keeps the remaining qty as a live `KotItem` and writes a separate `CANCELLED` row for the struck-off qty so the kitchen can print a cancel slip.

### `PaymentMethod`

`CASH`, `UPI`, `CARD`. Cash tenders also write a `CashEntry` of type `SALE_CASH`.

### `TableStatus`

| Value | Meaning |
|-------|---------|
| `FREE` | Empty |
| `OCCUPIED` | Seated, KOT not sent yet |
| `RUNNING` | KOT sent (kitchen working) |
| `PRINTED` | Bill printed |
| `RESERVED` | Held for a reservation |
| `BILLING` | Checkout in progress |

### `CashEntryType`

`OPENING`, `TOPUP`, `WITHDRAW`, `CLOSING`, `SALE_CASH`.

### `ReservationStatus`

`BOOKED`, `SEATED`, `CANCELLED`, `NO_SHOW`, `COMPLETED`.

### `CouponType`

`PERCENT` or `FLAT` (rupees). `Coupon.value` is the percent or the rupee amount.

### `DeliveryDutyStatus`

`AVAILABLE`, `ON_TRIP`, `OFFLINE`.

### `DeliveryTrackStatus` (on `Order`)

`PENDING`, `ASSIGNED`, `PICKED_UP`, `ON_THE_WAY`, `ARRIVED`, `DELIVERED`, `CANCELLED`.

---

## Models

### `Outlet`

The restaurant / store. One seeded demo outlet is typical.

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `id` | String | cuid | PK |
| `name` | String | | Display name |
| `address` | String? | | |
| `phone` | String? | | |
| `gstin` | String? | | GSTIN printed on bills |
| `billPrefix` | String | `"DF"` | Prefix for bill numbers |
| `billCounter` | Int | `1` | Next bill sequence |
| `logoUrl` | String? | | |
| `cgstPercent` | Float | `2.5` | Default CGST |
| `sgstPercent` | Float | `2.5` | Default SGST |
| `packingChargeDefault` | Float | `10` | Parcel default |
| `deliveryChargeDefault` | Float | `40` | Delivery default |
| `serviceChargePercent` | Float | `0` | |
| `containerChargeDefault` | Float | `0` | |
| `reportEmail` | String? | | Day-close PDF recipient |
| `createdAt` / `updatedAt` | DateTime | now / auto | |

**Relations (1:N):** `User`, `Category`, `DiningHall`, `DiningTable`, `Order`, `DayClose`, `AuditLog`, `Customer`, `CashEntry`, `Expense`, `Reservation`, `Coupon`, `DeliveryBoy`, `Feedback`.

---

### `AppLicense`

Single-row install license. Not outlet-scoped.

| Field | Type | Notes |
|-------|------|-------|
| `id` | String | Always `"default"` |
| `installedAt` | DateTime | First install |
| `expiresAt` | DateTime | Unlock / 6-month window |
| `lastUnlockedAt` | DateTime? | Last PIN unlock |
| `challenge` | String? | Vendor challenge material |
| `updatedAt` | DateTime | |

---

### `User`

Staff account. Email is unique globally. JWT session stores `id`, `role`, `outletId`, `outletName` and refreshes from this row after a reseed.

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `id` | String | cuid | PK |
| `name` | String | | |
| `email` | String | | **unique** |
| `passwordHash` | String | | bcrypt |
| `role` | Role | `CASHIER` | |
| `active` | Boolean | `true` | Inactive users cannot log in |
| `outletId` | String | | → `Outlet` |
| `createdAt` / `updatedAt` | DateTime | | |

**Relations:** creates `Order` (as `createdBy`), `Payment` (`takenBy`), `Kot`, `CashEntry`, `Expense`, `AuditLog`.

---

### `DiningHall`

Floor / section (AC, Garden, Rooftop).

| Field | Type | Default |
|-------|------|---------|
| `id` | String | cuid |
| `name` | String | |
| `sortOrder` | Int | `0` |
| `active` | Boolean | `true` |
| `outletId` | String | → `Outlet` |
| `createdAt` / `updatedAt` | DateTime | |

**Relations:** `DiningTable[]`.

---

### `DiningTable`

Physical table on the floor map.

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `id` | String | cuid | |
| `name` | String | | e.g. `T1` |
| `capacity` | Int | `4` | |
| `status` | TableStatus | `FREE` | Drives floor color |
| `sortOrder` | Int | `0` | |
| `mergedInto` | String? | | Target table id when merged |
| `hallId` | String? | | → `DiningHall` |
| `outletId` | String | | → `Outlet` |
| `createdAt` / `updatedAt` | DateTime | | |

**Relations:** `Order[]`, `Reservation[]`.

---

### `Category`

Menu group shown on POS.

| Field | Type | Default |
|-------|------|---------|
| `id` | String | cuid |
| `name` | String | |
| `sortOrder` | Int | `0` |
| `active` | Boolean | `true` |
| `outletId` | String | → `Outlet` |
| `createdAt` / `updatedAt` | DateTime | |

**Relations:** `MenuItem[]`.

---

### `MenuItem`

Sellable dish. Punched onto an order as a **snapshot** on `OrderItem` (name, price, veg, variant, addons). Later menu edits do not rewrite old bills.

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `id` | String | cuid | |
| `code` | String | | **unique** item code (quick punch) |
| `name` | String | | |
| `description` | String? | | |
| `price` | Float | | Base price |
| `isVeg` | Boolean | `true` | |
| `available` | Boolean | `true` | 86 / sold out |
| `imageUrl` | String? | | |
| `stock` | Int | `100` | Decremented on settle |
| `popular` | Boolean | `false` | POS filter |
| `recommended` | Boolean | `false` | POS filter |
| `kitchenStation` | String | `"Kitchen"` | Historical; app now uses one KOT per table |
| `categoryId` | String | | → `Category` |
| `createdAt` / `updatedAt` | DateTime | | |

**Indexes:** `@@unique([code])`, `@@index([code])`.

**Relations:** `MenuVariant[]`, `MenuAddon[]`, `OrderItem[]`.  
Deleting a menu item **sets `OrderItem.menuItemId` to null** (`onDelete: SetNull`).

---

### `MenuVariant`

Size / style with a price delta (Half, Full, Extra spicy).

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `id` | String | cuid | |
| `name` | String | | |
| `priceDelta` | Float | `0` | Added to `MenuItem.price` |
| `menuItemId` | String | | → `MenuItem`, **cascade delete** |

---

### `MenuAddon`

Optional extra with its own price (raita, extra gravy).

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `id` | String | cuid | |
| `name` | String | | |
| `price` | Float | `0` | |
| `menuItemId` | String | | → `MenuItem`, **cascade delete** |

---

### `Order`

The bill. Central transaction record.

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `id` | String | cuid | Used in `/pos/[orderId]` |
| `orderNumber` | String | | Human number |
| `type` | OrderType | `DINE_IN` | |
| `source` | OrderSource | `WALK_IN` | |
| `status` | OrderStatus | `OPEN` | |
| `guestCount` | Int | `1` | |
| `customerName` | String? | | |
| `customerPhone` | String? | | |
| `customerAddress` | String? | | Delivery address |
| `onlinePlatform` | String? | | Swiggy / Zomato / etc. |
| `driverName` | String? | | Alias if no `DeliveryBoy` |
| `deliveryBoyId` | String? | | → `DeliveryBoy` |
| `deliveryStatus` | DeliveryTrackStatus | `PENDING` | |
| `destLat` / `destLng` | Float? | | Drop GPS |
| `riderLat` / `riderLng` | Float? | | Live rider GPS |
| `pickedUpAt` / `deliveredAt` | DateTime? | | |
| `notes` | String? | | Order-level note |
| `packingCharge` | Float | `0` | |
| `deliveryCharge` | Float | `0` | |
| `serviceCharge` | Float | `0` | |
| `containerCharge` | Float | `0` | |
| `roundOff` | Float | `0` | |
| `subtotal` | Float | `0` | Sum of non-voided lines |
| `discountAmount` | Float | `0` | Rupees off |
| `discountPercent` | Float | `0` | |
| `discountReason` | String? | | |
| `cgstAmount` / `sgstAmount` | Float | `0` | |
| `total` | Float | `0` | Payable |
| `paidAmount` | Float | `0` | Sum of `Payment` |
| `voidReason` | String? | | Whole-order void |
| `billPrintedAt` | DateTime? | | |
| `occupiedAt` | DateTime? | | Table sat |
| `settledAt` | DateTime? | | |
| `outletId` | String | | → `Outlet` |
| `tableId` | String? | | → `DiningTable` (null for parcel/delivery) |
| `createdById` | String | | → `User` |
| `createdAt` / `updatedAt` | DateTime | | |

**Indexes:** `@@index([outletId, status])`, `@@index([createdAt])`.

**Relations:** `OrderItem[]`, `Kot[]`, `Payment[]`. Deleting an order **cascades** items, KOTs, and payments.

**App rules:**

- Unsent lines can be removed outright.
- Lines already on a KOT are `voided` with a reason; kitchen gets a cancel print.
- Partial cancel splits qty on `OrderItem` and writes a `CANCELLED` `KotItem`.
- Empty billable order releases the table.

---

### `OrderItem`

A punched line on the bill.

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `id` | String | cuid | |
| `name` | String | | Snapshot at punch time |
| `quantity` | Int | `1` | Reduced on partial cancel |
| `unitPrice` | Float | | Snapshot |
| `lineTotal` | Float | | `unitPrice * quantity` |
| `notes` | String? | | Guest instruction |
| `isVeg` | Boolean | `true` | |
| `variantName` | String? | | Snapshot, not FK |
| `addonNames` | String? | | Joined snapshot |
| `voided` | Boolean | `false` | Whole-line cancel after KOT |
| `voidReason` | String? | | Cancel reason |
| `kotSent` | Boolean | `false` | True after Send KOT |
| `menuItemId` | String? | | → `MenuItem`, SetNull on delete |
| `orderId` | String | | → `Order`, **cascade** |
| `createdAt` / `updatedAt` | DateTime | | |

**Relations:** `KotItem[]`.

---

### `Kot`

Kitchen ticket. Current app logic: **one open KOT per table/order**; new items append.

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `id` | String | cuid | |
| `kotNumber` | Int | | Per-order sequence |
| `station` | String | `"Kitchen"` | No longer split by station |
| `status` | KotStatus | `PENDING` | All-cancelled → `CANCELLED` |
| `orderId` | String | | → `Order`, **cascade** |
| `createdById` | String | | → `User` |
| `createdAt` / `updatedAt` | DateTime | | `updatedAt` bumped on item cancel so the board reprints |

**Index:** `@@index([status])`.

---

### `KotItem`

Line on a kitchen ticket. Links back to the bill line.

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `id` | String | cuid | |
| `quantity` | Int | | |
| `name` | String | | Includes variant · addons |
| `notes` | String? | | Cancel reason on cancelled rows |
| `status` | KotItemStatus | `PENDING` | |
| `kotId` | String | | → `Kot`, **cascade** |
| `orderItemId` | String | | → `OrderItem`, **cascade** |

---

### `Payment`

Tender against an order. Multiple rows = split / partial pay. Order settles when `paidAmount >= total`.

| Field | Type | Notes |
|-------|------|-------|
| `id` | String | cuid |
| `amount` | Float | |
| `method` | PaymentMethod | |
| `reference` | String? | UPI/card ref |
| `orderId` | String | → `Order`, **cascade** |
| `takenById` | String | → `User` |
| `createdAt` | DateTime | |

---

### `DayClose`

End-of-day snapshot (one row per close). Used for the daily PDF / email.

| Field | Type | Notes |
|-------|------|-------|
| `id` | String | cuid |
| `outletId` | String | → `Outlet` |
| `businessDate` | DateTime | Business day |
| `totalSales` | Float | |
| `cashTotal` / `upiTotal` / `cardTotal` | Float | |
| `orderCount` / `voidCount` | Int | |
| `discountTotal` | Float | |
| `notes` | String? | |
| `closedAt` | DateTime | default now |

---

### `AuditLog`

Who did what. Actions include `CANCEL_ITEM`, `DELETE_ITEM`, `VOID_ITEM`, credit/debit notes, day close, sync.

| Field | Type | Notes |
|-------|------|-------|
| `id` | String | cuid |
| `action` | String | Free-text action key |
| `entity` | String | e.g. `OrderItem`, `Order` |
| `entityId` | String? | |
| `details` | String? | Human summary |
| `outletId` | String | → `Outlet` |
| `userId` | String? | → `User` |
| `createdAt` | DateTime | |

---

### `Customer`

Repeat guest. Unique phone **per outlet**.

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `id` | String | cuid | |
| `name` | String | | |
| `phone` | String | | part of unique |
| `email` | String? | | |
| `address` | String? | | |
| `loyaltyPoints` | Int | `0` | |
| `creditBalance` | Float | `0` | Due payments |
| `notes` | String? | | |
| `outletId` | String | | → `Outlet` |
| `createdAt` / `updatedAt` | DateTime | | |

**Constraints:** `@@unique([outletId, phone])`, `@@index([outletId])`.

There is **no FK** from `Order` to `Customer`; orders store name/phone/address inline.

---

### `CashEntry`

Drawer movement.

| Field | Type | Notes |
|-------|------|-------|
| `id` | String | cuid |
| `type` | CashEntryType | |
| `amount` | Float | |
| `note` | String? | |
| `outletId` | String | → `Outlet` |
| `userId` | String | → `User` |
| `createdAt` | DateTime | |

**Index:** `@@index([outletId, createdAt])`.

---

### `Expense`

Outlet expense (petrol, vegetables, …).

| Field | Type | Notes |
|-------|------|-------|
| `id` | String | cuid |
| `category` | String | Free-text category |
| `amount` | Float | |
| `note` | String? | |
| `outletId` | String | → `Outlet` |
| `userId` | String | → `User` |
| `createdAt` | DateTime | |

**Index:** `@@index([outletId, createdAt])`.

---

### `Reservation`

Table booking.

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `id` | String | cuid | |
| `guestName` | String | | |
| `phone` | String? | | |
| `partySize` | Int | `2` | |
| `tableId` | String? | | → `DiningTable` |
| `reservedAt` | DateTime | | When they arrive |
| `status` | ReservationStatus | `BOOKED` | |
| `notes` | String? | | |
| `outletId` | String | | → `Outlet` |
| `createdAt` | DateTime | | |

**Index:** `@@index([outletId, reservedAt])`.

---

### `Coupon`

Discount code.

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `id` | String | cuid | |
| `code` | String | | **unique** globally |
| `type` | CouponType | | `PERCENT` or `FLAT` |
| `value` | Float | | Percent or rupees |
| `active` | Boolean | `true` | |
| `minOrder` | Float | `0` | Minimum subtotal |
| `expiresAt` | DateTime? | | |
| `outletId` | String | | → `Outlet` |

**Index:** `@@index([outletId])`.

---

### `DeliveryBoy`

Rider assigned to delivery orders.

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `id` | String | cuid | |
| `name` / `phone` | String | | |
| `active` | Boolean | `true` | |
| `rating` | Float | `5` | |
| `dutyStatus` | DeliveryDutyStatus | `AVAILABLE` | |
| `vehicleType` | String | `"Bike"` | |
| `vehicleNumber` | String? | | |
| `lat` / `lng` | Float? | | Last GPS |
| `lastSeenAt` | DateTime? | | |
| `outletId` | String | | → `Outlet` |
| `createdAt` / `updatedAt` | DateTime | | |

**Indexes:** `@@index([outletId])`, `@@index([dutyStatus])`.  
**Relations:** `Order[]`.

---

### `Feedback`

Star rating. `orderId` is a **loose string**, not a foreign key.

| Field | Type | Notes |
|-------|------|-------|
| `id` | String | cuid |
| `rating` | Int | 1–5 in the UI |
| `comment` | String? | |
| `customerName` | String? | |
| `orderId` | String? | Not a Prisma relation |
| `outletId` | String | → `Outlet` |
| `createdAt` | DateTime | |

**Index:** `@@index([outletId, createdAt])`.

---

## Delete / cascade behavior

| Parent | Child | On delete |
|--------|-------|-----------|
| `MenuItem` | `MenuVariant`, `MenuAddon` | Cascade |
| `MenuItem` | `OrderItem.menuItemId` | Set null |
| `Order` | `OrderItem`, `Kot`, `Payment` | Cascade |
| `Kot` | `KotItem` | Cascade |
| `OrderItem` | `KotItem` | Cascade |

Outlet, User, DiningTable, and DeliveryBoy deletes are **not** cascaded in the schema — remove dependents in application code first.

---

## Typical write path (POS)

1. Open or create `Order` (`OPEN`, optional `tableId`). Set table `OCCUPIED`.
2. Insert `OrderItem` rows (`kotSent = false`). Recompute totals.
3. **Send KOT:** append `KotItem` to the open `Kot` (or create KOT #1). Set `kotSent = true`. Table → `RUNNING`.
4. **Cancel:** unsent line deleted; sent line `voided` + `KotItem.status = CANCELLED` (or split qty). Audit `CANCEL_ITEM`.
5. **Pay:** insert `Payment`; bump `paidAmount`. Cash also inserts `CashEntry SALE_CASH`.
6. When paid in full: `Order.status = SETTLED`, `settledAt` set, table `FREE`.
7. **Day close:** insert `DayClose`, optional PDF/email to `Outlet.reportEmail`.

---

## Regenerating the client

```bash
npx prisma generate
npx prisma db push          # apply schema to SQLite
npx prisma db seed          # demo data (see prisma/seed.ts)
```

After you change this file, update `prisma/schema.prisma` first — this document should follow the Prisma schema, not the other way around.
