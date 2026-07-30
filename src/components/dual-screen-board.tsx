"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Maximize2, Minimize2, RefreshCw } from "lucide-react";
import { formatINR } from "@/lib/tax";

export type DualOrderOption = {
  id: string;
  label: string;
};

export type DualOrderItem = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  variantName: string | null;
  addonNames: string | null;
  notes: string | null;
  kitchenStatus: string | null;
  kotSent: boolean;
};

export type DualOrder = {
  id: string;
  orderNumber: string;
  type: string;
  tableName: string | null;
  customerName: string | null;
  guestCount: number;
  subtotal: number;
  discountAmount: number;
  packingCharge: number;
  deliveryCharge: number;
  serviceCharge: number;
  containerCharge: number;
  cgstAmount: number;
  sgstAmount: number;
  roundOff: number;
  total: number;
  paidAmount: number;
  cgstPercent: number;
  sgstPercent: number;
  outletName: string;
  items: DualOrderItem[];
};

function statusLabel(item: DualOrderItem) {
  if (!item.kotSent) return { text: "Added", className: "bg-slate-100 text-slate-600" };
  const s = (item.kitchenStatus || "PENDING").toUpperCase();
  if (s === "SERVED") return { text: "Served", className: "bg-emerald-100 text-emerald-800" };
  if (s === "PREPARING") return { text: "Cooking", className: "bg-orange-100 text-orange-900" };
  if (s === "READY") return { text: "Ready", className: "bg-emerald-50 text-emerald-700" };
  if (s === "DELAYED") return { text: "Delayed", className: "bg-amber-100 text-amber-900" };
  return { text: "Kitchen", className: "bg-sky-50 text-sky-800" };
}

