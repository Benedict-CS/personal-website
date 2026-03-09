import { NextResponse } from "next/server";
import { POST as importPOST } from "@/app/api/import/route";
import { GET as exportGET } from "@/app/api/export/route";
import { GET as pagesGET, POST as pagesPOST } from "@/app/api/custom-pages/route";
import { PATCH as pagePATCH, DELETE as pageDELETE } from "@/app/api/custom-pages/id/[id]/route";
import { POST as reorderPOST } from "@/app/api/custom-pages/reorder/route";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/audit";
import { getClientIP } from "@/lib/rate-limit";

jest.mock("@/lib/auth", () => ({
  requireSession: jest.fn(),
}));

jest.mock("@/lib/audit", () => ({
  auditLog: jest.fn(),
}));

jest.mock("@/lib/rate-limit", () => ({
  getClientIP: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    post: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    customPage: {
      aggregate: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

describe("Import/Export/Custom Pages API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireSession as jest.Mock).mockResolvedValue({ user: { id: "u1" } });
    (getClientIP as jest.Mock).mockReturnValue("1.2.3.4");
    (prisma.customPage.aggregate as jest.Mock).mockResolvedValue({ _max: { order: 1 } });
    (prisma.customPage.create as jest.Mock).mockResolvedValue({ id: "cp1" });
    (prisma.post.create as jest.Mock).mockResolvedValue({ id: "p1" });
    (auditLog as jest.Mock).mockResolvedValue(undefined);
  });

  it("rejects import when unauthorized", async () => {
    (requireSession as jest.Mock).mockResolvedValue({ unauthorized: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) });
    const req = new Request("http://localhost/api/import", { method: "POST", body: JSON.stringify({ posts: [] }) });
    const res = await importPOST(req as never);
    expect(res.status).toBe(401);
  });

  it("imports valid posts and pages", async () => {
    const req = new Request("http://localhost/api/import", {
      method: "POST",
      body: JSON.stringify({
        posts: [{ title: "A", slug: "a", tags: ["T1"], published: true }],
        customPages: [{ title: "Pg", slug: "pg", content: "x" }],
      }),
    });
    const res = await importPOST(req as never);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.posts).toBe(1);
    expect(data.pages).toBe(1);
    expect(auditLog).toHaveBeenCalled();
  });

  it("keeps collecting errors for malformed import records", async () => {
    const req = new Request("http://localhost/api/import", {
      method: "POST",
      body: JSON.stringify({
        posts: [{ bad: 1 }, { title: "No slug" }],
        customPages: [{ slug: "x-only" }, { title: "y-only" }],
      }),
    });
    const res = await importPOST(req as never);
    const data = await res.json();
    expect(data.errors.length).toBeGreaterThanOrEqual(2);
    expect(data.posts).toBe(0);
    expect(data.pages).toBe(0);
  });

  it("returns 500 on invalid import JSON", async () => {
    const req = new Request("http://localhost/api/import", { method: "POST", body: "{bad" });
    const res = await importPOST(req as never);
    expect(res.status).toBe(500);
  });

  it("rejects export when unauthorized", async () => {
    (requireSession as jest.Mock).mockResolvedValue({ unauthorized: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) });
    const res = await exportGET();
    expect(res.status).toBe(401);
  });

  it("exports posts and custom pages in expected shape", async () => {
    (prisma.post.findMany as jest.Mock).mockResolvedValue([
      {
        id: "p1",
        title: "Post",
        slug: "post",
        content: "c",
        description: null,
        published: true,
        pinned: false,
        category: null,
        order: 0,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-02"),
        tags: [{ name: "Tech" }],
      },
    ]);
    (prisma.customPage.findMany as jest.Mock).mockResolvedValue([
      {
        id: "cp1",
        slug: "about",
        title: "About",
        content: "body",
        order: 0,
        published: true,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-02"),
      },
    ]);
    const res = await exportGET();
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(data.posts)).toBe(true);
    expect(Array.isArray(data.customPages)).toBe(true);
  });

  it("returns empty list when custom pages GET fails", async () => {
    (prisma.customPage.findMany as jest.Mock).mockRejectedValue(new Error("db"));
    const res = await pagesGET();
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toEqual([]);
  });

  it("creates custom page with normalized slug", async () => {
    (prisma.customPage.findUnique as jest.Mock).mockResolvedValue(null);
    const req = new Request("http://localhost/api/custom-pages", {
      method: "POST",
      body: JSON.stringify({ slug: " Hello World! ", title: "T", content: "C" }),
    });
    const res = await pagesPOST(req);
    expect(res.status).toBe(200);
    expect(prisma.customPage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ slug: "hello-world-" }),
      })
    );
  });

  it("rejects custom page creation when slug exists", async () => {
    (prisma.customPage.findUnique as jest.Mock).mockResolvedValue({ id: "existing" });
    const req = new Request("http://localhost/api/custom-pages", {
      method: "POST",
      body: JSON.stringify({ slug: "about", title: "About" }),
    });
    const res = await pagesPOST(req);
    expect(res.status).toBe(409);
  });

  it("rejects reorder when orderedIds missing", async () => {
    const req = new Request("http://localhost/api/custom-pages/reorder", {
      method: "POST",
      body: JSON.stringify({ orderedIds: [] }),
    });
    const res = await reorderPOST(req);
    expect(res.status).toBe(400);
  });

  it("updates order transaction for reorder", async () => {
    (prisma.$transaction as jest.Mock).mockResolvedValue(undefined);
    const req = new Request("http://localhost/api/custom-pages/reorder", {
      method: "POST",
      body: JSON.stringify({ orderedIds: ["a", "b", "c"] }),
    });
    const res = await reorderPOST(req);
    expect(res.status).toBe(200);
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it("patches custom page and checks slug conflict", async () => {
    (prisma.customPage.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.customPage.update as jest.Mock).mockResolvedValue({ id: "p1", slug: "new" });
    const req = new Request("http://localhost/api/custom-pages/id/p1", {
      method: "PATCH",
      body: JSON.stringify({ slug: "New!", title: "Title" }),
    });
    const res = await pagePATCH(req, { params: Promise.resolve({ id: "p1" }) });
    expect(res.status).toBe(200);
    expect(prisma.customPage.update).toHaveBeenCalled();
  });

  it("returns 409 on page PATCH slug conflict", async () => {
    (prisma.customPage.findFirst as jest.Mock).mockResolvedValue({ id: "other" });
    const req = new Request("http://localhost/api/custom-pages/id/p1", {
      method: "PATCH",
      body: JSON.stringify({ slug: "used-slug" }),
    });
    const res = await pagePATCH(req, { params: Promise.resolve({ id: "p1" }) });
    expect(res.status).toBe(409);
  });

  it("deletes custom page", async () => {
    (prisma.customPage.delete as jest.Mock).mockResolvedValue({ id: "gone" });
    const res = await pageDELETE(new Request("http://localhost", { method: "DELETE" }), {
      params: Promise.resolve({ id: "gone" }),
    });
    expect(res.status).toBe(204);
  });
});

