const SCHEDULE_MARKER = "<!-- custom-page:publish-at:";
const SCHEDULE_REGEX = /^<!--\s*custom-page:publish-at:([^\s]+)\s*-->\s*\n?/i;

export function getScheduledPublishAt(content: string): string | null {
  const match = content.match(SCHEDULE_REGEX);
  if (!match?.[1]) return null;
  const raw = match[1].trim();
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function stripScheduledPublishAt(content: string): string {
  return content.replace(SCHEDULE_REGEX, "");
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

