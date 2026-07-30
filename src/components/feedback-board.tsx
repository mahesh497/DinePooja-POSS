"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createFeedback } from "@/lib/actions/services";

type Row = {
  id: string;
  rating: number;
  comment: string | null;
  customerName: string | null;
  createdAt: string;
};

export function FeedbackBoard({ feedbacks, avgRating }: { feedbacks: Row[]; avgRating: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({ rating: "5", comment: "", customerName: "" });

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <p className="text-xs uppercase text-[var(--muted)]">Average rating</p>
        <p className="font-[family-name:var(--font-display)] text-2xl">
          {avgRating.toFixed(1)} / 5
        </p>
      </div>

      <form
        className="card grid gap-3 p-4 md:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            await createFeedback({
              rating: Number(form.rating),
              comment: form.comment,
              customerName: form.customerName,
            });
            setForm({ rating: "5", comment: "", customerName: "" });
            router.refresh();
          });
        }}
      >
        <select
          className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm"
          value={form.rating}
          onChange={(e) => setForm({ ...form, rating: e.target.value })}
        >
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} stars
            </option>
          ))}
        </select>
        <input
          className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm"
          placeholder="Customer name"
          value={form.customerName}
          onChange={(e) => setForm({ ...form, customerName: e.target.value })}
        />
        <input
          className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm"
          placeholder="Comment"
          value={form.comment}
          onChange={(e) => setForm({ ...form, comment: e.target.value })}
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white md:col-span-3"
        >
          Submit feedback
        </button>
      </form>

      <div className="space-y-2">
        {feedbacks.map((f) => (
          <div key={f.id} className="card p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold">{"★".repeat(f.rating)}{"☆".repeat(5 - f.rating)}</p>
              <p className="text-xs text-[var(--muted)]">
                {new Date(f.createdAt).toLocaleString("en-IN")}
              </p>
            </div>
            <p className="mt-1 text-sm">{f.customerName || "Anonymous"}</p>
            {f.comment ? <p className="mt-1 text-sm text-[var(--muted)]">{f.comment}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
