import { GET } from "@/app/api/integrations/leetcode/route";
import { NextRequest } from "next/server";

describe("/api/integrations/leetcode", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("returns 400 for empty username", async () => {
    const req = new NextRequest("http://localhost/api/integrations/leetcode?user=");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns 502 when HTTP status is not ok", async () => {
    global.fetch = jest.fn(
      async () =>
        ({
          ok: false,
          status: 503,
          json: async () => ({}),
        }) as Response
    );
    const req = new NextRequest("http://localhost/api/integrations/leetcode?user=foo");
    const res = await GET(req);
    expect(res.status).toBe(502);
  });

  it("returns profile JSON with cache header on success", async () => {
    global.fetch = jest.fn(
      async () =>
        ({
          ok: true,
          json: async () => ({
            data: {
              matchedUser: {
                username: "foo",
                profile: { ranking: 1000, reputation: 42 },
                submitStats: {
                  acSubmissionNum: [{ difficulty: "All", count: 10 }],
                },
                badges: [],
              },
            },
          }),
        }) as Response
    );
    const req = new NextRequest("http://localhost/api/integrations/leetcode?user=foo");
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("s-maxage");
    const body = (await res.json()) as { username: string; totalAccepted: number };
    expect(body.username).toBe("foo");
    expect(body.totalAccepted).toBe(10);
  });
});
