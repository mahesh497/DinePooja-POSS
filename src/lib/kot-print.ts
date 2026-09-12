/** Browser thermal / system print for a kitchen ticket. */

export type KotPrintItem = {
  name: string;
  quantity: number;
  notes: string | null;
  status?: string;
};

export type KotPrintPayload = {
  kotNumber: number;
  station: string;
  orderNumber: string;
  tableName: string | null;
  orderTypeLabel: string;
  createdAt: string;
  items: KotPrintItem[];
};

export function printKotTicket(kot: KotPrintPayload, reprint = false) {
  if (typeof window === "undefined") return;
  const w = window.open("", "_blank", "width=400,height=600");
  if (!w) return;

  const lines = kot.items
    .filter((i) => i.status !== "CANCELLED" && i.status !== "VOIDED")
    .map(
      (i) =>
        `<li><strong>${i.quantity}x</strong> ${escapeHtml(i.name)}${
          i.notes ? " (" + escapeHtml(i.notes) + ")" : ""
        }</li>`
    )
    .join("");

  w.document.write(`
    <html><head><title>KOT ${kot.kotNumber}</title>
    <style>
      body{font-family:monospace;padding:12px;font-size:14px}
      h1{font-size:18px;margin:0 0 8px}
      p{margin:4px 0}
      li{margin:8px 0;font-size:16px}
      hr{border:none;border-top:1px dashed #000;margin:10px 0}
    </style>
    </head><body>
    <h1>${reprint ? "REPRINT · " : ""}KOT #${kot.kotNumber} · ${escapeHtml(kot.station)}</h1>
    <p>${kot.tableName ? "Table " + escapeHtml(kot.tableName) : escapeHtml(kot.orderTypeLabel)} · ${escapeHtml(kot.orderNumber)}</p>
    <p>${new Date(kot.createdAt).toLocaleString()}</p>
    <hr/>
    <ul>${lines}</ul>
    <script>
      window.onload = function() {
        window.print();
        setTimeout(function(){ window.close(); }, 500);
      };
    </script>
    </body></html>
  `);
  w.document.close();
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
