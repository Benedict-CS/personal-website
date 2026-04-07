/**
 * Rate limit per IP: fixed window (first hit starts the window).
 * Prefer `checkRateLimitAsync` when REDIS_URL is set so limits are shared across instances.
 */

import { incrementWithExpiry } from "@/lib/infra/redis";

const windowSeconds = 60;
const maxPerWindow = 10;

const store = new Map<string, { count: number; resetAt: number }>();

function getKey(identifier: string, prefix: string): string {
  return `${prefix}:${identifier}`;
}

export function checkRateLimit(identifier: string, prefix: string = "default"): { ok: boolean; remaining: number } {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
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

export async function checkRateLimitAsync(
  identifier: string,
  prefix: string = "default"
): Promise<{ ok: boolean; remaining: number }> {
  const key = `rl:${prefix}:${identifier}`;
  const count = await incrementWithExpiry(key, windowSeconds);
  const remaining = Math.max(0, maxPerWindow - count);
  return { ok: count <= maxPerWindow, remaining };
}

export function getClientIP(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}
