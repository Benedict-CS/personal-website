export type SeoIntegrityIssue = {
  level: "error" | "warning";
  code: string;
  message: string;
};

export type FeedIntegritySummary = {
  itemCount: number;
  hasAtomSelfLink: boolean;
  issues: SeoIntegrityIssue[];
};

export type SitemapIntegritySummary = {
  urlCount: number;
  hasHomeUrl: boolean;
  hasBlogUrl: boolean;
  issues: SeoIntegrityIssue[];
};

export function evaluateRssFeedXml(xml: string): FeedIntegritySummary {
  const itemCount = (xml.match(/<item>/g) ?? []).length;
  const hasAtomSelfLink = /<atom:link\b[^>]*rel="self"/i.test(xml);
  const hasChannel = /<channel>/i.test(xml);
  const issues: SeoIntegrityIssue[] = [];
  if (!hasChannel) {
    issues.push({
      level: "error",
      code: "rss_missing_channel",
      message: "RSS feed does not contain a <channel> node.",
    });
  }
  if (!hasAtomSelfLink) {
    issues.push({
      level: "warning",
      code: "rss_missing_atom_self",
      message: "RSS feed is missing atom self-link metadata.",
    });
  }
  if (itemCount === 0) {
    issues.push({
      level: "warning",
      code: "rss_empty_items",
      message: "RSS feed currently has zero <item> entries.",
    });
  }
  return { itemCount, hasAtomSelfLink, issues };
}

export function evaluateSitemapXml(xml: string, baseUrl: string): SitemapIntegritySummary {
  const urlCount = (xml.match(/<url>/g) ?? []).length;
  const homeUrl = `${baseUrl.replace(/\/$/, "")}/`;
  const blogUrl = `${baseUrl.replace(/\/$/, "")}/blog`;
  const hasUrlset = /<urlset\b/i.test(xml);
  const hasHomeUrl = xml.includes(homeUrl);
  const hasBlogUrl = xml.includes(blogUrl);
  const issues: SeoIntegrityIssue[] = [];
  if (!hasUrlset) {
    issues.push({
      level: "error",
      code: "sitemap_missing_urlset",
      message: "Sitemap does not contain a <urlset> node.",
    });
  }
  if (!hasHomeUrl) {
    issues.push({
      level: "warning",
      code: "sitemap_missing_home",
      message: "Sitemap does not include the home page URL.",
    });
  }
  if (!hasBlogUrl) {
    issues.push({
      level: "warning",
      code: "sitemap_missing_blog",
      message: "Sitemap does not include the blog index URL.",
    });
  }
  if (urlCount < 3) {
    issues.push({
      level: "warning",
      code: "sitemap_low_url_count",
      message: "Sitemap URL count is unusually low.",
    });
  }
  return { urlCount, hasHomeUrl, hasBlogUrl, issues };
}
