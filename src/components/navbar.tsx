"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const { data: session } = useSession();
  const isLoggedIn = !!session;

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-200 bg-slate-50/80 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="text-xl font-bold text-slate-900 hover:text-slate-700 transition-colors"
        >
          Benedict
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/">
            <Button variant="ghost" className="text-slate-700 hover:text-slate-900">
              Home
            </Button>
          </Link>
          <Link href="/blog">
            <Button variant="ghost" className="text-slate-700 hover:text-slate-900">
              Blog
            </Button>
          </Link>
          <Link href="/about">
            <Button variant="ghost" className="text-slate-700 hover:text-slate-900">
              About
            </Button>
          </Link>
          {isLoggedIn && (
            <>
              <Link href="/dashboard">
                <Button variant="ghost" className="text-slate-700 hover:text-slate-900">
                  Dashboard
                </Button>
              </Link>
              <Button
                variant="outline"
                className="text-slate-700"
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                Sign Out
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
