import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthOptions } from "next-auth";
import {
  getClientIP,
  assertNotLocked,
  recordFailedAttempt,
  clearAttempts,
} from "@/lib/login-rate-limit";
import { isPrivateUrl } from "@/lib/is-private-url";

type ReqLike = { headers?: Headers | Record<string, string | string[] | undefined> };

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        password: {
          label: "Password",
          type: "password",
        },
      },
      async authorize(credentials, req: ReqLike) {
        if (!credentials?.password) {
          return null;
        }

        const ip = getClientIP(req?.headers);
        assertNotLocked(ip);

        if (credentials.password === process.env.ADMIN_PASSWORD) {
          clearAttempts(ip);
          return {
            id: "1",
            name: "Benedict",
            email: "admin@example.com",
          };
        }

        recordFailedAttempt(ip);
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
