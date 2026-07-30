"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addExpense } from "@/lib/actions/services";

type ExpenseRow = {
  id: string;
  category: string;
  amount: number;
  note: string | null;
  createdAt: string;
  userName: string;
};

export function ExpensesBoard({ expenses, todayTotal }: { expenses: ExpenseRow[]; todayTotal: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({ category: "", amount: "", note: "" });

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <p className="text-xs uppercase text-[var(--muted)]">Today&apos;s expenses</p>
        <p className="font-[family-name:var(--font-display)] text-2xl">₹{todayTotal.toFixed(0)}</p>
      </div>

      <form
        className="card grid gap-3 p-4 md:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            await addExpense({
              category: form.category,
              amount: Number(form.amount),
              note: form.note,
            });
            setForm({ category: "", amount: "", note: "" });
            router.refresh();
          });
        }}
      >
        <input
          className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm"
          placeholder="Category"
          required
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
        />
        <input
          type="number"
          min="1"
          required
          className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm"
          placeholder="Amount"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
        />
        <input
          className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm"
          placeholder="Note"
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white md:col-span-3"
        >
          {pending ? "Saving…" : "Add expense"}
        </button>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--line)] text-xs uppercase text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">By</th>
              <th className="px-4 py-3">Note</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id} className="border-b border-[var(--line)] last:border-0">
                <td className="px-4 py-3">{new Date(e.createdAt).toLocaleString("en-IN")}</td>
                <td className="px-4 py-3 font-medium">{e.category}</td>
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
