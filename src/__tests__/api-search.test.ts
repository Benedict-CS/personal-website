/**
 * API route tests: GET /api/search (with mocked DB).
 */
import { NextRequest } from "next/server";
import { GET } from "@/app/api/search/route";

const mockQueryRaw = jest.fn();
const mockPostFindMany = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: (...args: unknown[]) => mockQueryRaw(...args),
    post: {
      findMany: (...args: unknown[]) => mockPostFindMany(...args),
    },
  },
}));

function createRequest(q?: string) {
  const url = new URL("http://localhost/api/search");
  if (q !== undefined) url.searchParams.set("q", q);
  return new NextRequest(url.toString());
}

describe("GET /api/search", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns empty posts and pages when q is missing", async () => {
    const req = createRequest();
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("posts");
    expect(data).toHaveProperty("pages");
    expect(data.posts).toEqual([]);
    expect(Array.isArray(data.pages)).toBe(true);
  });

  it("returns empty posts and pages when q is empty string", async () => {
    const req = createRequest("");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.posts).toEqual([]);
  });

  it("returns posts and pages shape when q is provided", async () => {
    mockQueryRaw.mockRejectedValue(new Error("no search_vector")); // fallback path
    mockPostFindMany.mockResolvedValue([
      {
        id: "1",
        title: "Test Post",
        slug: "test-post",
        description: "Desc",
        content: "Content with term",
        createdAt: new Date(),
        tags: [{ name: "tech" }],
      },
    ]);
    const req = createRequest("term");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.posts)).toBe(true);
    expect(Array.isArray(data.pages)).toBe(true);
    if (data.posts.length > 0) {
      expect(data.posts[0]).toHaveProperty("id");
      expect(data.posts[0]).toHaveProperty("title");
      expect(data.posts[0]).toHaveProperty("slug");
      expect(data.posts[0]).toHaveProperty("snippets");
      expect(data.posts[0]).not.toHaveProperty("content"); // stripped in response
    }
  });

  it("ranks title matches above weak content matches", async () => {
    mockQueryRaw.mockRejectedValue(new Error("no search_vector"));
    mockPostFindMany.mockResolvedValue([
      {
        id: "2",
        title: "General Notes",
        slug: "general-notes",
        description: "misc",
        content: "includes nycu once in body text",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        tags: [],
      },
      {
        id: "1",
        title: "NYCU Research Journey",
        slug: "nycu-research-journey",
        description: "Deep dive",
        content: "research content",
        createdAt: new Date("2025-01-01T00:00:00.000Z"),
        tags: [{ name: "networking" }],
      },
    ]);

    const req = createRequest("nycu");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.posts[0]?.slug).toBe("nycu-research-journey");
  });

  it("returns 500 on unexpected error", async () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    mockQueryRaw.mockRejectedValue(new Error("db error"));
    mockPostFindMany.mockRejectedValue(new Error("db error"));
    const req = createRequest("foo");
    const res = await GET(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.posts).toEqual([]);
    expect(data.pages).toEqual([]);
    spy.mockRestore();
  });
});
