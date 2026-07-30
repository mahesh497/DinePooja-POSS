"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateKotItemStatus } from "@/lib/actions/orders";
import {
  cancelKot,
  markKotReady,
  markKotServed,
  mergeKots,
  moveKotItems,
  setKotDelayed,
  splitKotItems,
} from "@/lib/actions/table-ops";

type KotItem = {
  id: string;
  name: string;
  quantity: number;
  notes: string | null;
  status: string;
};

type KotCard = {
  id: string;
  kotNumber: number;
  station: string;
  status: string;
  createdAt: string;
  orderId: string;
  orderNumber: string;
  tableName: string | null;
  orderTypeLabel: string;
  items: KotItem[];
};

const QUEUE_FILTERS = [
  { key: "ALL", label: "Kitchen queue" },
  { key: "PENDING", label: "Pending" },
  { key: "PREPARING", label: "Cooking" },
  { key: "READY", label: "Ready" },
  { key: "DELAYED", label: "Delayed" },
  { key: "SERVED", label: "Served" },
  { key: "CANCELLED", label: "Cancelled" },
] as const;

function statusBadge(status: string) {
  if (status === "READY") return "bg-emerald-100 text-emerald-800";
  if (status === "DELAYED") return "bg-amber-100 text-amber-900";
  if (status === "CANCELLED") return "bg-red-100 text-red-800";
  if (status === "SERVED") return "bg-slate-100 text-slate-600";
  if (status === "PREPARING") return "bg-orange-100 text-orange-900";
  return "bg-[var(--chip)] text-[var(--ink)]";
}

