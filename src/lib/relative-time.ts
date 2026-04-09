const relativeTimeFormatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/**
 * Human-readable offset from a reference instant (default: now), e.g. "3 days ago".
 * Uses en + Intl.RelativeTimeFormat; pass `nowMs` in tests for deterministic output.
 */
export function formatRelativeTime(iso: string, nowMs: number = Date.now()): string {
  const date = new Date(iso);
  const diffSec = (date.getTime() - nowMs) / 1000;
  const diffMin = diffSec / 60;
  const diffHour = diffMin / 60;
  const diffDay = diffHour / 24;
  const diffWeek = diffDay / 7;
  const diffMonth = diffDay / 30;
  const diffYear = diffDay / 365;

  if (Math.abs(diffSec) < 60) return relativeTimeFormatter.format(Math.round(diffSec), "second");
  if (Math.abs(diffMin) < 60) return relativeTimeFormatter.format(Math.round(diffMin), "minute");
  if (Math.abs(diffHour) < 24) return relativeTimeFormatter.format(Math.round(diffHour), "hour");
  if (Math.abs(diffDay) < 7) return relativeTimeFormatter.format(Math.round(diffDay), "day");
  if (Math.abs(diffWeek) < 4) return relativeTimeFormatter.format(Math.round(diffWeek), "week");
  if (Math.abs(diffMonth) < 12) return relativeTimeFormatter.format(Math.round(diffMonth), "month");
  return relativeTimeFormatter.format(Math.round(diffYear), "year");
}

/** Fixed locale string for tooltips (medium date + short time). */
export function formatAbsoluteDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
