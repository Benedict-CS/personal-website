"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import type { SiteConfigForRender } from "@/types/site";

/** Dashboard, editor, and auth use their own chrome — no public site footer. */
export function useHidePublicSiteFooter(): boolean {
  const pathname = usePathname() ?? "";
  return (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/editor") ||
    pathname.startsWith("/auth")
  );
}

export function SiteNavbar({ siteConfig }: { siteConfig: SiteConfigForRender }) {
  return <Navbar siteConfig={siteConfig} />;
}

export function SiteFooter({ siteConfig }: { siteConfig: SiteConfigForRender }) {
  if (useHidePublicSiteFooter()) return null;
  return <Footer siteConfig={siteConfig} />;
}

export function SiteMain({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const hideFooter = useHidePublicSiteFooter();
  return (
    <main
      id="main-content"
      className={cn(
        "flex flex-1 flex-col min-h-0",
        hideFooter ? "min-h-[calc(100dvh-4rem)]" : "main-fade-in",
        className
      )}
    >
      {children}
    </main>
  );
}
