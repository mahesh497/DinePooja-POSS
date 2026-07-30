"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Bike,
  MapPin,
  Navigation,
  Phone,
  RefreshCw,
  Satellite,
} from "lucide-react";
import {
  assignDeliveryPartner,
  createDeliveryPartner,
  setPartnerDutyStatus,
  simulatePartnerGps,
  toggleDeliveryBoy,
  unassignDeliveryPartner,
  updateDeliveryTrackStatus,
  updatePartnerGps,
} from "@/lib/actions/delivery";
import { distanceKm, etaMinutes } from "@/lib/delivery-geo";
import { getDeviceCoords } from "@/lib/device-gps";
import { formatINR } from "@/lib/tax";

type Partner = {
  id: string;
  name: string;
  phone: string;
  active: boolean;
  rating: number;
  dutyStatus: string;
  vehicleType: string;
  vehicleNumber: string | null;
  lat: number | null;
  lng: number | null;
  lastSeenAt: string | null;
  activeTrips: number;
};

type DeliveryOrder = {
  id: string;
  orderNumber: string;
  customerName: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  driverName: string | null;
  deliveryBoyId: string | null;
  deliveryStatus: string;
  destLat: number | null;
  destLng: number | null;
  riderLat: number | null;
  riderLng: number | null;
  total: number;
  paidAmount: number;
  createdAt: string;
  pickedUpAt: string | null;
  onlinePlatform: string | null;
};

const TRACK_STEPS = ["ASSIGNED", "PICKED_UP", "ON_THE_WAY", "ARRIVED", "DELIVERED"] as const;

function statusTone(status: string) {
  if (status === "DELIVERED") return "bg-emerald-100 text-emerald-800";
  if (status === "CANCELLED") return "bg-rose-100 text-rose-800";
  if (status === "ON_THE_WAY" || status === "ARRIVED") return "bg-sky-100 text-sky-800";
  if (status === "PICKED_UP" || status === "ASSIGNED") return "bg-amber-100 text-amber-900";
  return "bg-[var(--chip)] text-[var(--muted)]";
}

function dutyTone(status: string) {
  if (status === "AVAILABLE") return "bg-emerald-50 text-emerald-700";
  if (status === "ON_TRIP") return "bg-sky-50 text-sky-800";
  return "bg-zinc-100 text-zinc-600";
}

/** Project lat/lng onto a 0–100 board around Bengaluru MG Road */
function project(lat: number, lng: number) {
  const minLat = 12.93;
  const maxLat = 13.02;
  const minLng = 77.55;
  const maxLng = 77.66;
  const x = ((lng - minLng) / (maxLng - minLng)) * 100;
  const y = ((maxLat - lat) / (maxLat - minLat)) * 100;
  return {
    left: `${Math.min(96, Math.max(4, x))}%`,
    top: `${Math.min(96, Math.max(4, y))}%`,
  };
}

