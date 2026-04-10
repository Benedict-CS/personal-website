import { NextRequest } from "next/server";
import { GET } from "@/app/api/integrations/github/route";

describe("/api/integrations/github", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it("rejects invalid usernames", async () => {
    const req = new NextRequest("https://example.test/api/integrations/github?user=bad/user");
    const res = await GET(req);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: "Invalid username" });
  });

  it("returns profile, repos, and derived language/star stats", async () => {
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            login: "octocat",
            name: "Octo Cat",
            bio: "test",
            avatar_url: "https://example.com/avatar.png",
            public_repos: 3,
            followers: 10,
            html_url: "https://github.com/octocat",
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              name: "repo-a",
              description: "A",
              html_url: "https://github.com/octocat/repo-a",
              language: "TypeScript",
              stargazers_count: 5,
              forks_count: 2,
            },
            {
              name: "repo-b",
              description: "B",
              html_url: "https://github.com/octocat/repo-b",
              language: "TypeScript",
              stargazers_count: 3,
              forks_count: 1,
            },
            {
              name: "repo-c",
              description: "C",
              html_url: "https://github.com/octocat/repo-c",
              language: "Rust",
              stargazers_count: 7,
              forks_count: 4,
            },
          ]),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              type: "PushEvent",
              repo: { name: "octocat/repo-a" },
              created_at: "2026-04-09T00:00:00.000Z",
            },
          ]),
          { status: 200 }
        )
      );

    const req = new NextRequest("https://example.test/api/integrations/github?user=octocat");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totalStars).toBe(15);
    expect(body.totalForks).toBe(7);
    expect(body.topLanguages).toEqual([
      { name: "TypeScript", reposCount: 2 },
      { name: "Rust", reposCount: 1 },
    ]);
    expect(body.recentActivity).toEqual([
      {
        type: "PushEvent",
        repo: "octocat/repo-a",
        createdAt: "2026-04-09T00:00:00.000Z",
        url: "https://github.com/octocat/repo-a",
      },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
