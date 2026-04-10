import { NextRequest, NextResponse } from "next/server";
import { PATCH } from "@/app/api/posts/[id]/route";

const mockFindUnique = jest.fn();
const mockTransaction = jest.fn();
const mockPostVersionFindFirst = jest.fn();
const mockPostVersionCreate = jest.fn();
const mockPostVersionFindMany = jest.fn();
const mockPostVersionDeleteMany = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: (...args: unknown[]) => mockTransaction(...args),
    post: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
    postVersion: {
      findFirst: (...args: unknown[]) => mockPostVersionFindFirst(...args),
      create: (...args: unknown[]) => mockPostVersionCreate(...args),
      findMany: (...args: unknown[]) => mockPostVersionFindMany(...args),
      deleteMany: (...args: unknown[]) => mockPostVersionDeleteMany(...args),
    },
  },
}));

jest.mock("@/lib/auth", () => ({
  requireSession: jest.fn(),
}));
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}));
jest.mock("@/lib/audit", () => ({
  auditLog: jest.fn(),
}));

import { requireSession } from "@/lib/auth";

const mockRequireSession = requireSession as jest.MockedFunction<typeof requireSession>;

describe("PATCH /api/posts/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireSession.mockResolvedValue({ session: { user: { email: "admin@example.com" } } } as Awaited<ReturnType<typeof requireSession>>);
  });

  it("uses a transaction and returns publicationState", async () => {
    const current = {
      id: "p1",
      title: "Before",
      slug: "before",
      content: "before content",
      published: false,
      pinned: false,
      category: null,
      publishedAt: null,
      tags: [{ name: "old-tag" }],
    };
    const updated = {
      ...current,
      title: "After",
      slug: "after",
      content: "after content",
      published: true,
      tags: [{ id: "t1", name: "New Tag", slug: "new-tag" }],
      publishedAt: new Date("2026-04-09T00:00:00.000Z"),
    };
    mockFindUnique.mockResolvedValue(current);
    mockPostVersionFindFirst.mockResolvedValue({ versionNumber: 1 });
    mockPostVersionCreate.mockResolvedValue({});
    mockPostVersionFindMany.mockResolvedValue([]);
    mockPostVersionDeleteMany.mockResolvedValue({ count: 0 });
    mockTransaction.mockResolvedValue(updated);

    const req = new NextRequest("http://localhost/api/posts/p1", {
      method: "PATCH",
      body: JSON.stringify({
        title: "After",
        slug: "after",
        content: "after content",
        description: null,
        tags: "New Tag",
        published: true,
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await PATCH(req, { params: Promise.resolve({ id: "p1" }) });
    expect(res.status).toBe(200);
    expect(mockTransaction).toHaveBeenCalled();
    const json = await res.json();
    expect(json.publicationState).toBe("published");
  });

  it("returns 404 when post does not exist", async () => {
    mockFindUnique.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/posts/missing", {
      method: "PATCH",
      body: JSON.stringify({ title: "x", slug: "x", content: "x" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "missing" }) });
    expect(res.status).toBe(404);
  });

  it("returns 401 when unauthorized", async () => {
    mockRequireSession.mockResolvedValue({
      unauthorized: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const req = new NextRequest("http://localhost/api/posts/p1", {
      method: "PATCH",
      body: JSON.stringify({ title: "x", slug: "x", content: "x" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "p1" }) });
    expect(res.status).toBe(401);
  });
});
