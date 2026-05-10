/**
 * True when the operator has configured Turnstile (both site key and secret).
 * When false, the sign-in flow must NOT require CAPTCHA — otherwise a soft-locked
 * IP can never log in (no widget can render, no token can satisfy the server).
 */
export function isTurnstileConfigured(): boolean {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  return Boolean(secret && siteKey);
}

/**
 * Verify Cloudflare Turnstile token server-side.
 * POST https://challenges.cloudflare.com/turnstile/v0/siteverify
 */
export async function verifyTurnstileToken(
  token: string | null | undefined,
  remoteip?: string
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return false;
  if (!token?.trim()) return false;

  const body = new URLSearchParams({
    secret,
    response: token.trim(),
    ...(remoteip && { remoteip }),
  });

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const data = (await res.json()) as { success?: boolean };
  return data.success === true;
}
