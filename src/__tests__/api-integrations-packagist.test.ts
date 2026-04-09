/**
 * @jest-environment node
 */

import { GET } from "@/app/api/integrations/packagist/route";
import { NextRequest } from "next/server";

describe("/api/integrations/packagist", () => {
  const origFetch = global.fetch;

  afterEach(() => {
    global.fetch = origFetch;
  });

  it("returns 400 for invalid package", async () => {
    const req = new NextRequest("http://localhost/api/integrations/packagist?package=bad");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns metadata on success", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        packages: {
          "symfony/http-foundation": [
            {
              version: "v7.0.0",
              description: "Defines an object-oriented layer for the HTTP specification.",
              license: ["MIT"],
            },
          ],
        },
      }),
    }) as unknown as typeof fetch;

    const req = new NextRequest(
      "http://localhost/api/integrations/packagist?package=symfony/http-foundation"
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const j = (await res.json()) as Record<string, unknown>;
    expect(j.name).toBe("symfony/http-foundation");
    expect(j.version).toBe("v7.0.0");
    expect(String(j.description)).toContain("HTTP");
    expect(j.license).toBe("MIT");
  });

  it("returns 404 when package list missing", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ packages: {} }),
    }) as unknown as typeof fetch;

    const req = new NextRequest("http://localhost/api/integrations/packagist?package=foo/bar");
    const res = await GET(req);
    expect(res.status).toBe(404);
  });
});
