export const ORDER_TYPE_LABELS: Record<string, string> = {
  DINE_IN: "Dine-in",
  PARCEL: "Parcel",
  DELIVERY: "Delivery",
  TAKEAWAY: "Parcel",
};

export const ORDER_SOURCE_LABELS: Record<string, string> = {
  WALK_IN: "Walk-in",
  PHONE: "Phone",
  ONLINE: "Online",
};

export const ONLINE_PLATFORMS = [
  "Swiggy",
  "Zomato",
  "Magicpin",
  "PhonePe",
  "Own Website",
] as const;

export function orderTypeLabel(type: string) {
  return ORDER_TYPE_LABELS[type] ?? type;
}

export function orderSourceLabel(source: string) {
  return ORDER_SOURCE_LABELS[source] ?? source;
}

export function orderChannelBadge(type: string) {
  if (type === "DELIVERY") return "bg-[#dce8f8] text-[#1d4e89]";
  if (type === "PARCEL" || type === "TAKEAWAY") return "bg-[#f8e8d4] text-[#8a4b16]";
  return "bg-[#dcefe6] text-[#0f6b4c]";
}
