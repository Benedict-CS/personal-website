/**
 * @jest-environment node
 */

import { GET } from "@/app/api/integrations/nuget/route";
import { NextRequest } from "next/server";

describe("/api/integrations/nuget", () => {
  const origFetch = global.fetch;

  afterEach(() => {
    global.fetch = origFetch;
  });

  it("returns 400 for invalid id", async () => {
    const req = new NextRequest("http://localhost/api/integrations/nuget?package=%3Cbad%3E");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns package metadata on success", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            id: "Newtonsoft.Json",
            version: "13.0.3",
            description: "Json.NET is a popular high-performance JSON framework for .NET.",
          },
        ],
      }),
    }) as unknown as typeof fetch;

    const req = new NextRequest("http://localhost/api/integrations/nuget?package=Newtonsoft.Json");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const j = (await res.json()) as Record<string, unknown>;
    expect(j.name).toBe("Newtonsoft.Json");
    expect(j.version).toBe("13.0.3");
    expect(String(j.description)).toContain("JSON");
    expect(j.license).toBeNull();
  });

  it("returns 404 when search has no rows", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    }) as unknown as typeof fetch;

    const req = new NextRequest("http://localhost/api/integrations/nuget?package=Missing.Package.Xyz");
    const res = await GET(req);
    expect(res.status).toBe(404);
  });
});
