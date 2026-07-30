"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { resumeHoldOrder } from "@/lib/actions/services";

type Order = {
  id: string;
  orderNumber: string;
  customerName: string | null;
  total: number;
  updatedAt: string;
  tableName: string | null;
  itemCount: number;
};

export function HoldOrdersBoard({ orders }: { orders: Order[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-2">
      {orders.map((o) => (
        <div key={o.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="font-semibold">
              #{o.orderNumber} · {o.tableName || "No table"}
            </p>
            <p className="text-sm text-[var(--muted)]">
              {o.customerName || "Guest"} · {o.itemCount} items · ₹{o.total.toFixed(0)} · held{" "}
              {new Date(o.updatedAt).toLocaleString("en-IN")}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await resumeHoldOrder(o.id);
                  router.push(`/pos/${o.id}`);
                })
              }
              className="rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white"
            >
              Resume
            </button>
            <Link
              href={`/pos/${o.id}`}
              className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm"
            >
              Open POS
            </Link>
          </div>
        </div>
      ))}
      {orders.length === 0 ? (
        <p className="card p-8 text-center text-sm text-[var(--muted)]">No held orders</p>
      ) : null}
    </div>
  );
}
