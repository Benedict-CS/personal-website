/**
 * Login rate limit by IP: 3 fails -> lock 1 min, 5 fails -> 3 min, 10 fails -> 10 min.
 * Uses Redis when REDIS_URL is set (shared across instances); otherwise in-memory.
 */

import { getString, setString, deleteKey } from "@/lib/infra/redis";

const LOCK_RULES = [
  { attempts: 10, lockMinutes: 10 },
  { attempts: 5, lockMinutes: 3 },
  { attempts: 3, lockMinutes: 1 },
] as const;

interface Entry {
  count: number;
  lockedUntil: number;
}

const memoryStore = new Map<string, Entry>();

const STATE_TTL_SEC = 24 * 60 * 60;

function isRedisConfigured(): boolean {
  return Boolean(process.env.REDIS_URL?.trim());
}

function redisKey(ip: string): string {
  const safe = ip.replace(/[^a-zA-Z0-9.:_-]/g, "_").slice(0, 200);
  return `login:state:${safe}`;
}

async function readEntry(ip: string): Promise<Entry | undefined> {
  if (isRedisConfigured()) {
    const raw = await getString(redisKey(ip));
    if (!raw) return undefined;
    try {
      const e = JSON.parse(raw) as Entry;
      if (typeof e.count === "number" && typeof e.lockedUntil === "number") return e;
    } catch {
      return undefined;
    }
    return undefined;
  }
  return memoryStore.get(ip);
}

async function writeEntry(ip: string, entry: Entry): Promise<void> {
  if (isRedisConfigured()) {
    await setString(redisKey(ip), JSON.stringify(entry), STATE_TTL_SEC);
    return;
  }
  memoryStore.set(ip, entry);
}

async function removeEntry(ip: string): Promise<void> {
  if (isRedisConfigured()) {
    await deleteKey(redisKey(ip));
    return;
  }
  memoryStore.delete(ip);
}

function getLockMinutes(attemptCount: number): number {
  for (const { attempts, lockMinutes } of LOCK_RULES) {
    if (attemptCount >= attempts) return lockMinutes;
  }
  return 0;
}

export function getClientIP(headers: Headers | Record<string, string | string[] | undefined> | undefined): string {
  if (!headers) return "unknown";
  const get = (key: string) => {
    if (headers instanceof Headers) return headers.get(key) ?? undefined;
    const v = (headers as Record<string, string | string[] | undefined>)[key];
    return Array.isArray(v) ? v[0] : v;
  };
  const forwarded = get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return get("x-real-ip") ?? "unknown";
}

/** Returns remaining lock time in ms, or 0 if not locked. */
export async function getLockRemainingMsAsync(ip: string): Promise<number> {
  const entry = await readEntry(ip);
  if (!entry || entry.lockedUntil <= Date.now()) return 0;
  return entry.lockedUntil - Date.now();
}

/** Number of failed attempts for this IP when not locked (for CAPTCHA threshold). */
export const CAPTCHA_REQUIRED_AFTER = 2;

export async function getAttemptCountAsync(ip: string): Promise<number> {
  const entry = await readEntry(ip);
  if (!entry || entry.lockedUntil > Date.now()) return 0;
  return entry.count;
}

/** Throws if IP is locked. Message format: TooManyAttempts:${minutesLeft} */
export async function assertNotLockedAsync(ip: string): Promise<void> {
  const remaining = await getLockRemainingMsAsync(ip);
  if (remaining <= 0) return;
  const minutesLeft = Math.ceil(remaining / 60_000);
  throw new Error(`TooManyAttempts:${minutesLeft}`);
}

export async function recordFailedAttemptAsync(ip: string): Promise<void> {
  const now = Date.now();
  let entry = await readEntry(ip);
  if (!entry) {
    entry = { count: 0, lockedUntil: 0 };
  }
  if (entry.lockedUntil > now) return;
  entry.count += 1;
  const lockMin = getLockMinutes(entry.count);
  entry.lockedUntil = lockMin > 0 ? now + lockMin * 60 * 1000 : 0;
  await writeEntry(ip, entry);
}

export async function clearAttemptsAsync(ip: string): Promise<void> {
  await removeEntry(ip);
}
