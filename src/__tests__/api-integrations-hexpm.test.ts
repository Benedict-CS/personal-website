/**
 * @jest-environment node
 */

import { GET } from "@/app/api/integrations/hexpm/route";
import { NextRequest } from "next/server";

describe("/api/integrations/hexpm", () => {
  const origFetch = global.fetch;

  afterEach(() => {
    global.fetch = origFetch;
  });

  it("returns 400 for invalid name", async () => {
    const req = new NextRequest("http://localhost/api/integrations/hexpm?package=Bad%2FName");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns package metadata on success", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        name: "ecto",
        latest_stable_version: "3.11.2",
        meta: {
          description: "A database wrapper and language integrated query for Elixir.",
          licenses: ["Apache-2.0"],
        },
      }),
    }) as unknown as typeof fetch;

    const req = new NextRequest("http://localhost/api/integrations/hexpm?package=ecto");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const j = (await res.json()) as Record<string, unknown>;
    expect(j.name).toBe("ecto");
    expect(j.version).toBe("3.11.2");
    expect(String(j.description)).toContain("Elixir");
    expect(j.license).toBe("Apache-2.0");
  });

  it("falls back to first release version", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        name: "plug",
        releases: [{ version: "1.16.1" }],
        meta: { description: "Composable web middleware", licenses: ["Apache-2.0"] },
      }),
    }) as unknown as typeof fetch;

    const req = new NextRequest("http://localhost/api/integrations/hexpm?package=plug");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const j = (await res.json()) as Record<string, unknown>;
    expect(j.version).toBe("1.16.1");
  });

  it("returns 404 when Hex responds 404", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
    }) as unknown as typeof fetch;

    const req = new NextRequest("http://localhost/api/integrations/hexpm?package=nonexistent_pkg_xyz");
    const res = await GET(req);
    expect(res.status).toBe(404);
  });
});
