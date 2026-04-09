import { GET } from "@/app/api/integrations/pypi/route";
import { NextRequest } from "next/server";

describe("/api/integrations/pypi", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("returns 400 for invalid name", async () => {
    const req = new NextRequest("http://localhost/api/integrations/pypi?package=");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for characters PyPI does not allow in this validator", async () => {
    const req = new NextRequest("http://localhost/api/integrations/pypi?package=bad%20name");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns version and cache header on success", async () => {
    global.fetch = jest.fn(async () => {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          info: {
            name: "requests",
            version: "2.31.0",
            summary: "HTTP library",
            license: "Apache 2.0",
          },
        }),
      } as Response;
    });

    const req = new NextRequest("http://localhost/api/integrations/pypi?package=requests");
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("s-maxage");
    const body = (await res.json()) as { name: string; version: string };
    expect(body.name).toBe("requests");
    expect(body.version).toBe("2.31.0");
  });

  it("returns 404 when PyPI misses package", async () => {
    global.fetch = jest.fn(async () => ({ ok: false, status: 404 }) as Response);
    const req = new NextRequest("http://localhost/api/integrations/pypi?package=not-a-real-pkg-zzzzz");
    const res = await GET(req);
    expect(res.status).toBe(404);
  });
});
