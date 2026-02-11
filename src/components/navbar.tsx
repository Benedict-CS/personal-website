"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { GlobalSearch } from "@/components/global-search";
import { LayoutDashboard, ExternalLink, Menu, X } from "lucide-react";
import { SessionCountdown } from "@/components/session-countdown";

export function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const isLoggedIn = !!session;
  const isDashboard = pathname?.startsWith("/dashboard");
  const expiresAt = (session as { expiresAt?: number } | null)?.expiresAt;
  const [mobileOpen, setMobileOpen] = useState(false);

  const publicLinks = (
    <>
      <Link href="/" onClick={() => setMobileOpen(false)}>
        <Button variant="ghost" size="sm" className="text-slate-700 hover:text-slate-900 hover:underline text-xs sm:text-sm w-full sm:w-auto justify-center sm:justify-start">
          Home
        </Button>
      </Link>
      <Link href="/about" onClick={() => setMobileOpen(false)}>
        <Button variant="ghost" size="sm" className="text-slate-700 hover:text-slate-900 text-xs sm:text-sm w-full sm:w-auto justify-center sm:justify-start">
          About
        </Button>
      </Link>
      <Link href="/blog" onClick={() => setMobileOpen(false)}>
        <Button variant="ghost" size="sm" className="text-slate-700 hover:text-slate-900 text-xs sm:text-sm w-full sm:w-auto justify-center sm:justify-start">
          Blog
        </Button>
      </Link>
      <Link href="/contact" onClick={() => setMobileOpen(false)}>
        <Button variant="ghost" size="sm" className="text-slate-700 hover:text-slate-900 text-xs sm:text-sm w-full sm:w-auto justify-center sm:justify-start">
          Contact
        </Button>
      </Link>
    </>
  );

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-200 bg-slate-50/95 backdrop-blur-sm">
      <div className="container mx-auto max-w-6xl flex h-14 sm:h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href={isDashboard ? "/dashboard" : "/"}
          className="text-lg sm:text-xl font-bold text-slate-900 hover:text-slate-700 transition-colors whitespace-nowrap flex items-center gap-1.5 btn-interactive"
        >
          {isDashboard && <LayoutDashboard className="h-5 w-5 shrink-0" />}
          Benedict{isDashboard ? " · Dashboard" : ""}
        </Link>
        {/* Desktop: inline links */}
        <div className="hidden sm:flex items-center gap-1 sm:gap-2 flex-wrap justify-end">
          {!isDashboard && <GlobalSearch />}
          {!isDashboard && publicLinks}
          {isLoggedIn && (
            <>
              {!isDashboard && (
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm" className="text-slate-700 hover:text-slate-900 text-xs sm:text-sm btn-interactive">
                    Dashboard
                  </Button>
                </Link>
              )}
              {isDashboard && (
                <>
                  {typeof expiresAt === "number" && <SessionCountdown expiresAt={expiresAt} />}
                  <a href="/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900 text-xs sm:text-sm btn-interactive">
                      <ExternalLink className="h-3.5 w-3.5" />
                      View site
                    </Button>
                  </a>
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                className="text-slate-700 text-xs sm:text-sm btn-interactive"
                onClick={() => {
                  signOut({ redirect: false }).then(() => {
                    window.location.href = "/";
                  });
                }}
              >
                Sign Out
              </Button>
            </>
          )}
        </div>
        {/* Mobile: hamburger + dropdown */}
        <div className="flex sm:hidden items-center gap-2">
          {!isDashboard && <GlobalSearch />}
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setMobileOpen((o) => !o)} aria-label={mobileOpen ? "Close menu" : "Open menu"}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>
      {mobileOpen && (
        <div className="sm:hidden border-t border-slate-200 bg-slate-50/98 backdrop-blur-sm dashboard-content-in">
          <div className="container mx-auto max-w-6xl px-4 py-3 flex flex-col gap-1">
            {!isDashboard && publicLinks}
            {isLoggedIn && (
              <>
                {!isDashboard && (
                  <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
                    <Button variant="ghost" size="sm" className="text-slate-700 w-full justify-center">Dashboard</Button>
                  </Link>
                )}
                {isDashboard && (
                  <a href="/" target="_blank" rel="noopener noreferrer" onClick={() => setMobileOpen(false)}>
                    <Button variant="ghost" size="sm" className="text-slate-600 w-full justify-center gap-1">
                      <ExternalLink className="h-3.5 w-3.5" /> View site
                    </Button>
                  </a>
                )}
                <Button
                variant="outline"
                size="sm"
                className="w-full justify-center"
                onClick={() => {
                  setMobileOpen(false);
                  signOut({ redirect: false }).then(() => {
                    window.location.href = "/";
                  });
                }}
              >
                  Sign Out
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
