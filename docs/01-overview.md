# 1. Overview

## Product

**DinePooja POS** is a full restaurant point-of-sale for dine-in, parcel, and delivery:

- Floor / table management with hall stages  
- Fast billing POS with GST  
- Kitchen Order Tickets (KOT)  
- Delivery partner assignment + live GPS / ETA  
- Cash drawer, expenses, customers, coupons  
- Reports and day close  
- Desktop (browser / PWA) and Android (Capacitor)

Brand focus: Indian restaurant ops (CGST/SGST, UPI/Cash/Card, Swiggy/Zomato-style tagging).

## Tech stack

| Layer | Technology |
|-------|------------|
| UI | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 |
| Auth | NextAuth (credentials JWT) |
| Database | Prisma 6 + SQLite (`prisma/dev.db`) |
| Mobile | Capacitor 8 (Android), PWA manifest + service worker |
| Icons | Lucide React |

Optional: `docker-compose.yml` for Postgres if you move off SQLite later.

## Environments

| Mode | Command | Use |
|------|---------|-----|
| Dev | `npm run dev` | Local coding |
| Dev (phones on LAN) | `npm run dev:mobile` | Bind `0.0.0.0` |
| Production | `npm run build` → `npm run start` | Desktop / server |
| Production + mobile LAN | `npm run start:mobile` | Phones install APK against this PC |

## Demo accounts

Password for **all**: `password123`

| Role | Email |
|------|--------|
| Owner | `owner@dinepooja.local` |
| Manager | `manager@dinepooja.local` |
| Cashier | `cashier@dinepooja.local` |
| Captain | `captain@dinepooja.local` |

Seed also creates sample menu, tables, halls, partners, customers, and coupons.
