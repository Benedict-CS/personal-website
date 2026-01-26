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
      // Redirect 以 NEXTAUTH_URL 為準。新 VM 測試時 .env 設 NEXTAUTH_URL=http://新VM的IP:3000 即可避免 520。
      const siteUrl = process.env.NEXTAUTH_URL || baseUrl || "http://localhost:3000";
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
