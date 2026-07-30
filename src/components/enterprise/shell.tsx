"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { Role } from "@prisma/client";
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  Search,
  Settings,
  Wifi,
  WifiOff,
  AlertTriangle,
  ClipboardList,
  PauseCircle,
  Store,
  Tag,
  LayoutDashboard,
  FileBarChart2,
  Receipt,
  Package,
  Table2,
  History,
  BookOpen,
  ChefHat,
  Monitor,
  PanelsTopLeft,
  Users,
  Bike,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { LiveClock } from "@/components/enterprise/live-clock";
import { APP_VERSION } from "@/lib/modules";
import { can, navForRole } from "@/lib/permissions";
import { cn } from "@/lib/cn";

type ShellProps = {
  outletName: string;
  outletId: string;
  userName: string;
  role: string;
  children: React.ReactNode;
};

const iconByHref: Record<string, LucideIcon> = {
  "/dashboard": LayoutDashboard,
  "/pos": Receipt,
  "/tables": Table2,
  "/orders": History,
  "/delivery": Bike,
  "/cash": Wallet,
  "/menu": BookOpen,
  "/kot": ChefHat,
  "/led-display": Monitor,
  "/dual-screen": PanelsTopLeft,
  "/alerts": AlertTriangle,
  "/reports": FileBarChart2,
  "/inventory": Package,
  "/staff": Users,
  "/settings": Settings,
};

