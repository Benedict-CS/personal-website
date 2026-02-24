/**
 * In-memory rate limiter (per key, e.g. IP).
 * Resets on server restart. For production at scale, use Redis (e.g. @upstash/ratelimit).
 */

const windowMs = 60 * 1000; // 1 minute
const maxPerWindow = 10; // e.g. 10 contact submissions or 10 sign-in attempts per minute per IP

const store = new Map<string, { count: number; resetAt: number }>();

function getKey(identifier: string, prefix: string): string {
  return `${prefix}:${identifier}`;
}

export function checkRateLimit(identifier: string, prefix: string = "default"): { ok: boolean; remaining: number } {
  const now = Date.now();
  const key = getKey(identifier, prefix);
  let entry = store.get(key);
  if (!entry) {
    entry = { count: 1, resetAt: now + windowMs };
    store.set(key, entry);
    return { ok: true, remaining: maxPerWindow - 1 };
  }
  if (now >= entry.resetAt) {
    entry = { count: 1, resetAt: now + windowMs };
    store.set(key, entry);
    return { ok: true, remaining: maxPerWindow - 1 };
  }
  entry.count += 1;
  const remaining = Math.max(0, maxPerWindow - entry.count);
  return { ok: entry.count <= maxPerWindow, remaining };
}

export function getClientIP(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}
