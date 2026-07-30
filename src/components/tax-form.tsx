"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateTaxSettings } from "@/lib/actions/services";

export function TaxForm({
  cgstPercent,
  sgstPercent,
  serviceChargePercent,
}: {
  cgstPercent: number;
  sgstPercent: number;
  serviceChargePercent: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({ cgstPercent, sgstPercent, serviceChargePercent });
  const [saved, setSaved] = useState(false);

  return (
    <form
      className="card grid max-w-xl gap-3 p-4 md:grid-cols-3"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          await updateTaxSettings(form);
          setSaved(true);
          router.refresh();
        });
      }}
    >
      <label className="text-sm">
        <span className="mb-1 block text-[var(--muted)]">CGST %</span>
        <input
          type="number"
          step="0.1"
          className="w-full rounded-xl border border-[var(--line)] px-3 py-2"
          value={form.cgstPercent}
          onChange={(e) => setForm({ ...form, cgstPercent: Number(e.target.value) })}
        />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-[var(--muted)]">SGST %</span>
        <input
          type="number"
          step="0.1"
          className="w-full rounded-xl border border-[var(--line)] px-3 py-2"
          value={form.sgstPercent}
          onChange={(e) => setForm({ ...form, sgstPercent: Number(e.target.value) })}
        />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-[var(--muted)]">Service charge %</span>
        <input
          type="number"
          step="0.1"
          className="w-full rounded-xl border border-[var(--line)] px-3 py-2"
          value={form.serviceChargePercent}
          onChange={(e) => setForm({ ...form, serviceChargePercent: Number(e.target.value) })}
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white md:col-span-3"
      >
        {pending ? "Saving…" : saved ? "Saved" : "Save tax settings"}
      </button>
    </form>
  );
}
