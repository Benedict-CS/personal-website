import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthOptions } from "next-auth";

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
      async authorize(credentials) {
        if (!credentials?.password) {
          return null;
        }

        // 檢查密碼是否與環境變數中的 ADMIN_PASSWORD 相符
        if (credentials.password === process.env.ADMIN_PASSWORD) {
          // 密碼正確，回傳使用者物件
          return {
            id: "1",
            name: "Benedict",
            email: "admin@example.com",
          };
        }

        // 密碼錯誤
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
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Use baseUrl (actual request origin) so redirect stays on same host.
      // Fixes: on new VM via IP, sign-in no longer redirects to domain (520).
      const origin = baseUrl || process.env.NEXTAUTH_URL || "http://localhost:3000";
      if (url.startsWith("/")) {
        return `${origin.replace(/\/$/, "")}${url}`;
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
