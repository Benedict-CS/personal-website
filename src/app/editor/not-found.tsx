import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, PenSquare, Home } from "lucide-react";

export const metadata: Metadata = {
  title: "Editor route not found",
  robots: { index: false, follow: false },
};

/**
 * Editor-specific 404. The default 404 page sends visitors back to public routes (`/blog`,
 * `/about`, etc.) which is wrong when an admin landed on an unknown editor URL — those bounce
 * the operator out of authoring context. Surface editor-aware recovery options instead so the
 * "frequent 404s in the editor" complaint stops sending the user to the public site.
 */
export default function EditorNotFound() {
  return (
    <div className="flex min-h-[65vh] flex-col items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-[var(--elevation-1)]">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Editor</p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-foreground">Editor route not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          That editor URL does not exist. Editor surfaces are{" "}
          <code className="font-mono">/editor/home</code>, <code className="font-mono">/editor/about</code>,{" "}
          <code className="font-mono">/editor/blog</code>, <code className="font-mono">/editor/contact</code>, and{" "}
          <code className="font-mono">/editor/page/&lt;slug&gt;</code>.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild className="gap-2">
            <Link href="/editor/home">
              <PenSquare className="h-4 w-4" />
              Home editor
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/dashboard">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/">
              <Home className="h-4 w-4" />
              Public site
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
