"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  addOrderItem,
  addPayment,
  applyDiscount,
  createChannelOrder,
  removeUnsentItem,
  sendKot,
  updateItemQuantity,
  updateOrderDetails,
  voidOrder,
  voidOrderItem,
} from "@/lib/actions/orders";
import { applyCouponToOrder, holdOrder } from "@/lib/actions/services";
import { ONLINE_PLATFORMS, orderTypeLabel } from "@/lib/order-types";
import { formatINR } from "@/lib/tax";

type Variant = { id: string; name: string; priceDelta: number };
type Addon = { id: string; name: string; price: number };
type MenuItem = {
  id: string;
  code: string;
  name: string;
  price: number;
  isVeg: boolean;
  available: boolean;
  imageUrl: string | null;
  stock: number;
  popular: boolean;
  recommended: boolean;
  variants: Variant[];
  addons: Addon[];
};
type Category = { id: string; name: string; items: MenuItem[] };
type OrderItem = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  notes: string | null;
  isVeg: boolean;
  variantName: string | null;
  addonNames: string | null;
  voided: boolean;
  kotSent: boolean;
  kitchenStatus: string | null;
};
type Order = {
  id: string;
  orderNumber: string;
  type: string;
  source: string;
  status: string;
  guestCount: number;
  subtotal: number;
  packingCharge: number;
  deliveryCharge: number;
  serviceCharge: number;
  containerCharge: number;
  roundOff: number;
  discountAmount: number;
  discountPercent: number;
  cgstAmount: number;
  sgstAmount: number;
  total: number;
  paidAmount: number;
  notes: string | null;
  tableName: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  onlinePlatform: string | null;
  items: OrderItem[];
};
type OutletDefaults = {
  cgstPercent: number;
  sgstPercent: number;
  packingChargeDefault: number;
  deliveryChargeDefault: number;
  containerChargeDefault: number;
};

type NewChannel = "PARCEL" | "DELIVERY" | null;
type SortKey = "name" | "price_asc" | "price_desc" | "code" | "popular";
type DietFilter = "ALL" | "VEG" | "NONVEG";

const FAV_KEY = "dinepooja-pos-favorites";

function hasModifiers(item: MenuItem) {
  return item.variants.length > 0 || item.addons.length > 0;
}

function kitchenBadge(status: string | null, kotSent: boolean) {
  if (!kotSent) return { label: "Pending KOT", className: "bg-slate-100 text-slate-600" };
  const s = (status || "PENDING").toUpperCase();
  if (s === "SERVED") return { label: "Served", className: "bg-emerald-100 text-emerald-800" };
  if (s === "PREPARING") return { label: "Cooking", className: "bg-orange-100 text-orange-900" };
  if (s === "READY") return { label: "Ready", className: "bg-emerald-50 text-emerald-700" };
  if (s === "DELAYED") return { label: "Delayed", className: "bg-amber-100 text-amber-900" };
  if (s === "CANCELLED" || s === "VOIDED") return { label: s, className: "bg-red-100 text-red-700" };
  return { label: "Pending", className: "bg-blue-50 text-blue-800" };
}

function ItemThumb({ item }: { item: MenuItem }) {
  if (item.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={item.imageUrl} alt="" className="h-16 w-full rounded-lg object-cover" />
    );
  }
  const tone = item.isVeg ? "from-emerald-100 to-lime-50" : "from-rose-100 to-orange-50";
  return (
    <div
      className={`flex h-16 w-full items-center justify-center rounded-lg bg-gradient-to-br ${tone} font-[family-name:var(--font-display)] text-xl text-[var(--ink)]/70`}
    >
      {item.name.slice(0, 1)}
    </div>
  );
}

