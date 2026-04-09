"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useCartStore } from "@/lib/commerce/cart-store";
import { formatMoney } from "@/lib/commerce/pricing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CartResponse = {
  id: string;
  currency: string;
  items: Array<{
    id: string;
    productId: string;
    variantId: string | null;
    quantity: number;
    unitPriceCents: number;
    lineTotalCents: number;
  }>;
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
};

type ProductOption = {
  id: string;
  title: string;
  basePriceCents: number;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
};

function buildSessionKey(): string {
  return `cart_${Math.random().toString(36).slice(2, 12)}_${Date.now()}`;
}

export function MockCheckoutPanel({ siteId }: { siteId: string }) {
  const [sessionKey, setSessionKey] = useState("");
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [discountCode, setDiscountCode] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [selectedProductId, setSelectedProductId] = useState(() => "");
  const { setContext } = useCartStore();

  useEffect(() => {
    const key = localStorage.getItem(`saas_cart_${siteId}`) || buildSessionKey();
    localStorage.setItem(`saas_cart_${siteId}`, key);
    const timer = window.setTimeout(() => {
      setSessionKey(key);
      setContext(siteId, key);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [siteId, setContext]);

  const refresh = useCallback(async (key = sessionKey) => {
    if (!key) return;
    const res = await fetch(`/api/saas/sites/${siteId}/commerce/cart/${key}`);
    if (res.ok) setCart(await res.json());
  }, [sessionKey, siteId]);

  useEffect(() => {
    if (!sessionKey) return;
    const timer = window.setTimeout(() => {
      void refresh(sessionKey);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [sessionKey, refresh]);

  useEffect(() => {
    const loadProducts = async () => {
      const res = await fetch(`/api/saas/sites/${siteId}/commerce/products`);
      if (!res.ok) return;
      const data = (await res.json()) as ProductOption[];
      const active = (Array.isArray(data) ? data : []).filter((p) => p.status === "ACTIVE");
      setProducts(active);
      if (!selectedProductId && active[0]?.id) setSelectedProductId(active[0].id);
    };
    loadProducts();
  }, [selectedProductId, siteId]);

  const totalsText = useMemo(() => {
    if (!cart) return "";
    return `${formatMoney(cart.totalCents, cart.currency)} (${cart.items.length} items)`;
  }, [cart]);

  const applyDiscount = async () => {
    if (!sessionKey) return;
    const res = await fetch(`/api/saas/sites/${siteId}/commerce/cart/${sessionKey}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "applyDiscount", code: discountCode || null }),
    });
    if (res.ok) {
      setCart(await res.json());
      setStatus("Discount applied.");
    } else {
      const data = await res.json().catch(() => ({}));
      setStatus(typeof data.error === "string" ? data.error : "Failed to apply discount.");
    }
  };

  const checkout = async () => {
    if (!sessionKey) return;
    const res = await fetch(`/api/saas/sites/${siteId}/commerce/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionKey,
        customer: { email: email || "customer@example.com" },
        paymentMethod: "card",
        shippingAddress: { line1: "1 Main Street", city: "San Francisco", country: "US" },
        billingAddress: { line1: "1 Main Street", city: "San Francisco", country: "US" },
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setStatus(`Checkout success. Order ${data.orderNumber}`);
      await refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setStatus(typeof data.error === "string" ? data.error : "Checkout failed.");
    }
  };

  const addItem = async () => {
    if (!sessionKey || !selectedProductId) return;
    const res = await fetch(`/api/saas/sites/${siteId}/commerce/cart/${sessionKey}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "addItem",
        productId: selectedProductId,
        quantity: 1,
      }),
    });
    if (res.ok) {
      setCart(await res.json());
      setStatus("Item added to cart.");
    } else {
      const data = await res.json().catch(() => ({}));
      setStatus(typeof data.error === "string" ? data.error : "Failed to add item.");
    }
  };

  return (
    <div className="rounded border border-border bg-card p-4">
      <h3 className="mb-2 text-lg font-semibold">Mock Stripe Checkout</h3>
      <p className="mb-3 text-sm text-muted-foreground">Session: {sessionKey || "-"}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="customer@example.com" />
        <div className="flex gap-2">
          <Input value={discountCode} onChange={(e) => setDiscountCode(e.target.value)} placeholder="Discount code" />
          <Button variant="outline" onClick={applyDiscount}>Apply</Button>
        </div>
      </div>
      <div className="mt-2 flex gap-2">
        <select
          className="flex-1 rounded border border-border px-3 py-2 text-sm"
          value={selectedProductId}
          onChange={(e) => setSelectedProductId(e.target.value)}
        >
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title} ({formatMoney(p.basePriceCents)})
            </option>
          ))}
        </select>
        <Button variant="outline" onClick={addItem}>Add Item</Button>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Cart total</span>
        <strong>{totalsText || "$0.00"}</strong>
      </div>
      <div className="mt-3 flex gap-2">
        <Button variant="outline" onClick={() => refresh()}>Refresh Cart</Button>
        <Button onClick={checkout}>Checkout</Button>
      </div>
      {status ? <p className="mt-2 text-sm text-muted-foreground">{status}</p> : null}
    </div>
  );
}

