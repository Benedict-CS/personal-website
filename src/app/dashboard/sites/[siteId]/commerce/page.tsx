"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/commerce/pricing";

type Product = {
  id: string;
  title: string;
  slug: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  basePriceCents: number;
  totalStock: number;
  variants: Array<{ id: string; sku: string; title: string; priceCents: number; stock: number }>;
};

type Order = {
  id: string;
  orderNumber: string;
  status: "PENDING" | "PAID" | "PROCESSING" | "SHIPPED" | "COMPLETED" | "CANCELED";
  fulfillmentStage: "NEW" | "PICKING" | "PACKING" | "SHIPPED" | "DELIVERED";
  totalCents: number;
  createdAt: string;
};

const KANBAN_STAGES: Array<Order["fulfillmentStage"]> = ["NEW", "PICKING", "PACKING", "SHIPPED", "DELIVERED"];

export default function CommerceDashboardPage() {
  const params = useParams<{ siteId: string }>();
  const siteId = params.siteId;
  const [activeTab, setActiveTab] = useState<"inventory" | "orders">("inventory");

  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusText, setStatusText] = useState("");
  const [newProduct, setNewProduct] = useState({ title: "", slug: "", basePriceCents: 0, totalStock: 0 });
  const [variantDraftByProduct, setVariantDraftByProduct] = useState<Record<string, { sku: string; title: string; priceCents: number; stock: number }>>({});

  const loadProducts = useCallback(async () => {
    const res = await fetch(`/api/saas/sites/${siteId}/commerce/products`);
    if (res.ok) setProducts(await res.json());
  }, [siteId]);
  const loadOrders = useCallback(async () => {
    const res = await fetch(`/api/saas/sites/${siteId}/commerce/orders`);
    if (res.ok) setOrders(await res.json());
  }, [siteId]);

  useEffect(() => {
    if (!siteId) return;
    const timer = window.setTimeout(() => {
      void loadProducts();
      void loadOrders();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [siteId, loadOrders, loadProducts]);

  const inventoryStats = useMemo(() => {
    const skuCount = products.reduce((sum, p) => sum + Math.max(1, p.variants.length), 0);
    const stock = products.reduce((sum, p) => sum + p.totalStock + p.variants.reduce((s, v) => s + v.stock, 0), 0);
    return { skuCount, stock, productCount: products.length };
  }, [products]);

  const createProduct = async () => {
    const res = await fetch(`/api/saas/sites/${siteId}/commerce/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newProduct.title,
        slug: newProduct.slug,
        basePriceCents: Number(newProduct.basePriceCents),
        totalStock: Number(newProduct.totalStock),
        status: "ACTIVE",
      }),
    });
    if (res.ok) {
      setStatusText("Product created.");
      setNewProduct({ title: "", slug: "", basePriceCents: 0, totalStock: 0 });
      await loadProducts();
    } else {
      setStatusText("Failed to create product.");
    }
  };

  const updateProductField = async (productId: string, patch: Record<string, unknown>) => {
    const res = await fetch(`/api/saas/sites/${siteId}/commerce/products/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setStatusText(res.ok ? "Product updated." : "Failed to update product.");
    if (res.ok) await loadProducts();
  };

  const addVariant = async (productId: string) => {
    const draft = variantDraftByProduct[productId] || { sku: "", title: "", priceCents: 0, stock: 0 };
    if (!draft.sku.trim()) return;
    const res = await fetch(`/api/saas/sites/${siteId}/commerce/products/${productId}/variants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    if (res.ok) {
      setStatusText("Variant added.");
      setVariantDraftByProduct((prev) => ({ ...prev, [productId]: { sku: "", title: "", priceCents: 0, stock: 0 } }));
      await loadProducts();
    } else {
      setStatusText("Failed to add variant.");
    }
  };

  const moveOrderStage = async (orderId: string, stage: Order["fulfillmentStage"]) => {
    const res = await fetch(`/api/saas/sites/${siteId}/commerce/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fulfillmentStage: stage,
        status: stage === "DELIVERED" ? "COMPLETED" : undefined,
      }),
    });
    setStatusText(res.ok ? "Order stage updated." : "Failed to update order.");
    if (res.ok) await loadOrders();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">E-commerce Admin</h1>
          <p className="text-muted-foreground">Inventory, variants, stock, and fulfillment Kanban for this tenant.</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/sites/${siteId}/pages`}>
            <Button variant="outline">Back to Pages</Button>
          </Link>
          <Button variant={activeTab === "inventory" ? "default" : "outline"} onClick={() => setActiveTab("inventory")}>
            Inventory
          </Button>
          <Button variant={activeTab === "orders" ? "default" : "outline"} onClick={() => setActiveTab("orders")}>
            Fulfillment Kanban
          </Button>
        </div>
      </div>

      {activeTab === "inventory" ? (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded border border-border bg-card p-3">
              <p className="text-sm text-muted-foreground">Products</p>
              <p className="text-2xl font-semibold">{inventoryStats.productCount}</p>
            </div>
            <div className="rounded border border-border bg-card p-3">
              <p className="text-sm text-muted-foreground">SKUs</p>
              <p className="text-2xl font-semibold">{inventoryStats.skuCount}</p>
            </div>
            <div className="rounded border border-border bg-card p-3">
              <p className="text-sm text-muted-foreground">Total stock units</p>
              <p className="text-2xl font-semibold">{inventoryStats.stock}</p>
            </div>
          </div>

          <div className="rounded border border-border bg-card p-4 space-y-3">
            <h2 className="font-semibold">Create Product</h2>
            <div className="grid gap-3 md:grid-cols-4">
              <Input placeholder="Title" value={newProduct.title} onChange={(e) => setNewProduct((p) => ({ ...p, title: e.target.value }))} />
              <Input placeholder="Slug" value={newProduct.slug} onChange={(e) => setNewProduct((p) => ({ ...p, slug: e.target.value }))} />
              <Input type="number" placeholder="Price (cents)" value={newProduct.basePriceCents} onChange={(e) => setNewProduct((p) => ({ ...p, basePriceCents: Number(e.target.value) }))} />
              <Input type="number" placeholder="Stock" value={newProduct.totalStock} onChange={(e) => setNewProduct((p) => ({ ...p, totalStock: Number(e.target.value) }))} />
            </div>
            <Button onClick={createProduct}>Create Product</Button>
          </div>

          <div className="space-y-3">
            {products.map((product) => {
              const draft = variantDraftByProduct[product.id] || { sku: "", title: "", priceCents: 0, stock: 0 };
              return (
                <div key={product.id} className="rounded border border-border bg-card p-4 space-y-3">
                  <div className="grid gap-2 md:grid-cols-5">
                    <Input value={product.title} onChange={(e) => setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, title: e.target.value } : p)))} />
                    <Input value={product.slug} onChange={(e) => setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, slug: e.target.value } : p)))} />
                    <Input type="number" value={product.basePriceCents} onChange={(e) => setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, basePriceCents: Number(e.target.value) } : p)))} />
                    <Input type="number" value={product.totalStock} onChange={(e) => setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, totalStock: Number(e.target.value) } : p)))} />
                    <select
                      className="rounded border border-input px-2"
                      value={product.status}
                      onChange={(e) =>
                        setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, status: e.target.value as Product["status"] } : p)))
                      }
                    >
                      <option value="DRAFT">DRAFT</option>
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="ARCHIVED">ARCHIVED</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => updateProductField(product.id, { title: product.title, slug: product.slug, basePriceCents: product.basePriceCents, totalStock: product.totalStock, status: product.status })}>
                      Save Product
                    </Button>
                  </div>

                  <div className="rounded border border-border/70 bg-muted/40 p-3">
                    <h3 className="mb-2 text-sm font-semibold">Variants</h3>
                    <div className="space-y-2">
                      {product.variants.map((variant) => (
                        <div key={variant.id} className="grid gap-2 md:grid-cols-4 rounded border border-border bg-card p-2">
                          <p className="text-sm">{variant.sku}</p>
                          <p className="text-sm">{variant.title}</p>
                          <p className="text-sm">{formatMoney(variant.priceCents)}</p>
                          <p className="text-sm">Stock: {variant.stock}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 grid gap-2 md:grid-cols-5">
                      <Input placeholder="SKU" value={draft.sku} onChange={(e) => setVariantDraftByProduct((prev) => ({ ...prev, [product.id]: { ...draft, sku: e.target.value } }))} />
                      <Input placeholder="Title" value={draft.title} onChange={(e) => setVariantDraftByProduct((prev) => ({ ...prev, [product.id]: { ...draft, title: e.target.value } }))} />
                      <Input type="number" placeholder="Price cents" value={draft.priceCents} onChange={(e) => setVariantDraftByProduct((prev) => ({ ...prev, [product.id]: { ...draft, priceCents: Number(e.target.value) } }))} />
                      <Input type="number" placeholder="Stock" value={draft.stock} onChange={(e) => setVariantDraftByProduct((prev) => ({ ...prev, [product.id]: { ...draft, stock: Number(e.target.value) } }))} />
                      <Button onClick={() => addVariant(product.id)}>Add Variant</Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-5">
          {KANBAN_STAGES.map((stage) => (
            <div key={stage} className="rounded border border-border bg-muted/40 p-3">
              <h2 className="mb-2 text-sm font-semibold">{stage}</h2>
              <div className="space-y-2">
                {orders
                  .filter((o) => o.fulfillmentStage === stage)
                  .map((order) => (
                    <div key={order.id} className="rounded border border-border bg-card p-2">
                      <p className="font-medium text-sm">{order.orderNumber}</p>
                      <p className="text-xs text-muted-foreground">{formatMoney(order.totalCents)}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {KANBAN_STAGES.filter((x) => x !== stage).map((next) => (
                          <button
                            key={next}
                            type="button"
                            className="rounded border border-border px-2 py-1 text-[10px] hover:bg-muted/40"
                            onClick={() => moveOrderStage(order.id, next)}
                          >
                            Move to {next}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {statusText ? <p className="text-sm text-muted-foreground">{statusText}</p> : null}
    </div>
  );
}