export function EnterpriseShell({
  outletName,
  outletId,
  userName,
  role,
  children,
}: ShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [online, setOnline] = useState(true);
  const [billQuery, setBillQuery] = useState("");
  const [kotQuery, setKotQuery] = useState("");
  const [globalQuery, setGlobalQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  const typedRole = role as Role;
  const sideLinks = useMemo(() => navForRole(typedRole), [typedRole]);
  const allowedHrefs = useMemo(() => new Set(sideLinks.map((l) => l.href)), [sideLinks]);
  const homeHref = sideLinks[0]?.href || "/pos";

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    setOnline(navigator.onLine);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const key = e.key.toLowerCase();
      const map: Record<string, string> = {
        o: "/orders",
        t: "/tables",
        k: "/kot",
        b: "/pos",
        m: "/menu",
        r: "/reports",
        s: "/settings",
        u: "/staff",
      };
      const href = map[key];
      if (href && allowedHrefs.has(href) && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        router.push(href);
      }
      if (key === "escape") setMobileOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, allowedHrefs]);

  const shortId = useMemo(() => outletId.slice(-8).toUpperCase(), [outletId]);
  const isPosScreen = pathname === "/pos" || pathname.startsWith("/pos/");
  const isBillingWorkspace = isPosScreen || pathname.startsWith("/bill/");

  useEffect(() => {
    if (isBillingWorkspace) setCollapsed(true);
  }, [isBillingWorkspace]);

  function searchBill(e: FormEvent) {
    e.preventDefault();
    if (!billQuery.trim()) return;
    router.push(`/orders?bill=${encodeURIComponent(billQuery.trim())}`);
  }

  function searchKot(e: FormEvent) {
    e.preventDefault();
    if (!kotQuery.trim()) return;
    router.push(`/kot?q=${encodeURIComponent(kotQuery.trim())}`);
  }

  function searchGlobal(e: FormEvent) {
    e.preventDefault();
    if (!globalQuery.trim()) return;
    router.push(`/dashboard?q=${encodeURIComponent(globalQuery.trim())}`);
  }

  const showHeaderExtras = can(typedRole, "settings") || can(typedRole, "menu");

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-white">
        <div className="flex h-[var(--header-h)] items-center gap-2 px-3 lg:gap-3 lg:px-4">
          <button
            type="button"
            className="rounded-lg border border-[var(--line)] p-2 lg:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Menu"
          >
            <Menu className="h-4 w-4" />
          </button>

          <Link href={homeHref} className="flex shrink-0 items-center gap-2">
            <BrandLogo size={34} />
            <div className="hidden min-w-0 sm:block">
              <p className="font-[family-name:var(--font-display)] text-base leading-tight text-[var(--accent)]">
                DinePooja
              </p>
              <p className="truncate text-[10px] text-[var(--muted)]">
                {outletName} · ID {shortId}
              </p>
            </div>
          </Link>

          {allowedHrefs.has("/pos") ? (
            <Link
              href="/pos"
              className="shrink-0 rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white hover:opacity-90"
            >
              New Order
            </Link>
          ) : null}

          {!isPosScreen && can(typedRole, "pos") ? (
            <>
              <form onSubmit={searchBill} className="hidden md:block">
                <input
                  value={billQuery}
                  onChange={(e) => setBillQuery(e.target.value)}
                  placeholder="Bill No"
                  className="w-24 rounded-lg border border-[var(--line)] bg-[var(--chip)] px-2 py-1.5 text-xs lg:w-28"
                />
              </form>
              <form onSubmit={searchKot} className="hidden md:block">
                <input
                  value={kotQuery}
                  onChange={(e) => setKotQuery(e.target.value)}
                  placeholder="KOT No"
                  className="w-24 rounded-lg border border-[var(--line)] bg-[var(--chip)] px-2 py-1.5 text-xs lg:w-28"
                />
              </form>
              {can(typedRole, "settings") ? (
                <form onSubmit={searchGlobal} className="relative hidden min-w-0 flex-1 lg:block">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]" />
                  <input
                    value={globalQuery}
                    onChange={(e) => setGlobalQuery(e.target.value)}
                    placeholder="Global search — items, customers, orders"
                    className="w-full rounded-lg border border-[var(--line)] bg-[var(--chip)] py-1.5 pl-8 pr-3 text-xs"
                  />
                </form>
              ) : (
                <div className="hidden flex-1 lg:block" />
              )}
            </>
          ) : isPosScreen ? (
            <div className="hidden min-w-0 flex-1 md:block">
              <p className="truncate text-xs font-semibold text-[var(--ink)]">Billing workspace</p>
              <p className="truncate text-[10px] text-[var(--muted)]">
                Categories · items · order — use sidebar for other modules
              </p>
            </div>
          ) : (
            <div className="hidden flex-1 lg:block" />
          )}

          <div className="ml-auto flex items-center gap-1 text-[var(--muted)]">
            {allowedHrefs.has("/alerts") ? (
              <HeaderIcon href="/alerts" label="Alerts" icon={AlertTriangle} />
            ) : null}
            {allowedHrefs.has("/orders") ? (
              <HeaderIcon href="/orders" label="Orders" icon={ClipboardList} />
            ) : null}
            {can(typedRole, "pos") && typedRole !== "CAPTAIN" ? (
              <HeaderIcon href="/hold-orders" label="Hold Orders" icon={PauseCircle} />
            ) : null}
            {can(typedRole, "menu") ? (
              <HeaderIcon href="/menu-availability" label="Item On/Off" icon={Tag} />
            ) : null}
            {showHeaderExtras ? <HeaderIcon href="/store" label="Store" icon={Store} /> : null}
            <div
              className={cn(
                "hidden items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold sm:inline-flex",
                online ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
              )}
              title={online ? "Online — syncing" : "Offline — local mode"}
            >
              {online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {online ? "Online" : "Offline"}
            </div>
            {!isPosScreen ? (
              <div className="hidden text-[10px] text-[var(--muted)] xl:block">
                <LiveClock />
              </div>
            ) : null}
            <div className="hidden text-right text-[10px] leading-tight lg:block">
              <p className="font-semibold text-[var(--ink)]">{userName}</p>
              <p>{role}</p>
            </div>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="rounded-lg border border-[var(--line)] p-2 hover:bg-[var(--chip)]"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
        {!isPosScreen ? (
          <div className="flex items-center justify-between border-t border-[var(--line)] px-3 py-1 text-[10px] text-[var(--muted)] lg:px-4">
            <span>Ref · {shortId}</span>
            <span>Biller · {userName}</span>
            <span>Version {APP_VERSION}</span>
          </div>
        ) : null}
      </header>

      <div className="flex">
        <aside
          className={cn(
            "sticky z-40 hidden shrink-0 flex-col border-r border-[var(--line)] bg-white transition-all lg:flex",
            isPosScreen
              ? "top-[var(--header-h)] h-[calc(100vh-var(--header-h))]"
              : "top-[calc(var(--header-h)+28px)] h-[calc(100vh-var(--header-h)-28px)]",
            collapsed ? "w-[var(--sidebar-w-collapsed)]" : "w-[var(--sidebar-w)]"
          )}
        >
          <div className="flex items-center justify-between border-b border-[var(--line)] p-3">
            {!collapsed ? (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{outletName}</p>
                <p className="text-[10px] text-[var(--muted)]">{role} · Restaurant POS</p>
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              className="rounded-lg border border-[var(--line)] p-1.5 hover:bg-[var(--chip)]"
              aria-label="Collapse sidebar"
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto p-2">
            {sideLinks.map((link) => {
              const active = pathname === link.href || pathname.startsWith(link.href + "/");
              const Icon = iconByHref[link.href] || LayoutDashboard;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                    active
                      ? "bg-[var(--accent-soft)] font-semibold text-[var(--accent)]"
                      : "text-[var(--muted)] hover:bg-[var(--chip)] hover:text-[var(--ink)]"
                  )}
                  title={link.label}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed ? <span>{link.label}</span> : null}
                </Link>
              );
            })}
          </nav>
          <div className="space-y-1 border-t border-[var(--line)] p-2 text-xs">
            {can(typedRole, "settings") ? (
              <Link href="/sync" className="block rounded-lg px-3 py-2 text-[var(--muted)] hover:bg-[var(--chip)]">
                {!collapsed ? "Check Updates" : "↻"}
              </Link>
            ) : null}
            <Link href="/help" className="block rounded-lg px-3 py-2 text-[var(--muted)] hover:bg-[var(--chip)]">
              {!collapsed ? "Help" : "?"}
            </Link>
            {!collapsed ? (
              <p className="px-3 py-2 text-[10px] text-[var(--muted)]">Version {APP_VERSION}</p>
            ) : null}
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[var(--danger)] hover:bg-red-50"
            >
              <LogOut className="h-3.5 w-3.5" />
              {!collapsed ? "Logout" : null}
            </button>
          </div>
        </aside>

        {mobileOpen ? (
          <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setMobileOpen(false)}>
            <div className="h-full w-72 bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <BrandLogo size={40} showWordmark wordmarkClassName="text-xl text-[var(--accent)]" />
              <p className="mt-2 text-xs text-[var(--muted)]">{role}</p>
              <nav className="mt-6 space-y-1">
                {sideLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="block rounded-xl px-3 py-2.5 text-sm hover:bg-[var(--chip)]"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        ) : null}

        <main
          className={cn("min-w-0 flex-1", isPosScreen ? "px-2 py-2 lg:px-3" : "px-3 py-4 lg:px-6")}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

function HeaderIcon({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      href={href}
      title={label}
      className="rounded-lg p-2 hover:bg-[var(--chip)] hover:text-[var(--ink)]"
    >
      <Icon className="h-4 w-4" />
    </Link>
  );
}
