import { NextRequest, NextResponse } from "next/server";
import { GET, PATCH } from "@/app/api/saas/sites/[siteId]/commerce/cart/[sessionKey]/route";

const mockCartFindUnique = jest.fn();
const mockCartCreate = jest.fn();
const mockCartFindFirst = jest.fn();
const mockCartUpdate = jest.fn();
const mockCartItemFindFirst = jest.fn();
const mockCartItemCreate = jest.fn();
const mockCartItemUpdate = jest.fn();
const mockCartItemDelete = jest.fn();
const mockProductFindFirst = jest.fn();
const mockVariantFindFirst = jest.fn();
const mockDiscountFindFirst = jest.fn();
const mockShippingFindFirst = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    cart: {
      findUnique: (...args: unknown[]) => mockCartFindUnique(...args),
      create: (...args: unknown[]) => mockCartCreate(...args),
      findFirst: (...args: unknown[]) => mockCartFindFirst(...args),
      update: (...args: unknown[]) => mockCartUpdate(...args),
    },
    cartItem: {
      findFirst: (...args: unknown[]) => mockCartItemFindFirst(...args),
      create: (...args: unknown[]) => mockCartItemCreate(...args),
      update: (...args: unknown[]) => mockCartItemUpdate(...args),
      delete: (...args: unknown[]) => mockCartItemDelete(...args),
    },
    product: {
      findFirst: (...args: unknown[]) => mockProductFindFirst(...args),
    },
    productVariant: {
      findFirst: (...args: unknown[]) => mockVariantFindFirst(...args),
    },
    discountCode: {
      findFirst: (...args: unknown[]) => mockDiscountFindFirst(...args),
    },
    shippingZone: {
      findFirst: (...args: unknown[]) => mockShippingFindFirst(...args),
    },
  },
}));

const mockRequireTenantContext = jest.fn();
jest.mock("@/lib/tenant-auth", () => ({
  requireTenantContext: (...args: unknown[]) => mockRequireTenantContext(...args),
}));

describe("commerce cart route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("passes through unauthorized response", async () => {
    mockRequireTenantContext.mockResolvedValue({
      unauthorized: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const req = new NextRequest("http://localhost/api/saas/sites/site-1/commerce/cart/s1");
    const res = await GET(req, { params: Promise.resolve({ siteId: "site-1", sessionKey: "s1" }) });
    expect(res.status).toBe(401);
  });

  it("creates cart when missing and returns cart payload", async () => {
    mockRequireTenantContext.mockResolvedValue({
      context: { siteId: "site-1", role: "viewer", userId: "u1", email: "u@example.com" },
    });
    mockCartFindUnique.mockResolvedValue(null);
    mockCartCreate.mockResolvedValue({ id: "cart-1", items: [], subtotalCents: 0, discountCents: 0, shippingCents: 0, taxCents: 0, totalCents: 0 });
    mockCartFindFirst.mockResolvedValue({ id: "cart-1", items: [], subtotalCents: 0, discountCents: 0, shippingCents: 0, taxCents: 0, totalCents: 0, discountCode: null, shippingZone: null });
    mockCartUpdate.mockResolvedValue({ id: "cart-1", items: [], subtotalCents: 0, discountCents: 0, shippingCents: 0, taxCents: 0, totalCents: 0 });

    const req = new NextRequest("http://localhost/api/saas/sites/site-1/commerce/cart/s1");
    const res = await GET(req, { params: Promise.resolve({ siteId: "site-1", sessionKey: "s1" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe("cart-1");
  });

  it("rejects addItem when product is missing", async () => {
    mockRequireTenantContext.mockResolvedValue({
      context: { siteId: "site-1", role: "viewer", userId: "u1", email: "u@example.com" },
    });
    mockCartFindUnique.mockResolvedValue({ id: "cart-1", items: [] });
    mockProductFindFirst.mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/saas/sites/site-1/commerce/cart/s1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "addItem", productId: "missing", quantity: 1 }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ siteId: "site-1", sessionKey: "s1" }) });
    expect(res.status).toBe(404);
  });
});

