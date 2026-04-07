"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { GlobalSearch } from "@/components/global-search";
import { ExternalLink, Menu, X } from "lucide-react";
import { SessionCountdown } from "@/components/session-countdown";
import type { SiteConfigForRender } from "@/lib/site-config";

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

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
  const isEditor = pathname?.startsWith("/editor");
  const expiresAt = (session as { expiresAt?: number } | null)?.expiresAt;
  const [mobileOpen, setMobileOpen] = useState(false);
  const mapToEditorHref = (href: string): string => {
    if (href === "/") return "/editor/home";
    if (href === "/about") return "/editor/about";
    if (href === "/contact") return "/editor/contact";
    if (href.startsWith("/page/")) return `/editor/page/${href.slice("/page/".length)}`;
    if (href === "/blog") return "/editor/blog";
    return href;
  };

  const publicLinks = (
    <>
      {navItems.map((item) => {
        const href = isEditor ? mapToEditorHref(item.href) : item.href;
        const active = !isEditor && !isDashboard && isActivePath(pathname ?? "", item.href);
        return (
          <Link key={item.href + item.label} href={href} onClick={() => setMobileOpen(false)} className="block">
            <Button
              variant="ghost"
              size="sm"
              className={`text-xs sm:text-sm w-full sm:w-auto justify-center sm:justify-start min-h-[44px] sm:min-h-0 py-3 sm:py-0 rounded-lg transition-colors duration-200 ${
                active
                  ? "text-[var(--primary)] font-medium bg-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--primary)]"
                  : "text-[var(--foreground)] hover:text-[var(--primary)] hover:bg-[var(--accent)]/60"
              }`}
            >
              {item.label}
            </Button>
          </Link>
        );
      })}
    </>
  );

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-[var(--border)] bg-[var(--glass-bg)] backdrop-blur-md shadow-[var(--shadow-sm)]">
      <div className="container mx-auto max-w-6xl flex h-14 sm:h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href={isDashboard ? "/dashboard/analytics" : isEditor ? "/editor/home" : "/"}
          data-editor-site="navbar.brand"
          className="text-lg sm:text-xl font-bold text-[var(--foreground)] hover:text-[var(--primary)] transition-colors duration-200 whitespace-nowrap flex items-center gap-1.5"
        >
          {logoUrl ? (
            <Image src={logoUrl} alt="" width={28} height={28} data-editor-site-logo className="rounded object-contain shrink-0" />
          ) : null}
          <span data-editor-site-label>{siteName}</span>
          {isDashboard ? " · Dashboard" : isEditor ? " · Editor" : ""}
        </Link>
        {/* Desktop: inline links */}
        <div className="hidden sm:flex items-center gap-1 sm:gap-2 flex-wrap justify-end">
          {!isDashboard && !isEditor && <GlobalSearch />}
          {!isDashboard && publicLinks}
          {isLoggedIn && (
            <>
              {!isDashboard && (
                <Link href="/dashboard/analytics">
                  <Button variant="ghost" size="sm" className="text-[var(--foreground)] hover:text-[var(--primary)] hover:bg-[var(--accent)]/60 text-xs sm:text-sm rounded-lg transition-colors duration-200">
                    Dashboard
                  </Button>
                </Link>
              )}
              {isDashboard && (
                <>
                  {typeof expiresAt === "number" && <SessionCountdown expiresAt={expiresAt} />}
                  <Link href="/" className="inline-flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)]/60 text-xs sm:text-sm rounded-lg transition-colors duration-200">
                      <ExternalLink className="h-3.5 w-3.5" />
                      View site
                    </Button>
                  </Link>
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                className="text-[var(--foreground)] text-xs sm:text-sm rounded-lg transition-colors duration-200"
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
          {!isDashboard && !isEditor && <GlobalSearch />}
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-[var(--foreground)]" onClick={() => setMobileOpen((o) => !o)} aria-label={mobileOpen ? "Close menu" : "Open menu"} aria-expanded={mobileOpen}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="sm:hidden overflow-hidden border-t border-[var(--border)] bg-[var(--glass-bg)] backdrop-blur-md"
          >
            <div className="container mx-auto max-w-6xl px-4 py-3 flex flex-col gap-0.5">
              {!isDashboard && publicLinks}
              {isLoggedIn && (
                <>
                  {!isDashboard && (
                    <Link href="/dashboard/analytics" onClick={() => setMobileOpen(false)} className="block">
                      <Button variant="ghost" size="sm" className="text-[var(--foreground)] hover:bg-[var(--accent)]/60 w-full justify-center min-h-[44px] py-3 rounded-lg transition-colors duration-200">Dashboard</Button>
                    </Link>
                  )}
                  {isDashboard && (
                    <Link href="/" onClick={() => setMobileOpen(false)} className="block">
                      <Button variant="ghost" size="sm" className="text-[var(--muted-foreground)] hover:bg-[var(--accent)]/60 w-full justify-center gap-1 min-h-[44px] py-3 rounded-lg transition-colors duration-200">
                        <ExternalLink className="h-3.5 w-3.5" /> View site
                      </Button>
                    </Link>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-center min-h-[44px] py-3 rounded-lg text-[var(--foreground)]"
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
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
