import { NextRequest, NextResponse } from "next/server";
import { fetchWithRetry } from "@/lib/self-healing-fetch";

export const dynamic = "force-dynamic";

function safeNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

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
    const [profileRes, reposRes, eventsRes] = await Promise.all([
      fetchWithRetry(`https://api.github.com/users/${encodeURIComponent(user)}`, { headers }, { retries: 2, timeoutMs: 4000 }),
      fetchWithRetry(
        `https://api.github.com/users/${encodeURIComponent(user)}/repos?sort=updated&per_page=8&type=owner`,
        { headers },
        { retries: 2, timeoutMs: 4000 }
      ).catch(() => null),
      fetchWithRetry(
        `https://api.github.com/users/${encodeURIComponent(user)}/events/public?per_page=5`,
        { headers },
        { retries: 2, timeoutMs: 4000 }
      ).catch(() => null),
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
    if (reposRes?.ok) {
      try {
        const raw = (await reposRes.json()) as unknown;
        reposJson = Array.isArray(raw) ? raw : [];
      } catch {
        reposJson = [];
      }
    }
    let eventsJson: unknown[] = [];
    if (eventsRes?.ok) {
      try {
        const raw = (await eventsRes.json()) as unknown;
        eventsJson = Array.isArray(raw) ? raw : [];
      } catch {
        eventsJson = [];
      }
    }

    const repos = reposJson.map((r) => {
      const row = r as Record<string, unknown>;
      return {
        name: String(row.name ?? ""),
        description: row.description != null ? String(row.description) : null,
        htmlUrl: String(row.html_url ?? ""),
        language: row.language != null ? String(row.language) : null,
        stargazersCount: safeNumber(row.stargazers_count),
        pushedAt: row.pushed_at != null ? String(row.pushed_at) : null,
      };
    });
    const totalStars = repos.reduce((sum, repo) => sum + repo.stargazersCount, 0);
    const totalForks = reposJson.reduce<number>((sum, repo) => {
      const row = repo as Record<string, unknown>;
      return sum + safeNumber(row.forks_count);
    }, 0);
    const languageCounts = repos.reduce<Map<string, number>>((map, repo) => {
      if (!repo.language) return map;
      map.set(repo.language, (map.get(repo.language) ?? 0) + 1);
      return map;
    }, new Map());
    const topLanguages = Array.from(languageCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, reposCount]) => ({ name, reposCount }));
    const recentActivity = eventsJson.slice(0, 5).map((event) => {
      const row = event as Record<string, unknown>;
      const repoObj = row.repo as Record<string, unknown> | undefined;
      const repoName = String(repoObj?.name ?? "");
      return {
        type: String(row.type ?? "Event"),
        repo: repoName,
        createdAt: row.created_at != null ? String(row.created_at) : null,
        url: repoName ? `https://github.com/${repoName}` : `https://github.com/${user}`,
      };
    });

    const body = {
      login: String(profile.login ?? user),
      name: profile.name != null ? String(profile.name) : null,
      bio: profile.bio != null ? String(profile.bio) : null,
      avatarUrl: profile.avatar_url != null ? String(profile.avatar_url) : null,
      publicRepos: safeNumber(profile.public_repos),
      followers: safeNumber(profile.followers),
      htmlUrl: String(profile.html_url ?? `https://github.com/${user}`),
      totalStars,
      totalForks,
      topLanguages,
      recentActivity,
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
