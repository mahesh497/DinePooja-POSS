"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createCoupon, toggleCoupon } from "@/lib/actions/services";
import type { CouponType } from "@prisma/client";

type Coupon = {
  id: string;
  code: string;
  type: CouponType;
  value: number;
  active: boolean;
  minOrder: number;
  expiresAt: string | null;
};

export function CouponsBoard({ coupons }: { coupons: Coupon[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    code: "",
    type: "PERCENT" as CouponType,
    value: "",
    minOrder: "0",
    expiresAt: "",
  });

  return (
    <div className="space-y-4">
      <form
        className="card grid gap-3 p-4 md:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            await createCoupon({
              code: form.code,
              type: form.type,
              value: Number(form.value),
              minOrder: Number(form.minOrder) || 0,
              expiresAt: form.expiresAt || undefined,
            });
            setForm({ code: "", type: "PERCENT", value: "", minOrder: "0", expiresAt: "" });
            router.refresh();
          });
        }}
      >
        <input
          className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm"
          placeholder="Code"
          required
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
        />
        <select
          className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm"
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value as CouponType })}
        >
          <option value="PERCENT">Percent</option>
          <option value="FLAT">Flat</option>
        </select>
        <input
          type="number"
          min="1"
          required
          className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm"
          placeholder="Value"
          value={form.value}
          onChange={(e) => setForm({ ...form, value: e.target.value })}
        />
        <input
          type="number"
          min="0"
          className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm"
          placeholder="Min order"
          value={form.minOrder}
          onChange={(e) => setForm({ ...form, minOrder: e.target.value })}
        />
        <input
          type="date"
          className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm"
          value={form.expiresAt}
          onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
        >
          {pending ? "Saving…" : "Create coupon"}
        </button>
      </form>

      <div className="grid gap-3 sm:grid-cols-2">
        {coupons.map((c) => (
          <div key={c.id} className="card flex items-center justify-between gap-3 p-4">
            <div>
              <p className="font-mono text-lg font-semibold text-[var(--accent)]">{c.code}</p>
              <p className="text-sm text-[var(--muted)]">
                {c.type === "PERCENT" ? `${c.value}% off` : `₹${c.value} off`} · min ₹{c.minOrder}
                {c.expiresAt ? ` · exp ${new Date(c.expiresAt).toLocaleDateString("en-IN")}` : ""}
              </p>
            </div>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await toggleCoupon(c.id, !c.active);
                  router.refresh();
                })
              }
              className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                c.active ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
              }`}
            >
              {c.active ? "Active" : "Off"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
