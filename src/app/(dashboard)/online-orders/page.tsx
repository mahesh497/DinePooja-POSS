import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { formatINR } from "@/lib/tax";
import { ONLINE_PLATFORMS } from "@/lib/order-types";

export default async function OnlineOrdersPage() {
  const session = await requirePermission("pos");
  const since = new Date();
  since.setHours(0, 0, 0, 0);

  const orders = await prisma.order.findMany({
    where: {
      outletId: session.user.outletId,
      OR: [{ source: "ONLINE" }, { onlinePlatform: { not: null } }],
      createdAt: { gte: since },
    },
    include: { items: { where: { voided: false } } },
    orderBy: { createdAt: "desc" },
  });

  const open = orders.filter((o) => o.status === "OPEN").length;
  const byPlatform = Object.fromEntries(
    ONLINE_PLATFORMS.map((p) => [p, orders.filter((o) => o.onlinePlatform === p).length])
  ) as Record<string, number>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-[var(--chip)] p-3">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-3xl">Online Orders</h1>
            <p className="text-sm text-[var(--muted)]">
              Tagged from POS (Swiggy / Zomato / etc.) — no aggregator webhooks yet
            </p>
          </div>
        </div>
        <Link href="/orders?tab=ONLINE" className="rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white">
          Open order hub
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Today" value={String(orders.length)} />
        <Stat label="Open" value={String(open)} />
        <Stat label="With driver" value={String(orders.filter((o) => o.driverName).length)} />
        <Stat label="Synced" value="Live" />
      </div>

      <div className="flex flex-wrap gap-2">
        {ONLINE_PLATFORMS.map((p) => (
          <span key={p} className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold">
            {p}: {byPlatform[p] ?? 0}
          </span>
        ))}
      </div>

      {!orders.length ? (
        <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--panel)] p-10 text-center">
          <p className="font-[family-name:var(--font-display)] text-2xl">No online orders today</p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Create a delivery/parcel order with source Online from POS.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/pos/${order.id}`}
              className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 transition hover:border-[var(--accent)]"
            >
              <div className="flex justify-between gap-2">
                <p className="font-semibold">{order.orderNumber}</p>
                <span className="rounded-full bg-[var(--chip)] px-2 py-0.5 text-[10px] font-semibold uppercase">
                  {order.onlinePlatform || "Online"}
                </span>
              </div>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {order.customerName || "Guest"}
                {order.customerPhone ? ` · ${order.customerPhone}` : ""}
              </p>
              {order.driverName ? (
                <p className="mt-1 text-xs text-blue-800">Driver: {order.driverName}</p>
              ) : (
                <p className="mt-1 text-xs text-[var(--muted)]">Tracking: awaiting rider</p>
              )}
              <p className="mt-3 font-[family-name:var(--font-display)] text-xl">
                {formatINR(order.total)}
              </p>
              <p className="text-xs text-[var(--muted)]">
                {order.status} · {order.items.length} items
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-2xl">{value}</p>
    </div>
  );
}
