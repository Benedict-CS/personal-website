/**
 * In-memory login rate limit by IP.
 * 3 fails -> lock 1 min, 5 fails -> 3 min, 10 fails -> 10 min.
 * Resets on successful login.
 */

const LOCK_RULES = [
  { attempts: 10, lockMinutes: 10 },
  { attempts: 5, lockMinutes: 3 },
  { attempts: 3, lockMinutes: 1 },
] as const;

interface Entry {
  count: number;
  lockedUntil: number;
}

const store = new Map<string, Entry>();

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
export function getLockRemainingMs(ip: string): number {
  const entry = store.get(ip);
  if (!entry || entry.lockedUntil <= Date.now()) return 0;
  return entry.lockedUntil - Date.now();
}

/** Throws if IP is locked. Message format: TooManyAttempts:${minutesLeft} */
export function assertNotLocked(ip: string): void {
  const remaining = getLockRemainingMs(ip);
  if (remaining <= 0) return;
  const minutesLeft = Math.ceil(remaining / 60_000);
  throw new Error(`TooManyAttempts:${minutesLeft}`);
}

export function recordFailedAttempt(ip: string): void {
  const now = Date.now();
  let entry = store.get(ip);
  if (!entry) {
    entry = { count: 0, lockedUntil: 0 };
    store.set(ip, entry);
  }
  if (entry.lockedUntil > now) return; // already locked, don't increment
  entry.count += 1;
  const lockMin = getLockMinutes(entry.count);
  entry.lockedUntil = lockMin > 0 ? now + lockMin * 60 * 1000 : 0;
}

export function clearAttempts(ip: string): void {
  store.delete(ip);
}
