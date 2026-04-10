import type { SiteConfigForRender } from "@/types/site";

/**
 * Site-wide structured data for search engines (WebSite + publisher).
 */
export function JsonLdRoot({ config }: { config: SiteConfigForRender }) {
  const base = config.url.replace(/\/$/, "");
  const name = (config.metaTitle || config.siteName).trim();
  const desc = config.metaDescription?.trim();

  const sameAs = [
    config.links?.github,
    config.links?.linkedin,
    ...Object.values(config.socialLinks ?? {}),
  ].filter((u): u is string => typeof u === "string" && /^https?:\/\//i.test(u));

  const uniqueSameAs = [...new Set(sameAs)];

  const publisherType = config.authorName?.trim() ? "Person" : "Organization";
  const publisherName = config.authorName?.trim() || config.siteName;

  const logoRaw = config.logoUrl || config.ogImageUrl;
  const logoUrl =
    logoRaw &&
    (logoRaw.startsWith("http") ? logoRaw : new URL(logoRaw, `${base}/`).toString());

  const publisher: Record<string, unknown> = {
    "@type": publisherType,
    "@id": `${base}/#publisher`,
    name: publisherName,
    url: base,
  };
  if (uniqueSameAs.length > 0) {
    publisher.sameAs = uniqueSameAs;
  }
  if (publisherType === "Organization" && logoUrl) {
    publisher.logo = { "@type": "ImageObject", url: logoUrl };
  }
  if (publisherType === "Person" && logoUrl) {
    publisher.image = { "@type": "ImageObject", url: logoUrl };
  }

  const website: Record<string, unknown> = {
    "@type": "WebSite",
    "@id": `${base}/#website`,
    url: base,
    name,
    inLanguage: "en",
    publisher: { "@id": `${base}/#publisher` },
  };
  if (desc) {
    website.description = desc;
  }

  const graph = {
    "@context": "https://schema.org",
    "@graph": [website, publisher],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
