"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateStoreProfile } from "@/lib/actions/services";

export function StoreForm({
  outlet,
}: {
  outlet: {
    name: string;
    address: string | null;
    phone: string | null;
    gstin: string | null;
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: outlet.name,
    address: outlet.address ?? "",
    phone: outlet.phone ?? "",
    gstin: outlet.gstin ?? "",
  });

  return (
    <form
      className="card grid max-w-2xl gap-3 p-4 md:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          await updateStoreProfile(form);
          router.refresh();
        });
      }}
    >
      <label className="text-sm md:col-span-2">
        <span className="mb-1 block text-[var(--muted)]">Outlet name</span>
        <input
          className="w-full rounded-xl border border-[var(--line)] px-3 py-2"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
      </label>
      <label className="text-sm md:col-span-2">
        <span className="mb-1 block text-[var(--muted)]">Address</span>
        <input
          className="w-full rounded-xl border border-[var(--line)] px-3 py-2"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-[var(--muted)]">Phone</span>
        <input
          className="w-full rounded-xl border border-[var(--line)] px-3 py-2"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-[var(--muted)]">GSTIN</span>
        <input
          className="w-full rounded-xl border border-[var(--line)] px-3 py-2"
          value={form.gstin}
          onChange={(e) => setForm({ ...form, gstin: e.target.value })}
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white md:col-span-2"
      >
        {pending ? "Saving…" : "Save store profile"}
      </button>
    </form>
  );
}
