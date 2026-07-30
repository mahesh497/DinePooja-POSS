"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { BrandLogo } from "@/components/brand-logo";

type NavItem = { href: string; label: string };

export function AppShell({
  brand,
  outletName,
  userName,
  role,
  nav,
  children,
}: {
  brand: string;
  outletName: string;
  userName: string;
  role: string;
  nav: NavItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--panel)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center gap-4 px-4 py-3">
          <Link href="/tables" className="flex min-w-0 items-center gap-3">
            <BrandLogo size={40} />
            <div className="min-w-0">
              <p className="font-[family-name:var(--font-display)] text-xl tracking-tight text-[var(--accent)]">
                {brand}
              </p>
              <p className="truncate text-xs text-[var(--muted)]">{outletName}</p>
            </div>
          </Link>
          <nav className="flex flex-1 gap-1 overflow-x-auto pb-1">
            {nav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-[var(--accent)] text-white"
                      : "text-[var(--muted)] hover:bg-[var(--chip)] hover:text-[var(--ink)]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="hidden items-center gap-3 sm:flex">
            <div className="text-right text-xs">
              <p className="font-medium">{userName}</p>
              <p className="text-[var(--muted)]">{role}</p>
            </div>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm hover:bg-[var(--chip)]"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1600px] px-4 py-4">{children}</main>
    </div>
  );
}