export function DeliveryBoard({
  partners,
  orders,
  outletName,
}: {
  partners: Partner[];
  orders: DeliveryOrder[];
  outletName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    vehicleType: "Bike",
    vehicleNumber: "",
  });
  const [selectedOrderId, setSelectedOrderId] = useState(orders[0]?.id ?? "");

  useEffect(() => {
    if (!selectedOrderId && orders[0]?.id) setSelectedOrderId(orders[0].id);
  }, [orders, selectedOrderId]);

  useEffect(() => {
    const t = setInterval(() => startTransition(() => router.refresh()), 6000);
    return () => clearInterval(t);
  }, [router]);

  const selected = useMemo(
    () => orders.find((o) => o.id === selectedOrderId) ?? orders[0] ?? null,
    [orders, selectedOrderId]
  );

  const tracking = useMemo(() => {
    if (!selected?.riderLat || !selected?.riderLng || !selected.destLat || !selected.destLng) {
      return null;
    }
    const d = distanceKm(
      selected.riderLat,
      selected.riderLng,
      selected.destLat,
      selected.destLng
    );
    return {
      distanceKm: d,
      eta: etaMinutes(d, selected.deliveryStatus),
      rider: project(selected.riderLat, selected.riderLng),
      dest: project(selected.destLat, selected.destLng),
    };
  }, [selected]);

  function run(action: () => Promise<void>, ok?: string) {
    startTransition(async () => {
      try {
        setError("");
        await action();
        if (ok) setMessage(ok);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Action failed");
      }
    });
  }

  function shareGps(partnerId: string) {
    startTransition(async () => {
      try {
        setError("");
        const coords = await getDeviceCoords();
        await updatePartnerGps({
          partnerId,
          lat: coords.lat,
          lng: coords.lng,
        });
        setMessage("Live GPS updated from device");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "GPS update failed");
      }
    });
  }

  const available = partners.filter((p) => p.active && p.dutyStatus === "AVAILABLE");
  const onTrip = partners.filter((p) => p.dutyStatus === "ON_TRIP");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[var(--muted)]">
          Live tracking · auto-refresh 6s · device GPS or simulate route
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => router.refresh())}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${pending ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      {message ? <p className="text-sm text-[var(--ok)]">{message}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Partners" value={String(partners.length)} />
        <Stat label="Available" value={String(available.length)} />
        <Stat label="On trip" value={String(onTrip.length)} />
        <Stat label="Active deliveries" value={String(orders.filter((o) => o.deliveryStatus !== "PENDING" && o.deliveryStatus !== "DELIVERED").length)} />
      </div>

      <form
        className="card grid gap-3 p-4 md:grid-cols-5"
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            await createDeliveryPartner(form);
            setForm({ name: "", phone: "", vehicleType: "Bike", vehicleNumber: "" });
          }, "Partner added");
        }}
      >
        <input
          className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm"
          placeholder="Partner name"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm"
          placeholder="Phone"
          required
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <select
          className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm"
          value={form.vehicleType}
          onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}
        >
          <option>Bike</option>
          <option>Scooter</option>
          <option>Cycle</option>
          <option>Car</option>
        </select>
        <input
          className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm"
          placeholder="Vehicle no."
          value={form.vehicleNumber}
          onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })}
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
        >
          Add partner
        </button>
      </form>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        {/* Live map */}
        <section className="card overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Live map</p>
              <p className="font-semibold">{outletName} delivery zone</p>
            </div>
            {tracking ? (
              <p className="text-right text-xs text-[var(--muted)]">
                {tracking.distanceKm.toFixed(2)} km · ETA ~{tracking.eta} min
              </p>
            ) : (
              <p className="text-xs text-[var(--muted)]">Select an assigned order</p>
            )}
          </div>
          <div className="relative h-[360px] bg-[linear-gradient(45deg,#ecfdf5_25%,transparent_25%),linear-gradient(-45deg,#ecfdf5_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#ecfdf5_75%),linear-gradient(-45deg,transparent_75%,#f0fdf4_75%)] bg-[length:24px_24px] bg-[position:0_0,0_12px,12px_-12px,-12px_0] md:h-[420px]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(15,23,42,0.06))]" />
            {/* outlet pin */}
            <div
              className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
              style={project(12.975, 77.606)}
              title="Restaurant"
            >
              <div className="rounded-full bg-[var(--accent)] px-2 py-1 text-[10px] font-bold text-white shadow">
                Hub
              </div>
            </div>
            {partners
              .filter((p) => p.lat != null && p.lng != null)
              .map((p) => {
                const pos = project(p.lat!, p.lng!);
                return (
                  <div
                    key={p.id}
                    className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
                    style={pos}
                    title={`${p.name} · ${p.dutyStatus}`}
                  >
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-white shadow ${
                        p.dutyStatus === "ON_TRIP" ? "bg-sky-500" : p.dutyStatus === "AVAILABLE" ? "bg-emerald-500" : "bg-zinc-400"
                      }`}
                    >
                      <Bike className="h-4 w-4 text-white" />
                    </div>
                  </div>
                );
              })}
            {tracking ? (
              <>
                <div
                  className="absolute z-30 -translate-x-1/2 -translate-y-1/2"
                  style={tracking.rider}
                >
                  <div className="rounded-full bg-sky-600 px-2 py-1 text-[10px] font-bold text-white shadow-lg ring-4 ring-sky-200">
                    Rider
                  </div>
                </div>
                <div
                  className="absolute z-30 -translate-x-1/2 -translate-y-1/2"
                  style={tracking.dest}
                >
                  <div className="flex items-center gap-1 rounded-full bg-rose-600 px-2 py-1 text-[10px] font-bold text-white shadow-lg">
                    <MapPin className="h-3 w-3" /> Drop
                  </div>
                </div>
              </>
            ) : null}
          </div>
          {selected ? (
            <div className="flex flex-wrap gap-2 border-t border-[var(--line)] p-3">
              <button
                type="button"
                disabled={pending || !selected.deliveryBoyId}
                className="inline-flex items-center gap-1 rounded-xl bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
                onClick={() =>
                  run(async () => {
                    await simulatePartnerGps(selected.id);
                  }, "GPS simulated toward drop")
                }
              >
                <Satellite className="h-3.5 w-3.5" /> Simulate GPS move
              </button>
              {selected.deliveryBoyId ? (
                <button
                  type="button"
                  disabled={pending}
                  className="inline-flex items-center gap-1 rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold"
                  onClick={() => shareGps(selected.deliveryBoyId!)}
                >
                  <Navigation className="h-3.5 w-3.5" /> Use device GPS
                </button>
              ) : null}
              {selected.destLat && selected.destLng ? (
                <a
                  href={`https://www.openstreetmap.org/directions?engine=fossgis_osrm_bike&route=${selected.riderLat ?? 12.975}%2C${selected.riderLng ?? 77.606}%3B${selected.destLat}%2C${selected.destLng}#map=13/${selected.destLat}/${selected.destLng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold"
                >
                  Open route map
                </a>
              ) : null}
            </div>
          ) : null}
        </section>

        {/* Partners */}
        <section className="space-y-3">
          <h2 className="font-semibold">Delivery partners</h2>
          <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
            {partners.map((p) => (
              <div key={p.id} className="card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{p.name}</p>
                    <p className="flex items-center gap-1 text-xs text-[var(--muted)]">
                      <Phone className="h-3 w-3" /> {p.phone}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {p.vehicleType}
                      {p.vehicleNumber ? ` · ${p.vehicleNumber}` : ""} · ★ {p.rating.toFixed(1)}
                      {p.activeTrips ? ` · ${p.activeTrips} trip` : ""}
                    </p>
                    {p.lat != null && p.lng != null ? (
                      <p className="mt-1 font-mono text-[10px] text-[var(--muted)]">
                        GPS {p.lat.toFixed(5)}, {p.lng.toFixed(5)}
                        {p.lastSeenAt
                          ? ` · ${new Date(p.lastSeenAt).toLocaleTimeString("en-IN")}`
                          : ""}
                      </p>
                    ) : (
                      <p className="mt-1 text-[10px] text-amber-700">No GPS yet</p>
                    )}
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${dutyTone(p.dutyStatus)}`}>
                    {p.dutyStatus.replace("_", " ")}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  <button
                    type="button"
                    disabled={pending}
                    className="rounded-lg bg-[var(--chip)] px-2 py-1 text-[10px] font-semibold"
                    onClick={() =>
                      run(async () => {
                        await setPartnerDutyStatus(p.id, "AVAILABLE");
                      })
                    }
                  >
                    Available
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    className="rounded-lg bg-[var(--chip)] px-2 py-1 text-[10px] font-semibold"
                    onClick={() =>
                      run(async () => {
                        await setPartnerDutyStatus(p.id, "OFFLINE");
                      })
                    }
                  >
                    Offline
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    className="rounded-lg bg-[var(--chip)] px-2 py-1 text-[10px] font-semibold"
                    onClick={() => shareGps(p.id)}
                  >
                    Ping GPS
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    className={`rounded-lg px-2 py-1 text-[10px] font-semibold ${
                      p.active ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                    }`}
                    onClick={() =>
                      run(async () => {
                        await toggleDeliveryBoy(p.id, !p.active);
                      })
                    }
                  >
                    {p.active ? "Active" : "Disabled"}
                  </button>
                </div>
              </div>
            ))}
            {!partners.length ? (
              <p className="text-sm text-[var(--muted)]">Add your first delivery partner above.</p>
            ) : null}
          </div>
        </section>
      </div>

      {/* Orders pipeline */}
      <section className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Delivery orders & tracking</h2>
          <Link href="/pos" className="text-xs font-semibold text-[var(--accent)]">
            New delivery from POS
          </Link>
        </div>
        <div className="mt-3 space-y-3">
          {orders.map((o) => {
            const selectedRow = selected?.id === o.id;
            return (
              <div
                key={o.id}
                className={`rounded-2xl border px-3 py-3 ${
                  selectedRow ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--line)]"
                }`}
              >
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => setSelectedOrderId(o.id)}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">
                        #{o.orderNumber} · {formatINR(o.total)}
                        {o.onlinePlatform ? ` · ${o.onlinePlatform}` : ""}
                      </p>
                      <p className="text-sm text-[var(--muted)]">
                        {o.customerName || "Guest"}
                        {o.customerPhone ? ` · ${o.customerPhone}` : ""}
                      </p>
                      {o.customerAddress ? (
                        <p className="mt-0.5 line-clamp-2 text-xs text-[var(--muted)]">
                          {o.customerAddress}
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs">
                        Rider: <span className="font-medium">{o.driverName || "Unassigned"}</span>
                        {o.paidAmount > 0 ? ` · Paid ${formatINR(o.paidAmount)}` : " · Collect on delivery"}
                      </p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${statusTone(o.deliveryStatus)}`}>
                      {o.deliveryStatus.replaceAll("_", " ")}
                    </span>
                  </div>
                </button>

                <div className="mt-3 flex flex-wrap gap-1">
                  {TRACK_STEPS.map((step) => (
                    <button
                      key={step}
                      type="button"
                      disabled={pending || (!o.deliveryBoyId && step !== "DELIVERED")}
                      className={`rounded-lg px-2 py-1 text-[10px] font-semibold ${
                        o.deliveryStatus === step
                          ? "bg-[var(--ink)] text-white"
                          : "bg-white border border-[var(--line)]"
                      } disabled:opacity-40`}
                      onClick={() =>
                        run(async () => {
                          await updateDeliveryTrackStatus(o.id, step);
                        })
                      }
                    >
                      {step.replaceAll("_", " ")}
                    </button>
                  ))}
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  <select
                    disabled={pending}
                    className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-xs"
                    value={o.deliveryBoyId || ""}
                    onChange={(e) => {
                      const id = e.target.value;
                      if (!id) {
                        run(async () => {
                          await unassignDeliveryPartner(o.id);
                        }, "Unassigned");
                        return;
                      }
                      run(async () => {
                        await assignDeliveryPartner(o.id, id);
                        setSelectedOrderId(o.id);
                      }, "Partner assigned");
                    }}
                  >
                    <option value="">Assign partner…</option>
                    {partners
                      .filter((p) => p.active)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                          {p.dutyStatus === "ON_TRIP" ? " (on trip)" : ""}
                          {p.dutyStatus === "OFFLINE" ? " (offline)" : ""}
                        </option>
                      ))}
                  </select>
                  <Link
                    href={`/pos/${o.id}`}
                    className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold"
                  >
                    Open POS
                  </Link>
                  <Link
                    href={`/bill/${o.id}`}
                    className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold"
                  >
                    Bill
                  </Link>
                </div>
              </div>
            );
          })}
          {!orders.length ? (
            <p className="text-sm text-[var(--muted)]">
              No open delivery orders. Create a Delivery order from POS to start tracking.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-2xl">{value}</p>
    </div>
  );
}
