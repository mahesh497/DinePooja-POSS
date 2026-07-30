"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createTable, updateOutletSettings } from "@/lib/actions/admin";

type Outlet = {
  name: string;
  address: string | null;
  phone: string | null;
  gstin: string | null;
  billPrefix: string;
  cgstPercent: number;
  sgstPercent: number;
  packingChargeDefault: number;
  deliveryChargeDefault: number;
};

export function SettingsForm({
  outlet,
  tables,
}: {
  outlet: Outlet;
  tables: { id: string; name: string; capacity: number; status: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: outlet.name,
    address: outlet.address ?? "",
    phone: outlet.phone ?? "",
    gstin: outlet.gstin ?? "",
    billPrefix: outlet.billPrefix,
    cgstPercent: outlet.cgstPercent,
    sgstPercent: outlet.sgstPercent,
    packingChargeDefault: outlet.packingChargeDefault,
    deliveryChargeDefault: outlet.deliveryChargeDefault,
  });
  const [tableName, setTableName] = useState("");
  const [capacity, setCapacity] = useState(4);
  const [saved, setSaved] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">Settings</h1>
        <p className="text-sm text-[var(--muted)]">
          Outlet profile, GST, packing/delivery defaults, tables.
        </p>
      </div>

      <form
        className="grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            await updateOutletSettings(form);
            setSaved(true);
            router.refresh();
          });
        }}
      >
        <label className="text-sm md:col-span-2">
          <span className="mb-1 block text-[var(--muted)]">Restaurant name</span>
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
        <label className="text-sm">
          <span className="mb-1 block text-[var(--muted)]">Bill prefix</span>
          <input
            className="w-full rounded-xl border border-[var(--line)] px-3 py-2"
            value={form.billPrefix}
            onChange={(e) => setForm({ ...form, billPrefix: e.target.value })}
            required
          />
        </label>
        <div className="grid grid-cols-2 gap-3 md:col-span-2">
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
            <span className="mb-1 block text-[var(--muted)]">Default packing ₹</span>
            <input
              type="number"
              step="1"
              className="w-full rounded-xl border border-[var(--line)] px-3 py-2"
              value={form.packingChargeDefault}
              onChange={(e) =>
                setForm({ ...form, packingChargeDefault: Number(e.target.value) })
              }
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-[var(--muted)]">Default delivery ₹</span>
            <input
              type="number"
              step="1"
              className="w-full rounded-xl border border-[var(--line)] px-3 py-2"
              value={form.deliveryChargeDefault}
              onChange={(e) =>
                setForm({ ...form, deliveryChargeDefault: Number(e.target.value) })
              }
            />
          </label>
        </div>
        <button
          disabled={pending}
          type="submit"
          className="rounded-xl bg-[var(--accent)] px-4 py-3 text-white md:col-span-2"
        >
          Save settings
        </button>
        {saved ? <p className="text-sm text-[var(--ok)] md:col-span-2">Saved.</p> : null}
      </form>

      <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
        <h2 className="font-[family-name:var(--font-display)] text-xl">Tables</h2>
        <form
          className="mt-3 flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              await createTable(tableName, capacity);
              setTableName("");
              router.refresh();
            });
          }}
        >
          <input
            required
            placeholder="Table name"
            value={tableName}
            onChange={(e) => setTableName(e.target.value)}
            className="rounded-xl border border-[var(--line)] px-3 py-2"
          />
          <input
            type="number"
            min={1}
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
            className="w-24 rounded-xl border border-[var(--line)] px-3 py-2"
          />
          <button type="submit" className="rounded-xl bg-[var(--accent)] px-4 py-2 text-white">
            Add table
          </button>
        </form>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
          {tables.map((t) => (
            <li key={t.id} className="rounded-xl bg-[var(--chip)] px-3 py-2 text-sm">
              {t.name} · {t.capacity} seats · {t.status}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
