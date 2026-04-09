import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MarkdownBodyServer } from "@/components/markdown/markdown-body-server";
import { prisma } from "@/lib/prisma";
import { verifyCustomPagePreviewToken } from "@/lib/custom-page-preview";
import { getScheduledPublishAt, stripScheduledPublishAt } from "@/lib/custom-page-schedule";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Custom Page Preview",
  robots: "noindex, nofollow",
};

type PreviewProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function CustomPagePreview({ searchParams }: PreviewProps) {
  const resolved = await searchParams;
  const token = typeof resolved?.token === "string" ? resolved.token : "";
  const payload = verifyCustomPagePreviewToken(token);
  if (!payload) notFound();

  const page = await prisma.customPage.findUnique({
    where: { id: payload.id },
    select: { id: true, slug: true, title: true, content: true, updatedAt: true },
  });
  if (!page) notFound();
  const scheduledAt = getScheduledPublishAt(page.content);
  const cleanContent = stripScheduledPublishAt(page.content);

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <Card className="shadow-[var(--elevation-2)]">
        <CardHeader>
          <div className="mb-2">
            <Badge variant="secondary" className="bg-amber-100 text-amber-800">
              Draft preview - read-only link
            </Badge>
          </div>
          <CardTitle>{page.title}</CardTitle>
          <p className="text-sm text-muted-foreground">
            Slug: /page/{page.slug} • Last updated {new Date(page.updatedAt).toLocaleString()}
            {scheduledAt ? ` • Scheduled ${new Date(scheduledAt).toLocaleString()}` : ""}
          </p>
        </CardHeader>
        <CardContent>
          <div className="prose prose-slate max-w-none">
            <MarkdownBodyServer content={cleanContent} />
          </div>
          <div className="mt-6 flex flex-wrap gap-3 border-t border-border pt-4">
            <Link href={`/editor/page/${encodeURIComponent(page.slug)}`}>
              <Button>Edit in visual editor</Button>
            </Link>
            <Link href={`/dashboard/content/pages`}>
              <Button variant="outline">Custom pages list</Button>
            </Link>
            <Link href={`/page/${encodeURIComponent(page.slug)}`}>
              <Button variant="outline">Open public page</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

