import { GET } from "@/app/api/integrations/gomodule/route";
import { NextRequest } from "next/server";

describe("/api/integrations/gomodule", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("returns 400 for path without slash", async () => {
    const req = new NextRequest("http://localhost/api/integrations/gomodule?module=fmt");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for path traversal", async () => {
    const req = new NextRequest(
      "http://localhost/api/integrations/gomodule?module=github.com/foo/../bar"
    );
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns version on success", async () => {
    global.fetch = jest.fn(async () => {
      return {
        ok: true,
        status: 200,
        json: async () => ({ Version: "v1.2.3", Time: "2024-01-01T00:00:00Z" }),
      } as Response;
    });

    const req = new NextRequest(
      "http://localhost/api/integrations/gomodule?module=github.com/foo/bar"
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("s-maxage");
    const body = (await res.json()) as { name: string; version: string; description: string | null };
    expect(body.name).toBe("github.com/foo/bar");
    expect(body.version).toBe("v1.2.3");
    expect(body.description).toContain("2024-01-01");
  });

  it("returns 404 when proxy misses module", async () => {
    global.fetch = jest.fn(async () => ({ ok: false, status: 404 }) as Response);
    const req = new NextRequest(
      "http://localhost/api/integrations/gomodule?module=github.com/nope/missing"
    );
    const res = await GET(req);
    expect(res.status).toBe(404);
  });
});
