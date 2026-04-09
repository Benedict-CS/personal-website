import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Public GitHub user + recent repos (no token; rate limit applies).
 * GET /api/integrations/github?user=octocat
 * Optional: GITHUB_TOKEN in .env for higher rate limits.
 */
export async function GET(request: NextRequest) {
  const user = request.nextUrl.searchParams.get("user")?.trim();
  if (!user || !/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37})$/.test(user)) {
    return NextResponse.json({ error: "Invalid username" }, { status: 400 });
  }

  const headers: HeadersInit = {
    Accept: "application/vnd.github+json",
    "User-Agent": "PersonalSite-GitHubIntegration/1.0",
  };
  const token = process.env.GITHUB_TOKEN?.trim();
  if (token) {
    (headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }

  try {
    const [profileRes, reposRes] = await Promise.all([
      fetch(`https://api.github.com/users/${encodeURIComponent(user)}`, { headers }),
      fetch(
        `https://api.github.com/users/${encodeURIComponent(user)}/repos?sort=updated&per_page=8&type=owner`,
        { headers }
      ),
    ]);

    if (!profileRes.ok) {
      return NextResponse.json(
        { error: profileRes.status === 404 ? "User not found" : "GitHub API error" },
        { status: profileRes.status === 404 ? 404 : 502 }
      );
    }

    let profile: Record<string, unknown>;
    try {
      profile = (await profileRes.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Invalid GitHub response" }, { status: 502 });
    }
    if (!profile || typeof profile !== "object") {
      return NextResponse.json({ error: "Invalid GitHub response" }, { status: 502 });
    }

    let reposJson: unknown[] = [];
    if (reposRes.ok) {
      try {
        const raw = (await reposRes.json()) as unknown;
        reposJson = Array.isArray(raw) ? raw : [];
      } catch {
        reposJson = [];
      }
    }

    const repos = reposJson.map((r) => {
      const row = r as Record<string, unknown>;
      return {
        name: String(row.name ?? ""),
        description: row.description != null ? String(row.description) : null,
        htmlUrl: String(row.html_url ?? ""),
        language: row.language != null ? String(row.language) : null,
        stargazersCount: Number(row.stargazers_count ?? 0),
        pushedAt: row.pushed_at != null ? String(row.pushed_at) : null,
      };
    });

    const body = {
      login: String(profile.login ?? user),
      name: profile.name != null ? String(profile.name) : null,
      bio: profile.bio != null ? String(profile.bio) : null,
      avatarUrl: profile.avatar_url != null ? String(profile.avatar_url) : null,
      publicRepos: Number(profile.public_repos ?? 0),
      followers: Number(profile.followers ?? 0),
      htmlUrl: String(profile.html_url ?? `https://github.com/${user}`),
      repos,
    };

    return NextResponse.json(body, {
      headers: {
        "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600",
      },
    });
  } catch (e) {
    console.error("[integrations/github]", e);
    return NextResponse.json({ error: "Failed to load GitHub data" }, { status: 502 });
  }
}
