import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft } from "lucide-react";

export function ModulePage({
  title,
  subtitle,
  icon: Icon,
  live = true,
  actions,
  children,
}: {
  title: string;
  subtitle: string;
  icon?: LucideIcon;
  live?: boolean;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/dashboard" className="mb-2 inline-flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--accent)]">
            <ArrowLeft className="h-3.5 w-3.5" /> Operations
          </Link>
          <div className="flex items-center gap-3">
            {Icon ? (
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                <Icon className="h-5 w-5" />
              </span>
            ) : null}
            <div>
              <h1 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl">{title}</h1>
              <p className="text-sm text-[var(--muted)]">{subtitle}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {live ? (
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
              Module live
            </span>
          ) : (
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
              Preview
            </span>
          )}
          {actions}
        </div>
      </div>
      {children}
    </div>
  );
}

export function FeatureGrid({ items }: { items: { title: string; detail: string }[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div key={item.title} className="card p-4">
          <p className="font-semibold">{item.title}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">{item.detail}</p>
        </div>
      ))}
    </div>
  );
}

export function StatRow({ stats }: { stats: { label: string; value: string }[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="card p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{s.label}</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl">{s.value}</p>
        </div>
      ))}
    </div>
  );
}
