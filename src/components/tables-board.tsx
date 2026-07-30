"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type FormEvent } from "react";
import { createTable } from "@/lib/actions/admin";
import { createHall, moveOrderToTable, splitItemsToTable } from "@/lib/actions/table-ops";
import {
  mergeTables,
  openTableOrder,
  reserveTable,
  unreserveTable,
} from "@/lib/actions/orders";
import { formatINR } from "@/lib/tax";
import { TABLE_STAGES, formatElapsed, stageMeta, type TableStage } from "@/lib/table-stages";

type OrderItem = { id: string; name: string; quantity: number; lineTotal: number };

type TableRow = {
  id: string;
  name: string;
  capacity: number;
  status: TableStage | string;
  hallId: string | null;
  hallName: string;
  openOrder: {
    id: string;
    total: number;
    orderNumber: string;
    guestCount: number;
    itemCount: number;
    kotCount: number;
    billPrintedAt: string | null;
    occupiedAt: string | null;
    createdAt: string;
    items: OrderItem[];
  } | null;
};

export function TablesBoard({
  halls,
  tables,
}: {
  halls: { id: string; name: string }[];
  tables: TableRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [hallTab, setHallTab] = useState<string>("ALL");
  const [filter, setFilter] = useState<"ALL" | TableStage>("ALL");
  const [mergeSource, setMergeSource] = useState<string | null>(null);
  const [moveFrom, setMoveFrom] = useState<TableRow | null>(null);
  const [splitFrom, setSplitFrom] = useState<TableRow | null>(null);
  const [splitItems, setSplitItems] = useState<string[]>([]);
  const [splitTarget, setSplitTarget] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showHall, setShowHall] = useState(false);
  const [tableName, setTableName] = useState("");
  const [capacity, setCapacity] = useState(4);
  const [hallId, setHallId] = useState(halls[0]?.id ?? "");
  const [hallName, setHallName] = useState("");
  const [seating, setSeating] = useState<TableRow | null>(null);
  const [guestCount, setGuestCount] = useState(4);

  const counts = useMemo(() => {
    const c: Record<string, number> = { FREE: 0, OCCUPIED: 0, RUNNING: 0, PRINTED: 0, RESERVED: 0 };
    for (const t of tables) {
      const key = t.status === "BILLING" ? "PRINTED" : t.status;
      c[key] = (c[key] ?? 0) + 1;
    }
    return c;
  }, [tables]);

  const visible = tables.filter((t) => {
    if (hallTab !== "ALL" && t.hallId !== hallTab) return false;
    if (filter === "ALL") return true;
    if (filter === "PRINTED") return t.status === "PRINTED" || t.status === "BILLING";
    return t.status === filter;
  });

  const vacantTargets = tables.filter(
    (t) => t.status === "FREE" || (t.openOrder?.itemCount ?? 0) === 0
  );

  function beginSeat(table: TableRow) {
    if (table.status === "RESERVED") return;
    if (table.openOrder && table.openOrder.itemCount > 0) {
      router.push(`/pos/${table.openOrder.id}`);
      return;
    }
    setSeating(table);
    setGuestCount(table.capacity);
  }

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
          <h1 className="font-[family-name:var(--font-display)] text-3xl">Table Management</h1>
          <p className="text-sm text-[var(--muted)]">
            Halls · color stages · move · merge · split · reserve · quick print/view
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setShowHall((v) => !v)} className="rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-sm font-medium">
            {showHall ? "Close" : "Add hall"}
          </button>
          <button type="button" onClick={() => setShowAdd((v) => !v)} className="rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white">
            {showAdd ? "Close" : "Add table"}
          </button>
          <button
            type="button"
            onClick={() => setMergeSource(mergeSource ? null : "__pick__")}
            className="rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-sm font-medium"
          >
            {mergeSource ? "Cancel merge" : "Merge tables"}
          </button>
        </div>
      </div>

      {/* Halls */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setHallTab("ALL")}
          className={`rounded-xl px-4 py-2 text-sm font-semibold ${hallTab === "ALL" ? "bg-[var(--ink)] text-white" : "bg-white border border-[var(--line)]"}`}
        >
          All halls
        </button>
        {halls.map((h) => (
          <button
            key={h.id}
            type="button"
            onClick={() => setHallTab(h.id)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${hallTab === h.id ? "bg-[var(--accent)] text-white" : "bg-white border border-[var(--line)]"}`}
          >
            {h.name}
          </button>
        ))}
      </div>

      {/* Stage legend */}
      <div className="card flex flex-wrap gap-2 p-3">
        <button type="button" onClick={() => setFilter("ALL")} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${filter === "ALL" ? "bg-[var(--ink)] text-white" : "bg-[var(--chip)]"}`}>
          All ({tables.length})
        </button>
        {TABLE_STAGES.filter((s) => s.key !== "BILLING").map((stage) => (
          <button
            key={stage.key}
            type="button"
            onClick={() => setFilter(stage.key)}
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${stage.badge} ${filter === stage.key ? "ring-1 ring-[var(--ink)]" : ""}`}
          >
            <span className={`h-2.5 w-2.5 rounded-full ${stage.swatch}`} />
            {stage.label} ({counts[stage.key] ?? 0})
          </button>
        ))}
      </div>

      {showHall ? (
        <form
          className="card flex flex-wrap gap-2 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              await createHall(hallName);
              setHallName("");
              setShowHall(false);
              setMessage("Hall added");
            });
          }}
        >
          <input required value={hallName} onChange={(e) => setHallName(e.target.value)} placeholder="Dining Hall 4" className="rounded-xl border border-[var(--line)] px-3 py-2" />
          <button type="submit" className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white">Save hall</button>
        </form>
      ) : null}

      {showAdd ? (
        <form
          className="card flex flex-wrap items-end gap-3 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              await createTable(tableName, capacity, hallId || undefined);
              setTableName("");
              setShowAdd(false);
              setMessage("Table added — Vacant");
            });
          }}
        >
          <input required value={tableName} onChange={(e) => setTableName(e.target.value)} placeholder="Table name" className="rounded-xl border border-[var(--line)] px-3 py-2" />
          <input type="number" min={1} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} className="w-24 rounded-xl border border-[var(--line)] px-3 py-2" />
          <select value={hallId} onChange={(e) => setHallId(e.target.value)} className="rounded-xl border border-[var(--line)] px-3 py-2">
            {halls.map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
          <button type="submit" className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white">Save table</button>
        </form>
      ) : null}

      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      {message ? <p className="text-sm text-[var(--ok)]">{message}</p> : null}
      {mergeSource && mergeSource !== "__pick__" ? (
        <p className="rounded-xl bg-[var(--chip)] px-3 py-2 text-sm">Merge mode — tap destination table.</p>
      ) : null}
      {moveFrom ? (
        <p className="rounded-xl bg-blue-50 px-3 py-2 text-sm text-blue-800">
          Move order from {moveFrom.name} — tap a vacant table.{" "}
          <button type="button" className="underline" onClick={() => setMoveFrom(null)}>Cancel</button>
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {visible.map((table) => {
          const stage = stageMeta(table.status);
          const order = table.openOrder;
          const active = !!order && order.itemCount > 0;
          const elapsed = formatElapsed(order?.occupiedAt || order?.createdAt);
          return (
            <div key={table.id} className={`rounded-2xl border-2 p-4 shadow-sm ${stage.card}`}>
              <button
                type="button"
                disabled={pending || table.status === "RESERVED"}
                className="w-full text-left disabled:cursor-not-allowed"
                onClick={() => {
                  if (moveFrom?.openOrder) {
                    if (table.id === moveFrom.id) return;
                    run(async () => {
                      await moveOrderToTable(moveFrom.openOrder!.id, table.id);
                      setMoveFrom(null);
                      setMessage(`Moved to ${table.name}`);
                    });
                    return;
                  }
                  if (mergeSource) {
                    if (mergeSource === "__pick__") setMergeSource(table.id);
                    else
                      run(async () => {
                        const id = await mergeTables(mergeSource, table.id);
                        setMergeSource(null);
                        router.push(`/pos/${id}`);
                      });
                    return;
                  }
                  beginSeat(table);
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-[family-name:var(--font-display)] text-2xl">{table.name}</p>
                    <p className="text-[10px] text-[var(--muted)]">{table.hallName}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${stage.badge}`}>
                    {stage.label}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {table.capacity} seats{active ? ` · ${elapsed}` : ""}
                </p>
                {active && order ? (
                  <div className="mt-2 text-sm">
                    <p className="font-medium">{order.orderNumber}</p>
                    <p className="text-lg font-semibold">{formatINR(order.total)}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {order.guestCount} guests · {order.itemCount} items
                      {order.kotCount ? ` · ${order.kotCount} KOT` : ""}
                    </p>
                  </div>
                ) : table.status === "RESERVED" ? (
                  <p className="mt-3 text-sm text-blue-700">Reserved</p>
                ) : (
                  <p className="mt-3 text-sm text-[var(--muted)]">Vacant · tap to seat</p>
                )}
              </button>

              <div className="mt-3 flex flex-wrap gap-1">
                {active && order ? (
                  <>
                    <Link href={`/pos/${order.id}`} className="rounded-md bg-white/90 px-2 py-1 text-[10px] font-semibold">View</Link>
                    <Link href={`/bill/${order.id}`} className="rounded-md bg-white/90 px-2 py-1 text-[10px] font-semibold">Print</Link>
                    <button type="button" className="rounded-md bg-white/90 px-2 py-1 text-[10px] font-semibold" onClick={() => setMoveFrom(table)}>Move</button>
                    <button
                      type="button"
                      className="rounded-md bg-white/90 px-2 py-1 text-[10px] font-semibold"
                      onClick={() => {
                        setSplitFrom(table);
                        setSplitItems(order.items.map((i) => i.id));
                        setSplitTarget(vacantTargets.find((t) => t.id !== table.id)?.id ?? "");
                      }}
                    >
                      Split
                    </button>
                    <Link href={`/kot`} className="rounded-md bg-white/90 px-2 py-1 text-[10px] font-semibold">KOT</Link>
                  </>
                ) : null}
                {(table.status === "FREE" || (!active && table.status !== "RESERVED")) ? (
                  <button
                    type="button"
                    className="rounded-md bg-blue-600 px-2 py-1 text-[10px] font-semibold text-white"
                    onClick={() =>
                      run(async () => {
                        await reserveTable(table.id);
                        setMessage(`${table.name} reserved`);
                      })
                    }
                  >
                    Reserve
                  </button>
                ) : null}
                {table.status === "RESERVED" ? (
                  <button
                    type="button"
                    className="rounded-md bg-white px-2 py-1 text-[10px] font-semibold text-blue-700"
                    onClick={() =>
                      run(async () => {
                        await unreserveTable(table.id);
                        setMessage(`${table.name} vacant`);
                      })
                    }
                  >
                    Unreserve
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {!visible.length ? <div className="card p-8 text-center text-sm text-[var(--muted)]">No tables in this view.</div> : null}

      {/* Seat modal */}
      {seating ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <form
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              run(async () => {
                const id = await openTableOrder(seating.id, guestCount);
                setSeating(null);
                router.push(`/pos/${id}`);
              });
            }}
          >
            <h3 className="font-[family-name:var(--font-display)] text-2xl">Seat {seating.name}</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">{seating.hallName} · capacity {seating.capacity}</p>
            <input type="number" min={1} value={guestCount} onChange={(e) => setGuestCount(Number(e.target.value))} className="mt-4 w-full rounded-xl border border-[var(--line)] px-3 py-3" />
            <div className="mt-4 flex gap-2">
              <button type="button" className="flex-1 rounded-xl border px-3 py-3" onClick={() => setSeating(null)}>Cancel</button>
              <button type="submit" className="flex-1 rounded-xl bg-[var(--accent)] px-3 py-3 font-semibold text-white">Open POS</button>
            </div>
          </form>
        </div>
      ) : null}

      {/* Split modal */}
      {splitFrom?.openOrder ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="font-[family-name:var(--font-display)] text-2xl">Split / transfer items</h3>
            <p className="text-sm text-[var(--muted)]">From {splitFrom.name} · {splitFrom.openOrder.orderNumber}</p>
            <div className="mt-3 max-h-48 space-y-2 overflow-y-auto">
              {splitFrom.openOrder.items.map((item) => {
                const on = splitItems.includes(item.id);
                return (
                  <label key={item.id} className="flex items-center justify-between rounded-lg border border-[var(--line)] px-3 py-2 text-sm">
                    <span className="flex items-center gap-2">
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
                    </span>
                    <span>{formatINR(item.lineTotal)}</span>
                  </label>
                );
              })}
            </div>
            <label className="mt-3 block text-sm">
              <span className="text-[var(--muted)]">Move to table</span>
              <select value={splitTarget} onChange={(e) => setSplitTarget(e.target.value)} className="mt-1 w-full rounded-xl border border-[var(--line)] px-3 py-2">
                <option value="">Select vacant table</option>
                {vacantTargets
                  .filter((t) => t.id !== splitFrom.id)
                  .map((t) => (
                    <option key={t.id} value={t.id}>{t.name} · {t.hallName}</option>
                  ))}
              </select>
            </label>
            <div className="mt-4 flex gap-2">
              <button type="button" className="flex-1 rounded-xl border px-3 py-3" onClick={() => setSplitFrom(null)}>Cancel</button>
              <button
                type="button"
                disabled={pending || !splitTarget || !splitItems.length}
                className="flex-1 rounded-xl bg-[var(--accent)] px-3 py-3 font-semibold text-white disabled:opacity-50"
                onClick={() =>
                  run(async () => {
                    const id = await splitItemsToTable({
                      orderId: splitFrom.openOrder!.id,
                      targetTableId: splitTarget,
                      orderItemIds: splitItems,
                    });
                    setSplitFrom(null);
                    router.push(`/pos/${id}`);
                  })
                }
              >
                Split to table
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
