import { NextRequest, NextResponse } from "next/server";
import { getClientIP, getAttemptCountAsync, CAPTCHA_REQUIRED_AFTER } from "@/lib/login-rate-limit";
import { isTurnstileConfigured } from "@/lib/verify-turnstile";

/**
 * GET /api/auth/captcha-required
 * Returns whether the current IP has enough failed attempts to require CAPTCHA on next login.
 * Used by the sign-in page to show Turnstile only when needed.
 *
 * If Turnstile is not configured (no NEXT_PUBLIC_TURNSTILE_SITE_KEY / TURNSTILE_SECRET_KEY)
 * always return false — otherwise the form would gate on a widget that can never render.
 */
export async function GET(request: NextRequest) {
  if (!isTurnstileConfigured()) {
    return NextResponse.json({ captchaRequired: false });
  }
  const ip = getClientIP(request.headers);
  const count = await getAttemptCountAsync(ip);
  const captchaRequired = count >= CAPTCHA_REQUIRED_AFTER;
  return NextResponse.json({ captchaRequired });
}
