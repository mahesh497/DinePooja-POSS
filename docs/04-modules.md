# 4. Modules reference

Routes live under `src/app/(dashboard)/…`. Many are also listed on the Operations dashboard (`src/lib/modules.ts`).

## Core operations

| Module | Route | Description |
|--------|-------|-------------|
| Operations hub | `/dashboard` | Module grid + shortcuts (Owner/Manager) |
| POS | `/pos`, `/pos/[orderId]` | Billing: dine-in / parcel / delivery |
| Tables | `/tables` | Halls, colors, merge/move/split, open seat |
| Orders History | `/orders` | Tabs + search + timeline / driver |
| Online Orders | `/online-orders` | Today’s platform-tagged orders |
| KOT | `/kot` | Kitchen board, print, merge/split |
| Order Status | `/order-status` | Read-only kitchen-style status board |
| Delivery Partners | `/delivery` | Assign, duty, GPS, ETA, COD settle |
| Reservations | `/reservations` | Bookings (status CRUD; limited table link) |
| Hold Orders | `/hold-orders` | Parked bills |
| Alerts | `/alerts` | Actionable operational alerts |
| LED Display | `/led-display` | Customer-facing display |
| Dual Screen | `/dual-screen` | Second guest screen |

## Billing & money

| Module | Route | Description |
|--------|-------|-------------|
| Bill | `/bill/[orderId]` | Printable GST bill |
| Print Center | `/print-center` | Reprint bills / jump to KOT |
| Due Payment | `/due-payments` | Credit collect + unpaid opens |
| Cash Flow | `/cash` | Drawer entries + today cash sales |
| Expenses | `/expenses` | Outlet expenses |
| Currency Counter | `/currency-counter` | Denomination helper |

## Menu & stock

| Module | Route | Description |
|--------|-------|-------------|
| Menu | `/menu` | Categories, items, modifiers |
| Menu Item On/Off | `/menu-availability` | Availability toggles |
| Inventory | `/inventory` | Stock levels (auto-decrement on settle) |

## CRM

| Module | Route | Description |
|--------|-------|-------------|
| Customers | `/customers` | Profiles, loyalty display, credit |
| Feedback | `/feedback` | Ratings |
| Coupons | `/coupons` | Percent / flat offers |

## Reports

| Module | Route | Description |
|--------|-------|-------------|
| Reports | `/reports` | Sales dashboard + day close |
| Item Report | `/reports/items` | Item / category sales |
| Executive Sales | `/reports/executive` | High-level collections |

## Settings & admin

| Module | Route | Description |
|--------|-------|-------------|
| Staff | `/staff` | Users & roles |
| Settings | `/settings` | Outlet / tax / charges defaults |
| Tax | `/tax` | GST overview |
| Store | `/store` | Outlet profile |
| Manual Sync | `/sync` | Demo sync heartbeat (audit log) |
| Service Renewal | `/service-renewal` | Demo subscription card |
| Help | `/help` | Shortcuts / help text |

## Auth

| Route | Description |
|-------|-------------|
| `/login` | Credentials login |
| `/api/auth/*` | NextAuth handlers |
| `/api/health` | Liveness |

## Known demo limits (honest)

These UIs work but are partial vs a full PetPooja cloud product:

- Online aggregators: **manual tagging only** (no webhooks)  
- Sync: **audit heartbeat**, not real offline cloud sync  
- Inventory: **stock numbers**, not full purchase/recipe/waste  
- Reservations: limited automatic seating/table lock  
- Loyalty points: mostly display unless extended  
- Service renewal: demo content  

Core dine-in → KOT → pay → settle and delivery GPS paths are production-shaped for local/demo use.
