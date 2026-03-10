import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { BreadcrumbItem } from "@/types/site";

export type { BreadcrumbItem } from "@/types/site";

export function PublicBreadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  if (items.length === 0) return null;
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-[var(--muted-foreground)]">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]/70" aria-hidden />}
            {item.href ? (
              <Link href={item.href} className="hover:text-[var(--foreground)] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded transition-colors duration-150">
                {item.label}
              </Link>
            ) : (
              <span className="font-medium text-[var(--foreground)]">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
