"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toggleMenuItem } from "@/lib/actions/admin";

type Item = {
  id: string;
  code: string;
  name: string;
  available: boolean;
  isVeg: boolean;
  priceLabel: string;
};

export function MenuAvailabilityBoard({
  categories,
}: {
  categories: { id: string; name: string; items: Item[] }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      {categories.map((cat) => (
        <section key={cat.id} className="card p-4">
          <h2 className="font-semibold">{cat.name}</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {cat.items.map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await toggleMenuItem(item.id, !item.available);
                    router.refresh();
                  })
                }
                className={`flex items-center justify-between rounded-xl border px-3 py-3 text-left text-sm ${
                  item.available
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-rose-200 bg-rose-50 opacity-80"
                }`}
              >
                <div>
                  <p className="font-mono text-xs text-[var(--accent)]">#{item.code}</p>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-[var(--muted)]">{item.priceLabel}</p>
                </div>
                <span className="text-xs font-semibold uppercase">
                  {item.available ? "ON" : "OFF"}
                </span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
