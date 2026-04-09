import { GET, HEAD } from "@/app/api/live/route";

describe("/api/live", () => {
  it("GET returns 200 with live payload and no-store cache", async () => {
    const res = GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("no-store");
    const body = (await res.json()) as { ok?: boolean; live?: boolean };
    expect(body).toMatchObject({ ok: true, live: true });
  });

  it("HEAD returns 200 with empty body", async () => {
    const res = HEAD();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("no-store");
    const text = await res.text();
    expect(text).toBe("");
  });
});
