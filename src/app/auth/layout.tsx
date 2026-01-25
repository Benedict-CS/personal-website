"use client";

import { SessionProvider } from "next-auth/react";

// Auth layout without Navbar - for clean login page
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <SessionProvider>{children}</SessionProvider>
    </div>
  );
}
