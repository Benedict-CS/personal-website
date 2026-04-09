import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getSiteConfigForRender } from "@/lib/site-config";
import { Search, Home, BookOpen, User, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default async function NotFound() {
  let label = "Site";
  let baseUrl = "";
  try {
    const config = await getSiteConfigForRender();
    label = config.siteName?.trim() || "Site";
    baseUrl = config.url ?? "";
  } catch {
    /* Config failures must not break the 404 page. */
  }
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 container-narrow">
      <p className="mb-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">Page not found</p>
      <h1 className="mb-2 text-6xl font-bold text-foreground">404</h1>
      <p className="mb-8 max-w-md text-center text-muted-foreground">
        The page you’re looking for doesn’t exist or was moved.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild className="gap-2">
          <Link href="/">
            <Home className="h-4 w-4" />
            Home
          </Link>
        </Button>
        <Button variant="outline" asChild className="gap-2">
          <Link href="/blog">
            <BookOpen className="h-4 w-4" />
            Blog
          </Link>
        </Button>
        <Button variant="outline" asChild className="gap-2">
          <Link href="/about">
            <User className="h-4 w-4" />
            About
          </Link>
        </Button>
        <Button variant="outline" asChild className="gap-2">
          <Link href="/contact">
            <Mail className="h-4 w-4" />
            Contact
          </Link>
        </Button>
        <Button variant="outline" asChild className="gap-2">
          <Link href="/?search=open">
            <Search className="h-4 w-4" />
            Search site
          </Link>
        </Button>
      </div>
      <p className="mt-10 text-sm text-muted-foreground">
        {label}
        {baseUrl ? ` · ${baseUrl}` : null}
      </p>
    </div>
  );
}
