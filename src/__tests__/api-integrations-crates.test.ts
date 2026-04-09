import { GET } from "@/app/api/integrations/crates/route";
import { NextRequest } from "next/server";

describe("/api/integrations/crates", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("returns 400 for empty crate", async () => {
    const req = new NextRequest("http://localhost/api/integrations/crates?crate=");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid characters", async () => {
    const req = new NextRequest("http://localhost/api/integrations/crates?crate=bad%20name");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns version on success", async () => {
    global.fetch = jest.fn(async () => {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          crate: {
            id: "serde",
            max_version: "1.0.0",
            max_stable_version: "1.0.0",
            description: "Serialization framework",
          },
        }),
      } as Response;
    });

    const req = new NextRequest("http://localhost/api/integrations/crates?crate=serde");
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("s-maxage");
    const body = (await res.json()) as { name: string; version: string };
    expect(body.name).toBe("serde");
    expect(body.version).toBe("1.0.0");
  });

  it("returns 404 when crates.io misses crate", async () => {
    global.fetch = jest.fn(async () => ({ ok: false, status: 404 }) as Response);
    const req = new NextRequest("http://localhost/api/integrations/crates?crate=not-a-real-crate-zzzzz");
    const res = await GET(req);
    expect(res.status).toBe(404);
  });
});
