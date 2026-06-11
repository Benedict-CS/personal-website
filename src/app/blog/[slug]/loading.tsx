import { Card, CardContent } from "@/components/ui/card";
import { publicWidePageContainerClassName } from "@/components/public/public-layout";

/**
 * Minimal skeleton matching the blog post detail page layout.
 * Mirrors the two-column (article + TOC sidebar) structure of page.tsx.
 */
export default function Loading() {
  return (
    <div className={`${publicWidePageContainerClassName} py-8 sm:py-10 lg:py-12`}>
      {/* Breadcrumbs row */}
      <div className="mb-6 h-4 w-48 animate-pulse rounded bg-muted" />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_260px] lg:gap-12">
        {/* Main content column */}
        <div className="order-2 min-w-0 lg:order-1">
          <Card className="overflow-hidden">
            <CardContent className="px-4 pt-6 pb-8 sm:px-6 sm:pt-8 sm:pb-10 lg:px-8">
              <div className="space-y-8">
                {/* Header: title + meta + tags */}
                <header className="space-y-3">
                  <div className="h-9 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <div className="h-5 w-14 animate-pulse rounded-full bg-muted" />
                    <div className="h-5 w-20 animate-pulse rounded-full bg-muted" />
                    <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
                  </div>
                </header>

                {/* Article body */}
                <div className="prose-reading mx-auto w-full max-w-[70ch] space-y-4">
                  <div className="h-4 w-full animate-pulse rounded bg-muted" />
                  <div className="h-4 w-[95%] animate-pulse rounded bg-muted" />
                  <div className="h-4 w-[90%] animate-pulse rounded bg-muted" />
                  <div className="h-4 w-[97%] animate-pulse rounded bg-muted" />
                  <div className="h-4 w-[85%] animate-pulse rounded bg-muted" />
                  <div className="h-4 w-[92%] animate-pulse rounded bg-muted" />
                  <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* TOC sidebar */}
        <aside className="order-1 w-full lg:sticky lg:top-20 lg:order-2 lg:w-[260px] lg:self-start">
          <div className="space-y-3">
            <div className="h-3 w-24 animate-pulse rounded bg-muted" />
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
            <div className="h-4 w-4/6 animate-pulse rounded bg-muted" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
          </div>
        </aside>
      </div>
    </div>
  );
}
