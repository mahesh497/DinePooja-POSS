import { CircleHelp } from "lucide-react";
import { ModulePage, StatRow } from "@/components/enterprise/module-page";
import { modules } from "@/lib/modules";
import { requireSession } from "@/lib/session";

export default async function HelpPage() {
  await requireSession();
  const shortcuts = modules.filter((m) => m.shortcut);

  return (
    <ModulePage title="Help" subtitle="Shortcuts, guides, support" icon={CircleHelp}>
      <StatRow
        stats={[
          { label: "Shortcuts", value: String(shortcuts.length) },
          { label: "Modules", value: String(modules.length) },
          { label: "Support", value: "In-app" },
          { label: "Synced", value: "Live" },
        ]}
      />

      <section className="card p-4">
        <h2 className="font-semibold">Keyboard shortcuts</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {shortcuts.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between rounded-xl border border-[var(--line)] px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium">{m.title}</p>
                <p className="text-xs text-[var(--muted)]">{m.description}</p>
              </div>
              <kbd className="rounded-lg bg-[var(--accent-soft)] px-2 py-1 font-mono text-xs font-semibold text-[var(--accent)]">
                {m.shortcut}
              </kbd>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-4">
        <h2 className="font-semibold">Tips</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--muted)]">
          <li>Use Tables to start dine-in, then punch items on POS.</li>
          <li>Send KOT before printing the bill for kitchen sync.</li>
          <li>Hold Orders parks a bill; resume from Hold Orders or POS.</li>
          <li>Demo coupons: WELCOME10 (10%), FLAT50 (₹50).</li>
        </ul>
      </section>
    </ModulePage>
  );
}
