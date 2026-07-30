export type ModuleDef = {
  id: string;
  title: string;
  href: string;
  group: "operations" | "billing" | "reports" | "inventory" | "crm" | "settings";
  shortcut?: string;
  description: string;
  live?: boolean;
};

export const APP_VERSION = "124.0.5";

export const modules: ModuleDef[] = [
  { id: "orders", title: "Orders History", href: "/orders", group: "operations", shortcut: "O", description: "Current, completed, cancelled & online orders", live: true },
  { id: "online", title: "Online Orders", href: "/online-orders", group: "operations", shortcut: "N", description: "Swiggy, Zomato, Magicpin, website", live: true },
  { id: "kots", title: "KOTs", href: "/kot", group: "operations", shortcut: "K", description: "Kitchen tickets & cooking status", live: true },
  { id: "due", title: "Due Payment", href: "/due-payments", group: "billing", shortcut: "U", description: "Pending & credit collections", live: true },
  { id: "billing", title: "POS", href: "/pos", group: "operations", shortcut: "B", description: "Fast billing & new order", live: true },
  { id: "print", title: "Bill / KOT Print", href: "/print-center", group: "billing", description: "Reprint bills & KOTs", live: true },
  { id: "tables", title: "Tables", href: "/tables", group: "operations", shortcut: "T", description: "Halls, merge, move, status colors", live: true },
  { id: "status", title: "Custom Order Status", href: "/order-status", group: "operations", description: "Pending, cooking, ready, served", live: true },
  { id: "delivery", title: "Delivery Partners", href: "/delivery", group: "operations", shortcut: "D", description: "Assign, live GPS, ETA tracking", live: true },
  { id: "cashflow", title: "Cash Flow", href: "/cash", group: "billing", shortcut: "C", description: "Register, top-up, withdrawal", live: true },
  { id: "expense", title: "Expense", href: "/expenses", group: "billing", description: "Daily expenses & categories", live: true },
  { id: "withdraw", title: "Withdrawal", href: "/cash?tab=withdraw", group: "billing", description: "Cash drawer withdrawals", live: true },
  { id: "topup", title: "Cash Top Up", href: "/cash?tab=topup", group: "billing", description: "Add cash to register", live: true },
  { id: "counter", title: "Currency Counter", href: "/currency-counter", group: "billing", description: "Denomination cash count", live: true },
  { id: "menu", title: "Menu", href: "/menu", group: "operations", shortcut: "M", description: "Categories, items, codes, modifiers", live: true },
  { id: "itemtoggle", title: "Menu Item On/Off", href: "/menu-availability", group: "operations", description: "Toggle availability instantly", live: true },
  { id: "tax", title: "Tax", href: "/tax", group: "settings", description: "GST, CGST, SGST, service charge", live: true },
  { id: "customers", title: "Customers", href: "/customers", group: "crm", shortcut: "G", description: "Profiles, loyalty, credit", live: true },
  { id: "feedback", title: "Feedback", href: "/feedback", group: "crm", description: "Ratings & reviews", live: true },
  { id: "led", title: "LED Display", href: "/led-display", group: "operations", description: "Customer-facing display", live: true },
  { id: "inventory", title: "Inventory", href: "/inventory", group: "inventory", shortcut: "I", description: "Stock, purchase, recipes, waste", live: true },
  { id: "dual", title: "Dual Screen", href: "/dual-screen", group: "operations", description: "Second display for guests", live: true },
  { id: "profile", title: "Staff", href: "/staff", group: "settings", description: "Users, roles, permissions", live: true },
  { id: "sync", title: "Manual Sync", href: "/sync", group: "settings", description: "Offline sync & cloud backup", live: true },
  { id: "alerts", title: "Alerts", href: "/alerts", group: "operations", description: "Low stock, due bills, renewals", live: true },
  { id: "renewal", title: "Service Renewal", href: "/service-renewal", group: "settings", description: "Subscription & renewals", live: true },
  { id: "help", title: "Help", href: "/help", group: "settings", shortcut: "?", description: "Shortcuts, guides, support", live: true },
  { id: "reports", title: "Reports", href: "/reports", group: "reports", shortcut: "R", description: "Sales, item, captain, executive", live: true },
  { id: "item-report", title: "Item Report", href: "/reports/items", group: "reports", description: "Category & item sales", live: true },
  { id: "executive", title: "Executive Sales", href: "/reports/executive", group: "reports", description: "Net sales & collections", live: true },
  { id: "reservations", title: "Reservations", href: "/reservations", group: "operations", description: "Table booking & waitlist", live: true },
  { id: "coupons", title: "Coupons", href: "/coupons", group: "crm", description: "Offers, gift cards, loyalty", live: true },
  { id: "hold", title: "Hold Orders", href: "/hold-orders", group: "billing", description: "Park and resume bills", live: true },
  { id: "store", title: "Store", href: "/store", group: "settings", description: "Outlet / branch profile", live: true },
  { id: "settings", title: "Settings", href: "/settings", group: "settings", shortcut: "S", description: "Printers, taxes, theme, sync", live: true },
];

export const sidebarSections = [
  { label: "Operations", href: "/dashboard", ids: ["orders", "online", "delivery", "status", "reservations"] },
  { label: "POS", href: "/pos", ids: ["billing", "due", "print", "cashflow", "hold"] },
  { label: "Tables", href: "/tables", ids: ["tables"] },
  { label: "Orders History", href: "/orders", ids: ["orders"] },
  { label: "Menu", href: "/menu", ids: ["menu", "itemtoggle"] },
  { label: "KOT", href: "/kot", ids: ["kots"] },
  { label: "LED", href: "/led-display", ids: ["led"] },
  { label: "Dual Screen", href: "/dual-screen", ids: ["dual"] },
  { label: "Alerts", href: "/alerts", ids: ["alerts"] },
  { label: "Reports", href: "/reports", ids: ["reports", "item-report", "executive"] },
  { label: "Inventory", href: "/inventory", ids: ["inventory"] },
  { label: "Staff", href: "/staff", ids: ["profile"] },
  { label: "CRM", href: "/customers", ids: ["customers", "feedback", "coupons"] },
  { label: "Settings", href: "/settings", ids: ["settings", "tax", "store", "sync", "help"] },
] as const;
