"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";

function resolveEditorHref(pathname: string): string | null {
  if (!pathname) return null;
  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/editor") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/s/")
  ) {
    return null;
  }
  if (pathname === "/") return "/editor/home";
  if (pathname.startsWith("/about")) return "/editor/about";
  if (pathname.startsWith("/contact")) return "/editor/contact";
  if (pathname === "/blog" || pathname.startsWith("/blog/")) return "/editor/blog";
  if (pathname.startsWith("/page/")) {
    const slug = pathname.slice("/page/".length).split("/")[0]?.trim();
    if (slug) return `/editor/page/${slug}`;
  }
  return null;
}

export function FloatingEditButton() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const editorHref = useMemo(() => resolveEditorHref(pathname || ""), [pathname]);

  if (status !== "authenticated" || !session || !editorHref) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[90] print:hidden">
      <Link href={editorHref}>
        <Button size="sm" className="h-11 rounded-full px-4 shadow-lg">
          <Pencil className="mr-1.5 h-4 w-4" />
          Edit
        </Button>
      </Link>
    </div>
  );
}
