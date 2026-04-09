"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const STATUSES = [
  { value: "all", label: "All" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
] as const;

export function PostsFilterTabs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = (searchParams.get("status") || "all") as (typeof STATUSES)[number]["value"];
  const valid = STATUSES.some((s) => s.value === current) ? current : "all";

  return (
    <div className="flex gap-2">
      {STATUSES.map(({ value, label }) => {
        const params = new URLSearchParams(searchParams);
        if (value === "all") params.delete("status");
        else params.set("status", value);
        const href = params.toString() ? `${pathname}?${params}` : pathname;
        const isActive = valid === value;
        return (
          <Link
            key={value}
            href={href}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
