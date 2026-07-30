"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { dayClose } from "@/lib/actions/orders";
import { formatINR } from "@/lib/tax";

type ReportsProps = {
  canClose: boolean;
  summary: {
    sales: number;
    orders: number;
    voids: number;
    discounts: number;
    cash: number;
    upi: number;
    card: number;
    dineIn: number;
    parcel: number;
    delivery: number;
  };
  itemWise: { name: string; qty: number; amount: number }[];
  hourly: { hour: string; orders: number; sales: number }[];
  recentCloses: {
    id: string;
    closedAt: string;
    totalSales: number;
    orderCount: number;
    cashTotal: number;
    upiTotal: number;
    cardTotal: number;
  }[];
};

export function ReportsDashboard({
  canClose,
  summary,
  itemWise,
  hourly,
  recentCloses,
}: ReportsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl">Reports</h1>
          <p className="text-sm text-[var(--muted)]">Today&apos;s sales, items, payments, day close.</p>
        </div>
        {canClose ? (
          <button
            type="button"
            disabled={pending}
            className="rounded-xl bg-[var(--accent)] px-4 py-3 font-semibold text-white"
            onClick={() =>
              startTransition(async () => {
                await dayClose();
                router.refresh();
              })
            }
          >
            Run day close
          </button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Today sales" value={formatINR(summary.sales)} />
        <Stat label="Orders settled" value={String(summary.orders)} />
        <Stat label="Voids" value={String(summary.voids)} />
        <Stat label="Discounts" value={formatINR(summary.discounts)} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Cash" value={formatINR(summary.cash)} />
        <Stat label="UPI" value={formatINR(summary.upi)} />
        <Stat label="Card" value={formatINR(summary.card)} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Dine-in sales" value={formatINR(summary.dineIn)} />
        <Stat label="Parcel sales" value={formatINR(summary.parcel)} />
        <Stat label="Delivery sales" value={formatINR(summary.delivery)} />
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
          <h2 className="font-[family-name:var(--font-display)] text-xl">Item-wise</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {itemWise.length ? (
              itemWise.map((i) => (
                <li key={i.name} className="flex justify-between gap-2 border-b border-[var(--line)] py-2">
                  <span>
                    {i.name} · {i.qty} sold
                  </span>
                  <span className="font-medium">{formatINR(i.amount)}</span>
                </li>
              ))
            ) : (
              <li className="text-[var(--muted)]">No settled item sales yet today.</li>
            )}
          </ul>
        </div>

        <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
          <h2 className="font-[family-name:var(--font-display)] text-xl">Hourly</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {hourly.length ? (
              hourly.map((h) => (
                <li key={h.hour} className="flex justify-between gap-2 border-b border-[var(--line)] py-2">
                  <span>
                    {h.hour} · {h.orders} orders
                  </span>
                  <span className="font-medium">{formatINR(h.sales)}</span>
                </li>
              ))
            ) : (
              <li className="text-[var(--muted)]">No hourly data yet.</li>
            )}
          </ul>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
        <h2 className="font-[family-name:var(--font-display)] text-xl">Day closes</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {recentCloses.length ? (
            recentCloses.map((c) => (
              <li key={c.id} className="rounded-xl bg-[var(--chip)] px-3 py-2">
                {new Date(c.closedAt).toLocaleString("en-IN")} · {c.orderCount} orders ·{" "}
                {formatINR(c.totalSales)} (Cash {formatINR(c.cashTotal)} / UPI {formatINR(c.upiTotal)}{" "}
                / Card {formatINR(c.cardTotal)})
              </li>
            ))
          ) : (
            <li className="text-[var(--muted)]">No day closes recorded yet.</li>
          )}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-2xl">{value}</p>
    </div>
  );
}
