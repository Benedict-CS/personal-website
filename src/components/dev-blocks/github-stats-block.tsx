"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { DevBlockMutedNotice } from "@/components/dev-blocks/dev-block-muted-notice";

type GitHubPayload = {
  login: string;
  name: string | null;
  bio: string | null;
  avatarUrl: string | null;
  publicRepos: number;
  followers: number;
  htmlUrl: string;
  totalStars: number;
  totalForks: number;
  topLanguages: { name: string; reposCount: number }[];
  recentActivity: { type: string; repo: string; createdAt: string | null; url: string }[];
  repos: {
    name: string;
    description: string | null;
    htmlUrl: string;
    language: string | null;
    stargazersCount: number;
  }[];
};

export function GitHubStatsBlock({
  username,
  variant,
}: {
  username: string;
  variant: "repos" | "overview";
}) {
  const trimmed = username.trim();
  if (!trimmed) {
    return <DevBlockMutedNotice>Set a GitHub username in the block settings.</DevBlockMutedNotice>;
  }
  return <GitHubStatsInner key={trimmed} username={trimmed} variant={variant} />;
}

function GitHubStatsInner({
  username,
  variant,
}: {
  username: string;
  variant: "repos" | "overview";
}) {
  const [data, setData] = useState<GitHubPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [staleCache, setStaleCache] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const cacheKey = `github-stats-cache:${username}`;
    fetch(`/api/integrations/github?user=${encodeURIComponent(username)}`)
      .then(async (r) => {
        const j = (await r.json()) as GitHubPayload & { error?: string };
        if (!r.ok) throw new Error(j.error || "Failed to load");
        if (!cancelled) {
          setData(j);
          setErr(null);
          setStaleCache(false);
        }
        try {
          localStorage.setItem(cacheKey, JSON.stringify(j));
        } catch {
          // ignore browser storage errors
        }
      })
      .catch((e: Error) => {
        if (cancelled) return;
        try {
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            const parsed = JSON.parse(cached) as GitHubPayload;
            setData(parsed);
            setStaleCache(true);
            setErr(null);
            return;
          }
        } catch {
          // ignore cache parse failure
        }
        setErr(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [username]);

  const streakSrc = `https://github-readme-streak-stats.demolab.com/?user=${encodeURIComponent(username)}&theme=default&hide_border=true&background=FFFFFF`;

  if (!data && !err) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-[var(--elevation-1)] text-sm text-muted-foreground">
        <div className="flex items-center gap-3">
          <div className="h-[72px] w-[72px] shrink-0 rounded-full skeleton-shimmer" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-32 rounded-lg skeleton-shimmer" />
            <div className="h-4 w-24 rounded-lg skeleton-shimmer" />
            <div className="h-3 w-full max-w-xs rounded-lg skeleton-shimmer" />
          </div>
        </div>
      </div>
    );
  }
  if (err || !data) {
    return <DevBlockMutedNotice>{err || "Could not load GitHub profile."}</DevBlockMutedNotice>;
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-[var(--elevation-1)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {data.avatarUrl ? (
          <Image
            src={data.avatarUrl}
            alt=""
            width={72}
            height={72}
            className="h-[72px] w-[72px] shrink-0 rounded-full border border-border"
            unoptimized
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold text-foreground">{data.name || data.login}</h3>
          <Link href={data.htmlUrl} className="text-sm font-medium text-primary hover:underline" target="_blank" rel="noreferrer">
            @{data.login}
          </Link>
          {data.bio ? <p className="mt-2 text-sm text-muted-foreground">{data.bio}</p> : null}
          <p className="mt-2 text-xs text-muted-foreground">
            {data.publicRepos} public repos · {data.followers} followers
          </p>
        </div>
      </div>
      {staleCache ? (
        <p className="text-xs text-amber-700">
          Showing cached snapshot because the live GitHub API request failed.
        </p>
      ) : null}

      {variant === "overview" ? (
        <div className="space-y-3">
          <div className="grid gap-2.5 sm:grid-cols-3">
            <div className="rounded-lg border border-border/60 bg-muted/25 px-3 py-2.5">
              <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Stars</p>
              <p className="text-sm font-semibold tabular-nums text-foreground">{data.totalStars}</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/25 px-3 py-2.5">
              <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Forks</p>
              <p className="text-sm font-semibold tabular-nums text-foreground">{data.totalForks}</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/25 px-3 py-2.5">
              <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Top language</p>
              <p className="text-sm font-semibold text-foreground">{data.topLanguages[0]?.name ?? "n/a"}</p>
            </div>
          </div>
          {data.topLanguages.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              Languages:{" "}
              {data.topLanguages.map((lang) => `${lang.name} (${lang.reposCount})`).join(" · ")}
            </p>
          ) : null}
          {data.recentActivity.length > 0 ? (
            <div className="rounded-lg border border-border/60 bg-background p-3">
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">Recent activity</p>
              <ul className="space-y-1">
                {data.recentActivity.slice(0, 3).map((event, index) => (
                  <li key={`${event.type}-${event.repo}-${index}`} className="text-xs text-muted-foreground">
                    <Link href={event.url} target="_blank" rel="noreferrer" className="text-foreground hover:text-primary">
                      {event.type}
                    </Link>
                    {event.repo ? ` · ${event.repo}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="overflow-hidden rounded-lg border border-border/60 bg-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={streakSrc} alt="GitHub contribution streak" className="h-auto w-full max-w-full" loading="lazy" />
          </div>
        </div>
      ) : null}

      {variant === "repos" ? (
        <ul className="space-y-3">
          {data.repos.length === 0 ? (
            <li className="text-sm text-muted-foreground">No public repositories found.</li>
          ) : (
            data.repos.map((r) => (
              <li key={r.name} className="border-b border-border/70 pb-3 last:border-0 last:pb-0">
                <Link href={r.htmlUrl} className="font-medium text-foreground hover:text-primary" target="_blank" rel="noreferrer">
                  {r.name}
                </Link>
                {r.description ? <p className="mt-1 text-sm text-muted-foreground">{r.description}</p> : null}
                <p className="mt-1 text-xs text-muted-foreground">
                  {r.language ?? "—"} · ★ {r.stargazersCount}
                </p>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
