export type TableStage = "FREE" | "OCCUPIED" | "RUNNING" | "PRINTED" | "RESERVED" | "BILLING";

export const TABLE_STAGES: {
  key: TableStage;
  label: string;
  hint: string;
  swatch: string;
  card: string;
  badge: string;
}[] = [
  {
    key: "FREE",
    label: "Vacant",
    hint: "Ready to seat",
    swatch: "bg-white border border-slate-300",
    card: "bg-white border-slate-200",
    badge: "bg-slate-100 text-slate-700",
  },
  {
    key: "OCCUPIED",
    label: "Occupied",
    hint: "Guests seated / ordering",
    swatch: "bg-red-500",
    card: "bg-red-50 border-red-200",
    badge: "bg-red-100 text-red-700",
  },
  {
    key: "RUNNING",
    label: "Running",
    hint: "KOT sent to kitchen",
    swatch: "bg-emerald-500",
    card: "bg-emerald-50 border-emerald-200",
    badge: "bg-emerald-100 text-emerald-700",
  },
  {
    key: "PRINTED",
    label: "Printed",
    hint: "Bill printed — awaiting pay",
    swatch: "bg-amber-400",
    card: "bg-amber-50 border-amber-200",
    badge: "bg-amber-100 text-amber-800",
  },
  {
    key: "RESERVED",
    label: "Reserved",
    hint: "Held for booking",
    swatch: "bg-blue-500",
    card: "bg-blue-50 border-blue-200",
    badge: "bg-blue-100 text-blue-700",
  },
  {
    key: "BILLING",
    label: "Printed",
    hint: "Bill stage",
    swatch: "bg-amber-400",
    card: "bg-amber-50 border-amber-200",
    badge: "bg-amber-100 text-amber-800",
  },
];

export function stageMeta(status: string) {
  return TABLE_STAGES.find((s) => s.key === status) ?? TABLE_STAGES[0];
}

export function formatElapsed(fromIso: string | null | undefined) {
  if (!fromIso) return "—";
  const ms = Date.now() - new Date(fromIso).getTime();
  if (ms < 0) return "0m";
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return `${hrs}h ${rem}m`;
}
