# DinePooja POS

Restaurant point-of-sale (PetPooja-style): billing, KOT, tables, delivery GPS, GST, reports — web, PWA, and Android.

## Documentation

**Full docs:** [docs/README.md](./docs/README.md)

| Guide | Link |
|-------|------|
| Overview | [docs/01-overview.md](./docs/01-overview.md) |
| Setup | [docs/02-setup.md](./docs/02-setup.md) |
| User guide | [docs/03-user-guide.md](./docs/03-user-guide.md) |
| Modules | [docs/04-modules.md](./docs/04-modules.md) |
| Roles | [docs/05-roles.md](./docs/05-roles.md) |
| Architecture | [docs/06-architecture.md](./docs/06-architecture.md) |
| Mobile / APK | [MOBILE.md](./MOBILE.md) |

## Quick start

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Demo logins

Password for all: `password123`

| Role    | Email                   |
|---------|-------------------------|
| Owner   | owner@dinepooja.local    |
| Manager | manager@dinepooja.local  |
| Cashier | cashier@dinepooja.local  |
| Captain | captain@dinepooja.local  |

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind  
- Prisma + SQLite (local); optional Postgres via `docker-compose.yml`  
- NextAuth roles: Owner / Manager / Cashier / Captain  
- Capacitor Android + PWA  

## Core flows

1. **Tables** → open table → **POS** items → **Send KOT**  
2. **KOT** → preparing / served / reprint  
3. Pay Cash / UPI / Card → print bill  
4. **Delivery** → assign partner → GPS → Delivered (COD)  
5. **Reports** → day close  

## Install as an app

- **Desktop:** Chrome/Edge → Install app (PWA)  
- **Android:** see [MOBILE.md](./MOBILE.md) (build APK in Android Studio)
