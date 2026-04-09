import { GET } from "@/app/api/integrations/npm/route";
import { NextRequest } from "next/server";

describe("/api/integrations/npm", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("returns 400 for empty package", async () => {
    const req = new NextRequest("http://localhost/api/integrations/npm?package=");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid scoped name", async () => {
    const req = new NextRequest("http://localhost/api/integrations/npm?package=@scopeonly");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns version and cache header on success", async () => {
    global.fetch = jest.fn(async () => {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          name: "left-pad",
          version: "1.0.0",
          description: "pad",
          license: "WTFPL",
        }),
      } as Response;
    });

    const req = new NextRequest("http://localhost/api/integrations/npm?package=left-pad");
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("s-maxage");
    const body = (await res.json()) as { name: string; version: string };
    expect(body.name).toBe("left-pad");
    expect(body.version).toBe("1.0.0");
  });

  it("returns 404 when registry misses package", async () => {
    global.fetch = jest.fn(async () => ({ ok: false, status: 404 }) as Response);
    const req = new NextRequest("http://localhost/api/integrations/npm?package=not-a-real-pkg-zzzzz");
    const res = await GET(req);
    expect(res.status).toBe(404);
  });
});
