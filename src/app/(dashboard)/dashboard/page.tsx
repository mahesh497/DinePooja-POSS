import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { ModuleCard } from "@/components/enterprise/module-card";
import { modules } from "@/lib/modules";
import { can, navForRole } from "@/lib/permissions";
import { requireSession } from "@/lib/session";

const modulePermission: Record<string, Parameters<typeof can>[1]> = {
  orders: "pos",
  online: "pos",
  kots: "kot",
  due: "pos",
  billing: "pos",
  print: "pos",
  tables: "tables",
  status: "pos",
  delivery: "pos",
  cashflow: "reports",
  expense: "settings",
  withdraw: "reports",
  topup: "reports",
  counter: "reports",
  menu: "menu",
  itemtoggle: "menu",
  tax: "settings",
  customers: "pos",
  feedback: "pos",
  led: "displays",
  inventory: "inventory",
  dual: "displays",
  profile: "staff",
  sync: "settings",
  alerts: "alerts",
  renewal: "settings",
  help: "pos",
  reports: "reports",
  "item-report": "reports",
  executive: "reports",
  reservations: "tables",
  coupons: "settings",
  hold: "pos",
  store: "settings",
  settings: "settings",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireSession();
  const role = session.user.role as Role;

  if (!can(role, "settings")) {
    const home = navForRole(role)[0]?.href || "/pos";
    redirect(home);
  }

  const { q } = await searchParams;
  const query = (q || "").trim().toLowerCase();
  const filtered = modules.filter((m) => {
    const perm = modulePermission[m.id] || "pos";
    if (!can(role, perm)) return false;
    if (!query) return true;
    return (
      m.title.toLowerCase().includes(query) ||
      m.description.toLowerCase().includes(query) ||
      m.group.includes(query)
    );
  });

  const groups = [
    { key: "operations", label: "Operations" },
    { key: "billing", label: "Billing" },
    { key: "reports", label: "Reports" },
    { key: "inventory", label: "Inventory" },
    { key: "crm", label: "CRM" },
    { key: "settings", label: "Settings" },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl">Operations Dashboard</h1>
          <p className="text-sm text-[var(--muted)]">
            Welcome, {session.user.name} ({role}). Shortcuts: O Orders · T Tables · K KOT · B POS · U Staff
          </p>
        </div>
        {query ? (
          <p className="rounded-full bg-[var(--chip)] px-3 py-1 text-xs">
            Showing results for “{q}”
          </p>
        ) : null}
      </div>

      {groups.map((group) => {
        const items = filtered.filter((m) => m.group === group.key);
        if (!items.length) return null;
        return (
          <section key={group.key} className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
              {group.label}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {items.map((mod) => (
                <ModuleCard key={mod.id} mod={mod} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