export function DualScreenBoard({
  orders,
  selected,
}: {
  orders: DualOrderOption[];
  selected: DualOrder | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [fullscreen, setFullscreen] = useState(false);
  const [orderId, setOrderId] = useState(selected?.id ?? orders[0]?.id ?? "");

  useEffect(() => {
    if (selected?.id) setOrderId(selected.id);
  }, [selected?.id]);

  useEffect(() => {
    const refresh = setInterval(() => startTransition(() => router.refresh()), 4000);
    return () => clearInterval(refresh);
  }, [router]);

  useEffect(() => {
    function onFs() {
      setFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const balance = useMemo(() => {
    if (!selected) return 0;
    return Math.max(0, Math.round((selected.total - selected.paidAmount) * 100) / 100);
  }, [selected]);

  async function toggleFullscreen() {
    const el = document.getElementById("dual-stage");
    if (!el) return;
    if (!document.fullscreenElement) await el.requestFullscreen().catch(() => null);
    else await document.exitFullscreen().catch(() => null);
  }

  return (
    <div className="space-y-3">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-[var(--muted)]">Show order</label>
          <select
            value={orderId}
            onChange={(e) => {
              const id = e.target.value;
              setOrderId(id);
              if (id) router.push(`/dual-screen?orderId=${id}`);
            }}
            className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm"
          >
            {!orders.length ? <option value="">No open orders</option> : null}
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => router.refresh())}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${pending ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white"
          >
            {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            {fullscreen ? "Exit full screen" : "Full screen"}
          </button>
        </div>
      </div>

      <div id="dual-stage" className="grid min-h-[70vh] gap-0 overflow-hidden rounded-2xl border border-[var(--line)] bg-white lg:grid-cols-[1.25fr_0.85fr]">
        <section className="flex flex-col p-6 md:p-8">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Your order</p>
          <h2 className="mt-1 font-[family-name:var(--font-display)] text-3xl md:text-4xl">
            {selected
              ? `${selected.tableName || selected.type} · #${selected.orderNumber}`
              : "No open order"}
          </h2>
          {selected ? (
            <p className="mt-1 text-sm text-[var(--muted)]">
              {selected.customerName || "Guest"}
              {selected.guestCount ? ` · ${selected.guestCount} guests` : ""}
            </p>
          ) : null}

          <ul className="mt-6 flex-1 space-y-3 overflow-y-auto">
            {selected?.items.map((i) => {
              const st = statusLabel(i);
              return (
                <li
                  key={i.id}
                  className="rounded-xl border border-[var(--line)] bg-[var(--panel)] px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">
                        {i.quantity}× {i.name}
                        {i.variantName ? ` (${i.variantName})` : ""}
                      </p>
                      {i.addonNames ? (
                        <p className="text-xs text-[var(--muted)]">+ {i.addonNames}</p>
                      ) : null}
                      {i.notes ? <p className="text-xs text-amber-800">Note: {i.notes}</p> : null}
                      <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${st.className}`}>
                        {st.text}
                      </span>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-semibold">{formatINR(i.lineTotal)}</p>
                      <p className="text-[10px] text-[var(--muted)]">{formatINR(i.unitPrice)} each</p>
                    </div>
                  </div>
                </li>
              );
            })}
            {!selected?.items.length ? (
              <li className="rounded-xl border border-dashed border-[var(--line)] px-4 py-10 text-center text-sm text-[var(--muted)]">
                Cart is empty — items added on POS will appear here
              </li>
            ) : null}
          </ul>
        </section>

        <section className="flex flex-col justify-between bg-[var(--accent-soft)] p-6 md:p-8">
          <div>
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
              {selected?.outletName || "Guest display"}
            </p>
            <div className="mt-6 space-y-2 text-sm">
              <Row label="Subtotal" value={formatINR(selected?.subtotal ?? 0)} />
              <Row label="Discount" value={`- ${formatINR(selected?.discountAmount ?? 0)}`} />
              {(selected?.serviceCharge ?? 0) > 0 ? (
                <Row label="Service" value={formatINR(selected!.serviceCharge)} />
              ) : null}
              {(selected?.packingCharge ?? 0) > 0 ? (
                <Row label="Packing" value={formatINR(selected!.packingCharge)} />
              ) : null}
              {(selected?.deliveryCharge ?? 0) > 0 ? (
                <Row label="Delivery" value={formatINR(selected!.deliveryCharge)} />
              ) : null}
              {(selected?.containerCharge ?? 0) > 0 ? (
                <Row label="Container" value={formatINR(selected!.containerCharge)} />
              ) : null}
              <Row
                label={`GST (${(selected?.cgstPercent ?? 0) + (selected?.sgstPercent ?? 0)}%)`}
                value={formatINR((selected?.cgstAmount ?? 0) + (selected?.sgstAmount ?? 0))}
              />
              {(selected?.roundOff ?? 0) !== 0 ? (
                <Row label="Round off" value={formatINR(selected!.roundOff)} />
              ) : null}
            </div>
          </div>

          <div className="mt-8 space-y-3 border-t border-[var(--line)] pt-5">
            <div>
              <p className="text-sm text-[var(--muted)]">Grand total</p>
              <p className="font-[family-name:var(--font-display)] text-4xl text-[var(--accent)] md:text-5xl">
                {formatINR(selected?.total ?? 0)}
              </p>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--muted)]">Paid</span>
              <span className="font-semibold">{formatINR(selected?.paidAmount ?? 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--muted)]">Balance due</span>
              <span className="font-[family-name:var(--font-display)] text-2xl">{formatINR(balance)}</span>
            </div>
            {selected ? (
              <Link
                href={`/bill/${selected.id}`}
                className="mt-2 inline-flex rounded-xl bg-[var(--ink)] px-4 py-2.5 text-xs font-semibold text-white"
              >
                View bill / QR
              </Link>
            ) : null}
            <p className="pt-2 text-center text-xs text-[var(--muted)]">Thank you for dining with us</p>
          </div>
        </section>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-[var(--muted)]">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
