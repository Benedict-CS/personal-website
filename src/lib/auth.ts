import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { NextResponse } from "next/server";
import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthOptions } from "next-auth";
import {
  getClientIP,
  assertNotLockedAsync,
  recordFailedAttemptAsync,
  clearAttemptsAsync,
  getAttemptCountAsync,
  CAPTCHA_REQUIRED_AFTER,
} from "@/lib/login-rate-limit";
import { verifyTurnstileToken } from "@/lib/verify-turnstile";
import { isPrivateUrl } from "@/lib/is-private-url";
import { encode as jwtEncode, decode as jwtDecode } from "next-auth/jwt";

const SESSION_FALLBACK_SEC = 60 * 60 * 12; // 12 hours when env is missing or invalid

/** Read at runtime (especially inside jwt encode) so SESSION_MAX_AGE_SECONDS is never stale vs module load. */
export function readSessionMaxAgeSeconds(): number {
  const raw = process.env.SESSION_MAX_AGE_SECONDS?.trim();
  if (!raw) return SESSION_FALLBACK_SEC;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return SESSION_FALLBACK_SEC;
  // Sane bounds: 5 minutes … 30 days (misconfiguration should not brick login)
  if (n < 300) return 300;
  if (n > 60 * 60 * 24 * 30) return 60 * 60 * 24 * 30;
  return n;
}

/**
 * NextAuth encrypts session JWT with `maxAge` at encode time (see next-auth/jwt encode).
 * Credentials callback calls encode({ ...jwt, token }) without re-passing maxAge; the merged `jwt.maxAge`
 * must be correct. Re-read env here so deploys / .env changes apply without relying on a frozen import.
 */
function encodeSessionJwt(
  params: Parameters<typeof jwtEncode>[0]
): ReturnType<typeof jwtEncode> {
  const maxAge = readSessionMaxAgeSeconds();
  return jwtEncode({
    ...params,
    maxAge,
  });
}

type ReqLike = { headers?: Headers | Record<string, string | string[] | undefined> };

/**
 * Use in protected API routes: get session or a 401 response.
 * Example: const auth = await requireSession(); if (auth.unauthorized) return auth.unauthorized;
 */
export async function requireSession(): Promise<
  { session: Session } | { unauthorized: NextResponse }
> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return { unauthorized: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { session };
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        password: { label: "Password", type: "password" },
        captchaToken: { label: "CAPTCHA", type: "text" },
      },
      async authorize(credentials, req: ReqLike) {
        if (!credentials?.password) return null;

        const ip = getClientIP(req?.headers);
        await assertNotLockedAsync(ip);

        const needCaptcha = (await getAttemptCountAsync(ip)) >= CAPTCHA_REQUIRED_AFTER;
        if (needCaptcha) {
          const ok = await verifyTurnstileToken(credentials.captchaToken, ip);
          if (!ok) return null; // CAPTCHA missing or invalid
        }

        if (credentials.password === process.env.ADMIN_PASSWORD) {
          await clearAttemptsAsync(ip);
          return {
            id: "1",
            name: "Administrator",
            email: "admin@example.com",
          };
        }

        await recordFailedAttemptAsync(ip);
        return null;
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "jwt",
    maxAge: readSessionMaxAgeSeconds(),
  },
  jwt: {
    maxAge: readSessionMaxAgeSeconds(),
    encode: encodeSessionJwt,
    decode: jwtDecode,
  },
  // NextAuth sets Secure, HttpOnly, SameSite=Lax when NEXTAUTH_URL is https
  callbacks: {
    async jwt({ token, user }) {
      const sec = readSessionMaxAgeSeconds();
      if (user) {
        token.exp = Math.floor(Date.now() / 1000) + sec;
      }
      return token;
    },
    async session({ session, token }) {
      if (!session.user) return session;
      const fromToken = typeof token.exp === "number" ? token.exp : undefined;
      const fromExpires =
        typeof session.expires === "string" && session.expires
          ? Math.floor(new Date(session.expires).getTime() / 1000)
          : undefined;
      const expSec = fromToken ?? fromExpires;
      if (typeof expSec === "number" && Number.isFinite(expSec)) {
        (session as { expiresAt?: number }).expiresAt = expSec;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Use NEXTAUTH_URL unless it is a private/local URL (causes browser "local network" prompt).
      let siteUrl = process.env.NEXTAUTH_URL || baseUrl || "http://localhost:3000";
      if (isPrivateUrl(siteUrl)) {
        siteUrl = baseUrl;
      }
      const origin = siteUrl.replace(/\/$/, "");
      if (url.startsWith("/")) {
        return `${origin}${url}`;
      }
      try {
        if (new URL(url).origin === new URL(origin).origin) return url;
      } catch {
        /* ignore */
      }
      return origin;
    },
  },
};
