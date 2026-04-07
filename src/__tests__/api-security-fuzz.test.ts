import { NextResponse } from "next/server";
import { POST as importPOST } from "@/app/api/import/route";
import { POST as customPagesPOST } from "@/app/api/custom-pages/route";
import { PATCH as customPagePATCH } from "@/app/api/custom-pages/id/[id]/route";
import { POST as reorderPOST } from "@/app/api/custom-pages/reorder/route";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/auth", () => ({
  requireSession: jest.fn(),
}));

jest.mock("@/lib/audit", () => ({
  auditLog: jest.fn(),
}));

jest.mock("@/lib/rate-limit", () => ({
  getClientIP: jest.fn(() => "9.9.9.9"),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    post: {
      create: jest.fn(),
    },
    customPage: {
      aggregate: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

describe("API security fuzz cases", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireSession as jest.Mock).mockResolvedValue({ user: { id: "u1" } });
    (prisma.customPage.aggregate as jest.Mock).mockResolvedValue({ _max: { order: 0 } });
    (prisma.customPage.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.customPage.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.customPage.create as jest.Mock).mockResolvedValue({ id: "cp1" });
    (prisma.customPage.update as jest.Mock).mockResolvedValue({ id: "cp1" });
    (prisma.post.create as jest.Mock).mockResolvedValue({ id: "p1" });
    (prisma.$transaction as jest.Mock).mockResolvedValue(undefined);
  });

  it("import handles non-array payloads gracefully", async () => {
    const req = new Request("http://localhost/api/import", {
      method: "POST",
      body: JSON.stringify({ posts: "bad", customPages: { bad: true } }),
    });
    const res = await importPOST(req as never);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.posts).toBe(0);
    expect(data.pages).toBe(0);
  });

  it("import rejects symbol-only slug after sanitization", async () => {
    const req = new Request("http://localhost/api/import", {
      method: "POST",
      body: JSON.stringify({ posts: [{ title: "x", slug: "@@@@" }] }),
    });
    const res = await importPOST(req as never);
    const data = await res.json();
    expect(data.errors.some((x: string) => x.includes("Invalid slug"))).toBe(true);
  });

  it("import continues when one post create fails", async () => {
    (prisma.post.create as jest.Mock)
      .mockRejectedValueOnce(new Error("dup"))
      .mockResolvedValueOnce({ id: "ok" });
    const req = new Request("http://localhost/api/import", {
      method: "POST",
      body: JSON.stringify({
        posts: [
          { title: "A", slug: "a" },
          { title: "B", slug: "b" },
        ],
      }),
    });
    const res = await importPOST(req as never);
    const data = await res.json();
    expect(data.posts).toBe(1);
    expect(data.errors.length).toBeGreaterThan(0);
  });

  it("custom-pages POST normalizes XSS-like slug input", async () => {
    const req = new Request("http://localhost/api/custom-pages", {
      method: "POST",
      body: JSON.stringify({ slug: "<script>alert(1)</script>", title: "T" }),
    });
    const res = await customPagesPOST(req);
    expect(res.status).toBe(200);
    expect(prisma.customPage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          slug: expect.stringContaining("alert-1"),
        }),
      })
    );
  });

  it("custom-pages POST rejects missing required fields", async () => {
    const req = new Request("http://localhost/api/custom-pages", {
      method: "POST",
      body: JSON.stringify({ slug: "", title: "" }),
    });
    const res = await customPagesPOST(req);
    expect(res.status).toBe(400);
  });

  it("custom-pages PATCH ignores empty sanitized slug and still updates safe fields", async () => {
    (prisma.customPage.findUnique as jest.Mock).mockResolvedValueOnce({
      id: "1",
      slug: "old",
      title: "Old",
      order: 0,
      published: true,
      content: "",
    });
    const req = new Request("http://localhost/api/custom-pages/id/1", {
      method: "PATCH",
      body: JSON.stringify({ slug: "!!!", title: "Safe title" }),
    });
    const res = await customPagePATCH(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(200);
    expect(prisma.customPage.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ title: "Safe title" }),
      })
    );
  });

  it("custom-pages PATCH blocks conflicting slug", async () => {
    (prisma.customPage.findUnique as jest.Mock).mockResolvedValueOnce({
      id: "1",
      slug: "mine",
      title: "Mine",
      order: 0,
      published: true,
      content: "",
    });
    (prisma.customPage.findFirst as jest.Mock).mockResolvedValue({ id: "other" });
    const req = new Request("http://localhost/api/custom-pages/id/1", {
      method: "PATCH",
      body: JSON.stringify({ slug: "conflict" }),
    });
    const res = await customPagePATCH(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(409);
  });

  it("reorder rejects payload with no valid string IDs", async () => {
    const req = new Request("http://localhost/api/custom-pages/reorder", {
      method: "POST",
      body: JSON.stringify({ orderedIds: [1, 2, null, {}] }),
    });
    const res = await reorderPOST(req);
    expect(res.status).toBe(400);
  });

  it("reorder filters mixed payload and uses valid IDs only", async () => {
    const req = new Request("http://localhost/api/custom-pages/reorder", {
      method: "POST",
      body: JSON.stringify({ orderedIds: ["id-1", 2, "id-2", false] }),
    });
    const res = await reorderPOST(req);
    expect(res.status).toBe(200);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("returns unauthorized response from auth guard", async () => {
    (requireSession as jest.Mock).mockResolvedValueOnce({
      unauthorized: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const req = new Request("http://localhost/api/custom-pages", {
      method: "POST",
      body: JSON.stringify({ slug: "abc", title: "A" }),
    });
    const res = await customPagesPOST(req);
    expect(res.status).toBe(401);
  });
});

