import Link from "next/link";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { Search, Home, BookOpen, User, Mail } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 container-narrow">
      <p className="mb-2 text-sm font-medium uppercase tracking-wider text-slate-500">Page not found</p>
      <h1 className="mb-2 text-6xl font-bold text-slate-900">404</h1>
      <p className="mb-8 text-slate-600 max-w-md text-center">The page you’re looking for doesn’t exist or was moved.</p>
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
          <Link href="/blog?search=1">
            <Search className="h-4 w-4" />
            Search
          </Link>
        </Button>
      </div>
      <p className="mt-10 text-sm text-slate-500">
        {siteConfig.name} · {siteConfig.url}
      </p>
    </div>
  );
}
