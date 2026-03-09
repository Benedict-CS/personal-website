export type DiscountInput = {
  type: "percentage" | "fixed";
  value: number;
  minSubtotalCents?: number;
};

export type ShippingInput = {
  baseRateCents: number;
  freeOverCents?: number;
};

export type TotalsInput = {
  subtotalCents: number;
  discount?: DiscountInput | null;
  shipping?: ShippingInput | null;
  taxRatePercent?: number;
};

export type CartTotals = {
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
};

function clampMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

export function calculateDiscount(subtotalCents: number, discount?: DiscountInput | null): number {
  const subtotal = clampMoney(subtotalCents);
  if (!discount) return 0;
  const min = clampMoney(discount.minSubtotalCents ?? 0);
  if (subtotal < min) return 0;
  if (discount.type === "fixed") {
    return Math.min(subtotal, clampMoney(discount.value));
  }
  const percentage = Math.max(0, Math.min(100, discount.value));
  return clampMoney((subtotal * percentage) / 100);
}

export function calculateShipping(subtotalAfterDiscountCents: number, shipping?: ShippingInput | null): number {
  const subtotal = clampMoney(subtotalAfterDiscountCents);
  if (!shipping) return 0;
  const freeOver = shipping.freeOverCents != null ? clampMoney(shipping.freeOverCents) : null;
  if (freeOver != null && subtotal >= freeOver) return 0;
  return clampMoney(shipping.baseRateCents);
}

export function calculateTax(taxableCents: number, taxRatePercent = 0): number {
  const taxable = clampMoney(taxableCents);
  const rate = Math.max(0, taxRatePercent);
  return clampMoney((taxable * rate) / 100);
}

export function calculateCartTotals(input: TotalsInput): CartTotals {
  const subtotalCents = clampMoney(input.subtotalCents);
  const discountCents = calculateDiscount(subtotalCents, input.discount);
  const afterDiscount = clampMoney(subtotalCents - discountCents);
  const shippingCents = calculateShipping(afterDiscount, input.shipping);
  const taxCents = calculateTax(afterDiscount + shippingCents, input.taxRatePercent ?? 0);
  const totalCents = clampMoney(afterDiscount + shippingCents + taxCents);
  return { subtotalCents, discountCents, shippingCents, taxCents, totalCents };
}

export function formatMoney(cents: number, currency = "USD"): string {
  const amount = clampMoney(cents) / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

