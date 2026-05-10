"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FilePlus2 } from "lucide-react";

export function DashboardGlobalHeader() {
  const pathname = usePathname();
  const newPostActive = pathname === "/dashboard/posts/new" || pathname.startsWith("/dashboard/posts/new/");

  return (
    <div className="sticky top-14 z-20 mb-4 flex justify-end sm:top-16">
      <Button asChild size="sm" variant={newPostActive ? "default" : "outline"} className="gap-2">
        <Link href="/dashboard/posts/new">
          <FilePlus2 className="h-4 w-4" />
          New post
        </Link>
      </Button>
    </div>
  );
}
