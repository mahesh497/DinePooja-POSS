"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { dayClose } from "@/lib/actions/orders";
import { formatINR } from "@/lib/tax";

type ReportsProps = {
  canClose: boolean;
  openCount: number;
  outletName: string;
  reportEmail: string;
  businessDate: string;
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
  hourly: { hour: string; sales: number }[];
  recentCloses: {
    id: string;
    closedAt: string;
    totalSales: number;
    cashTotal: number;
    upiTotal: number;
    cardTotal: number;
  }[];
};

type EditTotals = {
  totalSales: number;
  cashTotal: number;
  upiTotal: number;
  cardTotal: number;
  voidCount: number;
  discountTotal: number;
};

export function ReportsDashboard({
  canClose,
  openCount,
  outletName,
  reportEmail,
  businessDate,
  summary,
  hourly,
  recentCloses,
}: ReportsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [totals, setTotals] = useState<EditTotals | null>(null);
  const [notes, setNotes] = useState("");
  const [toEmail, setToEmail] = useState("");

  function openDayCloseModal() {
    setError("");
    setMessage("");
    if (openCount > 0) {
      setError(
        `Cannot day-close: ${openCount} open/hold order(s) still active. Settle, void, or cancel them first.`
      );
      return;
    }
    setTotals({
      totalSales: summary.sales,
      cashTotal: summary.cash,
      upiTotal: summary.upi,
      cardTotal: summary.card,
      voidCount: summary.voids,
      discountTotal: summary.discounts,
    });
    setNotes("");
    setToEmail(reportEmail);
    setModalOpen(true);
  }

  function confirmDayClose() {
    if (!totals) return;
    const ok = window.confirm(
      `Confirm day close for ${outletName} (${businessDate})?\n\n` +
        `Finished tickets will be cleared from this PC.\n` +
        `PDF will be emailed (if configured) and saved under reports/archive/.`
    );
    if (!ok) return;

    startTransition(async () => {
      try {
        setError("");
        const result = await dayClose({
          includeOrderIds: [],
          totalSales: totals.totalSales,
          cashTotal: totals.cashTotal,
          upiTotal: totals.upiTotal,
          cardTotal: totals.cardTotal,
          orderCount: summary.orders,
          voidCount: totals.voidCount,
          discountTotal: totals.discountTotal,
          dineInSales: summary.dineIn,
          parcelSales: summary.parcel,
          deliverySales: summary.delivery,
          notes,
          toEmail,
        });
        setModalOpen(false);
        setMessage(
          `Day closed. Sales ${formatINR(result.totalSales)}.` +
            (result.emailSent ? " PDF emailed." : " (Email skipped — set report email / SMTP.)") +
            (result.archived ? " PDF archived locally." : "")
        );
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Day close failed");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl">Reports</h1>
          <p className="text-sm text-[var(--muted)]">Today&apos;s sales · day close clears finished tickets</p>
        </div>
        {canClose ? (
          <button
            type="button"
            disabled={pending}
            className="rounded-xl bg-[var(--accent)] px-4 py-3 font-semibold text-white disabled:opacity-60"
            onClick={openDayCloseModal}
          >
            Run day close
          </button>
        ) : null}
      </div>

      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      {message ? <p className="text-sm text-[var(--ok)]">{message}</p> : null}

      <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--panel)] px-4 py-3 text-sm text-[var(--muted)]">
        Day close lets you edit sales totals, email a PDF, archive a copy under{" "}
        <code className="text-xs">reports/archive/</code>, then wipe finished tickets.
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Today sales" value={formatINR(summary.sales)} />
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

      <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
        <h2 className="font-[family-name:var(--font-display)] text-xl">Hourly sales</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {hourly.length ? (
            hourly.map((h) => (
              <li key={h.hour} className="flex justify-between gap-2 border-b border-[var(--line)] py-2">
                <span>{h.hour}</span>
                <span className="font-medium">{formatINR(h.sales)}</span>
              </li>
            ))
          ) : (
            <li className="text-[var(--muted)]">No hourly data yet.</li>
          )}
        </ul>
      </section>

      <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
        <h2 className="font-[family-name:var(--font-display)] text-xl">Day closes</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {recentCloses.length ? (
            recentCloses.map((c) => (
              <li key={c.id} className="rounded-xl bg-[var(--chip)] px-3 py-2">
                {new Date(c.closedAt).toLocaleString("en-IN")} · {formatINR(c.totalSales)}
                <span className="text-[var(--muted)]">
                  {" "}
                  · Cash {formatINR(c.cashTotal)} / UPI {formatINR(c.upiTotal)} / Card{" "}
                  {formatINR(c.cardTotal)}
                </span>
              </li>
            ))
          ) : (
            <li className="text-[var(--muted)]">No day closes recorded yet.</li>
          )}
        </ul>
      </section>

      {modalOpen && totals ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center">
          <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="border-b border-[var(--line)] px-5 py-4">
              <h3 className="font-[family-name:var(--font-display)] text-2xl">Review day close</h3>
              <p className="text-sm text-[var(--muted)]">
                {outletName} · {businessDate} · edit totals, then send PDF
              </p>
            </div>

            <div className="space-y-4 overflow-y-auto px-5 py-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <NumberField
                  label="Total sales"
                  value={totals.totalSales}
                  onChange={(v) => setTotals({ ...totals, totalSales: v })}
                />
                <NumberField
                  label="Voids"
                  value={totals.voidCount}
                  integer
                  onChange={(v) => setTotals({ ...totals, voidCount: v })}
                />
                <NumberField
                  label="Discounts"
                  value={totals.discountTotal}
                  onChange={(v) => setTotals({ ...totals, discountTotal: v })}
                />
                <NumberField
                  label="Cash"
                  value={totals.cashTotal}
                  onChange={(v) => setTotals({ ...totals, cashTotal: v })}
                />
                <NumberField
                  label="UPI"
                  value={totals.upiTotal}
                  onChange={(v) => setTotals({ ...totals, upiTotal: v })}
                />
                <NumberField
                  label="Card"
                  value={totals.cardTotal}
                  onChange={(v) => setTotals({ ...totals, cardTotal: v })}
                />
              </div>

              <label className="block text-sm">
                <span className="text-xs uppercase tracking-wide text-[var(--muted)]">Notes</span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-xl border border-[var(--line)] px-3 py-2"
                  placeholder="Optional note on the PDF"
                />
              </label>

              <label className="block text-sm">
                <span className="text-xs uppercase tracking-wide text-[var(--muted)]">
                  Email PDF to
                </span>
                <input
                  type="email"
                  value={toEmail}
                  onChange={(e) => setToEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[var(--line)] px-3 py-2"
                  placeholder="owner@restaurant.com"
                />
              </label>
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--line)] px-5 py-4">
              <button
                type="button"
                disabled={pending}
                className="rounded-xl border border-[var(--line)] px-4 py-2 text-sm"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pending}
                className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
                onClick={confirmDayClose}
              >
                {pending ? "Closing…" : "Confirm & send PDF"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  integer,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  integer?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</span>
      <input
        type="number"
        step={integer ? 1 : 0.01}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => {
          const n = integer ? parseInt(e.target.value, 10) : parseFloat(e.target.value);
          onChange(Number.isFinite(n) ? n : 0);
        }}
        className="mt-1 w-full rounded-xl border border-[var(--line)] px-3 py-2"
      />
    </label>
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