export function KotBoard({
  kots,
  initialQuery = "",
}: {
  kots: KotCard[];
  initialQuery?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState<(typeof QUEUE_FILTERS)[number]["key"]>("ALL");
  const [query, setQuery] = useState(initialQuery);
  const [mergeSource, setMergeSource] = useState<string | null>(null);
  const [moveFrom, setMoveFrom] = useState<KotCard | null>(null);
  const [moveItems, setMoveItems] = useState<string[]>([]);
  const [moveTarget, setMoveTarget] = useState("");
  const [splitFrom, setSplitFrom] = useState<KotCard | null>(null);
  const [splitItems, setSplitItems] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const k of kots) c[k.status] = (c[k.status] ?? 0) + 1;
    return c;
  }, [kots]);

  const visible = useMemo(() => {
    let list = kots.filter((k) =>
      filter === "ALL" ? !["SERVED", "CANCELLED"].includes(k.status) : k.status === filter
    );
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (k) =>
          String(k.kotNumber).toLowerCase().includes(q) ||
          k.orderNumber.toLowerCase().includes(q) ||
          k.tableName?.toLowerCase().includes(q) ||
          k.id.toLowerCase().includes(q)
      );
    }
    return list;
  }, [kots, filter, query]);

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

  function setItemStatus(
    id: string,
    status: "PENDING" | "PREPARING" | "SERVED" | "VOIDED" | "DELAYED" | "CANCELLED"
  ) {
    run(async () => {
      await updateKotItemStatus(id, status);
    });
  }

  function printKot(kot: KotCard, reprint = false) {
    const w = window.open("", "_blank", "width=400,height=600");
    if (!w) return;
    w.document.write(`
      <html><head><title>KOT ${kot.kotNumber}</title>
      <style>body{font-family:monospace;padding:12px} h1{font-size:18px} li{margin:6px 0}</style>
      </head><body>
      <h1>${reprint ? "REPRINT · " : ""}KOT #${kot.kotNumber} · ${kot.station}</h1>
      <p>${kot.tableName ? "Table " + kot.tableName : kot.orderTypeLabel} · ${kot.orderNumber}</p>
      <p>${new Date(kot.createdAt).toLocaleString()}</p>
      <hr/>
      <ul>${kot.items
        .filter((i) => i.status !== "CANCELLED" && i.status !== "VOIDED")
        .map(
          (i) =>
            `<li><strong>${i.quantity}x</strong> ${i.name}${i.notes ? " (" + i.notes + ")" : ""}</li>`
        )
        .join("")}</ul>
      <script>window.print()</script>
      </body></html>
    `);
    w.document.close();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {QUEUE_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              filter === f.key ? "bg-[var(--ink)] text-white" : "bg-white border border-[var(--line)]"
            }`}
          >
            {f.label}
            {f.key === "ALL" ? ` (${kots.filter((k) => !["SERVED", "CANCELLED"].includes(k.status)).length})` : ` (${counts[f.key] ?? 0})`}
          </button>
        ))}
        <input
          className="min-w-[160px] flex-1 rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-xs"
          placeholder="Search KOT / order / table"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      {message ? <p className="text-sm text-[var(--ok)]">{message}</p> : null}
      {mergeSource ? (
        <p className="rounded-xl bg-[var(--chip)] px-3 py-2 text-sm">
          Merge mode — tap another KOT on the same order.{" "}
          <button type="button" className="underline" onClick={() => setMergeSource(null)}>
            Cancel
          </button>
        </p>
      ) : null}

      {!visible.length ? (
        <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--panel)] p-10 text-center">
          <p className="font-[family-name:var(--font-display)] text-2xl">
            {filter === "ALL" ? "Kitchen is clear" : `No ${filter.toLowerCase()} tickets`}
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">New KOTs from POS will appear here.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((kot) => (
            <article
              key={kot.id}
              className={`rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-sm ${
                kot.status === "DELAYED" ? "ring-2 ring-amber-400" : ""
              }`}
            >
              <button
                type="button"
                className="w-full text-left"
                disabled={pending}
                onClick={() => {
                  if (!mergeSource) return;
                  if (mergeSource === kot.id) return;
                  run(async () => {
                    await mergeKots(mergeSource, kot.id);
                    setMergeSource(null);
                    setMessage("KOTs merged");
                  });
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-[family-name:var(--font-display)] text-xl">
                      KOT #{kot.kotNumber}
                    </p>
                    <p className="text-sm text-[var(--muted)]">
                      {kot.station} ·{" "}
                      {kot.tableName ? `Table ${kot.tableName}` : kot.orderTypeLabel} ·{" "}
                      {kot.orderNumber}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {new Date(kot.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${statusBadge(kot.status)}`}
                  >
                    {kot.status}
                  </span>
                </div>
              </button>

              <ul className="mt-3 space-y-2">
                {kot.items.map((item) => (
                  <li key={item.id} className="rounded-xl bg-white p-3">
                    <div className="flex justify-between gap-2">
                      <p className="font-medium">
                        {item.quantity}× {item.name}
                      </p>
                      <span className="text-xs uppercase text-[var(--muted)]">{item.status}</span>
                    </div>
                    {item.notes ? <p className="text-xs text-[var(--muted)]">{item.notes}</p> : null}
                    {!["VOIDED", "CANCELLED", "SERVED"].includes(item.status) ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        <button
                          type="button"
                          disabled={pending}
                          className="rounded-lg bg-[var(--chip)] px-2 py-1 text-xs"
                          onClick={() => setItemStatus(item.id, "PREPARING")}
                        >
                          Cooking
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          className="rounded-lg bg-emerald-600 px-2 py-1 text-xs text-white"
                          onClick={() => setItemStatus(item.id, "SERVED")}
                        >
                          Served
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          className="rounded-lg bg-amber-100 px-2 py-1 text-xs text-amber-900"
                          onClick={() => setItemStatus(item.id, "DELAYED")}
                        >
                          Delayed
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          className="rounded-lg bg-red-50 px-2 py-1 text-xs text-red-700"
                          onClick={() => setItemStatus(item.id, "CANCELLED")}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>

              {kot.status !== "CANCELLED" && kot.status !== "SERVED" ? (
                <div className="mt-3 flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => printKot(kot, false)}
                    className="rounded-lg border border-[var(--line)] bg-white px-2 py-1.5 text-xs font-semibold"
                  >
                    Print
                  </button>
                  <button
                    type="button"
                    onClick={() => printKot(kot, true)}
                    className="rounded-lg border border-[var(--line)] bg-white px-2 py-1.5 text-xs font-semibold"
                  >
                    Reprint
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    className="rounded-lg bg-emerald-600 px-2 py-1.5 text-xs font-semibold text-white"
                    onClick={() =>
                      run(async () => {
                        await markKotReady(kot.id);
                        setMessage(`KOT #${kot.kotNumber} ready`);
                      })
                    }
                  >
                    Ready
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    className="rounded-lg bg-[var(--accent)] px-2 py-1.5 text-xs font-semibold text-white"
                    onClick={() =>
                      run(async () => {
                        await markKotServed(kot.id);
                      })
                    }
                  >
                    All served
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    className="rounded-lg bg-amber-100 px-2 py-1.5 text-xs font-semibold text-amber-900"
                    onClick={() =>
                      run(async () => {
                        await setKotDelayed(kot.id);
                      })
                    }
                  >
                    Delayed
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    className="rounded-lg bg-red-50 px-2 py-1.5 text-xs font-semibold text-red-700"
                    onClick={() => {
                      const reason = window.prompt("Cancel reason?") || "Cancelled";
                      run(async () => {
                        await cancelKot(kot.id, reason);
                        setMessage(`KOT #${kot.kotNumber} cancelled`);
                      });
                    }}
                  >
                    Cancel KOT
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-[var(--line)] bg-white px-2 py-1.5 text-xs font-semibold"
                    onClick={() => setMergeSource(kot.id)}
                  >
                    Merge
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-[var(--line)] bg-white px-2 py-1.5 text-xs font-semibold"
                    onClick={() => {
                      setSplitFrom(kot);
                      setSplitItems(kot.items.filter((i) => !["CANCELLED", "VOIDED"].includes(i.status)).map((i) => i.id).slice(0, 1));
                    }}
                  >
                    Split
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-[var(--line)] bg-white px-2 py-1.5 text-xs font-semibold"
                    onClick={() => {
                      setMoveFrom(kot);
                      setMoveItems(kot.items.filter((i) => !["CANCELLED", "VOIDED"].includes(i.status)).map((i) => i.id));
                      const sibling = kots.find(
                        (k) =>
                          k.orderId === kot.orderId &&
                          k.id !== kot.id &&
                          !["CANCELLED", "SERVED"].includes(k.status)
                      );
                      setMoveTarget(sibling?.id ?? "");
                    }}
                  >
                    Move items
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => printKot(kot, true)}
                  className="mt-3 w-full rounded-xl border border-[var(--line)] px-3 py-2 text-sm"
                >
                  Reprint KOT
                </button>
              )}
            </article>
          ))}
        </div>
      )}

      {/* Split modal */}
      {splitFrom ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="font-[family-name:var(--font-display)] text-2xl">Split KOT #{splitFrom.kotNumber}</h3>
            <p className="text-sm text-[var(--muted)]">Selected items become a new ticket</p>
            <div className="mt-3 max-h-48 space-y-2 overflow-y-auto">
              {splitFrom.items
                .filter((i) => !["CANCELLED", "VOIDED"].includes(i.status))
                .map((item) => {
                  const on = splitItems.includes(item.id);
                  return (
                    <label key={item.id} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() =>
                          setSplitItems((prev) =>
                            on ? prev.filter((id) => id !== item.id) : [...prev, item.id]
                          )
                        }
                      />
                      {item.quantity}× {item.name}
                    </label>
                  );
                })}
            </div>
            <div className="mt-4 flex gap-2">
              <button type="button" className="flex-1 rounded-xl border px-3 py-3" onClick={() => setSplitFrom(null)}>
                Cancel
              </button>
              <button
                type="button"
                disabled={pending || !splitItems.length}
                className="flex-1 rounded-xl bg-[var(--accent)] px-3 py-3 font-semibold text-white disabled:opacity-50"
                onClick={() =>
                  run(async () => {
                    await splitKotItems(splitFrom.id, splitItems);
                    setSplitFrom(null);
                    setMessage("KOT split");
                  })
                }
              >
                Split
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Move items modal */}
      {moveFrom ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="font-[family-name:var(--font-display)] text-2xl">Move KOT items</h3>
            <p className="text-sm text-[var(--muted)]">From KOT #{moveFrom.kotNumber}</p>
            <div className="mt-3 max-h-40 space-y-2 overflow-y-auto">
              {moveFrom.items
                .filter((i) => !["CANCELLED", "VOIDED"].includes(i.status))
                .map((item) => {
                  const on = moveItems.includes(item.id);
                  return (
                    <label key={item.id} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() =>
                          setMoveItems((prev) =>
                            on ? prev.filter((id) => id !== item.id) : [...prev, item.id]
                          )
                        }
                      />
                      {item.quantity}× {item.name}
                    </label>
                  );
                })}
            </div>
            <label className="mt-3 block text-sm">
              <span className="text-[var(--muted)]">Target KOT (same order)</span>
              <select
                value={moveTarget}
                onChange={(e) => setMoveTarget(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[var(--line)] px-3 py-2"
              >
                <option value="">Select KOT</option>
                {kots
                  .filter(
                    (k) =>
                      k.orderId === moveFrom.orderId &&
                      k.id !== moveFrom.id &&
                      !["CANCELLED", "SERVED"].includes(k.status)
                  )
                  .map((k) => (
                    <option key={k.id} value={k.id}>
                      KOT #{k.kotNumber} · {k.station}
                    </option>
                  ))}
              </select>
            </label>
            <div className="mt-4 flex gap-2">
              <button type="button" className="flex-1 rounded-xl border px-3 py-3" onClick={() => setMoveFrom(null)}>
                Cancel
              </button>
              <button
                type="button"
                disabled={pending || !moveTarget || !moveItems.length}
                className="flex-1 rounded-xl bg-[var(--accent)] px-3 py-3 font-semibold text-white disabled:opacity-50"
                onClick={() =>
                  run(async () => {
                    await moveKotItems(moveFrom.id, moveTarget, moveItems);
                    setMoveFrom(null);
                    setMessage("Items moved");
                  })
                }
              >
                Move
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
