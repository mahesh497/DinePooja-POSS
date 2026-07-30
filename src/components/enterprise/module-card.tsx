"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Banknote,
  Bell,
  ClipboardList,
  CreditCard,
  HelpCircle,
  LayoutGrid,
  Package,
  Printer,
  RefreshCw,
  ShoppingBag,
  Store,
  Table2,
  Truck,
  UtensilsCrossed,
  Wallet,
  Users,
  Receipt,
  BarChart3,
  Tag,
  CalendarDays,
  PauseCircle,
  Wifi,
  MonitorSmartphone,
  Monitor,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { ModuleDef } from "@/lib/modules";

const iconMap: Record<string, LucideIcon> = {
  orders: ClipboardList,
  online: ShoppingBag,
  kots: UtensilsCrossed,
  due: CreditCard,
  billing: Receipt,
  print: Printer,
  tables: Table2,
  status: Layers,
  delivery: Truck,
  cashflow: Wallet,
  expense: Banknote,
  withdraw: Banknote,
  topup: Banknote,
  counter: Banknote,
  menu: LayoutGrid,
  itemtoggle: Tag,
  tax: Receipt,
  customers: Users,
  feedback: Bell,
  led: MonitorSmartphone,
  inventory: Package,
  dual: Monitor,
  profile: Users,
  sync: RefreshCw,
  alerts: AlertTriangle,
  renewal: Store,
  help: HelpCircle,
  reports: BarChart3,
  "item-report": BarChart3,
  executive: BarChart3,
  reservations: CalendarDays,
  coupons: Tag,
  hold: PauseCircle,
  store: Store,
  settings: Store,
};

export function ModuleCard({ mod }: { mod: ModuleDef }) {
  const router = useRouter();
  const Icon = iconMap[mod.id] ?? Wifi;

  return (
    <Link
      href={mod.href}
      title={mod.shortcut ? `Shortcut: ${mod.shortcut}` : mod.title}
      onClick={(e) => {
        // allow middle click etc
        if (e.metaKey || e.ctrlKey) return;
      }}
      className={cn(
        "card card-hover group relative flex min-h-[118px] flex-col justify-between p-4 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      )}
      onKeyDown={(e) => {
        if (e.key === "Enter") router.push(mod.href);
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
          <Icon className="h-5 w-5" />
        </span>
        {mod.shortcut ? (
          <span className="rounded-md border border-[var(--line)] bg-[var(--chip)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--muted)]">
            {mod.shortcut}
          </span>
        ) : null}
      </div>
      <div>
        <p className="font-semibold text-[var(--ink)] group-hover:text-[var(--accent)]">{mod.title}</p>
        <p className="mt-1 line-clamp-2 text-xs text-[var(--muted)]">{mod.description}</p>
      </div>
    </Link>
  );
}
