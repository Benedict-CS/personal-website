import { NextRequest, NextResponse } from "next/server";
import { getClientIP, getAttemptCountAsync, CAPTCHA_REQUIRED_AFTER } from "@/lib/login-rate-limit";

/**
 * GET /api/auth/captcha-required
 * Returns whether the current IP has enough failed attempts to require CAPTCHA on next login.
 * Used by the sign-in page to show Turnstile only when needed.
 */
export async function GET(request: NextRequest) {
  const ip = getClientIP(request.headers);
  const count = await getAttemptCountAsync(ip);
  const captchaRequired = count >= CAPTCHA_REQUIRED_AFTER;
  return NextResponse.json({ captchaRequired });
}
