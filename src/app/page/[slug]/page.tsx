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
  const themeMatch = page.content.match(/^<!--\s*site-theme:(clean|soft|bold)\s*-->\s*\n?/i);
  const pageTheme = (themeMatch?.[1]?.toLowerCase() as "clean" | "soft" | "bold" | undefined) ?? "clean";
  const withoutTheme = themeMatch ? page.content.replace(themeMatch[0], "") : page.content;
  const brandMatch = withoutTheme.match(/^<!--\s*site-brand:(\{[\s\S]*?\})\s*-->\s*\n?/i);
  let brand = {
    brandName: "",
    brandLogoUrl: "",
    primaryColor: "#0f172a",
    accentColor: "#334155",
  };
  if (brandMatch) {
    try {
      const parsedBrand = JSON.parse(brandMatch[1]) as Partial<typeof brand>;
      brand = {
        brandName: parsedBrand.brandName ?? "",
        brandLogoUrl: parsedBrand.brandLogoUrl ?? "",
        primaryColor: parsedBrand.primaryColor ?? "#0f172a",
        accentColor: parsedBrand.accentColor ?? "#334155",
      };
    } catch {
      // Keep defaults
    }
  }
  const content = brandMatch ? withoutTheme.replace(brandMatch[0], "") : withoutTheme;

  const containerClass =
    pageTheme === "bold"
      ? "bg-slate-900 text-slate-100 border-slate-800"
      : pageTheme === "soft"
        ? "bg-slate-50 border-slate-200"
        : "bg-white border-slate-200";
  const titleClass = pageTheme === "bold" ? "text-slate-100" : "text-slate-900";

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <Card className={`shadow-lg ${containerClass}`} style={{ borderTopColor: brand.primaryColor, borderTopWidth: "3px" }}>
        <CardHeader>
          <CardTitle className={titleClass}>{page.title}</CardTitle>
          {(brand.brandName || brand.brandLogoUrl) && (
            <div className="mt-2 rounded border p-2 text-sm" style={{ borderColor: brand.accentColor, color: brand.primaryColor }}>
              <p className="font-medium">{brand.brandName || "Brand"}</p>
              {brand.brandLogoUrl && <p className="text-xs opacity-80">Logo: {brand.brandLogoUrl}</p>}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="prose prose-slate max-w-none">
            <MarkdownRenderer content={content} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
