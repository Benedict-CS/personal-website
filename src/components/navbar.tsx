"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { GlobalSearch } from "@/components/global-search";
import { ExternalLink, Menu, X } from "lucide-react";
import { SessionCountdown } from "@/components/session-countdown";
import type { SiteConfigForRender } from "@/lib/site-config";

const FALLBACK_NAME = "My Site";

const DEFAULT_NAV = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
];

export function Navbar({ siteConfig }: { siteConfig?: SiteConfigForRender | null }) {
  const siteName = siteConfig?.siteName ?? FALLBACK_NAME;
  const logoUrl = siteConfig?.logoUrl;
  const navItems = (siteConfig?.navItems?.length ? siteConfig.navItems : DEFAULT_NAV) as { label: string; href: string }[];
  const { data: session } = useSession();
  const pathname = usePathname();
  const isLoggedIn = !!session;
  const isDashboard = pathname?.startsWith("/dashboard");
  const expiresAt = (session as { expiresAt?: number } | null)?.expiresAt;
  const [mobileOpen, setMobileOpen] = useState(false);

  const publicLinks = (
    <>
      {navItems.map((item) => (
        <Link key={item.href + item.label} href={item.href} onClick={() => setMobileOpen(false)} className="block">
          <Button variant="ghost" size="sm" className="text-slate-700 hover:text-slate-900 text-xs sm:text-sm w-full sm:w-auto justify-center sm:justify-start min-h-[44px] sm:min-h-0 py-3 sm:py-0 rounded-md">
            {item.label}
          </Button>
        </Link>
      ))}
    </>
  );

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-200 bg-slate-50/95 backdrop-blur-sm">
      <div className="container mx-auto max-w-6xl flex h-14 sm:h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href={isDashboard ? "/dashboard" : "/"}
          className="text-lg sm:text-xl font-bold text-slate-900 hover:text-slate-700 transition-colors whitespace-nowrap flex items-center gap-1.5 btn-interactive"
        >
          {logoUrl ? (
            <Image src={logoUrl} alt="" width={28} height={28} className="rounded object-contain shrink-0" />
          ) : null}
          {siteName}{isDashboard ? " · Dashboard" : ""}
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
              {!isDashboard && (
                <Link href="/editor/home">
                  <Button variant="ghost" size="sm" className="text-slate-700 hover:text-slate-900 text-xs sm:text-sm btn-interactive">
                    Editor
                  </Button>
                </Link>
              )}
              {isDashboard && (
                <>
                  {typeof expiresAt === "number" && <SessionCountdown expiresAt={expiresAt} />}
                  <Link href="/" className="inline-flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900 text-xs sm:text-sm btn-interactive">
                      <ExternalLink className="h-3.5 w-3.5" />
                      View site
                    </Button>
                  </Link>
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
          <div className="container mx-auto max-w-6xl px-4 py-3 flex flex-col gap-0.5">
            {!isDashboard && publicLinks}
            {isLoggedIn && (
              <>
                {!isDashboard && (
                  <>
                    <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="block">
                      <Button variant="ghost" size="sm" className="text-slate-700 w-full justify-center min-h-[44px] py-3 rounded-md">Dashboard</Button>
                    </Link>
                    <Link href="/editor/home" onClick={() => setMobileOpen(false)} className="block">
                      <Button variant="ghost" size="sm" className="text-slate-700 w-full justify-center min-h-[44px] py-3 rounded-md">Editor</Button>
                    </Link>
                  </>
                )}
                {isDashboard && (
                  <Link href="/" onClick={() => setMobileOpen(false)} className="block">
                    <Button variant="ghost" size="sm" className="text-slate-600 w-full justify-center gap-1 min-h-[44px] py-3 rounded-md">
                      <ExternalLink className="h-3.5 w-3.5" /> View site
                    </Button>
                  </Link>
                )}
                <Button
                variant="outline"
                size="sm"
                className="w-full justify-center min-h-[44px] py-3 rounded-md"
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
