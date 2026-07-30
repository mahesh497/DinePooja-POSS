"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addCashEntry } from "@/lib/actions/services";
import type { CashEntryType } from "@prisma/client";

type Entry = {
  id: string;
  type: CashEntryType;
  amount: number;
  note: string | null;
  createdAt: string;
  userName: string;
};

export function CashBoard({
  entries,
  todayCashSales,
  drawerBalance,
  defaultTab,
}: {
  entries: Entry[];
  todayCashSales: number;
  drawerBalance: number;
  defaultTab?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const initialType =
    defaultTab === "withdraw" ? "WITHDRAW" : defaultTab === "topup" ? "TOPUP" : "OPENING";
  const [type, setType] = useState<CashEntryType>(initialType as CashEntryType);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  return (
    <div className="space-y-4">
      <form
        className="card grid gap-3 p-4 md:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            await addCashEntry({ type, amount: Number(amount), note });
            setAmount("");
            setNote("");
            router.refresh();
          });
        }}
      >
        <label className="text-sm">
          <span className="mb-1 block text-[var(--muted)]">Type</span>
          <select
            className="w-full rounded-xl border border-[var(--line)] px-3 py-2"
            value={type}
            onChange={(e) => setType(e.target.value as CashEntryType)}
          >
            <option value="OPENING">Opening</option>
            <option value="TOPUP">Top up</option>
            <option value="WITHDRAW">Withdraw</option>
            <option value="CLOSING">Closing</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[var(--muted)]">Amount</span>
          <input
            type="number"
            min="1"
            step="1"
            required
            className="w-full rounded-xl border border-[var(--line)] px-3 py-2"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <label className="text-sm md:col-span-2">
          <span className="mb-1 block text-[var(--muted)]">Note</span>
          <input
            className="w-full rounded-xl border border-[var(--line)] px-3 py-2"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white md:col-span-4"
        >
          {pending ? "Posting…" : "Post cash entry"}
        </button>
      </form>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="card p-4">
          <p className="text-xs uppercase text-[var(--muted)]">Today cash sales</p>
          <p className="font-[family-name:var(--font-display)] text-2xl">
            ₹{todayCashSales.toFixed(0)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase text-[var(--muted)]">Drawer balance (entries)</p>
          <p className="font-[family-name:var(--font-display)] text-2xl">
            ₹{drawerBalance.toFixed(0)}
          </p>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--line)] text-xs uppercase text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">By</th>
              <th className="px-4 py-3">Note</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-b border-[var(--line)] last:border-0">
                <td className="px-4 py-3">{new Date(e.createdAt).toLocaleString("en-IN")}</td>
                <td className="px-4 py-3 font-medium">{e.type}</td>
                <td className="px-4 py-3">₹{e.amount.toFixed(0)}</td>
                <td className="px-4 py-3">{e.userName}</td>
                <td className="px-4 py-3 text-[var(--muted)]">{e.note || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
