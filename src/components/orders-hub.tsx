"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { assignDriver, cancelOrder, refundOrder } from "@/lib/actions/table-ops";
import { formatINR } from "@/lib/tax";
import {
  ONLINE_PLATFORMS,
  orderChannelBadge,
  orderSourceLabel,
  orderTypeLabel,
} from "@/lib/order-types";

type TimelineEvent = {
  id: string;
  action: string;
  details: string | null;
  createdAt: string;
};

type OrderRow = {
  id: string;
  orderNumber: string;
  type: string;
  source: string;
  status: string;
  total: number;
  guestCount: number;
  customerName: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  onlinePlatform: string | null;
  driverName: string | null;
  voidReason: string | null;
  tableName: string | null;
  itemCount: number;
  createdAt: string;
  settledAt: string | null;
  timeline: TimelineEvent[];
};

const TABS = [
  { key: "CURRENT", label: "Current" },
  { key: "COMPLETED", label: "Completed" },
  { key: "CANCELLED", label: "Cancelled" },
  { key: "REFUNDED", label: "Refunded" },
  { key: "ONLINE", label: "Online" },
] as const;

function statusColor(status: string) {
  if (status === "OPEN") return "bg-emerald-100 text-emerald-800";
  if (status === "SETTLED") return "bg-slate-100 text-slate-700";
  if (status === "CANCELLED" || status === "VOIDED") return "bg-red-100 text-red-800";
  if (status === "REFUNDED") return "bg-amber-100 text-amber-900";
  return "bg-[var(--chip)]";
}

