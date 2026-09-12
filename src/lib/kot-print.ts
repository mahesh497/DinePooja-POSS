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

export type KotPrintMode = "new" | "update" | "cancel" | "reprint";

function isCancelled(status?: string) {
  return status === "CANCELLED" || status === "VOIDED";
}

export function printKotTicket(kot: KotPrintPayload, mode: KotPrintMode | boolean = "new") {
  if (typeof window === "undefined") return;
  const printMode: KotPrintMode = typeof mode === "boolean" ? (mode ? "reprint" : "new") : mode;

  const w = window.open("", "_blank", "width=400,height=600");
  if (!w) return;

  const active = kot.items.filter((i) => !isCancelled(i.status));
  const cancelled = kot.items.filter((i) => isCancelled(i.status));

  const activeLines = active
    .map(
      (i) =>
        `<li><strong>${i.quantity}x</strong> ${escapeHtml(i.name)}${
          i.notes ? " (" + escapeHtml(i.notes) + ")" : ""
        }</li>`
    )
    .join("");

  const cancelLines = cancelled
    .map(
      (i) =>
        `<li class="cancel"><strong>CANCEL ${i.quantity}x</strong> ${escapeHtml(i.name)}${
          i.notes ? " (" + escapeHtml(i.notes) + ")" : ""
        }</li>`
    )
    .join("");

  const title =
    printMode === "cancel"
      ? "CANCEL UPDATE"
      : printMode === "update"
        ? "KOT UPDATE · NEW ITEMS"
        : printMode === "reprint"
          ? "REPRINT"
          : "NEW KOT";

  w.document.write(`
    <html><head><title>KOT ${kot.kotNumber}</title>
    <style>
      body{font-family:monospace;padding:12px;font-size:14px}
      h1{font-size:18px;margin:0 0 8px}
      h2{font-size:14px;margin:12px 0 6px;text-transform:uppercase}
      p{margin:4px 0}
      li{margin:8px 0;font-size:16px}
      li.cancel{color:#000;text-decoration:line-through;font-weight:bold}
      .banner{border:2px solid #000;padding:6px;margin:8px 0;font-weight:bold;text-align:center}
      hr{border:none;border-top:1px dashed #000;margin:10px 0}
    </style>
    </head><body>
    <div class="banner">${title}</div>
    <h1>KOT #${kot.kotNumber}</h1>
    <p>${kot.tableName ? "Table " + escapeHtml(kot.tableName) : escapeHtml(kot.orderTypeLabel)} · ${escapeHtml(kot.orderNumber)}</p>
    <p>${new Date().toLocaleString()}</p>
    <hr/>
    ${
      printMode === "cancel" && cancelLines
        ? `<h2>Cancelled — do not prepare</h2><ul>${cancelLines}</ul><hr/>`
        : ""
    }
    <h2>${printMode === "cancel" ? "Remaining order" : "Items to prepare"}</h2>
    <ul>${activeLines || "<li>(none)</li>"}</ul>
    ${
      printMode !== "cancel" && cancelLines
        ? `<hr/><h2>Cancelled</h2><ul>${cancelLines}</ul>`
        : ""
    }
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
