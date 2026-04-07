import Redis from "ioredis";

type MemoryEntry = { value: number; expiresAt: number };
const memoryStore = new Map<string, MemoryEntry>();

let redisClient: Redis | null = null;

function getRedisClient(): Redis | null {
  if (redisClient) return redisClient;
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return null;
  redisClient = new Redis(redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 2,
    enableAutoPipelining: true,
  });
  redisClient.on("error", () => {
    // Fallback handled in helpers.
  });
  return redisClient;
}

export async function incrementWithExpiry(
  key: string,
  windowSeconds: number
): Promise<number> {
  const redis = getRedisClient();
  if (redis) {
    try {
      if (redis.status === "wait") await redis.connect();
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, windowSeconds);
      return count;
    } catch {
      // Fallback to memory store on transient Redis failures.
    }
  }

  const now = Date.now();
  const existing = memoryStore.get(key);
  if (!existing || existing.expiresAt <= now) {
    memoryStore.set(key, { value: 1, expiresAt: now + windowSeconds * 1000 });
    return 1;
  }
  const next = existing.value + 1;
  memoryStore.set(key, { ...existing, value: next });
  return next;
}

export async function getString(key: string): Promise<string | null> {
  const redis = getRedisClient();
  if (redis) {
    try {
      if (redis.status === "wait") await redis.connect();
      return await redis.get(key);
    } catch {
      return null;
    }
  }
  return null;
}

export async function setString(key: string, value: string, ttlSeconds?: number): Promise<void> {
  const redis = getRedisClient();
  if (redis) {
    try {
      if (redis.status === "wait") await redis.connect();
      if (ttlSeconds && ttlSeconds > 0) {
        await redis.set(key, value, "EX", ttlSeconds);
      } else {
        await redis.set(key, value);
      }
      return;
    } catch {
      // ignore; memory fallback not necessary for mapping writes
    }
  }
}

export async function deleteKey(key: string): Promise<void> {
  const redis = getRedisClient();
  if (redis) {
    try {
      if (redis.status === "wait") await redis.connect();
      await redis.del(key);
    } catch {
      /* ignore */
    }
  }
}

