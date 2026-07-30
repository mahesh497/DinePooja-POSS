"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createReservation, updateReservationStatus } from "@/lib/actions/services";
import type { ReservationStatus } from "@prisma/client";

type Row = {
  id: string;
  guestName: string;
  phone: string | null;
  partySize: number;
  reservedAt: string;
  status: ReservationStatus;
  notes: string | null;
  tableName: string | null;
};

const statuses: ReservationStatus[] = ["BOOKED", "SEATED", "COMPLETED", "NO_SHOW", "CANCELLED"];

export function ReservationsBoard({
  reservations,
  tables,
}: {
  reservations: Row[];
  tables: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    guestName: "",
    phone: "",
    partySize: "2",
    tableId: "",
    reservedAt: "",
    notes: "",
  });

  return (
    <div className="space-y-4">
      <form
        className="card grid gap-3 p-4 md:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            await createReservation({
              guestName: form.guestName,
              phone: form.phone,
              partySize: Number(form.partySize),
              tableId: form.tableId || undefined,
              reservedAt: form.reservedAt,
              notes: form.notes,
            });
            setForm({
              guestName: "",
              phone: "",
              partySize: "2",
              tableId: "",
              reservedAt: "",
              notes: "",
            });
            router.refresh();
          });
        }}
      >
        <input
          className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm"
          placeholder="Guest name"
          required
          value={form.guestName}
          onChange={(e) => setForm({ ...form, guestName: e.target.value })}
        />
        <input
          className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm"
          placeholder="Phone"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <input
          type="number"
          min="1"
          className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm"
          value={form.partySize}
          onChange={(e) => setForm({ ...form, partySize: e.target.value })}
        />
        <select
          className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm"
          value={form.tableId}
          onChange={(e) => setForm({ ...form, tableId: e.target.value })}
        >
          <option value="">Any table</option>
          {tables.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <input
          type="datetime-local"
          required
          className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm"
          value={form.reservedAt}
          onChange={(e) => setForm({ ...form, reservedAt: e.target.value })}
        />
        <input
          className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm"
          placeholder="Notes"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white md:col-span-3"
        >
          {pending ? "Booking…" : "Book reservation"}
        </button>
      </form>

      <div className="space-y-2">
        {reservations.map((r) => (
          <div key={r.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-semibold">{r.guestName}</p>
              <p className="text-sm text-[var(--muted)]">
                {r.partySize} guests · {r.tableName || "Any"} ·{" "}
                {new Date(r.reservedAt).toLocaleString("en-IN")}
                {r.phone ? ` · ${r.phone}` : ""}
              </p>
              {r.notes ? <p className="mt-1 text-xs text-[var(--muted)]">{r.notes}</p> : null}
            </div>
            <select
              disabled={pending}
              className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm"
              value={r.status}
              onChange={(e) =>
                startTransition(async () => {
                  await updateReservationStatus(r.id, e.target.value as ReservationStatus);
                  router.refresh();
                })
              }
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        ))}
        {reservations.length === 0 ? (
          <p className="card p-6 text-center text-sm text-[var(--muted)]">No reservations</p>
        ) : null}
      </div>
    </div>
  );
}
