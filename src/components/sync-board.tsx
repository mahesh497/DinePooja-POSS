"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { recordSync } from "@/lib/actions/services";

export function SyncBoard({ lastSyncAt }: { lastSyncAt: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="card max-w-lg space-y-4 p-6">
      <div>
        <p className="text-xs uppercase text-[var(--muted)]">Last sync</p>
        <p className="font-[family-name:var(--font-display)] text-xl">
          {lastSyncAt ? new Date(lastSyncAt).toLocaleString("en-IN") : "Never synced"}
        </p>
      </div>
      <p className="text-sm text-[var(--muted)]">
        Manual sync writes an audit log entry for cloud backup / offline reconciliation.
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await recordSync();
            router.refresh();
          })
        }
        className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
      >
        {pending ? "Syncing…" : "Run manual sync"}
      </button>
    </div>
  );
}
