"use client";

import { memo } from "react";
import type { CSSProperties } from "react";
import Image from "next/image";
import type { VisualBlock } from "@/types/saas";

function styleFromMap(map: Record<string, unknown>): CSSProperties {
  return {
    paddingTop: Number(map.paddingTop ?? 24),
    paddingBottom: Number(map.paddingBottom ?? 24),
    paddingLeft: Number(map.paddingLeft ?? 24),
    paddingRight: Number(map.paddingRight ?? 24),
    marginTop: Number(map.marginTop ?? 0),
    marginBottom: Number(map.marginBottom ?? 16),
    borderRadius: Number(map.borderRadius ?? 12),
    background: String(map.backgroundGradient || map.backgroundColor || "#ffffff"),
    color: String(map.color || "#0f172a"),
    fontFamily: String(map.fontFamily || "Inter"),
    fontSize: Number(map.fontSize ?? 16),
    fontWeight: Number(map.fontWeight ?? 400),
    boxShadow: String(map.boxShadow || "0 1px 2px rgba(15,23,42,0.08)"),
    border: `1px solid ${String(map.borderColor || "#e2e8f0")}`,
  };
}

function text(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function list(value: unknown): string[] {
  return Array.isArray(value) ? value.map((x) => String(x)) : [];
}

function BlockNode({ block }: { block: VisualBlock }) {
  const style = styleFromMap(block.styles || {});
  const content = block.content || {};
  const title = text(content.title, block.type);
  const subtitle = text(content.subtitle, "Describe this section");

  switch (block.type) {
    case "MarketingHeroSplit":
    case "MarketingHeroSimple":
      return (
        <section style={style} className="space-y-3">
          <h2 className="text-3xl font-semibold">{title}</h2>
          <p className="text-slate-600">{subtitle}</p>
          <button className="rounded-md bg-blue-600 px-4 py-2 text-white">
            {text(content.ctaText, "Get Started")}
          </button>
        </section>
      );
    case "MarketingFeatureGrid":
      return (
        <section style={style}>
          <h3 className="mb-3 text-2xl font-semibold">{title}</h3>
          <div className="grid gap-3 md:grid-cols-3">
            {list(content.features).map((f) => (
              <div key={f} className="rounded border border-slate-200 bg-white p-3">{f}</div>
            ))}
          </div>
        </section>
      );
    case "MediaImage":
      return (
        <figure style={style} className="space-y-2">
          <Image
            src={text(content.src, "https://placehold.co/1200x600")}
            alt={text(content.alt, "block image")}
            width={1200}
            height={600}
            className="h-auto w-full rounded-md"
          />
        </figure>
      );
    case "InteractiveFormContact":
    case "InteractiveFormCustom":
      return (
        <section style={style} className="space-y-2">
          <h3 className="text-xl font-semibold">{title}</h3>
          <div className="grid gap-2">
            {list(content.fields).map((field) => (
              <input key={field} placeholder={field} className="rounded border border-slate-300 px-3 py-2" />
            ))}
            <button className="rounded-md bg-blue-600 px-4 py-2 text-white">Submit</button>
          </div>
        </section>
      );
    case "CommerceProductGrid":
      return (
        <section style={style} className="space-y-3">
          <h3 className="text-xl font-semibold">{text(content.title, "Featured products")}</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: Number(content.limit ?? 4) }).map((_, idx) => (
              <div key={`p-${idx}`} className="rounded border border-slate-200 bg-white p-3">
                <div className="mb-2 h-24 rounded bg-slate-100" />
                <p className="font-medium">Product {idx + 1}</p>
                <p className="text-sm text-slate-500">$99.00</p>
              </div>
            ))}
          </div>
        </section>
      );
    case "CommerceSingleProduct":
      return (
        <section style={style} className="grid gap-3 md:grid-cols-2">
          <div className="h-48 rounded bg-slate-100" />
          <div className="space-y-2">
            <h3 className="text-2xl font-semibold">{text(content.productSlug, "product-slug")}</h3>
            <p className="text-slate-600">Variant-aware product detail block for storefront pages.</p>
            <button className="rounded-md bg-blue-600 px-4 py-2 text-white">Add to cart</button>
          </div>
        </section>
      );
    case "CommerceCartDrawer":
      return (
        <section style={style}>
          <h3 className="text-xl font-semibold">Cart Drawer</h3>
          <p className="text-slate-600">Slide-out cart preview with quantity controls and subtotal.</p>
          <div className="mt-2 rounded border border-slate-200 p-2 text-sm">
            Position: {text(content.position, "right")} | Subtotal visibility: {String(content.showSubtotal ?? true)}
          </div>
        </section>
      );
    case "CommerceCheckoutFlow":
      return (
        <section style={style} className="space-y-2">
          <h3 className="text-xl font-semibold">Checkout Flow</h3>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700">
            {list(content.steps).map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>
      );
    case "CommerceCategorySidebar":
      return (
        <section style={style} className="space-y-2">
          <h3 className="text-xl font-semibold">Category Filters</h3>
          <ul className="space-y-1 text-sm">
            <li>All products</li>
            <li>Featured</li>
            <li>On sale</li>
          </ul>
        </section>
      );
    default:
      return (
        <section style={style}>
          <h3 className="mb-1 text-xl font-semibold">{title}</h3>
          <p className="text-slate-600">{subtitle}</p>
        </section>
      );
  }
}

export const BlockRenderer = memo(function BlockRenderer({ blocks }: { blocks: VisualBlock[] }) {
  return (
    <div className="space-y-4">
      {blocks.map((block) => (
        <BlockNode key={block.id} block={block} />
      ))}
    </div>
  );
});

