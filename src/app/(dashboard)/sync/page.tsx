import { RefreshCw } from "lucide-react";
import { ModulePage, StatRow } from "@/components/enterprise/module-page";
import { SyncBoard } from "@/components/sync-board";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { resolveOutletId } from "@/lib/outlet";

export default async function SyncPage() {
  const session = await requirePermission("settings");
  const outletId = await resolveOutletId(session);
  const last = await prisma.auditLog.findFirst({
    where: { outletId, action: "SYNC" },
    orderBy: { createdAt: "desc" },
  });

  return (
    <ModulePage title="Manual Sync" subtitle="Demo heartbeat — logs sync events for this outlet" icon={RefreshCw}>
      <StatRow
        stats={[
          {
            label: "Last sync",
            value: last ? new Date(last.createdAt).toLocaleTimeString("en-IN") : "Never",
          },
          { label: "Status", value: last ? "OK" : "Pending" },
          { label: "Mode", value: "Manual" },
          { label: "Synced", value: "Live" },
        ]}
      />
      <SyncBoard lastSyncAt={last?.createdAt.toISOString() ?? null} />
    </ModulePage>
  );
}
