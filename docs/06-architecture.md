# 6. Architecture

## Request flow

```
Browser / PWA / Capacitor WebView
        │
        ▼
Next.js App Router (RSC pages + client boards)
        │
        ├── NextAuth session (JWT)
        ├── Server Actions ("use server")  → Prisma → SQLite
        └── API routes (/api/auth, /api/health)
```

## Important folders

| Path | Role |
|------|------|
| `src/app/(auth)/login` | Login page |
| `src/app/(dashboard)/*` | Authenticated screens |
| `src/components/*` | Client boards (POS, tables, KOT, delivery, …) |
| `src/components/enterprise/*` | Shell, module page chrome |
| `src/lib/actions/orders.ts` | Open table, items, pay, settle, stock |
| `src/lib/actions/delivery.ts` | Partners, assign, GPS, delivery status |
| `src/lib/actions/table-ops.ts` | Table merge/move, driver alias |
| `src/lib/actions/services.ts` | Customers, cash, coupons, hold, credit collect |
| `src/lib/actions/admin.ts` | Menu/staff/settings admin |
| `src/lib/auth.ts` | NextAuth options |
| `src/lib/permissions.ts` | Role → permission → nav |
| `src/lib/tax.ts` | GST helpers / INR format |
| `src/lib/delivery-geo.ts` | Distance / ETA (client-safe) |
| `src/lib/device-gps.ts` | Capacitor or browser geolocation |
| `prisma/schema.prisma` | Data model |
| `android/` | Native Android shell |

## Data model (summary)

**Outlet** owns users, halls, tables, menu, orders, cash, customers, coupons, delivery partners.

**Order** — type (`DINE_IN` / `PARCEL` / `DELIVERY`), status (`OPEN` / `HOLD` / `SETTLED` / …), GST totals, payments, optional `deliveryBoy`, `deliveryStatus`, rider/dest GPS.

**OrderItem** → optional **MenuItem** (stock decrement on settle).

**Kot** + **KotItem** — kitchen tickets by station.

**Payment** — `CASH` | `UPI` | `CARD`. Cash payments also create **CashEntry** `SALE_CASH`.

**DeliveryBoy** — duty (`AVAILABLE` / `ON_TRIP` / `OFFLINE`), lat/lng, vehicle.

**Customer** — loyalty + `creditBalance` (collect via Due Payments).

**AuditLog** — voids, delivery status, sync heartbeats, credit collect.

## Auth

- Credentials provider; bcrypt password hashes.  
- JWT session carries `id`, `role`, `outletId`, `outletName`.  
- JWT refresh reloads user from DB (survives reseed ID changes).  
- Set `NEXTAUTH_URL` to the exact origin phones/browsers use.

## Mobile architecture

Capacitor app (`com.dinepooja.pos`) does **not** embed a static Next export. It loads the live server URL (`capacitor.config.ts` → `server.url`) so SSR, auth, and Prisma keep working. Phone and server must share network (or use a public HTTPS deploy).

See [MOBILE.md](../MOBILE.md).

## Conventions for contributors

- Prefer server actions + `revalidatePath` over ad-hoc APIs.  
- Keep pure geo helpers out of `"use server"` files (use `delivery-geo.ts`).  
- Gate UI with `can(role, permission)` to match server `requirePermission`.  
- This Next.js version may differ from older training data — check `node_modules/next/dist/docs/` and `AGENTS.md`.
