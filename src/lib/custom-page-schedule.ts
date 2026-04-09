const SCHEDULE_MARKER = "<!-- custom-page:publish-at:";
const SCHEDULE_REGEX = /^<!--\s*custom-page:publish-at:([^\s]+)\s*-->\s*\n?/i;

export function getScheduledPublishAt(content: string | null | undefined): string | null {
  const c = typeof content === "string" ? content : "";
  const match = c.match(SCHEDULE_REGEX);
  if (!match?.[1]) return null;
  const raw = match[1].trim();
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function stripScheduledPublishAt(content: string): string {
  return content.replace(SCHEDULE_REGEX, "");
}

const THEME_HINT = /^<!--\s*site-theme:(clean|soft|bold)\s*-->\s*\n?/i;
const BRAND_HINT = /^<!--\s*site-brand:(\{[\s\S]*?\})\s*-->\s*\n?/i;

/** Strips schedule, theme, and brand hints so Markdown-derived SEO snippets start with real content. */
export function stripCustomPageDecoratorsForSeo(content: string): string {
  let c = stripScheduledPublishAt(content);
  c = c.replace(THEME_HINT, "");
  c = c.replace(BRAND_HINT, "");
  return c;
}

export function setScheduledPublishAt(content: string, isoOrNull: string | null): string {
  const body = stripScheduledPublishAt(content);
  if (!isoOrNull) return body;
  const date = new Date(isoOrNull);
  if (Number.isNaN(date.getTime())) return body;
  return `${SCHEDULE_MARKER}${date.toISOString()} -->\n${body}`;
}

export function isScheduledLive(content: string, now = new Date()): boolean {
  const scheduled = getScheduledPublishAt(content);
  if (!scheduled) return false;
  return new Date(scheduled).getTime() <= now.getTime();
}

/**
 * Matches public route logic for `/page/[slug]`: published pages, or drafts that became
 * visible because their scheduled publish time has passed.
 */
export function isCustomPagePublicOnSite(published: boolean | null | undefined, content: string): boolean {
  return (published ?? true) || isScheduledLive(content);
}

