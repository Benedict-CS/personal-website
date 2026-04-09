import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const QUERY = `
query userStats($username: String!) {
  matchedUser(username: $username) {
    username
    profile {
      ranking
      reputation
    }
    submitStats: submitStatsGlobal {
      acSubmissionNum {
        difficulty
        count
      }
    }
    badges {
      displayName
      icon
    }
  }
}
`;

function resolveBadgeIconUrl(icon: string | null | undefined): string | null {
  const s = icon?.trim();
  if (!s) return null;
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.startsWith("/")) return `https://leetcode.com${s}`;
  return `https://leetcode.com/${s}`;
}

/**
 * LeetCode public profile stats via official GraphQL (no auth for public data).
 * GET /api/integrations/leetcode?user=username
 */
export async function GET(request: NextRequest) {
  const user = request.nextUrl.searchParams.get("user")?.trim();
  if (!user || user.length < 1 || user.length > 40 || !/^[a-zA-Z0-9_-]+$/.test(user)) {
    return NextResponse.json({ error: "Invalid username" }, { status: 400 });
  }

  try {
    const res = await fetch("https://leetcode.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Referer: `https://leetcode.com/${encodeURIComponent(user)}/`,
        "User-Agent": "Mozilla/5.0 (compatible; PersonalSite-LeetCode/1.0)",
      },
      body: JSON.stringify({ query: QUERY, variables: { username: user } }),
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "LeetCode request failed" }, { status: 502 });
    }

    let json: {
      data?: { matchedUser?: unknown };
      errors?: { message?: string }[];
    };
    try {
      json = (await res.json()) as typeof json;
    } catch {
      return NextResponse.json({ error: "Invalid LeetCode response" }, { status: 502 });
    }

    if (json.errors?.length) {
      const msg = json.errors[0]?.message ?? "Unknown error";
      if (msg.toLowerCase().includes("does not exist")) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    const mu = json.data?.matchedUser as
      | {
          username: string;
          profile?: { ranking?: number; reputation?: number };
          submitStats?: {
            acSubmissionNum?: { difficulty: string; count: number }[];
          };
          badges?: { displayName?: string | null; icon?: string | null }[];
        }
      | null
      | undefined;

    if (!mu) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const byDifficulty: Record<string, number> = {};
    for (const row of mu.submitStats?.acSubmissionNum ?? []) {
      byDifficulty[row.difficulty] = row.count;
    }

    const totalAccepted = byDifficulty["All"] ?? 0;

    const badges = (mu.badges ?? [])
      .slice(0, 64)
      .map((b) => {
        const iconUrl = resolveBadgeIconUrl(b.icon ?? undefined);
        if (!iconUrl) return null;
        return {
          displayName: (b.displayName ?? "Badge").trim() || "Badge",
          iconUrl,
        };
      })
      .filter((b): b is { displayName: string; iconUrl: string } => b !== null);

    const body = {
      username: mu.username,
      ranking: mu.profile?.ranking ?? null,
      reputation: mu.profile?.reputation ?? null,
      solvedByDifficulty: byDifficulty,
      totalAccepted,
      badges,
      profileUrl: `https://leetcode.com/u/${encodeURIComponent(mu.username)}/`,
    };

    return NextResponse.json(body, {
      headers: {
        "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600",
      },
    });
  } catch (e) {
    console.error("[integrations/leetcode]", e);
    return NextResponse.json({ error: "Failed to load LeetCode data" }, { status: 502 });
  }
}
