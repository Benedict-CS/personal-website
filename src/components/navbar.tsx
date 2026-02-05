"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { GlobalSearch } from "@/components/global-search";

export function Navbar() {
  const { data: session } = useSession();
  const isLoggedIn = !!session;

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-200 bg-slate-50/80 backdrop-blur-sm">
      <div className="container mx-auto max-w-6xl flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="text-xl font-bold text-slate-900 hover:text-slate-700 transition-colors whitespace-nowrap"
        >
          Benedict
        </Link>
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-end">
          <GlobalSearch />
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-slate-700 hover:text-slate-900 hover:underline text-xs sm:text-sm">
              Home
            </Button>
          </Link>
          <Link href="/blog">
            <Button variant="ghost" size="sm" className="text-slate-700 hover:text-slate-900 text-xs sm:text-sm">
              Blog
            </Button>
          </Link>
          <Link href="/about">
            <Button variant="ghost" size="sm" className="text-slate-700 hover:text-slate-900 hover:underline text-xs sm:text-sm">
              About
            </Button>
          </Link>
          <Link href="/contact">
            <Button variant="ghost" size="sm" className="text-slate-700 hover:text-slate-900 hover:underline text-xs sm:text-sm">
              Contact
            </Button>
          </Link>
          {isLoggedIn && (
            <>
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="text-slate-700 hover:text-slate-900 hover:underline text-xs sm:text-sm">
                  Dashboard
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                className="text-slate-700 text-xs sm:text-sm"
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
