"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Circle, ExternalLink } from "lucide-react";

/**
 * Shown on dashboard home after setup is complete. Guides non-technical users
 * through the next actions: edit About, add first post, add a page, view site.
 */
export function DashboardNextSteps({
  hasPosts,
  hasCustomPages,
  siteUrl,
}: {
  hasPosts: boolean;
  hasCustomPages: boolean;
  siteUrl: string;
}) {
  const steps = [
    { done: true, label: "Complete site setup (name, logo, navigation)", href: "/dashboard/setup" },
    { done: hasPosts, label: "Add your first post or page", href: "/dashboard/posts/new" },
    { done: hasCustomPages, label: "Add a custom page (e.g. Portfolio, Services)", href: "/dashboard/content/pages" },
    { done: false, label: "Edit About & Contact content", href: "/dashboard/content" },
  ];

  return (
    <Card className="border-slate-200 bg-slate-50/50">
      <CardHeader>
        <CardTitle className="text-base font-medium text-slate-800">Next steps</CardTitle>
        <p className="text-sm text-slate-600">
          Do these in any order. No code needed — just fill in the forms and click Save.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        <ul className="space-y-2">
          {steps.map((step, i) => (
            <li key={i} className="flex items-center gap-3">
              {step.done ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
              ) : (
                <Circle className="h-5 w-5 shrink-0 text-slate-300" aria-hidden />
              )}
              <Link
                href={step.href}
                className={`flex-1 text-sm ${step.done ? "text-slate-600" : "font-medium text-slate-800 hover:underline"}`}
              >
                {step.label}
              </Link>
              {!step.done && (
                <Link href={step.href}>
                  <Button variant="ghost" size="sm">
                    Go
                  </Button>
                </Link>
              )}
            </li>
          ))}
        </ul>
        {siteUrl && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <a
              href={siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900"
            >
              <ExternalLink className="h-4 w-4" />
              View your live site
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
