import {
  calculateCartTotals,
  calculateDiscount,
  calculateShipping,
  calculateTax,
  formatMoney,
} from "@/lib/commerce/pricing";

describe("commerce pricing math", () => {
  it("calculates percentage discounts with minimum subtotal", () => {
    expect(calculateDiscount(10000, { type: "percentage", value: 10, minSubtotalCents: 5000 })).toBe(1000);
    expect(calculateDiscount(3000, { type: "percentage", value: 10, minSubtotalCents: 5000 })).toBe(0);
  });

  it("caps fixed discount at subtotal", () => {
    expect(calculateDiscount(2500, { type: "fixed", value: 5000 })).toBe(2500);
  });

  it("shipping becomes free above threshold", () => {
    expect(calculateShipping(10000, { baseRateCents: 999, freeOverCents: 8000 })).toBe(0);
    expect(calculateShipping(5000, { baseRateCents: 999, freeOverCents: 8000 })).toBe(999);
  });

  it("computes tax and totals reliably", () => {
    const totals = calculateCartTotals({
      subtotalCents: 20000,
      discount: { type: "percentage", value: 25 },
      shipping: { baseRateCents: 1000 },
      taxRatePercent: 8.5,
    });
    expect(totals.subtotalCents).toBe(20000);
    expect(totals.discountCents).toBe(5000);
    expect(totals.shippingCents).toBe(1000);
    expect(totals.taxCents).toBe(1360);
    expect(totals.totalCents).toBe(17360);
  });

  it("formats money output in USD", () => {
    expect(formatMoney(12345)).toBe("$123.45");
  });

  it("tax function handles invalid and negative values safely", () => {
    expect(calculateTax(-500, 8)).toBe(0);
    expect(calculateTax(10000, -5)).toBe(0);
  });
});

