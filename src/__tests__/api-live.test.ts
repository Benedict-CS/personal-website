/**
 * Liveness route must stay DB-free for cheap probes.
 */
import { GET, HEAD } from "@/app/api/live/route";

describe("GET /api/live", () => {
  it("returns 200 without database access", async () => {
    const res = GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("no-store");
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, live: true });
  });
});

describe("HEAD /api/live", () => {
  it("returns 200 with no body and no-store", async () => {
    const res = HEAD();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("no-store");
    expect(await res.text()).toBe("");
  });
});
