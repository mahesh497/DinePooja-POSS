"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Maximize2, Minimize2, RefreshCw } from "lucide-react";
import { formatINR } from "@/lib/tax";

export type LedOrderItem = {
  id: string;
  name: string;
  quantity: number;
  lineTotal: number;
  variantName: string | null;
};

export type LedOrder = {
  id: string;
  orderNumber: string;
  type: string;
  total: number;
  tableName: string | null;
  customerName: string | null;
  items: LedOrderItem[];
  updatedAt: string;
};

export type LedReadyTicket = {
  id: string;
  kotNumber: number;
  orderNumber: string;
  tableName: string | null;
  station: string;
};

export function LedDisplayBoard({
  outletName,
  order,
  readyTickets,
  ticker,
}: {
  outletName: string;
  order: LedOrder | null;
  readyTickets: LedReadyTicket[];
  ticker: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [fullscreen, setFullscreen] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const clock = setInterval(() => setNow(new Date()), 1000);
    const refresh = setInterval(() => {
      startTransition(() => router.refresh());
    }, 5000);
    return () => {
      clearInterval(clock);
      clearInterval(refresh);
    };
  }, [router]);

  useEffect(() => {
    function onFs() {
      setFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  async function toggleFullscreen() {
    const el = document.getElementById("led-stage");
    if (!el) return;
    if (!document.fullscreenElement) await el.requestFullscreen().catch(() => null);
    else await document.exitFullscreen().catch(() => null);
  }

  const title = order
    ? `${order.tableName || order.type} · #${order.orderNumber}`
    : "Waiting for order";

  return (
    <div className="space-y-3">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[var(--muted)]">
          Guest LED board · auto-refreshes every 5s · open on a second display
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => router.refresh())}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${pending ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white"
          >
            {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            {fullscreen ? "Exit full screen" : "Full screen"}
          </button>
        </div>
      </div>

      <div
        id="led-stage"
        className="overflow-hidden rounded-2xl bg-zinc-950 text-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3 md:px-8">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-emerald-400">LED Display</p>
            <p className="font-[family-name:var(--font-display)] text-xl text-rose-400 md:text-2xl">
              {outletName}
            </p>
          </div>
          <div className="text-right font-mono text-sm text-zinc-300 md:text-base">
            <p>{now.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" })}</p>
            <p className="text-lg font-semibold text-white md:text-2xl">
              {now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </p>
          </div>
        </div>

        <div className="grid gap-0 lg:grid-cols-[1.4fr_0.8fr]">
          <section className="border-b border-zinc-800 px-5 py-6 md:px-8 lg:border-b-0 lg:border-r">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Now billing</p>
            <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl leading-tight md:text-5xl">
              {title}
            </h2>
            {order?.customerName ? (
              <p className="mt-1 text-zinc-400">Guest · {order.customerName}</p>
            ) : null}

            {order?.items.length ? (
              <ul className="mt-6 max-h-[42vh] space-y-3 overflow-y-auto pr-1 text-base md:text-xl">
                {order.items.map((i) => (
                  <li key={i.id} className="flex justify-between gap-4 border-b border-zinc-800/80 pb-2">
                    <span className="min-w-0">
                      <span className="text-emerald-400">{i.quantity}×</span> {i.name}
                      {i.variantName ? (
                        <span className="block text-sm text-zinc-500">({i.variantName})</span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-zinc-300">{formatINR(i.lineTotal)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-10 font-[family-name:var(--font-display)] text-2xl text-zinc-600 md:text-4xl">
                Waiting for next order…
              </p>
            )}

            <div className="mt-8 flex items-end justify-between border-t border-zinc-700 pt-5">
              <span className="text-zinc-400">Grand total</span>
              <span className="font-[family-name:var(--font-display)] text-4xl text-rose-400 md:text-6xl">
                {formatINR(order?.total ?? 0)}
              </span>
            </div>
          </section>

          <section className="px-5 py-6 md:px-6">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Ready for pickup</p>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
              {readyTickets.length ? (
                readyTickets.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-4 text-center"
                  >
                    <p className="font-[family-name:var(--font-display)] text-3xl text-emerald-300">
                      {t.kotNumber}
                    </p>
                    <p className="mt-1 truncate text-xs text-zinc-300">
                      #{t.orderNumber}
                      {t.tableName ? ` · ${t.tableName}` : ""}
                    </p>
                    <p className="text-[10px] uppercase tracking-wide text-zinc-500">{t.station}</p>
                  </div>
                ))
              ) : (
                <p className="col-span-full py-8 text-center text-sm text-zinc-600">No tickets ready</p>
              )}
            </div>
          </section>
        </div>

        <div className="overflow-hidden border-t border-zinc-800 bg-zinc-900 py-2.5">
          <p className="led-marquee whitespace-nowrap text-sm text-amber-300">
            {ticker} &nbsp;&nbsp;•&nbsp;&nbsp; {ticker}
          </p>
        </div>
      </div>
    </div>
  );
}
