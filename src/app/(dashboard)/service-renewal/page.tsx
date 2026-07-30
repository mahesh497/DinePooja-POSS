import { ShieldCheck } from "lucide-react";
import { ModulePage, StatRow } from "@/components/enterprise/module-page";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { resolveOutletId } from "@/lib/outlet";
import { APP_VERSION } from "@/lib/modules";

export default async function ServiceRenewalPage() {
  const session = await requireSession();
  const outletId = await resolveOutletId(session);
  const outlet = await prisma.outlet.findUniqueOrThrow({ where: { id: outletId } });

  const renewsOn = new Date();
  renewsOn.setMonth(renewsOn.getMonth() + 11);
  const daysLeft = Math.ceil((renewsOn.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <ModulePage title="Service Renewal" subtitle="Subscription & renewals" icon={ShieldCheck}>
      <StatRow
        stats={[
          { label: "Plan", value: "Demo Pro" },
          { label: "Days left", value: String(daysLeft) },
          { label: "Version", value: APP_VERSION },
          { label: "Status", value: "Active" },
        ]}
      />

      <section className="card max-w-2xl space-y-3 p-6">
        <h2 className="font-[family-name:var(--font-display)] text-2xl">{outlet.name}</h2>
        <p className="text-sm text-[var(--muted)]">
          {[outlet.address, outlet.phone, outlet.gstin].filter(Boolean).join(" · ") ||
            "Outlet profile incomplete"}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-[var(--line)] p-3">
            <p className="text-xs uppercase text-[var(--muted)]">Subscription</p>
            <p className="font-semibold">DinePooja Demo Pro</p>
          </div>
          <div className="rounded-xl border border-[var(--line)] p-3">
            <p className="text-xs uppercase text-[var(--muted)]">Renews on</p>
            <p className="font-semibold">{renewsOn.toLocaleDateString("en-IN")}</p>
          </div>
          <div className="rounded-xl border border-[var(--line)] p-3">
            <p className="text-xs uppercase text-[var(--muted)]">Seats</p>
            <p className="font-semibold">Unlimited (demo)</p>
          </div>
          <div className="rounded-xl border border-[var(--line)] p-3">
            <p className="text-xs uppercase text-[var(--muted)]">Support</p>
            <p className="font-semibold">owner@dinepooja.local</p>
          </div>
        </div>
        <p className="text-sm text-[var(--muted)]">
          This is a demo subscription status tied to your outlet. Production billing is not enabled
          in this build.
        </p>
      </section>
    </ModulePage>
  );
}
