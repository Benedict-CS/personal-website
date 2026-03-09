"use client";

import { create } from "zustand";
import { calculateCartTotals } from "@/lib/commerce/pricing";

export type CartStoreItem = {
  productId: string;
  variantId?: string;
  title: string;
  quantity: number;
  unitPriceCents: number;
};

type CartState = {
  siteId: string | null;
  sessionKey: string | null;
  currency: string;
  items: CartStoreItem[];
  discountCode: string | null;
  taxRatePercent: number;
  shippingBaseCents: number;
  shippingFreeOverCents: number | null;
  setContext: (siteId: string, sessionKey: string) => void;
  setShipping: (baseCents: number, freeOverCents?: number | null) => void;
  setTaxRate: (rate: number) => void;
  setDiscountCode: (code: string | null) => void;
  addItem: (item: Omit<CartStoreItem, "quantity"> & { quantity?: number }) => void;
  updateQuantity: (productId: string, variantId: string | undefined, quantity: number) => void;
  removeItem: (productId: string, variantId?: string) => void;
  clear: () => void;
  totals: () => {
    subtotalCents: number;
    discountCents: number;
    shippingCents: number;
    taxCents: number;
    totalCents: number;
  };
};

function sameLine(a: CartStoreItem, productId: string, variantId?: string): boolean {
  return a.productId === productId && (a.variantId || "") === (variantId || "");
}

export const useCartStore = create<CartState>((set, get) => ({
  siteId: null,
  sessionKey: null,
  currency: "USD",
  items: [],
  discountCode: null,
  taxRatePercent: 0,
  shippingBaseCents: 0,
  shippingFreeOverCents: null,
  setContext: (siteId, sessionKey) => set({ siteId, sessionKey }),
  setShipping: (baseCents, freeOverCents = null) =>
    set({ shippingBaseCents: Math.max(0, Math.round(baseCents)), shippingFreeOverCents: freeOverCents }),
  setTaxRate: (rate) => set({ taxRatePercent: Math.max(0, rate) }),
  setDiscountCode: (code) => set({ discountCode: code?.trim() || null }),
  addItem: (item) =>
    set((state) => {
      const nextQty = Math.max(1, item.quantity ?? 1);
      const idx = state.items.findIndex((x) => sameLine(x, item.productId, item.variantId));
      if (idx === -1) {
        return { items: [...state.items, { ...item, quantity: nextQty }] };
      }
      const next = [...state.items];
      next[idx] = { ...next[idx], quantity: next[idx].quantity + nextQty };
      return { items: next };
    }),
  updateQuantity: (productId, variantId, quantity) =>
    set((state) => ({
      items: state.items
        .map((x) => (sameLine(x, productId, variantId) ? { ...x, quantity: Math.max(0, Math.round(quantity)) } : x))
        .filter((x) => x.quantity > 0),
    })),
  removeItem: (productId, variantId) =>
    set((state) => ({ items: state.items.filter((x) => !sameLine(x, productId, variantId)) })),
  clear: () => set({ items: [], discountCode: null }),
  totals: () => {
    const state = get();
    const subtotalCents = state.items.reduce(
      (sum, item) => sum + Math.max(0, item.unitPriceCents) * Math.max(0, item.quantity),
      0
    );
    return calculateCartTotals({
      subtotalCents,
      // Code resolution happens server-side; store-level discount remains absent.
      discount: null,
      shipping: {
        baseRateCents: state.shippingBaseCents,
        freeOverCents: state.shippingFreeOverCents ?? undefined,
      },
      taxRatePercent: state.taxRatePercent,
    });
  },
}));

