# 3. User guide

Password for demo users: **`password123`**. Prefer **Owner** or **Manager** for full features.

---

## A. Dine-in (table) flow

1. Open **Tables**.  
2. Tap a vacant table → opens / resumes a POS order.  
3. On **POS**: pick category → add items → set guests if needed.  
4. **Send KOT** → kitchen sees tickets on **KOT**.  
5. Kitchen: Pending → Preparing → Ready → Served (or Delayed / Cancel).  
6. On POS: optional discount / coupon (Owner/Manager/Cashier).  
7. Take payment: **Cash / UPI / Card** (partial payments allowed until total is covered).  
8. **Print bill** → guest copy; order settles when paid in full; table returns to vacant.

**Hold:** park an open bill under **Hold Orders**, resume later. Opening the same table again resumes HOLD (does not create a second order).

---

## B. Parcel / takeaway

1. **POS** → create parcel order (or from Operations hub).  
2. Add items → KOT → pay → print.

---

## C. Delivery

1. Create a **Delivery** order (customer name / phone / address).  
2. Open **Delivery**.  
3. Assign a partner (seeded: Suresh Kumar, Imran Ali).  
4. Status: Pending → Assigned → Picked up → On the way → Arrived → **Delivered**.  
5. **Simulate GPS** (demo) or **Share GPS** (device / native app).  
6. Marking **Delivered** collects remaining amount as COD (cash), settles the order, updates cash drawer & stock.

Map shows hub, riders, and drop with distance / ETA.

---

## D. Kitchen (KOT)

- Filter by status; search by KOT #, order #, or table.  
- Print / reprint, merge, split, move items between KOTs.  
- Header **KOT No** search jumps to `/kot?q=…`.

---

## E. Orders history

Tabs: Current · Completed · Cancelled · Refunded · Online.  

Header **Bill No** search opens the matching open order in POS or settled bill page.

Online orders are tagged from POS (platform name); there is no live Swiggy/Zomato webhook yet.

---

## F. Cash & due

- **Cash**: opening / top-up / withdraw; POS cash sales post as `SALE_CASH`.  
- **Due Payment**: collect customer credit balances; jump to unpaid open orders.

---

## G. Menu & inventory

- **Menu**: categories, items, codes, variants, add-ons, availability.  
- **Menu Item On/Off**: quick 86’ing.  
- **Inventory**: live stock numbers; stock decreases when an order is settled.

---

## H. Reports & day close

- Sales / item / executive views.  
- Order data is **local only** (`prisma/dev.db` on this PC).  
- **Day close** (Owner/Manager):
  1. Settle/cancel all open bills first  
  2. Saves today’s totals into Day Close history  
  3. Deletes finished orders / KOTs / payments from local DB  
  4. Keeps menu, staff, customers, settings, and day-close summaries  
  5. Frees tables and resets delivery partners

---

## I. Displays & alerts

- **LED** / **Dual Screen**: guest-facing boards (auto-refresh).  
- **Alerts**: low stock, unpaid, operational warnings.

---

## Tips

- Use the Operations dashboard module grid for shortcuts.  
- Collapsed sidebar on POS keeps the billing screen wide.  
- Install as **PWA** on desktop tablets for fullscreen; use **Android APK** for phones (see [MOBILE.md](../MOBILE.md)).
