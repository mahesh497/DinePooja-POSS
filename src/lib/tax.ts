export function roundMoney(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export type BillInput = {
  subtotal: number;
  discountAmount?: number;
  discountPercent?: number;
  cgstPercent: number;
  sgstPercent: number;
};

export type BillBreakdown = {
  subtotal: number;
  discountAmount: number;
  taxable: number;
  cgstAmount: number;
  sgstAmount: number;
  total: number;
};

export function calculateBill(input: BillInput): BillBreakdown {
  const subtotal = roundMoney(Math.max(0, input.subtotal));
  let discountAmount = roundMoney(input.discountAmount ?? 0);
  if ((input.discountPercent ?? 0) > 0) {
    discountAmount = roundMoney((subtotal * (input.discountPercent ?? 0)) / 100);
  }
  discountAmount = Math.min(discountAmount, subtotal);
  const taxable = roundMoney(subtotal - discountAmount);
  const cgstAmount = roundMoney((taxable * input.cgstPercent) / 100);
  const sgstAmount = roundMoney((taxable * input.sgstPercent) / 100);
  const total = roundMoney(taxable + cgstAmount + sgstAmount);
  return { subtotal, discountAmount, taxable, cgstAmount, sgstAmount, total };
}

export function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}
