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
    maxAge: 60 * 60, // 1 hour
  },
  // NextAuth sets Secure, HttpOnly, SameSite=Lax when NEXTAUTH_URL is https
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.exp = Math.floor(Date.now() / 1000) + 60 * 60;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && typeof token.exp === "number") {
        (session as { expiresAt?: number }).expiresAt = token.exp;
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
