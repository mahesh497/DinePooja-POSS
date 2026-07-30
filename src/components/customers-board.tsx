"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createCustomer } from "@/lib/actions/services";

type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  loyaltyPoints: number;
  creditBalance: number;
  notes: string | null;
};

export function CustomersBoard({ customers }: { customers: Customer[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });
  const [error, setError] = useState("");

  return (
    <div className="space-y-4">
      <form
        className="card grid gap-3 p-4 md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          setError("");
          startTransition(async () => {
            try {
              await createCustomer(form);
              setForm({ name: "", phone: "", email: "", address: "", notes: "" });
              router.refresh();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Failed to save");
            }
          });
        }}
      >
        <p className="font-semibold md:col-span-2">Add customer</p>
        <input
          className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm"
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm"
          placeholder="Phone"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          required
        />
        <input
          className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm"
          placeholder="Address"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
        <input
          className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm md:col-span-2"
          placeholder="Notes"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
        {error ? <p className="text-sm text-rose-600 md:col-span-2">{error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white md:col-span-2"
        >
          {pending ? "Saving…" : "Save customer"}
        </button>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--line)] text-xs uppercase text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Loyalty</th>
              <th className="px-4 py-3">Credit</th>
              <th className="px-4 py-3">Notes</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-b border-[var(--line)] last:border-0">
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3">{c.phone}</td>
                <td className="px-4 py-3">{c.loyaltyPoints}</td>
                <td className="px-4 py-3">₹{c.creditBalance.toFixed(0)}</td>
                <td className="px-4 py-3 text-[var(--muted)]">{c.notes || c.address || "—"}</td>
              </tr>
            ))}
            {customers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[var(--muted)]">
                  No customers yet
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
