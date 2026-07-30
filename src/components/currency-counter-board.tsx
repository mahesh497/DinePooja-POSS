"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addCashEntry } from "@/lib/actions/services";

const DENOMS = [500, 200, 100, 50, 20, 10, 5, 2, 1] as const;

export function CurrencyCounterBoard() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [counts, setCounts] = useState<Record<number, string>>(
    Object.fromEntries(DENOMS.map((d) => [d, ""]))
  );
  const [note, setNote] = useState("");
  const [mode, setMode] = useState<"TOPUP" | "CLOSING">("CLOSING");

  const total = useMemo(
    () => DENOMS.reduce((sum, d) => sum + d * (Number(counts[d]) || 0), 0),
    [counts]
  );

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <p className="text-xs uppercase text-[var(--muted)]">Counted total</p>
        <p className="font-[family-name:var(--font-display)] text-3xl">₹{total.toFixed(0)}</p>
      </div>

      <div className="card grid gap-3 p-4 sm:grid-cols-3">
        {DENOMS.map((d) => (
          <label key={d} className="text-sm">
            <span className="mb-1 block text-[var(--muted)]">₹{d} ×</span>
            <input
              type="number"
              min="0"
              className="w-full rounded-xl border border-[var(--line)] px-3 py-2"
              value={counts[d]}
              onChange={(e) => setCounts({ ...counts, [d]: e.target.value })}
            />
          </label>
        ))}
      </div>

      <div className="card grid gap-3 p-4 md:grid-cols-3">
        <select
          className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm"
          value={mode}
          onChange={(e) => setMode(e.target.value as "TOPUP" | "CLOSING")}
        >
          <option value="CLOSING">Post as CLOSING</option>
          <option value="TOPUP">Post as TOPUP</option>
        </select>
        <input
          className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm md:col-span-2"
          placeholder="Note (denomination summary)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button
          type="button"
          disabled={pending || total <= 0}
          onClick={() =>
            startTransition(async () => {
              const summary = DENOMS.filter((d) => Number(counts[d]) > 0)
                .map((d) => `${d}x${counts[d]}`)
                .join(", ");
              await addCashEntry({
                type: mode,
                amount: total,
                note: note || `Count: ${summary}`,
              });
              router.refresh();
            })
          }
          className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white md:col-span-3"
        >
          {pending ? "Posting…" : `Post ₹${total} as ${mode}`}
        </button>
      </div>
    </div>
  );
}
