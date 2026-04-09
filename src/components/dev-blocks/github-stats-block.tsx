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

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/integrations/github?user=${encodeURIComponent(username)}`)
      .then(async (r) => {
        const j = (await r.json()) as GitHubPayload & { error?: string };
        if (!r.ok) throw new Error(j.error || "Failed to load");
        if (!cancelled) setData(j);
      })
      .catch((e: Error) => {
        if (!cancelled) setErr(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [username]);

  const streakSrc = `https://github-readme-streak-stats.demolab.com/?user=${encodeURIComponent(username)}&theme=default&hide_border=true&background=FFFFFF`;

  if (!data && !err) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">Loading GitHub…</div>
    );
  }
  if (err || !data) {
    return <DevBlockMutedNotice>{err || "Could not load GitHub profile."}</DevBlockMutedNotice>;
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-[var(--shadow-sm)]">
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

      {variant === "overview" ? (
        <div className="overflow-hidden rounded-md border border-border/70 bg-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={streakSrc} alt="GitHub contribution streak" className="h-auto w-full max-w-full" loading="lazy" />
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
