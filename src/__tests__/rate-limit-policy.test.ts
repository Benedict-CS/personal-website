import { getRateLimitProfileForPrefix } from "@/lib/rate-limit";

describe("rate limit policy presets", () => {
  const originalPreset = process.env.RATE_LIMIT_POLICY_PRESET;

  afterEach(() => {
    if (typeof originalPreset === "string") {
      process.env.RATE_LIMIT_POLICY_PRESET = originalPreset;
    } else {
      delete process.env.RATE_LIMIT_POLICY_PRESET;
    }
  });

  it("uses strict preset override for post writes", () => {
    process.env.RATE_LIMIT_POLICY_PRESET = "strict";
    const profile = getRateLimitProfileForPrefix("posts_write");
    expect(profile.maxPerWindow).toBe(5);
    expect(profile.windowSeconds).toBe(60);
  });

  it("falls back to balanced preset when env is missing", () => {
    delete process.env.RATE_LIMIT_POLICY_PRESET;
    const profile = getRateLimitProfileForPrefix("unknown_prefix");
    expect(profile.maxPerWindow).toBe(12);
    expect(profile.windowSeconds).toBe(60);
  });
});
