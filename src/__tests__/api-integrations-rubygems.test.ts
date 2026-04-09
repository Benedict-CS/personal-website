/**
 * @jest-environment node
 */

import { GET } from "@/app/api/integrations/rubygems/route";
import { NextRequest } from "next/server";

describe("/api/integrations/rubygems", () => {
  const origFetch = global.fetch;

  afterEach(() => {
    global.fetch = origFetch;
  });

  it("returns 400 for invalid gem name", async () => {
    const req = new NextRequest("http://localhost/api/integrations/rubygems?gem=%3Cbad%3E");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns gem metadata on success", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        name: "rails",
        version: "7.1.3",
        info: "Full-stack web framework.",
        licenses: ["MIT"],
      }),
    }) as unknown as typeof fetch;

    const req = new NextRequest("http://localhost/api/integrations/rubygems?gem=rails");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const j = (await res.json()) as Record<string, unknown>;
    expect(j.name).toBe("rails");
    expect(j.version).toBe("7.1.3");
    expect(j.description).toContain("framework");
    expect(j.license).toBe("MIT");
  });

  it("returns 404 when RubyGems responds 404", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
    }) as unknown as typeof fetch;

    const req = new NextRequest("http://localhost/api/integrations/rubygems?gem=nonexistent_gem_xyz");
    const res = await GET(req);
    expect(res.status).toBe(404);
  });
});