export function OrdersHub({
  orders,
  initialTab = "CURRENT",
  billQuery,
}: {
  orders: OrderRow[];
  initialTab?: (typeof TABS)[number]["key"];
  billQuery?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>(initialTab);
  const [platform, setPlatform] = useState<string>("ALL");
  const [timelineFor, setTimelineFor] = useState<OrderRow | null>(null);
  const [driverFor, setDriverFor] = useState<OrderRow | null>(null);
  const [driverName, setDriverName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState(billQuery ?? "");

  const filtered = useMemo(() => {
    let list = orders;
    if (tab === "CURRENT") list = orders.filter((o) => o.status === "OPEN");
    else if (tab === "COMPLETED") list = orders.filter((o) => o.status === "SETTLED");
    else if (tab === "CANCELLED")
      list = orders.filter((o) => o.status === "CANCELLED" || o.status === "VOIDED");
    else if (tab === "REFUNDED") list = orders.filter((o) => o.status === "REFUNDED");
    else if (tab === "ONLINE")
      list = orders.filter((o) => o.source === "ONLINE" || !!o.onlinePlatform);

    if (tab === "ONLINE" && platform !== "ALL") {
      list = list.filter((o) => o.onlinePlatform === platform);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(q) ||
          o.customerName?.toLowerCase().includes(q) ||
          o.customerPhone?.includes(q) ||
          o.tableName?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [orders, tab, platform, search]);

  const counts = useMemo(
    () => ({
      CURRENT: orders.filter((o) => o.status === "OPEN").length,
      COMPLETED: orders.filter((o) => o.status === "SETTLED").length,
      CANCELLED: orders.filter((o) => o.status === "CANCELLED" || o.status === "VOIDED").length,
      REFUNDED: orders.filter((o) => o.status === "REFUNDED").length,
      ONLINE: orders.filter((o) => o.source === "ONLINE" || !!o.onlinePlatform).length,
    }),
    [orders]
  );

  function run(action: () => Promise<void>) {
    startTransition(async () => {
      try {
        setError("");
        await action();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Action failed");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl">Order Management</h1>
          <p className="text-sm text-[var(--muted)]">
            Current · completed · cancelled · refunded · online · timeline · driver · tracking
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/tables" className="rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-sm">
            Tables
          </Link>
          <Link href="/pos" className="rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white">
            New order
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              tab === t.key ? "bg-[var(--ink)] text-white" : "bg-white border border-[var(--line)]"
            }`}
          >
            {t.label} ({counts[t.key]})
          </button>
        ))}
        <input
          className="min-w-[160px] flex-1 rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-xs"
          placeholder="Search bill / phone / table"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {tab === "ONLINE" ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPlatform("ALL")}
            className={`rounded-xl px-3 py-2 text-xs font-semibold ${platform === "ALL" ? "bg-[var(--accent)] text-white" : "border border-[var(--line)] bg-white"}`}
          >
            All platforms
          </button>
          {ONLINE_PLATFORMS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPlatform(p)}
              className={`rounded-xl px-3 py-2 text-xs font-semibold ${platform === p ? "bg-[var(--accent)] text-white" : "border border-[var(--line)] bg-white"}`}
            >
              {p}
            </button>
          ))}
        </div>
      ) : null}

      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      {message ? <p className="text-sm text-[var(--ok)]">{message}</p> : null}

      {!filtered.length ? (
        <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--panel)] p-10 text-center">
          <p className="font-[family-name:var(--font-display)] text-2xl">No orders in this view</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((order) => (
            <article
              key={order.id}
              className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{order.orderNumber}</p>
                  <p className="text-sm text-[var(--muted)]">
                    {order.tableName
                      ? `Table ${order.tableName}`
                      : order.customerName || orderTypeLabel(order.type)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${statusColor(order.status)}`}>
                    {order.status}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${orderChannelBadge(order.type)}`}>
                    {orderTypeLabel(order.type)}
                  </span>
                </div>
              </div>

              <p className="mt-2 text-xs text-[var(--muted)]">
                {orderSourceLabel(order.source)}
                {order.onlinePlatform ? ` · ${order.onlinePlatform}` : ""}
                {" · "}
                {order.itemCount} items · {order.guestCount} guests
              </p>
              {order.customerPhone ? (
                <p className="mt-1 text-xs text-[var(--muted)]">{order.customerPhone}</p>
              ) : null}
              {order.customerAddress ? (
                <p className="mt-1 line-clamp-2 text-xs text-[var(--muted)]">{order.customerAddress}</p>
              ) : null}
              {order.driverName ? (
                <p className="mt-1 text-xs font-medium text-blue-800">Driver: {order.driverName}</p>
              ) : null}
              {order.voidReason ? (
                <p className="mt-1 text-xs text-red-700">{order.voidReason}</p>
              ) : null}

              <p className="mt-3 font-[family-name:var(--font-display)] text-xl">
                {formatINR(order.total)}
              </p>
              <p className="text-[10px] text-[var(--muted)]">
                {new Date(order.createdAt).toLocaleString("en-IN")}
                {order.settledAt ? ` · settled ${new Date(order.settledAt).toLocaleTimeString()}` : ""}
              </p>

              <div className="mt-3 flex flex-wrap gap-1">
                {order.status === "OPEN" ? (
                  <Link href={`/pos/${order.id}`} className="rounded-md bg-[var(--accent)] px-2 py-1 text-[10px] font-semibold text-white">
                    Open POS
                  </Link>
                ) : null}
                <Link href={`/bill/${order.id}`} className="rounded-md bg-white border border-[var(--line)] px-2 py-1 text-[10px] font-semibold">
                  Bill
                </Link>
                <button
                  type="button"
                  className="rounded-md bg-white border border-[var(--line)] px-2 py-1 text-[10px] font-semibold"
                  onClick={() => setTimelineFor(order)}
                >
                  Timeline
                </button>
                {(order.type === "DELIVERY" || order.source === "ONLINE") && order.status === "OPEN" ? (
                  <button
                    type="button"
                    className="rounded-md bg-blue-600 px-2 py-1 text-[10px] font-semibold text-white"
                    onClick={() => {
                      setDriverFor(order);
                      setDriverName(order.driverName || "");
                    }}
                  >
                    Assign driver
                  </button>
                ) : null}
                {order.status === "OPEN" ? (
                  <button
                    type="button"
                    disabled={pending}
                    className="rounded-md bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-700"
                    onClick={() => {
                      const reason = window.prompt("Cancel reason?") || "Cancelled";
                      run(async () => {
                        await cancelOrder(order.id, reason);
                        setMessage(`${order.orderNumber} cancelled`);
                      });
                    }}
                  >
                    Cancel
                  </button>
                ) : null}
                {order.status === "SETTLED" ? (
                  <button
                    type="button"
                    disabled={pending}
                    className="rounded-md bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-900"
                    onClick={() => {
                      const reason = window.prompt("Refund reason?") || "Refunded";
                      run(async () => {
                        await refundOrder(order.id, reason);
                        setMessage(`${order.orderNumber} refunded`);
                      });
                    }}
                  >
                    Refund
                  </button>
                ) : null}
                {order.customerAddress || order.type === "DELIVERY" ? (
                  <span className="rounded-md bg-[var(--chip)] px-2 py-1 text-[10px] font-semibold">
                    Tracking: {order.driverName ? "Out for delivery" : "Awaiting rider"}
                  </span>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}

      {timelineFor ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="font-[family-name:var(--font-display)] text-2xl">Order timeline</h3>
            <p className="text-sm text-[var(--muted)]">{timelineFor.orderNumber}</p>
            <ol className="mt-4 max-h-72 space-y-3 overflow-y-auto border-l-2 border-[var(--line)] pl-4">
              <li className="text-sm">
                <p className="font-semibold">Created</p>
                <p className="text-xs text-[var(--muted)]">
                  {new Date(timelineFor.createdAt).toLocaleString("en-IN")}
                </p>
              </li>
              {timelineFor.timeline.map((ev) => (
                <li key={ev.id} className="text-sm">
                  <p className="font-semibold">{ev.action.replaceAll("_", " ")}</p>
                  {ev.details ? <p className="text-xs text-[var(--muted)]">{ev.details}</p> : null}
                  <p className="text-xs text-[var(--muted)]">
                    {new Date(ev.createdAt).toLocaleString("en-IN")}
                  </p>
                </li>
              ))}
              {timelineFor.settledAt ? (
                <li className="text-sm">
                  <p className="font-semibold">Settled</p>
                  <p className="text-xs text-[var(--muted)]">
                    {new Date(timelineFor.settledAt).toLocaleString("en-IN")}
                  </p>
                </li>
              ) : null}
              {!timelineFor.timeline.length && !timelineFor.settledAt ? (
                <li className="text-sm text-[var(--muted)]">No further events yet</li>
              ) : null}
            </ol>
            <button
              type="button"
              className="mt-4 w-full rounded-xl border px-3 py-3"
              onClick={() => setTimelineFor(null)}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}

      {driverFor ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <form
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
            onSubmit={(e) => {
              e.preventDefault();
              run(async () => {
                await assignDriver(driverFor.id, driverName);
                setDriverFor(null);
                setMessage(`Driver assigned to ${driverFor.orderNumber}`);
              });
            }}
          >
            <h3 className="font-[family-name:var(--font-display)] text-2xl">Assign driver</h3>
            <p className="text-sm text-[var(--muted)]">{driverFor.orderNumber}</p>
            <input
              required
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              placeholder="Rider name / phone"
              className="mt-4 w-full rounded-xl border border-[var(--line)] px-3 py-3"
            />
            <div className="mt-4 flex gap-2">
              <button type="button" className="flex-1 rounded-xl border px-3 py-3" onClick={() => setDriverFor(null)}>
                Cancel
              </button>
              <button type="submit" className="flex-1 rounded-xl bg-[var(--accent)] px-3 py-3 font-semibold text-white">
                Save
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
