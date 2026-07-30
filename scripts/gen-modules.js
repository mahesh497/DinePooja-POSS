const fs = require("fs");
const path = require("path");

const pages = [
  ["online-orders", "Online Orders", "Swiggy, Zomato, Magicpin, PhonePe & own website in one queue", "ShoppingBag", [["Swiggy", "Accept, reject, mark prepared"], ["Zomato", "Menu sync & order push"], ["Magicpin", "Offers-linked orders"], ["Own website", "Direct online ordering"], ["Driver assign", "Map rider to order"], ["Timeline", "Track status changes"]]],
  ["due-payments", "Due Payments", "Credit bills, partial dues and collections", "CreditCard", [["Open dues", "Unpaid settled balances"], ["Customer credit", "Credit limit tracking"], ["Collect", "Cash / UPI / Card against due"], ["Reminders", "SMS / WhatsApp nudges"]]],
  ["print-center", "Bill / KOT Print", "Reprint bills, KOTs, duplicates and labels", "Printer", [["Bill reprint", "Duplicate GST invoice"], ["KOT reprint", "Kitchen copy"], ["Label printer", "Parcel labels"], ["Thermal", "80mm / 58mm profiles"]]],
  ["order-status", "Custom Order Status", "Pending, cooking, ready, served, delayed, cancelled", "Layers", [["Pending", "Awaiting kitchen"], ["Cooking", "In progress"], ["Ready", "Ready for serve/pickup"], ["Served", "Completed at table"], ["Delayed", "SLA breach"], ["Cancelled", "Voided tickets"]]],
  ["delivery", "Delivery Boys", "Availability, assignment, GPS, ratings", "Truck", [["Live status", "Available / busy / offline"], ["Assigned orders", "Active deliveries"], ["GPS", "Live tracking"], ["Performance", "On-time %, ratings"]]],
  ["cash", "Cash Management", "Cash flow, top-up, withdrawal, settlement", "Wallet", [["Opening balance", "Start of day"], ["Cash top up", "Add float"], ["Withdrawal", "Safe drops"], ["Closing", "Day settlement"]]],
  ["expenses", "Expenses", "Track daily restaurant expenses", "Banknote", [["Categories", "Rent, utilities, supplies"], ["Attachments", "Bill photos"], ["Approvals", "Manager sign-off"], ["Reports", "Expense summary"]]],
  ["currency-counter", "Currency Counter", "Denomination-wise cash counting", "Banknote", [["Notes", "2000 to 10"], ["Coins", "10 to 1"], ["Variance", "Vs expected drawer"], ["Print count", "Cashier sheet"]]],
  ["menu-availability", "Menu Item On / Off", "Toggle items by stock or rush", "Tag", [["Bulk off", "Disable category"], ["86 item", "Mark sold out"], ["Time based", "Breakfast / dinner menus"], ["Sync online", "Push to aggregators"]]],
  ["tax", "Tax Settings", "GST, CGST, SGST, service & packing", "Receipt", [["CGST / SGST", "Outlet tax rates"], ["Service charge", "Optional %"], ["HSN", "Item tax mapping"], ["GSTIN", "Invoice compliance"]]],
  ["customers", "Customers", "Profiles, loyalty, wallet, credit", "Users", [["Profile", "Phone, GST, address"], ["Loyalty", "Reward points"], ["Wallet", "Store credit"], ["History", "Past orders"]]],
  ["feedback", "Feedback", "Guest ratings and comments", "Bell", [["Table feedback", "Post-bill survey"], ["Online reviews", "Aggregator scores"], ["Alerts", "Low rating notify"], ["Reports", "CSAT trends"]]],
  ["led-display", "LED Display", "Customer-facing running total", "MonitorSmartphone", [["Cart mirror", "Live items"], ["Total", "Grand total display"], ["Offers", "Promo banner"], ["Thank you", "After payment"]]],
  ["inventory", "Inventory", "Stock, purchase, recipes, waste", "Package", [["Stock", "On-hand qty"], ["Purchase", "Supplier GRN"], ["Recipes", "Item consumption"], ["Waste", "Wastage logs"], ["Low stock", "Alerts"], ["Transfers", "Branch transfer"]]],
  ["dual-screen", "Dual Screen", "Second display for guests", "Monitor", [["Guest cart", "Itemized view"], ["Ads", "Promo media"], ["Payment QR", "UPI QR panel"], ["Thank you", "Receipt screen"]]],
  ["sync", "Manual Sync", "Offline queue, cloud backup, updates", "RefreshCw", [["Push local", "Upload pending"], ["Pull cloud", "Download masters"], ["Backup", "Snapshot DB"], ["Check updates", "Version 124.0.5"]]],
  ["alerts", "Alerts", "Low stock, dues, renewals, kitchen delay", "AlertTriangle", [["Stock", "Below reorder"], ["Dues", "Unpaid bills"], ["KOT delay", "Kitchen SLA"], ["Renewal", "Subscription"]]],
  ["service-renewal", "Service Renewal", "Subscription, invoices, renew", "Store", [["Plan", "Current package"], ["Invoice", "Renewal bill"], ["Pay online", "UPI / card"], ["History", "Past renewals"]]],
  ["help", "Help & Shortcuts", "Guides, keyboard map, support", "HelpCircle", [["Shortcuts", "O T K B M R S"], ["Guides", "How to bill"], ["WhatsApp", "Support chat"], ["FAQ", "Common issues"]]],
  ["reservations", "Reservations", "Table booking & waitlist", "CalendarDays", [["Book table", "Date time guests"], ["Waitlist", "Walk-in queue"], ["Reminders", "SMS confirm"], ["No-show", "Auto release"]]],
  ["coupons", "Coupons & Loyalty", "Offers, gift cards, reward points", "Tag", [["Coupons", "% or flat"], ["Gift cards", "Sell / redeem"], ["Loyalty", "Points earn/burn"], ["Campaigns", "SMS blasts"]]],
  ["hold-orders", "Hold Orders", "Park bills and resume later", "PauseCircle", [["Hold", "Park current cart"], ["Resume", "Restore held bill"], ["Expire", "Auto clear"], ["Transfer", "Move to table"]]],
  ["store", "Store", "Outlet / branch profile", "Store", [["Profile", "Name, GSTIN, address"], ["Branches", "Multi-outlet"], ["Timings", "Open hours"], ["FSSAI", "License info"]]],
];

for (const [slug, title, subtitle, icon, features] of pages) {
  const featureLiteral = features
    .map(([t, d]) => `          { title: ${JSON.stringify(t)}, detail: ${JSON.stringify(d)} }`)
    .join(",\n");
  const content = `import { ${icon} } from "lucide-react";
import { FeatureGrid, ModulePage, StatRow } from "@/components/enterprise/module-page";
import { requireSession } from "@/lib/session";

export default async function Page() {
  await requireSession();
  return (
    <ModulePage
      title="${title}"
      subtitle="${subtitle}"
      icon={${icon}}
    >
      <StatRow
        stats={[
          { label: "Today", value: "—" },
          { label: "Open", value: "—" },
          { label: "Pending", value: "—" },
          { label: "Synced", value: "Live" },
        ]}
      />
      <FeatureGrid
        items={[
${featureLiteral}
        ]}
      />
    </ModulePage>
  );
}
`;
  const dir = path.join("src/app/(dashboard)", slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "page.tsx"), content);
  console.log("wrote", slug);
}
