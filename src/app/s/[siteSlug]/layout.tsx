import { prisma } from "@/lib/prisma";

export default async function TenantSiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ siteSlug: string }>;
}) {
  const { siteSlug } = await params;
  const site = await prisma.tenantSite.findUnique({
    where: { slug: siteSlug },
    select: { defaultLocale: true },
  });
  const lang = site?.defaultLocale ?? "en";

  return (
    <div lang={lang} className="min-h-screen bg-white text-slate-900">
      {children}
    </div>
  );
}
