"use client";

import { markBillPrinted } from "@/lib/actions/orders";

export function PrintBillButton({ orderId }: { orderId: string }) {
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await markBillPrinted(orderId);
        } catch {
          // still allow print
        }
        window.print();
      }}
      className="no-print rounded-xl bg-[var(--accent)] px-4 py-2 text-white"
    >
      Print bill
    </button>
  );
}
