"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DevBlockMutedNotice } from "@/components/dev-blocks/dev-block-muted-notice";

type LCPayload = {
  username: string;
  ranking: number | null;
  reputation: number | null;
  solvedByDifficulty: Record<string, number>;
  totalAccepted: number;
  badges: { displayName: string; iconUrl: string }[];
  profileUrl: string;
};

export function LeetCodeStatsBlock({ username }: { username: string }) {
  const trimmed = username.trim();
  if (!trimmed) {
    return <DevBlockMutedNotice>Set a LeetCode username in the block settings.</DevBlockMutedNotice>;
  }
  return <LeetCodeStatsInner key={trimmed} username={trimmed} />;
}

function LeetCodeStatsInner({ username }: { username: string }) {
  const [data, setData] = useState<LCPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/integrations/leetcode?user=${encodeURIComponent(username)}`)
      .then(async (r) => {
        const j = (await r.json()) as LCPayload & { error?: string };
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

  if (!data && !err) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">Loading LeetCode…</div>
    );
  }
  if (err || !data) {
    return <DevBlockMutedNotice>{err || "Could not load profile."}</DevBlockMutedNotice>;
  }

  const easy = data.solvedByDifficulty["Easy"] ?? 0;
  const medium = data.solvedByDifficulty["Medium"] ?? 0;
  const hard = data.solvedByDifficulty["Hard"] ?? 0;

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--elevation-1)]">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-semibold text-foreground">LeetCode</h3>
        <Link href={data.profileUrl} className="text-sm font-medium text-orange-600 hover:underline" target="_blank" rel="noreferrer">
          @{data.username}
        </Link>
      </div>
      <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{data.totalAccepted} solved</p>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
        <div className="rounded-md bg-emerald-50 px-2 py-2">
          <div className="text-xs font-medium text-emerald-800">Easy</div>
          <div className="font-semibold tabular-nums text-emerald-900">{easy}</div>
        </div>
        <div className="rounded-md bg-amber-50 px-2 py-2">
          <div className="text-xs font-medium text-amber-800">Medium</div>
          <div className="font-semibold tabular-nums text-amber-900">{medium}</div>
        </div>
        <div className="rounded-md bg-rose-50 px-2 py-2">
          <div className="text-xs font-medium text-rose-800">Hard</div>
          <div className="font-semibold tabular-nums text-rose-900">{hard}</div>
        </div>
      </div>
      {(data.ranking != null || data.reputation != null) && (
        <p className="mt-3 text-xs text-muted-foreground">
          {data.ranking != null ? <>Ranking #{data.ranking}</> : null}
          {data.ranking != null && data.reputation != null ? " · " : null}
          {data.reputation != null ? <>Rep {data.reputation}</> : null}
        </p>
      )}
      {data.badges.length > 0 ? (
        <div className="mt-4 border-t border-border/70 pt-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Badges</p>
          <div className="flex flex-wrap gap-2">
            {data.badges.slice(0, 20).map((b, i) => (
              // eslint-disable-next-line @next/next/no-img-element -- remote LeetCode badge assets
              <img
                key={`${i}-${b.iconUrl}`}
                src={b.iconUrl}
                alt=""
                title={b.displayName}
                width={36}
                height={36}
                className="h-9 w-9 rounded-lg border border-border bg-card object-contain p-0.5 shadow-[var(--elevation-1)]"
                loading="lazy"
              />
            ))}
          </div>
          {data.badges.length > 20 ? (
            <p className="mt-2 text-xs text-muted-foreground">
              +{data.badges.length - 20} more on{" "}
              <Link href={data.profileUrl} className="font-medium text-orange-600 hover:underline" target="_blank" rel="noreferrer">
                profile
              </Link>
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
