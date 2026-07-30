import type { Role } from "@prisma/client";

export type Permission =
  | "pos"
  | "tables"
  | "kot"
  | "menu"
  | "staff"
  | "settings"
  | "reports"
  | "void"
  | "discount"
  | "day_close"
  | "inventory"
  | "alerts"
  | "displays";

const rolePermissions: Record<Role, Permission[]> = {
  OWNER: [
    "pos",
    "tables",
    "kot",
    "menu",
    "staff",
    "settings",
    "reports",
    "void",
    "discount",
    "day_close",
    "inventory",
    "alerts",
    "displays",
  ],
  MANAGER: [
    "pos",
    "tables",
    "kot",
    "menu",
    "staff",
    "settings",
    "reports",
    "void",
    "discount",
    "day_close",
    "inventory",
    "alerts",
    "displays",
  ],
  CASHIER: ["pos", "tables", "kot", "reports", "discount", "alerts"],
  CAPTAIN: ["pos", "tables", "kot"],
};

export function can(role: Role, permission: Permission) {
  return rolePermissions[role]?.includes(permission) ?? false;
}

/** Sidebar tabs allowed per role — only necessary modules */
export type NavTab = {
  href: string;
  label: string;
  permission: Permission;
};

const allNavTabs: NavTab[] = [
  { href: "/dashboard", label: "Operations", permission: "settings" }, // owner/manager hub
  { href: "/pos", label: "POS", permission: "pos" },
  { href: "/tables", label: "Tables", permission: "tables" },
  { href: "/orders", label: "Orders History", permission: "pos" },
  { href: "/delivery", label: "Delivery", permission: "pos" },
  { href: "/menu", label: "Menu", permission: "menu" },
  { href: "/kot", label: "KOT", permission: "kot" },
  { href: "/led-display", label: "LED", permission: "displays" },
  { href: "/dual-screen", label: "Dual Screen", permission: "displays" },
  { href: "/alerts", label: "Alerts", permission: "alerts" },
  { href: "/reports", label: "Reports", permission: "reports" },
  { href: "/inventory", label: "Inventory", permission: "inventory" },
  { href: "/staff", label: "Staff", permission: "staff" },
  { href: "/settings", label: "Settings", permission: "settings" },
];

/** Captain: floor ops only — no full order history / reports noise */
const captainTabs: NavTab[] = [
  { href: "/pos", label: "POS", permission: "pos" },
  { href: "/tables", label: "Tables", permission: "tables" },
  { href: "/kot", label: "KOT", permission: "kot" },
  { href: "/orders", label: "Orders History", permission: "pos" },
];

/** Cashier: billing-focused */
const cashierTabs: NavTab[] = [
  { href: "/pos", label: "POS", permission: "pos" },
  { href: "/tables", label: "Tables", permission: "tables" },
  { href: "/orders", label: "Orders History", permission: "pos" },
  { href: "/delivery", label: "Delivery", permission: "pos" },
  { href: "/cash", label: "Cash", permission: "pos" },
  { href: "/kot", label: "KOT", permission: "kot" },
  { href: "/alerts", label: "Alerts", permission: "alerts" },
  { href: "/reports", label: "Reports", permission: "reports" },
];

/** Manager: run outlet, manage staff — no owner-only ops dashboard clutter optional; include ops */
const managerTabs: NavTab[] = [
  { href: "/dashboard", label: "Operations", permission: "settings" },
  { href: "/pos", label: "POS", permission: "pos" },
  { href: "/tables", label: "Tables", permission: "tables" },
  { href: "/orders", label: "Orders History", permission: "pos" },
  { href: "/delivery", label: "Delivery", permission: "pos" },
  { href: "/menu", label: "Menu", permission: "menu" },
  { href: "/kot", label: "KOT", permission: "kot" },
  { href: "/led-display", label: "LED", permission: "displays" },
  { href: "/dual-screen", label: "Dual Screen", permission: "displays" },
  { href: "/alerts", label: "Alerts", permission: "alerts" },
  { href: "/reports", label: "Reports", permission: "reports" },
  { href: "/inventory", label: "Inventory", permission: "inventory" },
  { href: "/staff", label: "Staff", permission: "staff" },
  { href: "/settings", label: "Settings", permission: "settings" },
];

export function navForRole(role: Role): NavTab[] {
  if (role === "CAPTAIN") return captainTabs.filter((t) => can(role, t.permission));
  if (role === "CASHIER") return cashierTabs.filter((t) => can(role, t.permission));
  if (role === "MANAGER") return managerTabs.filter((t) => can(role, t.permission));
  // OWNER — full set
  return allNavTabs.filter((t) => can(role, t.permission));
}
