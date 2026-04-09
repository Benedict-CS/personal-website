import { GET } from "@/app/api/integrations/github/route";
import { NextRequest } from "next/server";

describe("/api/integrations/github", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("returns 400 for invalid username", async () => {
    const req = new NextRequest("http://localhost/api/integrations/github?user=");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns profile and repos with cache header on success", async () => {
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const u = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (u.includes("/users/octocat/repos")) {
        return {
          ok: true,
          json: async () => [
            {
              name: "hello",
              description: "d",
              html_url: "https://github.com/octocat/hello",
              language: "TypeScript",
              stargazers_count: 3,
            },
          ],
        } as Response;
      }
      return {
        ok: true,
        json: async () => ({
          login: "octocat",
          name: "The Octocat",
          bio: null,
          avatar_url: "https://avatars.githubusercontent.com/u/1?v=4",
          public_repos: 9,
          followers: 100,
          html_url: "https://github.com/octocat",
        }),
      } as Response;
    });

    const req = new NextRequest("http://localhost/api/integrations/github?user=octocat");
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("s-maxage");
    const body = (await res.json()) as {
      login: string;
      repos: { name: string }[];
    };
    expect(body.login).toBe("octocat");
    expect(body.repos).toHaveLength(1);
    expect(body.repos[0].name).toBe("hello");
  });

  it("treats non-array repos payload as empty list", async () => {
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const u = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (u.includes("/repos")) {
        return { ok: true, json: async () => ({ bogus: true }) } as Response;
      }
      return {
        ok: true,
        json: async () => ({
          login: "octocat",
          name: null,
          bio: null,
          avatar_url: null,
          public_repos: 0,
          followers: 0,
          html_url: "https://github.com/octocat",
        }),
      } as Response;
    });

    const req = new NextRequest("http://localhost/api/integrations/github?user=octocat");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { repos: unknown[] };
    expect(body.repos).toEqual([]);
  });
});
