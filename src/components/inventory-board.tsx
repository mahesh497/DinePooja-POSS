"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { adjustStock } from "@/lib/actions/services";

type Item = {
  id: string;
  code: string;
  name: string;
  stock: number;
  available: boolean;
  categoryName: string;
};

export function InventoryBoard({ items }: { items: Item[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-[var(--line)] text-xs uppercase text-[var(--muted)]">
          <tr>
            <th className="px-4 py-3">Code</th>
            <th className="px-4 py-3">Item</th>
            <th className="px-4 py-3">Category</th>
            <th className="px-4 py-3">Stock</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Adjust</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-[var(--line)] last:border-0">
              <td className="px-4 py-3 font-mono text-[var(--accent)]">#{item.code}</td>
              <td className="px-4 py-3 font-medium">{item.name}</td>
              <td className="px-4 py-3 text-[var(--muted)]">{item.categoryName}</td>
              <td className="px-4 py-3">
                <span className={item.stock <= 10 ? "font-semibold text-rose-600" : ""}>
                  {item.stock}
                </span>
              </td>
              <td className="px-4 py-3">{item.available ? "Available" : "Off"}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    className="w-20 rounded-lg border border-[var(--line)] px-2 py-1"
                    value={drafts[item.id] ?? String(item.stock)}
                    onChange={(e) => setDrafts({ ...drafts, [item.id]: e.target.value })}
                  />
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        await adjustStock(item.id, Number(drafts[item.id] ?? item.stock));
                        router.refresh();
                      })
                    }
                    className="rounded-lg bg-[var(--accent)] px-2 py-1 text-xs font-semibold text-white"
                  >
                    Save
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
