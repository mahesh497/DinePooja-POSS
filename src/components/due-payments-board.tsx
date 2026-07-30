"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { collectCustomerCredit } from "@/lib/actions/services";
import { formatINR } from "@/lib/tax";

type CreditCustomer = {
  id: string;
  name: string;
  phone: string;
  creditBalance: number;
};

type UnpaidOrder = {
  id: string;
  orderNumber: string;
  tableName: string | null;
  type: string;
  total: number;
  paidAmount: number;
};

export function DuePaymentsBoard({
  customers,
  unpaid,
}: {
  customers: CreditCustomer[];
  unpaid: UnpaidOrder[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      {message ? <p className="text-sm text-[var(--ok)]">{message}</p> : null}

      <section className="card p-4">
        <h2 className="font-semibold">Customer credit balances</h2>
        <div className="mt-3 space-y-2">
          {customers.map((c) => (
            <div
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--line)] px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-[var(--muted)]">{c.phone}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-rose-600">{formatINR(c.creditBalance)}</p>
                <input
                  type="number"
                  min={1}
                  step="1"
                  className="w-24 rounded-lg border border-[var(--line)] px-2 py-1.5 text-sm"
                  placeholder="Amt"
                  value={amounts[c.id] ?? String(Math.round(c.creditBalance))}
                  onChange={(e) => setAmounts((prev) => ({ ...prev, [c.id]: e.target.value }))}
                />
                <button
                  type="button"
                  disabled={pending}
                  className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white"
                  onClick={() => {
                    startTransition(async () => {
                      try {
                        setError("");
                        const amt = Number(amounts[c.id] ?? c.creditBalance);
                        const collected = await collectCustomerCredit({
                          customerId: c.id,
                          amount: amt,
                          method: "CASH",
                        });
                        setMessage(`Collected ${formatINR(collected)} from ${c.name}`);
                        router.refresh();
                      } catch (e) {
                        setError(e instanceof Error ? e.message : "Collect failed");
                      }
                    });
                  }}
                >
                  Collect cash
                </button>
              </div>
            </div>
          ))}
          {customers.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No credit balances</p>
          ) : null}
        </div>
      </section>

      <section className="card p-4">
        <h2 className="font-semibold">Open / hold orders with balance due</h2>
        <div className="mt-3 space-y-2">
          {unpaid.map((o) => (
            <Link
              key={o.id}
              href={`/pos/${o.id}`}
              className="flex items-center justify-between rounded-xl border border-[var(--line)] px-3 py-2 text-sm hover:border-[var(--accent)]"
            >
              <div>
                <p className="font-medium">
                  #{o.orderNumber} · {o.tableName || o.type}
                </p>
                <p className="text-[var(--muted)]">
                  Paid {formatINR(o.paidAmount)} of {formatINR(o.total)}
                </p>
              </div>
              <p className="font-semibold">{formatINR(o.total - o.paidAmount)}</p>
            </Link>
          ))}
          {unpaid.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No unpaid open orders</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
