/**
 * Rate limit per IP: fixed window (first hit starts the window).
 * Prefer `checkRateLimitAsync` when REDIS_URL is set so limits are shared across instances.
 */

import { incrementWithExpiry } from "@/lib/infra/redis";

type RateLimitProfile = {
  windowSeconds: number;
  maxPerWindow: number;
};

type RateLimitPreset = "relaxed" | "balanced" | "strict";

const DEFAULT_PRESET: RateLimitPreset = "balanced";

const PRESET_PROFILES: Record<RateLimitPreset, RateLimitProfile> = {
  relaxed: { windowSeconds: 60, maxPerWindow: 24 },
  balanced: { windowSeconds: 60, maxPerWindow: 12 },
  strict: { windowSeconds: 60, maxPerWindow: 6 },
};

const PREFIX_OVERRIDES: Record<string, Partial<Record<RateLimitPreset, RateLimitProfile>>> = {
  contact_submit: {
    relaxed: { windowSeconds: 60, maxPerWindow: 8 },
    balanced: { windowSeconds: 60, maxPerWindow: 4 },
    strict: { windowSeconds: 60, maxPerWindow: 2 },
  },
  posts_write: {
    relaxed: { windowSeconds: 60, maxPerWindow: 20 },
    balanced: { windowSeconds: 60, maxPerWindow: 10 },
    strict: { windowSeconds: 60, maxPerWindow: 5 },
  },
  posts_translate_write: {
    relaxed: { windowSeconds: 60, maxPerWindow: 8 },
    balanced: { windowSeconds: 60, maxPerWindow: 4 },
    strict: { windowSeconds: 60, maxPerWindow: 2 },
  },
  custom_pages_write: {
    relaxed: { windowSeconds: 60, maxPerWindow: 14 },
    balanced: { windowSeconds: 60, maxPerWindow: 8 },
    strict: { windowSeconds: 60, maxPerWindow: 4 },
  },
  import: {
    relaxed: { windowSeconds: 60, maxPerWindow: 6 },
    balanced: { windowSeconds: 60, maxPerWindow: 3 },
    strict: { windowSeconds: 60, maxPerWindow: 2 },
  },
  post_preview_token: {
    relaxed: { windowSeconds: 60, maxPerWindow: 12 },
    balanced: { windowSeconds: 60, maxPerWindow: 6 },
    strict: { windowSeconds: 60, maxPerWindow: 3 },
  },
  analytics_view: {
    relaxed: { windowSeconds: 60, maxPerWindow: 60 },
    balanced: { windowSeconds: 60, maxPerWindow: 30 },
    strict: { windowSeconds: 60, maxPerWindow: 15 },
  },
};

function resolvePreset(): RateLimitPreset {
  const raw = (process.env.RATE_LIMIT_POLICY_PRESET ?? "").trim().toLowerCase();
  if (raw === "relaxed" || raw === "balanced" || raw === "strict") return raw;
  return DEFAULT_PRESET;
}

export function getRateLimitProfileForPrefix(prefix: string): RateLimitProfile {
  const preset = resolvePreset();
  const override = PREFIX_OVERRIDES[prefix]?.[preset];
  return override ?? PRESET_PROFILES[preset];
}

export async function checkRateLimitAsync(
  identifier: string,
  prefix: string = "default"
): Promise<{ ok: boolean; remaining: number }> {
  const profile = getRateLimitProfileForPrefix(prefix);
  const windowSeconds = profile.windowSeconds;
  const maxPerWindow = profile.maxPerWindow;
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
