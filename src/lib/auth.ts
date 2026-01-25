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
      // 確保重定向到正確的域名
      const siteUrl = process.env.NEXTAUTH_URL || baseUrl;
      // 如果是相對路徑，使用正確的 base URL
      if (url.startsWith("/")) {
        return `${siteUrl}${url}`;
      }
      // 如果 URL 屬於同一個域名，允許重定向
      if (new URL(url).origin === new URL(siteUrl).origin) {
        return url;
      }
      // 否則重定向到 base URL
      return siteUrl;
    },
  },
};
