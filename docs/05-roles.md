# 5. Roles & permissions

Defined in `src/lib/permissions.ts`. Middleware route guards: `src/middleware.ts`.

## Roles

| Role | Intent |
|------|--------|
| **OWNER** | Full outlet control |
| **MANAGER** | Run outlet + staff (same permissions as owner in code) |
| **CASHIER** | Billing, tables, KOT, delivery, cash, alerts, reports |
| **CAPTAIN** | Floor: POS, tables, KOT, limited order history |

## Permission keys

`pos` · `tables` · `kot` · `menu` · `staff` · `settings` · `reports` · `void` · `discount` · `day_close` · `inventory` · `alerts` · `displays`

| Permission | Owner | Manager | Cashier | Captain |
|------------|:-----:|:-------:|:-------:|:-------:|
| pos | ✓ | ✓ | ✓ | ✓ |
| tables | ✓ | ✓ | ✓ | ✓ |
| kot | ✓ | ✓ | ✓ | ✓ |
| menu | ✓ | ✓ | | |
| staff | ✓ | ✓ | | |
| settings | ✓ | ✓ | | |
| reports | ✓ | ✓ | ✓ | |
| void | ✓ | ✓ | | |
| discount | ✓ | ✓ | ✓ | |
| day_close | ✓ | ✓ | | |
| inventory | ✓ | ✓ | | |
| alerts | ✓ | ✓ | ✓ | |
| displays | ✓ | ✓ | | |

## Sidebar by role

- **Owner**: Operations, POS, Tables, Orders, Delivery, Menu, KOT, LED, Dual, Alerts, Reports, Inventory, Staff, Settings  
- **Manager**: same as Owner (manager tab list)  
- **Cashier**: POS, Tables, Orders, Delivery, Cash, KOT, Alerts, Reports  
- **Captain**: POS, Tables, KOT, Orders History  

Extra modules still reachable from Operations hub / deep links when the role’s permission allows the page’s `requirePermission(…)`.

## Practical rules

- Coupons / discounts on POS require `discount` (Captain does not see/apply).  
- Void needs `void`.  
- Day close needs `day_close`.  
- Staff & Settings pages: Owner/Manager only (middleware).
