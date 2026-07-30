"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, RefreshCw } from "lucide-react";
import { formatINR } from "@/lib/tax";

export type AlertItem = {
  id: string;
  kind: "CRITICAL" | "WARN" | "INFO";
  category: string;
  title: string;
  detail: string;
  href: string;
  createdAt?: string;
};

const DISMISS_KEY = "dinepooja-dismissed-alerts";

export function AlertsBoard({
  stats,
  alerts,
}: {
  stats: { label: string; value: string }[];
  alerts: AlertItem[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [filter, setFilter] = useState<"ALL" | "CRITICAL" | "WARN" | "INFO">("ALL");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      if (raw) setDismissed(JSON.parse(raw) as string[]);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const refresh = setInterval(() => startTransition(() => router.refresh()), 15000);
    return () => clearInterval(refresh);
  }, [router]);

  function dismiss(id: string) {
    setDismissed((prev) => {
      const next = [...new Set([...prev, id])];
      localStorage.setItem(DISMISS_KEY, JSON.stringify(next));
      return next;
    });
  }

  function clearDismissed() {
    localStorage.removeItem(DISMISS_KEY);
    setDismissed([]);
  }

  const visible = useMemo(() => {
    return alerts.filter((a) => {
      if (dismissed.includes(a.id)) return false;
      if (filter === "ALL") return true;
      return a.kind === filter;
    });
  }, [alerts, dismissed, filter]);

  const counts = useMemo(
    () => ({
      ALL: alerts.filter((a) => !dismissed.includes(a.id)).length,
      CRITICAL: alerts.filter((a) => a.kind === "CRITICAL" && !dismissed.includes(a.id)).length,
      WARN: alerts.filter((a) => a.kind === "WARN" && !dismissed.includes(a.id)).length,
      INFO: alerts.filter((a) => a.kind === "INFO" && !dismissed.includes(a.id)).length,
    }),
    [alerts, dismissed]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
            <Bell className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl">Alerts</h1>
            <p className="text-sm text-[var(--muted)]">
              Low stock · delayed KOTs · unpaid bills · credit · long open orders
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => router.refresh())}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${pending ? "animate-spin" : ""}`} />
            Refresh
          </button>
          {dismissed.length ? (
            <button
              type="button"
              onClick={clearDismissed}
              className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold"
            >
              Restore dismissed ({dismissed.length})
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{s.label}</p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-2xl">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {(["ALL", "CRITICAL", "WARN", "INFO"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              filter === f ? "bg-[var(--ink)] text-white" : "border border-[var(--line)] bg-white"
            }`}
          >
            {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()} ({counts[f]})
          </button>
        ))}
      </div>

      {!visible.length ? (
        <div className="card p-10 text-center">
          <p className="font-[family-name:var(--font-display)] text-2xl">All clear</p>
          <p className="mt-1 text-sm text-[var(--muted)]">No active alerts in this view.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((a) => (
            <div
              key={a.id}
              className={`card flex flex-wrap items-start justify-between gap-3 p-4 ${
                a.kind === "CRITICAL"
                  ? "border-rose-200 bg-rose-50/40"
                  : a.kind === "WARN"
                    ? "border-amber-200 bg-amber-50/40"
                    : ""
              }`}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      a.kind === "CRITICAL"
                        ? "bg-rose-600 text-white"
                        : a.kind === "WARN"
                          ? "bg-amber-500 text-white"
                          : "bg-sky-100 text-sky-800"
                    }`}
                  >
                    {a.kind}
                  </span>
                  <span className="rounded-full bg-[var(--chip)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[var(--muted)]">
                    {a.category}
                  </span>
                </div>
                <p className="mt-1.5 font-semibold">{a.title}</p>
                <p className="text-sm text-[var(--muted)]">{a.detail}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Link
                  href={a.href}
                  className="rounded-xl bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white"
                >
                  Open
                </Link>
                <button
                  type="button"
                  onClick={() => dismiss(a.id)}
                  className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function alertMoney(n: number) {
  return formatINR(n);
}
