import Link from "next/link";
import { Printer } from "lucide-react";
import { ModulePage, StatRow } from "@/components/enterprise/module-page";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { resolveOutletId } from "@/lib/outlet";
import { formatINR } from "@/lib/tax";

export default async function PrintCenterPage() {
  const session = await requirePermission("pos");
  const outletId = await resolveOutletId(session);

  const [settled, kots] = await Promise.all([
    prisma.order.findMany({
      where: { outletId, status: "SETTLED" },
      orderBy: { settledAt: "desc" },
      take: 20,
      include: { table: { select: { name: true } } },
    }),
    prisma.kot.findMany({
      where: { order: { outletId } },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        order: { select: { id: true, orderNumber: true, table: { select: { name: true } } } },
      },
    }),
  ]);

  return (
    <ModulePage title="Bill / KOT Print" subtitle="Reprint bills & KOTs" icon={Printer}>
      <StatRow
        stats={[
          { label: "Recent bills", value: String(settled.length) },
          { label: "Recent KOTs", value: String(kots.length) },
          { label: "Pending", value: "—" },
          { label: "Synced", value: "Live" },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-4">
          <h2 className="font-semibold">Settled bills</h2>
          <div className="mt-3 space-y-2">
            {settled.map((o) => (
              <Link
                key={o.id}
                href={`/bill/${o.id}`}
                className="flex items-center justify-between rounded-xl border border-[var(--line)] px-3 py-2 text-sm hover:border-[var(--accent)]"
              >
                <div>
                  <p className="font-medium">
                    #{o.orderNumber} · {o.table?.name || o.type}
                  </p>
                  <p className="text-[var(--muted)]">
                    {o.settledAt ? new Date(o.settledAt).toLocaleString("en-IN") : ""}
                  </p>
                </div>
                <span className="font-semibold">{formatINR(o.total)}</span>
              </Link>
            ))}
            {settled.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No settled bills yet</p>
            ) : null}
          </div>
        </section>

        <section className="card p-4">
          <h2 className="font-semibold">Recent KOTs</h2>
          <div className="mt-3 space-y-2">
            {kots.map((k) => (
              <Link
                key={k.id}
                href="/kot"
                className="flex items-center justify-between rounded-xl border border-[var(--line)] px-3 py-2 text-sm hover:border-[var(--accent)]"
              >
                <div>
                  <p className="font-medium">
                    KOT #{k.kotNumber} · Order #{k.order.orderNumber}
                  </p>
                  <p className="text-[var(--muted)]">
                    {k.order.table?.name || k.station} · {k.status}
                  </p>
                </div>
                <span className="text-xs text-[var(--muted)]">
                  {new Date(k.createdAt).toLocaleTimeString("en-IN")}
                </span>
              </Link>
            ))}
            {kots.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No KOTs yet</p>
            ) : null}
          </div>
        </section>
      </div>
    </ModulePage>
  );
}
