"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { markBillPrinted, voidOrder } from "@/lib/actions/orders";
import {
  createCreditNote,
  createDebitNote,
  refundOrder,
} from "@/lib/actions/table-ops";

export function BillTools({
  orderId,
  status,
  canVoid,
}: {
  orderId: string;
  status: string;
  canVoid: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [noteOpen, setNoteOpen] = useState<"CREDIT" | "DEBIT" | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  function run(action: () => Promise<void>) {
    startTransition(async () => {
      try {
        setError("");
        await action();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed");
      }
    });
  }

  async function printDuplicate(reprint = false) {
    try {
      await markBillPrinted(orderId);
    } catch {
      // allow print
    }
    window.print();
    setMessage(reprint ? "Duplicate / reprint sent" : "Bill printed");
  }

  return (
    <div className="no-print space-y-3">
      <div className="flex flex-wrap gap-2">
        <Link href={`/pos/${orderId}`} className="rounded-xl border border-[var(--line)] px-4 py-2 text-sm">
          Back to POS
        </Link>
        <button
          type="button"
          onClick={() => printDuplicate(false)}
          className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
        >
          Print GST invoice
        </button>
        <button
          type="button"
          onClick={() => printDuplicate(true)}
          className="rounded-xl border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold"
        >
          Duplicate / Reprint
        </button>
        {status === "OPEN" && canVoid ? (
          <button
            type="button"
            disabled={pending}
            className="rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-700"
            onClick={() => {
              const reason = window.prompt("Void bill reason?") || "Voided";
              run(async () => {
                await voidOrder(orderId, reason);
                setMessage("Bill voided");
              });
            }}
          >
            Void bill
          </button>
        ) : null}
        {status === "SETTLED" && canVoid ? (
          <button
            type="button"
            disabled={pending}
            className="rounded-xl bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900"
            onClick={() => {
              const reason = window.prompt("Refund reason?") || "Refunded";
              run(async () => {
                await refundOrder(orderId, reason);
                setMessage("Order refunded");
              });
            }}
          >
            Refund
          </button>
        ) : null}
        {canVoid ? (
          <>
            <button
              type="button"
              className="rounded-xl border border-[var(--line)] bg-white px-4 py-2 text-sm"
              onClick={() => {
                setNoteOpen("CREDIT");
                setAmount("");
                setNote("");
              }}
            >
              Credit note
            </button>
            <button
              type="button"
              className="rounded-xl border border-[var(--line)] bg-white px-4 py-2 text-sm"
              onClick={() => {
                setNoteOpen("DEBIT");
                setAmount("");
                setNote("");
              }}
            >
              Debit note
            </button>
          </>
        ) : null}
      </div>
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      {message ? <p className="text-sm text-[var(--ok)]">{message}</p> : null}

      {noteOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <form
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
            onSubmit={(e) => {
              e.preventDefault();
              const value = Number(amount);
              if (!value || value <= 0) {
                setError("Enter a valid amount");
                return;
              }
              run(async () => {
                if (noteOpen === "CREDIT") await createCreditNote(orderId, value, note || "Credit note");
                else await createDebitNote(orderId, value, note || "Debit note");
                setNoteOpen(null);
                setMessage(`${noteOpen === "CREDIT" ? "Credit" : "Debit"} note logged`);
              });
            }}
          >
            <h3 className="font-[family-name:var(--font-display)] text-2xl">
              {noteOpen === "CREDIT" ? "Credit note" : "Debit note"}
            </h3>
            <input
              type="number"
              min={0.01}
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount"
              className="mt-4 w-full rounded-xl border border-[var(--line)] px-3 py-3"
            />
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Reason / note"
              className="mt-2 w-full rounded-xl border border-[var(--line)] px-3 py-3"
            />
            <div className="mt-4 flex gap-2">
              <button type="button" className="flex-1 rounded-xl border px-3 py-3" onClick={() => setNoteOpen(null)}>
                Cancel
              </button>
              <button type="submit" className="flex-1 rounded-xl bg-[var(--accent)] px-3 py-3 font-semibold text-white">
                Save note
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
