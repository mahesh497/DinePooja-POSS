"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  addAddon,
  addVariant,
  createCategory,
  createMenuItem,
  toggleMenuItem,
  updateMenuItemCode,
  updateMenuItemPrice,
} from "@/lib/actions/admin";
import { formatINR } from "@/lib/tax";

type Item = {
  id: string;
  code: string;
  name: string;
  price: number;
  isVeg: boolean;
  available: boolean;
  kitchenStation: string;
  variants: { id: string; name: string; priceDelta: number }[];
  addons: { id: string; name: string; price: number }[];
};

type Category = {
  id: string;
  name: string;
  active: boolean;
  items: Item[];
};

export function MenuAdmin({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [catName, setCatName] = useState("");
  const [form, setForm] = useState({
    categoryId: categories[0]?.id ?? "",
    code: "",
    name: "",
    price: "",
    isVeg: true,
    kitchenStation: "Kitchen",
  });
  const [error, setError] = useState("");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">Menu</h1>
        <p className="text-sm text-[var(--muted)]">
          Categories, item codes, prices, variants, add-ons, and availability.
        </p>
      </div>
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <form
          className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              await createCategory(catName);
              setCatName("");
              router.refresh();
            });
          }}
        >
          <p className="font-medium">Add category</p>
          <input
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
            required
            placeholder="Category name"
            className="w-full rounded-xl border border-[var(--line)] px-3 py-2"
          />
          <button
            disabled={pending}
            className="rounded-xl bg-[var(--accent)] px-4 py-2 text-white"
            type="submit"
          >
            Add category
          </button>
        </form>

        <form
          className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              try {
                setError("");
                await createMenuItem({
                  categoryId: form.categoryId,
                  code: form.code,
                  name: form.name,
                  price: Number(form.price),
                  isVeg: form.isVeg,
                  kitchenStation: form.kitchenStation,
                });
                setForm((f) => ({ ...f, code: "", name: "", price: "" }));
                router.refresh();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Failed to add item");
              }
            });
          }}
        >
          <p className="font-medium">Add menu item</p>
          <select
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            className="w-full rounded-xl border border-[var(--line)] px-3 py-2"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            required
            placeholder="Item code (e.g. 30)"
            className="w-full rounded-xl border border-[var(--line)] px-3 py-2 font-mono"
          />
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            placeholder="Item name"
            className="w-full rounded-xl border border-[var(--line)] px-3 py-2"
          />
          <input
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            required
            type="number"
            step="0.01"
            placeholder="Price"
            className="w-full rounded-xl border border-[var(--line)] px-3 py-2"
          />
          <input
            value={form.kitchenStation}
            onChange={(e) => setForm({ ...form, kitchenStation: e.target.value })}
            placeholder="Kitchen station"
            className="w-full rounded-xl border border-[var(--line)] px-3 py-2"
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isVeg}
              onChange={(e) => setForm({ ...form, isVeg: e.target.checked })}
            />
            Vegetarian
          </label>
          <button
            disabled={pending}
            className="rounded-xl bg-[var(--accent)] px-4 py-2 text-white"
            type="submit"
          >
            Add item
          </button>
        </form>
      </div>

      <div className="space-y-4">
        {categories.map((category) => (
          <section
            key={category.id}
            className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4"
          >
            <h2 className="font-[family-name:var(--font-display)] text-xl">{category.name}</h2>
            <div className="mt-3 space-y-3">
              {category.items.map((item) => (
                <div key={item.id} className="rounded-xl border border-[var(--line)] bg-white p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">
                        <span className="mr-2 font-mono text-[var(--accent)]">#{item.code}</span>
                        {item.name}{" "}
                        <span className="text-xs text-[var(--muted)]">
                          · {item.kitchenStation} · {item.isVeg ? "Veg" : "Non-veg"}
                        </span>
                      </p>
                      <p className="text-sm text-[var(--muted)]">{formatINR(item.price)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded-lg bg-[var(--chip)] px-3 py-1 text-sm"
                        onClick={() =>
                          startTransition(async () => {
                            const code = prompt("Item code", item.code);
                            if (!code) return;
                            try {
                              setError("");
                              await updateMenuItemCode(item.id, code);
                              router.refresh();
                            } catch (e) {
                              setError(e instanceof Error ? e.message : "Code update failed");
                            }
                          })
                        }
                      >
                        Edit code
                      </button>
                      <button
                        type="button"
                        className="rounded-lg bg-[var(--chip)] px-3 py-1 text-sm"
                        onClick={() =>
                          startTransition(async () => {
                            const price = Number(prompt("New price", String(item.price)));
                            if (!Number.isFinite(price)) return;
                            await updateMenuItemPrice(item.id, price);
                            router.refresh();
                          })
                        }
                      >
                        Edit price
                      </button>
                      <button
                        type="button"
                        className="rounded-lg bg-[var(--chip)] px-3 py-1 text-sm"
                        onClick={() =>
                          startTransition(async () => {
                            await toggleMenuItem(item.id, !item.available);
                            router.refresh();
                          })
                        }
                      >
                        {item.available ? "Mark unavailable" : "Make available"}
                      </button>
                      <button
                        type="button"
                        className="rounded-lg bg-[var(--chip)] px-3 py-1 text-sm"
                        onClick={() =>
                          startTransition(async () => {
                            const name = prompt("Variant name");
                            const delta = Number(prompt("Price delta", "0") || 0);
                            if (!name) return;
                            await addVariant(item.id, name, delta);
                            router.refresh();
                          })
                        }
                      >
                        + Variant
                      </button>
                      <button
                        type="button"
                        className="rounded-lg bg-[var(--chip)] px-3 py-1 text-sm"
                        onClick={() =>
                          startTransition(async () => {
                            const name = prompt("Add-on name");
                            const price = Number(prompt("Add-on price", "0") || 0);
                            if (!name) return;
                            await addAddon(item.id, name, price);
                            router.refresh();
                          })
                        }
                      >
                        + Add-on
                      </button>
                    </div>
                  </div>
                  {(item.variants.length || item.addons.length) && (
                    <p className="mt-2 text-xs text-[var(--muted)]">
                      {item.variants.map((v) => `${v.name}(${v.priceDelta})`).join(", ")}
                      {item.variants.length && item.addons.length ? " · " : ""}
                      {item.addons.map((a) => `${a.name}+${a.price}`).join(", ")}
                    </p>
                  )}
                </div>
              ))}
              {!category.items.length ? (
                <p className="text-sm text-[var(--muted)]">No items in this category.</p>
              ) : null}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
