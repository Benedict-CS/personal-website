import Link from "next/link";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <h1 className="mb-2 text-4xl font-bold text-slate-900">404</h1>
      <p className="mb-6 text-slate-600">This page could not be found.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/">Home</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/blog">Blog</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/about">About</Link>
        </Button>
      </div>
      <p className="mt-8 text-sm text-slate-500">
        {siteConfig.name} · {siteConfig.url}
      </p>
    </div>
  );
}