export function PosScreen({
  categories,
  order,
  openOrders,
  canVoid,
  canDiscount,
  outletTax,
}: {
  categories: Category[];
  order: Order | null;
  openOrders: { id: string; label: string; type: string }[];
  canVoid: boolean;
  canDiscount: boolean;
  outletTax: OutletDefaults;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [categoryQuery, setCategoryQuery] = useState("");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [diet, setDiet] = useState<DietFilter>("ALL");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [variantId, setVariantId] = useState("");
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");
  const [discountPct, setDiscountPct] = useState(order?.discountPercent ?? 0);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<"CASH" | "UPI" | "CARD">("CASH");
  const [payRef, setPayRef] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [newChannel, setNewChannel] = useState<NewChannel>(null);
  const [orderNotes, setOrderNotes] = useState(order?.notes ?? "");
  const [charges, setCharges] = useState({
    packing: String(order?.packingCharge ?? 0),
    delivery: String(order?.deliveryCharge ?? 0),
    service: String(order?.serviceCharge ?? 0),
    container: String(order?.containerCharge ?? 0),
  });
  const [channelForm, setChannelForm] = useState({
    customerName: "",
    customerPhone: "",
    customerAddress: "",
    source: "WALK_IN" as "WALK_IN" | "PHONE" | "ONLINE",
    onlinePlatform: "Swiggy",
    packingCharge: String(outletTax.packingChargeDefault),
    deliveryCharge: String(outletTax.deliveryChargeDefault),
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(FAV_KEY);
      if (raw) setFavorites(JSON.parse(raw) as string[]);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!order) return;
    setOrderNotes(order.notes ?? "");
    setCharges({
      packing: String(order.packingCharge),
      delivery: String(order.deliveryCharge),
      service: String(order.serviceCharge),
      container: String(order.containerCharge),
    });
    setDiscountPct(order.discountPercent);
  }, [order]);

  function toggleFavorite(id: string) {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      localStorage.setItem(FAV_KEY, JSON.stringify(next));
      return next;
    });
  }

  const visibleCategories = useMemo(() => {
    const q = categoryQuery.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, categoryQuery]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = categories.flatMap((c) =>
      c.items.map((i) => ({ ...i, categoryId: c.id, categoryName: c.name }))
    );
    let filtered = list.filter((i) => {
      if (!showUnavailable && !i.available) return false;
      if (favoritesOnly && !favorites.includes(i.id)) return false;
      if (diet === "VEG" && !i.isVeg) return false;
      if (diet === "NONVEG" && i.isVeg) return false;
      if (!q) return !categoryId || i.categoryId === categoryId;
      const code = i.code.toLowerCase();
      const name = i.name.toLowerCase();
      return code === q || code.startsWith(q) || name.includes(q);
    });

    filtered = [...filtered].sort((a, b) => {
      if (q) {
        const aExact = a.code.toLowerCase() === q ? 0 : a.code.toLowerCase().startsWith(q) ? 1 : 2;
        const bExact = b.code.toLowerCase() === q ? 0 : b.code.toLowerCase().startsWith(q) ? 1 : 2;
        if (aExact !== bExact) return aExact - bExact;
      }
      if (sortKey === "price_asc") return a.price - b.price;
      if (sortKey === "price_desc") return b.price - a.price;
      if (sortKey === "code") return a.code.localeCompare(b.code, undefined, { numeric: true });
      if (sortKey === "popular") return Number(b.popular) - Number(a.popular) || a.name.localeCompare(b.name);
      return a.name.localeCompare(b.name);
    });
    return filtered;
  }, [categories, categoryId, query, sortKey, diet, favoritesOnly, favorites, showUnavailable]);

  const exactCodeMatch = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return items.find((i) => i.code.toLowerCase() === q) ?? null;
  }, [items, query]);

  function openModifier(item: MenuItem) {
    setSelectedItem(item);
    setVariantId(item.variants[0]?.id ?? "");
    setAddonIds([]);
    setQty(1);
    setNotes("");
  }

  function quickAdd(item: MenuItem) {
    if (!order) return;
    if (!item.available || item.stock <= 0) {
      setError("Item unavailable / out of stock");
      return;
    }
    if (hasModifiers(item)) {
      openModifier(item);
      return;
    }
    startTransition(async () => {
      try {
        setError("");
        await addOrderItem({ orderId: order.id, menuItemId: item.id, quantity: 1 });
        setMessage(`Added ${item.name}`);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to add");
      }
    });
  }

  function addSelected() {
    if (!order || !selectedItem) return;
    startTransition(async () => {
      try {
        setError("");
        await addOrderItem({
          orderId: order.id,
          menuItemId: selectedItem.id,
          quantity: qty,
          variantId: variantId || undefined,
          addonIds,
          notes: notes || undefined,
        });
        setSelectedItem(null);
        setMessage("Item added");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to add");
      }
    });
  }

  function startChannel(type: "PARCEL" | "DELIVERY") {
    setNewChannel(type);
    setChannelForm({
      customerName: "",
      customerPhone: "",
      customerAddress: "",
      source: "WALK_IN",
      onlinePlatform: "Swiggy",
      packingCharge: String(outletTax.packingChargeDefault),
      deliveryCharge: String(outletTax.deliveryChargeDefault),
    });
  }

  function confirmChannel() {
    if (!newChannel) return;
    if (newChannel === "DELIVERY" && !channelForm.customerAddress.trim()) {
      setError("Delivery address is required");
      return;
    }
    startTransition(async () => {
      try {
        setError("");
        const id = await createChannelOrder({
          type: newChannel,
          source: channelForm.source,
          customerName: channelForm.customerName || undefined,
          customerPhone: channelForm.customerPhone || undefined,
          customerAddress: channelForm.customerAddress || undefined,
          onlinePlatform:
            channelForm.source === "ONLINE" ? channelForm.onlinePlatform : undefined,
          packingCharge: Number(channelForm.packingCharge) || 0,
          deliveryCharge:
            newChannel === "DELIVERY" ? Number(channelForm.deliveryCharge) || 0 : 0,
        });
        setNewChannel(null);
        router.push(`/pos/${id}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not create order");
      }
    });
  }

  if (!order) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl">POS</h1>
          <p className="text-sm text-[var(--muted)]">
            One counter for dine-in, parcel, delivery & online orders.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Link
            href="/tables"
            className="rounded-2xl border border-[var(--line)] bg-[var(--free)] p-5 transition hover:border-[var(--accent)]"
          >
            <p className="font-[family-name:var(--font-display)] text-2xl">Dine-in</p>
            <p className="mt-1 text-sm text-[var(--muted)]">Seat a table and bill at the table</p>
          </Link>
          <button
            type="button"
            onClick={() => startChannel("PARCEL")}
            className="rounded-2xl border border-[var(--line)] bg-[var(--occupied)] p-5 text-left transition hover:border-[var(--accent)]"
          >
            <p className="font-[family-name:var(--font-display)] text-2xl">Parcel</p>
            <p className="mt-1 text-sm text-[var(--muted)]">Takeaway / packing counter orders</p>
          </button>
          <button
            type="button"
            onClick={() => startChannel("DELIVERY")}
            className="rounded-2xl border border-[var(--line)] bg-[#dce8f8] p-5 text-left transition hover:border-[var(--accent)]"
          >
            <p className="font-[family-name:var(--font-display)] text-2xl">Delivery</p>
            <p className="mt-1 text-sm text-[var(--muted)]">Phone or aggregator delivery orders</p>
          </button>
        </div>
        {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
        {openOrders.length ? (
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium">Open orders</p>
              <Link href="/orders" className="text-sm text-[var(--accent)]">
                View all
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {openOrders.map((o) => (
                <Link key={o.id} href={`/pos/${o.id}`} className="rounded-lg bg-[var(--chip)] px-3 py-2 text-sm">
                  {o.label}
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-[var(--muted)]">No open orders yet.</p>
        )}
        {newChannel ? (
          <ChannelModal
            type={newChannel}
            form={channelForm}
            setForm={setChannelForm}
            pending={pending}
            onClose={() => setNewChannel(null)}
            onConfirm={confirmChannel}
          />
        ) : null}
      </div>
    );
  }

  const balance = Math.max(0, Math.round((order.total - order.paidAmount) * 100) / 100);
  const gstTotal = order.cgstAmount + order.sgstAmount;
  const title =
    order.type === "DINE_IN" ? `Table ${order.tableName ?? "—"}` : orderTypeLabel(order.type);

  return (
    <div className="flex h-[calc(100vh-var(--header-h)-1rem)] min-h-[520px] flex-col gap-2 lg:flex-row">
      {/* CATEGORY PANEL — isolated from item filters so tabs don't collide */}
      <aside className="flex max-h-40 w-full shrink-0 flex-col rounded-2xl border border-[var(--line)] bg-white lg:max-h-none lg:w-44 xl:w-52">
        <div className="border-b border-[var(--line)] px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            Category panel
          </p>
          <input
            value={categoryQuery}
            onChange={(e) => setCategoryQuery(e.target.value)}
            placeholder="Search categories"
            className="mt-1.5 w-full rounded-lg border border-[var(--line)] px-2 py-1.5 text-sm"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto p-2 lg:block lg:flex-1 lg:space-y-1 lg:overflow-y-auto">
          <button
            type="button"
            onClick={() => {
              setCategoryId("");
              setQuery("");
            }}
            className={`shrink-0 rounded-xl px-3 py-2 text-left text-sm font-medium lg:w-full ${
              !categoryId ? "bg-[var(--accent)] text-white" : "bg-[var(--chip)] lg:bg-transparent lg:hover:bg-[var(--chip)]"
            }`}
          >
            All items
          </button>
          {visibleCategories.map((c) => {
            const selected = categoryId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setCategoryId(c.id);
                  setQuery("");
                }}
                className={`shrink-0 rounded-xl px-3 py-2 text-left text-sm font-medium transition lg:w-full ${
                  selected
                    ? "bg-[var(--accent)] text-white shadow-sm"
                    : "bg-[var(--chip)] text-[var(--ink)] lg:bg-transparent lg:hover:bg-[var(--chip)]"
                }`}
              >
                <span className="block leading-tight whitespace-nowrap lg:whitespace-normal">{c.name}</span>
                <span className={`hidden text-[10px] lg:block ${selected ? "text-white/80" : "text-[var(--muted)]"}`}>
                  {c.items.length} items
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* ITEM GRID */}
      <section className="flex min-w-0 flex-1 flex-col rounded-2xl border border-[var(--line)] bg-[var(--panel)]">
        <div className="space-y-2 border-b border-[var(--line)] p-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h1 className="font-[family-name:var(--font-display)] text-2xl leading-none">
                {title} · {order.orderNumber}
              </h1>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {orderTypeLabel(order.type)}
                {order.onlinePlatform ? ` · ${order.onlinePlatform}` : ""}
                {order.customerName ? ` · ${order.customerName}` : ""}
                {" · "}
                {order.guestCount} guests
              </p>
            </div>
            <form
              className="flex min-w-[220px] flex-1 gap-2 sm:max-w-md"
              onSubmit={(e) => {
                e.preventDefault();
                if (exactCodeMatch) {
                  quickAdd(exactCodeMatch);
                  setQuery("");
                }
              }}
            >
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name / code (e.g. 30)"
                autoComplete="off"
                className="min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 font-mono text-sm"
              />
              <button
                type="submit"
                disabled={!exactCodeMatch}
                className="rounded-xl bg-[var(--accent)] px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
              >
                Go
              </button>
            </form>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="rounded-lg border border-[var(--line)] bg-white px-2 py-1.5 text-xs"
            >
              <option value="name">Sort: Name</option>
              <option value="code">Sort: Code</option>
              <option value="price_asc">Sort: Price ↑</option>
              <option value="price_desc">Sort: Price ↓</option>
              <option value="popular">Sort: Popular</option>
            </select>
            {(["ALL", "VEG", "NONVEG"] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDiet(d)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  diet === d ? "bg-[var(--ink)] text-white" : "bg-white border border-[var(--line)]"
                }`}
              >
                {d === "ALL" ? "All" : d === "VEG" ? "Veg" : "Non-veg"}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setFavoritesOnly((v) => !v)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                favoritesOnly ? "bg-amber-500 text-white" : "bg-white border border-[var(--line)]"
              }`}
            >
              Favorites
            </button>
            <button
              type="button"
              onClick={() => setShowUnavailable((v) => !v)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                showUnavailable ? "bg-[var(--chip)] ring-1 ring-[var(--ink)]" : "bg-white border border-[var(--line)]"
              }`}
            >
              Show unavailable
            </button>
            <span className="self-center text-xs text-[var(--muted)]">{items.length} items</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => {
              const mods = hasModifiers(item);
              const fav = favorites.includes(item.id);
              const out = !item.available || item.stock <= 0;
              return (
                <div
                  key={item.id}
                  className={`relative rounded-2xl border bg-white p-2.5 shadow-sm ${
                    exactCodeMatch?.id === item.id
                      ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/25"
                      : "border-[var(--line)]"
                  } ${out ? "opacity-55" : ""}`}
                >
                  <button type="button" className="w-full text-left" onClick={() => openModifier(item)} disabled={out}>
                    <ItemThumb item={item} />
                    <div className="mt-2 flex items-start justify-between gap-1">
                      <div className="min-w-0">
                        <p className="font-mono text-[10px] font-semibold text-[var(--accent)]">#{item.code}</p>
                        <p className="truncate text-sm font-semibold leading-tight">{item.name}</p>
                      </div>
                      <span
                        className={`mt-0.5 inline-block h-3 w-3 shrink-0 rounded-sm border ${
                          item.isVeg ? "border-green-700 bg-green-600" : "border-red-700 bg-red-600"
                        }`}
                        title={item.isVeg ? "Veg" : "Non-veg"}
                      />
                    </div>
                    <p className="mt-1 text-sm font-medium">{formatINR(item.price)}</p>
                  </button>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {item.popular ? (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-800">
                        Popular
                      </span>
                    ) : null}
                    {item.recommended ? (
                      <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-sky-800">
                        Recommended
                      </span>
                    ) : null}
                    {mods ? (
                      <span className="rounded bg-[var(--chip)] px-1.5 py-0.5 text-[9px] font-bold uppercase">
                        Modifiers
                      </span>
                    ) : null}
                    {out ? (
                      <span className="rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-red-700">
                        Unavailable
                      </span>
                    ) : (
                      <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-800">
                        Stock {item.stock}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-1">
                    <button
                      type="button"
                      title="Favorite"
                      className={`rounded-lg px-2 py-1 text-xs ${fav ? "bg-amber-100 text-amber-800" : "bg-[var(--chip)]"}`}
                      onClick={() => toggleFavorite(item.id)}
                    >
                      ★
                    </button>
                    <button
                      type="button"
                      disabled={pending || out}
                      className="flex-1 rounded-lg bg-[var(--accent)] px-2 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                      onClick={() => quickAdd(item)}
                    >
                      Quick add
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          {!items.length ? (
            <p className="py-10 text-center text-sm text-[var(--muted)]">No items match this filter.</p>
          ) : null}
        </div>
      </section>

      {/* ORDER PANEL */}
      <aside className="flex w-full shrink-0 flex-col rounded-2xl border border-[var(--line)] bg-white lg:w-[340px] xl:w-[380px]">
        <div className="border-b border-[var(--line)] p-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-[family-name:var(--font-display)] text-xl">Order</h2>
            <Link href="/orders" className="text-xs text-[var(--accent)]">
              All orders
            </Link>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-[var(--chip)] px-2 py-1.5">
              <p className="text-[var(--muted)]">Table / channel</p>
              <p className="font-semibold">{title}</p>
            </div>
            <div className="rounded-lg bg-[var(--chip)] px-2 py-1.5">
              <p className="text-[var(--muted)]">Customer</p>
              <p className="truncate font-semibold">{order.customerName || "Walk-in"}</p>
            </div>
          </div>
        </div>

        {(order.type === "PARCEL" || order.type === "DELIVERY") && (
          <div className="border-b border-[var(--line)] p-3">
            <CustomerPanel
              order={order}
              pending={pending}
              onSave={(data) =>
                startTransition(async () => {
                  await updateOrderDetails({ orderId: order.id, ...data });
                  setMessage("Customer details saved");
                  router.refresh();
                })
              }
            />
          </div>
        )}

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
          {order.items.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">Tap items to build the order.</p>
          ) : (
            order.items.map((item) => {
              const kb = kitchenBadge(item.kitchenStatus, item.kotSent);
              const lineTax = (item.lineTotal * (outletTax.cgstPercent + outletTax.sgstPercent)) / 100;
              return (
                <div
                  key={item.id}
                  className={`rounded-xl border border-[var(--line)] bg-[var(--panel)] p-2.5 ${
                    item.voided ? "opacity-50 line-through" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-tight">
                        {item.name}
                        {item.variantName ? ` (${item.variantName})` : ""}
                      </p>
                      {item.addonNames ? (
                        <p className="text-[11px] text-[var(--muted)]">+ {item.addonNames}</p>
                      ) : null}
                      <p className="text-[11px] text-[var(--muted)]">
                        Qty {item.quantity} · {formatINR(item.unitPrice)} · Tax ~{formatINR(lineTax)}
                      </p>
                      {item.notes ? (
                        <p className="text-[11px] text-amber-800">Note: {item.notes}</p>
                      ) : null}
                      <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${kb.className}`}>
                        {kb.label}
                      </span>
                    </div>
                    <p className="shrink-0 text-sm font-semibold">{formatINR(item.lineTotal)}</p>
                  </div>
                  {!item.voided ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {!item.kotSent ? (
                        <>
                          <button
                            type="button"
                            className="rounded-md bg-white px-2 py-1 text-xs"
                            onClick={() =>
                              startTransition(async () => {
                                await updateItemQuantity(item.id, item.quantity - 1);
                                router.refresh();
                              })
                            }
                          >
                            −
                          </button>
                          <span className="px-1 py-1 text-xs">{item.quantity}</span>
                          <button
                            type="button"
                            className="rounded-md bg-white px-2 py-1 text-xs"
                            onClick={() =>
                              startTransition(async () => {
                                await updateItemQuantity(item.id, item.quantity + 1);
                                router.refresh();
                              })
                            }
                          >
                            +
                          </button>
                          <button
                            type="button"
                            className="rounded-md px-2 py-1 text-xs text-[var(--danger)]"
                            onClick={() =>
                              startTransition(async () => {
                                await removeUnsentItem(item.id);
                                router.refresh();
                              })
                            }
                          >
                            Remove
                          </button>
                        </>
                      ) : canVoid ? (
                        <button
                          type="button"
                          className="rounded-md px-2 py-1 text-xs text-[var(--danger)]"
                          onClick={() =>
                            startTransition(async () => {
                              const reason = prompt("Void reason?") || "Voided";
                              await voidOrderItem(item.id, reason);
                              router.refresh();
                            })
                          }
                        >
                          Void
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>

        <div className="space-y-2 border-t border-[var(--line)] p-3 text-sm">
          <label className="block text-xs">
            <span className="text-[var(--muted)]">Special notes</span>
            <div className="mt-1 flex gap-1">
              <input
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-[var(--line)] px-2 py-1.5 text-xs"
                placeholder="Order / kitchen notes"
              />
              <button
                type="button"
                disabled={pending}
                className="rounded-lg bg-[var(--chip)] px-2 py-1.5 text-xs"
                onClick={() =>
                  startTransition(async () => {
                    await updateOrderDetails({ orderId: order.id, notes: orderNotes });
                    setMessage("Notes saved");
                    router.refresh();
                  })
                }
              >
                Save
              </button>
            </div>
          </label>

          <div className="grid grid-cols-2 gap-1.5 text-xs">
            {(
              [
                ["packing", "Packing"],
                ["container", "Container"],
                ["service", "Service"],
                ["delivery", "Delivery"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-1">
                <span className="w-16 shrink-0 text-[var(--muted)]">{label}</span>
                <input
                  type="number"
                  min={0}
                  value={charges[key]}
                  onChange={(e) => setCharges((c) => ({ ...c, [key]: e.target.value }))}
                  onBlur={() =>
                    startTransition(async () => {
                      await updateOrderDetails({
                        orderId: order.id,
                        packingCharge: Number(charges.packing) || 0,
                        deliveryCharge: Number(charges.delivery) || 0,
                        serviceCharge: Number(charges.service) || 0,
                        containerCharge: Number(charges.container) || 0,
                      });
                      router.refresh();
                    })
                  }
                  className="w-full rounded border border-[var(--line)] px-1.5 py-1"
                />
              </label>
            ))}
          </div>

          <div className="space-y-0.5 border-t border-dashed border-[var(--line)] pt-2 text-xs">
            <Row label="Subtotal" value={formatINR(order.subtotal)} />
            <Row label="Discount" value={`- ${formatINR(order.discountAmount)}`} />
            <Row label="Service charge" value={formatINR(order.serviceCharge)} />
            <Row label="Packing charge" value={formatINR(order.packingCharge)} />
            <Row label="Delivery charge" value={formatINR(order.deliveryCharge)} />
            <Row label="Container charge" value={formatINR(order.containerCharge)} />
            <Row label={`GST (${outletTax.cgstPercent + outletTax.sgstPercent}%)`} value={formatINR(gstTotal)} />
            <Row label="  CGST" value={formatINR(order.cgstAmount)} />
            <Row label="  SGST" value={formatINR(order.sgstAmount)} />
            <Row label="Round off" value={formatINR(order.roundOff)} />
            <Row label="Grand total" value={formatINR(order.total)} bold />
            <Row label="Paid" value={formatINR(order.paidAmount)} />
            <Row label="Balance" value={formatINR(balance)} bold />
          </div>

          {canDiscount ? (
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                max={100}
                value={discountPct}
                onChange={(e) => setDiscountPct(Number(e.target.value))}
                className="w-20 rounded-lg border border-[var(--line)] px-2 py-1.5 text-xs"
              />
              <button
                type="button"
                disabled={pending}
                className="rounded-lg bg-[var(--chip)] px-3 py-1.5 text-xs"
                onClick={() =>
                  startTransition(async () => {
                    await applyDiscount(order.id, discountPct, "POS discount");
                    router.refresh();
                  })
                }
              >
                Apply % discount
              </button>
            </div>
          ) : null}

          <div className="flex gap-1">
            <input
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="Coupon code"
              className="min-w-0 flex-1 rounded-lg border border-[var(--line)] px-2 py-1.5 text-xs"
            />
            <button
              type="button"
              disabled={pending || !couponCode.trim()}
              className="rounded-lg bg-[var(--chip)] px-2 py-1.5 text-xs font-semibold disabled:opacity-40"
              onClick={() =>
                startTransition(async () => {
                  try {
                    setError("");
                    await applyCouponToOrder(order.id, couponCode.trim());
                    setMessage(`Coupon ${couponCode} applied`);
                    setCouponCode("");
                    router.refresh();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Coupon failed");
                  }
                })
              }
            >
              Apply
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              disabled={pending}
              className="rounded-xl bg-[var(--accent-2)] px-2 py-2.5 text-xs font-semibold text-white"
              onClick={() =>
                startTransition(async () => {
                  try {
                    setError("");
                    await sendKot(order.id);
                    setMessage("KOT sent to kitchen");
                    router.refresh();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "KOT failed");
                  }
                })
              }
            >
              Send KOT
            </button>
            <button
              type="button"
              disabled={pending}
              className="rounded-xl border border-[var(--line)] bg-[var(--panel)] px-2 py-2.5 text-xs font-semibold"
              onClick={() =>
                startTransition(async () => {
                  try {
                    await holdOrder(order.id);
                    setMessage("Order held");
                    router.push("/hold-orders");
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Hold failed");
                  }
                })
              }
            >
              Hold
            </button>
            <Link
              href={`/bill/${order.id}`}
              className="rounded-xl border border-[var(--line)] bg-[var(--panel)] px-2 py-2.5 text-center text-xs font-semibold"
            >
              Print bill
            </Link>
          </div>

          <div className="space-y-1.5 rounded-xl bg-[var(--chip)] p-2.5">
            <p className="text-xs font-medium">Collect payment</p>
            <div className="flex gap-1">
              {(["CASH", "UPI", "CARD"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPayMethod(m)}
                  className={`rounded-lg px-2 py-1.5 text-[10px] font-semibold ${
                    payMethod === m ? "bg-[var(--accent)] text-white" : "bg-white"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            <input
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              placeholder={`Amount (balance ${balance})`}
              className="w-full rounded-lg border border-[var(--line)] bg-white px-2 py-1.5 text-xs"
            />
            {payMethod !== "CASH" ? (
              <input
                value={payRef}
                onChange={(e) => setPayRef(e.target.value)}
                placeholder="UPI/Card reference"
                className="w-full rounded-lg border border-[var(--line)] bg-white px-2 py-1.5 text-xs"
              />
            ) : null}
            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-lg bg-white px-2 py-1.5 text-xs"
                onClick={() => setPayAmount(String(balance))}
              >
                Full
              </button>
              <button
                type="button"
                disabled={pending || order.status !== "OPEN"}
                className="flex-1 rounded-lg bg-[var(--accent)] px-2 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                onClick={() =>
                  startTransition(async () => {
                    try {
                      setError("");
                      const amount = Number(payAmount || balance);
                      const settled = await addPayment({
                        orderId: order.id,
                        amount,
                        method: payMethod,
                        reference: payRef || undefined,
                      });
                      setPayAmount("");
                      setPayRef("");
                      setMessage(settled ? "Order settled" : "Partial payment recorded");
                      router.refresh();
                      if (settled) router.push(`/bill/${order.id}`);
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Payment failed");
                    }
                  })
                }
              >
                Pay
              </button>
            </div>
          </div>

          {canVoid ? (
            <button
              type="button"
              className="w-full rounded-xl border border-[var(--danger)] px-3 py-2 text-xs text-[var(--danger)]"
              onClick={() =>
                startTransition(async () => {
                  const reason = prompt("Void entire order reason?") || "Voided";
                  await voidOrder(order.id, reason);
                  router.push("/orders");
                })
              }
            >
              Void order
            </button>
          ) : null}

          {message ? <p className="text-xs text-[var(--ok)]">{message}</p> : null}
          {error ? <p className="text-xs text-[var(--danger)]">{error}</p> : null}
        </div>
      </aside>

      {selectedItem ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="font-[family-name:var(--font-display)] text-2xl">{selectedItem.name}</h3>
            <p className="text-sm text-[var(--muted)]">
              #{selectedItem.code} · {formatINR(selectedItem.price)}
            </p>

            {selectedItem.variants.length ? (
              <div className="mt-4">
                <p className="mb-2 text-sm font-medium">Variant</p>
                <div className="flex flex-wrap gap-2">
                  {selectedItem.variants.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVariantId(v.id)}
                      className={`rounded-lg px-3 py-2 text-sm ${
                        variantId === v.id ? "bg-[var(--accent)] text-white" : "bg-[var(--chip)]"
                      }`}
                    >
                      {v.name}
                      {v.priceDelta ? ` (${v.priceDelta > 0 ? "+" : ""}${v.priceDelta})` : ""}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {selectedItem.addons.length ? (
              <div className="mt-4">
                <p className="mb-2 text-sm font-medium">Modifiers / add-ons</p>
                <div className="flex flex-wrap gap-2">
                  {selectedItem.addons.map((a) => {
                    const on = addonIds.includes(a.id);
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() =>
                          setAddonIds((prev) =>
                            on ? prev.filter((id) => id !== a.id) : [...prev, a.id]
                          )
                        }
                        className={`rounded-lg px-3 py-2 text-sm ${
                          on ? "bg-[var(--accent)] text-white" : "bg-[var(--chip)]"
                        }`}
                      >
                        {a.name} +{a.price}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="mt-4 flex items-center gap-3">
              <button type="button" className="rounded-lg bg-[var(--chip)] px-3 py-2" onClick={() => setQty((q) => Math.max(1, q - 1))}>
                −
              </button>
              <span className="text-lg font-semibold">{qty}</span>
              <button type="button" className="rounded-lg bg-[var(--chip)] px-3 py-2" onClick={() => setQty((q) => q + 1)}>
                +
              </button>
            </div>

            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Special notes for kitchen"
              className="mt-3 w-full rounded-lg border border-[var(--line)] px-3 py-2"
            />

            <div className="mt-4 flex gap-2">
              <button type="button" className="flex-1 rounded-xl border border-[var(--line)] px-3 py-3" onClick={() => setSelectedItem(null)}>
                Cancel
              </button>
              <button
                type="button"
                disabled={pending}
                className="flex-1 rounded-xl bg-[var(--accent)] px-3 py-3 font-semibold text-white"
                onClick={addSelected}
              >
                Add to order
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "text-sm font-semibold" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function ChannelModal({
  type,
  form,
  setForm,
  pending,
  onClose,
  onConfirm,
}: {
  type: "PARCEL" | "DELIVERY";
  form: {
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    source: "WALK_IN" | "PHONE" | "ONLINE";
    onlinePlatform: string;
    packingCharge: string;
    deliveryCharge: string;
  };
  setForm: Dispatch<SetStateAction<typeof form>>;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl bg-[var(--panel)] p-5 shadow-xl">
        <h3 className="font-[family-name:var(--font-display)] text-2xl">New {orderTypeLabel(type)}</h3>
        <div className="mt-4 flex flex-wrap gap-2">
          {(["WALK_IN", "PHONE", "ONLINE"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setForm({ ...form, source: s })}
              className={`rounded-lg px-3 py-2 text-sm ${
                form.source === s ? "bg-[var(--accent)] text-white" : "bg-[var(--chip)]"
              }`}
            >
              {s === "WALK_IN" ? "Walk-in" : s === "PHONE" ? "Phone" : "Online"}
            </button>
          ))}
        </div>
        {form.source === "ONLINE" ? (
          <select
            className="mt-3 w-full rounded-xl border border-[var(--line)] px-3 py-2"
            value={form.onlinePlatform}
            onChange={(e) => setForm({ ...form, onlinePlatform: e.target.value })}
          >
            {ONLINE_PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        ) : null}
        <input
          className="mt-3 w-full rounded-xl border border-[var(--line)] px-3 py-2"
          placeholder="Customer name"
          value={form.customerName}
          onChange={(e) => setForm({ ...form, customerName: e.target.value })}
        />
        <input
          className="mt-2 w-full rounded-xl border border-[var(--line)] px-3 py-2"
          placeholder="Phone"
          value={form.customerPhone}
          onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
        />
        {type === "DELIVERY" ? (
          <textarea
            className="mt-2 w-full rounded-xl border border-[var(--line)] px-3 py-2"
            placeholder="Delivery address *"
            rows={2}
            value={form.customerAddress}
            onChange={(e) => setForm({ ...form, customerAddress: e.target.value })}
          />
        ) : null}
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="text-sm">
            <span className="text-[var(--muted)]">Packing ₹</span>
            <input
              type="number"
              className="mt-1 w-full rounded-xl border border-[var(--line)] px-3 py-2"
              value={form.packingCharge}
              onChange={(e) => setForm({ ...form, packingCharge: e.target.value })}
            />
          </label>
          {type === "DELIVERY" ? (
            <label className="text-sm">
              <span className="text-[var(--muted)]">Delivery ₹</span>
              <input
                type="number"
                className="mt-1 w-full rounded-xl border border-[var(--line)] px-3 py-2"
                value={form.deliveryCharge}
                onChange={(e) => setForm({ ...form, deliveryCharge: e.target.value })}
              />
            </label>
          ) : (
            <div />
          )}
        </div>
        <div className="mt-4 flex gap-2">
          <button type="button" className="flex-1 rounded-xl border border-[var(--line)] px-3 py-3" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            disabled={pending}
            className="flex-1 rounded-xl bg-[var(--accent)] px-3 py-3 font-semibold text-white"
            onClick={onConfirm}
          >
            Start order
          </button>
        </div>
      </div>
    </div>
  );
}

function CustomerPanel({
  order,
  pending,
  onSave,
}: {
  order: Order;
  pending: boolean;
  onSave: (data: {
    customerName?: string;
    customerPhone?: string;
    customerAddress?: string;
    packingCharge?: number;
    deliveryCharge?: number;
  }) => void;
}) {
  const [name, setName] = useState(order.customerName ?? "");
  const [phone, setPhone] = useState(order.customerPhone ?? "");
  const [address, setAddress] = useState(order.customerAddress ?? "");

  return (
    <div className="rounded-xl bg-[var(--chip)] p-2.5 text-xs">
      <p className="mb-2 font-medium">
        Customer
        {order.onlinePlatform ? ` · ${order.onlinePlatform}` : ""}
      </p>
      <div className="grid gap-1.5">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className="rounded-lg border border-[var(--line)] bg-white px-2 py-1.5"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone"
          className="rounded-lg border border-[var(--line)] bg-white px-2 py-1.5"
        />
        {order.type === "DELIVERY" ? (
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Address"
            rows={2}
            className="rounded-lg border border-[var(--line)] bg-white px-2 py-1.5"
          />
        ) : null}
        <button
          type="button"
          disabled={pending}
          className="rounded-lg bg-white px-3 py-1.5"
          onClick={() =>
            onSave({
              customerName: name,
              customerPhone: phone,
              customerAddress: address,
            })
          }
        >
          Save customer
        </button>
      </div>
    </div>
  );
}
