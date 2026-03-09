/**
 * API route tests: GET/PATCH /api/site-content (with mocked DB and auth).
 */
import { NextRequest, NextResponse } from "next/server";
import { GET, PATCH } from "@/app/api/site-content/route";

const mockFindUnique = jest.fn();
const mockUpsert = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    sitePageContent: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      upsert: (...args: unknown[]) => mockUpsert(...args),
    },
  },
}));

jest.mock("@/lib/auth", () => ({
  requireSession: jest.fn(),
}));

import { requireSession } from "@/lib/auth";

function createGetRequest(page?: string) {
  const url = new URL("http://localhost/api/site-content");
  if (page) url.searchParams.set("page", page);
  return new NextRequest(url.toString());
}

describe("GET /api/site-content", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 when page is missing", async () => {
    const req = createGetRequest();
    const res = await GET(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/invalid/i);
  });

  it("returns 400 when page is invalid", async () => {
    const req = createGetRequest("invalid-page");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns null when no content stored for page", async () => {
    mockFindUnique.mockResolvedValue(null);
    const req = createGetRequest("home");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toBeNull();
  });

  it("returns content for valid page", async () => {
    const content = { hero: { title: "Hello" } };
    mockFindUnique.mockResolvedValue({ page: "home", content });
    const req = createGetRequest("home");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual(content);
  });

  it("accepts contact page", async () => {
    mockFindUnique.mockResolvedValue(null);
    const req = createGetRequest("contact");
    const res = await GET(req);
    expect(res.status).toBe(200);
  });
});

describe("PATCH /api/site-content", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    requireSession.mockResolvedValue({
      unauthorized: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });
    const req = new NextRequest("http://localhost/api/site-content", {
      method: "PATCH",
      body: JSON.stringify({ page: "home", content: {} }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when page is invalid", async () => {
    requireSession.mockResolvedValue({ session: {} });
    const req = new NextRequest("http://localhost/api/site-content", {
      method: "PATCH",
      body: JSON.stringify({ page: "invalid", content: {} }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });

  it("returns 200 and upserts when valid", async () => {
    requireSession.mockResolvedValue({ session: {} });
    mockUpsert.mockResolvedValue(undefined);
    const req = new NextRequest("http://localhost/api/site-content", {
      method: "PATCH",
      body: JSON.stringify({ page: "home", content: { hero: { title: "Hi" } } }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(mockUpsert).toHaveBeenCalled();
  });
});
