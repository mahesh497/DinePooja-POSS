# 2. Setup

## Requirements

- Node.js 20+ (tested with 22)
- npm 10+
- Git  
- For Android APK: [Android Studio](https://developer.android.com/studio) + SDK

## Install

```bash
cd restaurant-pos
npm install
```

`postinstall` runs `prisma generate`.

## Environment (`.env`)

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="change-me-to-a-long-random-string"
```

For phones on Wi‑Fi, use your LAN IP:

```env
NEXTAUTH_URL="http://192.168.x.x:3000"
```

Also set the same host in `capacitor.config.ts` (or `CAPACITOR_SERVER_URL`) before syncing the Android app.

## Database

```bash
npm run db:push    # sync schema → SQLite
npm run db:seed    # demo outlet, users, menu, tables, partners
```

Reset (destroys local data):

```bash
npm run db:reset
```

> Force-reset is blocked for AI agents without explicit consent; run locally yourself if needed.

## Run

```bash
npm run dev                 # http://localhost:3000
npm run build && npm start  # production
npm run start:mobile        # production, reachable on LAN
```

Health check: `GET /api/health` → `{ "ok": true }`

## Useful scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Next.js dev server |
| `npm run dev:mobile` | Dev on `0.0.0.0:3000` |
| `npm run build` | Prisma generate + Next build |
| `npm run start` / `start:mobile` | Production server |
| `npm run db:push` / `db:seed` / `db:reset` | Database |
| `npm run cap:sync` | Sync Capacitor Android |
| `npm run mobile:android` | Sync + open Android Studio |
| `npm run lint` | ESLint |

## Project layout (high level)

```
prisma/           schema + seed
src/app/          routes (auth, dashboard pages, API)
src/components/   UI boards (POS, tables, KOT, delivery, …)
src/lib/actions/  server actions (orders, delivery, admin, …)
src/lib/          auth, permissions, tax, prisma, modules
android/          Capacitor Android project
mobile/www/       fallback shell HTML for Capacitor
docs/             this documentation
MOBILE.md         Android build & share guide
```

## Windows notes

- If `prisma generate` fails with **EPERM** on `query_engine-windows.dll.node`, stop all `node` processes and retry.
- NextAuth catch-all lives at `src/app/api/auth/[...nextauth]/route.ts`.
