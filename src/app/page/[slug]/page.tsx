import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSiteConfigForRender } from "@/lib/site-config";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await prisma.customPage.findFirst({
    where: { slug: slug.toLowerCase().trim(), published: true },
    select: { title: true },
  });
  if (!page) return { title: "Not Found" };
  const config = await getSiteConfigForRender();
  return {
    title: page.title,
    openGraph: {
      title: page.title,
      url: `${config.url}/page/${slug}`,
    },
  };
}

export default async function CustomPageRoute({ params }: Props) {
  const { slug } = await params;
  const page = await prisma.customPage.findFirst({
    where: { slug: slug.toLowerCase().trim(), published: true },
  });
  if (!page) notFound();

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-slate-900">{page.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-slate max-w-none">
            <MarkdownRenderer content={page.content} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
