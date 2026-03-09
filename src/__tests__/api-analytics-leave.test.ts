import { NextRequest } from "next/server";

const mockFindFirst = jest.fn();
const mockUpdate = jest.fn();
const mockGetRequestOrigin = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    pageView: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}));

jest.mock("@/lib/get-request-origin", () => ({
  getRequestOrigin: (...args: unknown[]) => mockGetRequestOrigin(...args),
}));

async function loadRoute() {
  jest.resetModules();
  process.env.NEXT_PUBLIC_SITE_URL = "https://site.test";
  const mod = await import("@/app/api/analytics/leave/route");
  return mod.POST;
}

describe("POST /api/analytics/leave", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetRequestOrigin.mockReturnValue("https://site.test");
    mockFindFirst.mockResolvedValue({ id: "pv-1" });
    mockUpdate.mockResolvedValue({ id: "pv-1" });
  });

  it("returns 401 for disallowed origin", async () => {
    const POST = await loadRoute();
    const req = new NextRequest("http://localhost/api/analytics/leave", {
      method: "POST",
      headers: { origin: "https://evil.test", "content-type": "application/json" },
      body: JSON.stringify({ path: "/", durationSeconds: 9 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid body", async () => {
    const POST = await loadRoute();
    const req = new NextRequest("http://localhost/api/analytics/leave", {
      method: "POST",
      headers: { origin: "https://site.test", "content-type": "application/json" },
      body: "broken-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns ok when duration is negative", async () => {
    const POST = await loadRoute();
    const req = new NextRequest("http://localhost/api/analytics/leave", {
      method: "POST",
      headers: { origin: "https://site.test", "content-type": "application/json" },
      body: JSON.stringify({ path: "/", durationSeconds: -1 }),
    });
    const res = await POST(req);
    const data = await res.json();
    expect(data).toEqual({ ok: true });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns ok when duration is not a number", async () => {
    const POST = await loadRoute();
    const req = new NextRequest("http://localhost/api/analytics/leave", {
      method: "POST",
      headers: { origin: "https://site.test", "content-type": "application/json" },
      body: JSON.stringify({ path: "/", durationSeconds: "foo" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("updates latest page view when record exists", async () => {
    const POST = await loadRoute();
    const req = new NextRequest("http://localhost/api/analytics/leave", {
      method: "POST",
      headers: {
        origin: "https://site.test",
        "content-type": "application/json",
        "x-forwarded-for": "7.7.7.7",
      },
      body: JSON.stringify({ path: "/abc", durationSeconds: 12.4 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockFindFirst).toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("returns ok when no recent row exists", async () => {
    mockFindFirst.mockResolvedValue(null);
    const POST = await loadRoute();
    const req = new NextRequest("http://localhost/api/analytics/leave", {
      method: "POST",
      headers: {
        origin: "https://site.test",
        "content-type": "application/json",
        "x-forwarded-for": "7.7.7.7",
      },
      body: JSON.stringify({ path: "/abc", durationSeconds: 20 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns 500 on DB failure", async () => {
    mockFindFirst.mockRejectedValue(new Error("db down"));
    const POST = await loadRoute();
    const req = new NextRequest("http://localhost/api/analytics/leave", {
      method: "POST",
      headers: { origin: "https://site.test", "content-type": "application/json" },
      body: JSON.stringify({ path: "/x", durationSeconds: 10 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});

