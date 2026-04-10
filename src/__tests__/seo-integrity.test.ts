import { evaluateRssFeedXml, evaluateSitemapXml } from "@/lib/seo-integrity";

describe("seo-integrity", () => {
  it("extracts rss integrity metrics", () => {
    const result = evaluateRssFeedXml(`
      <rss>
        <channel>
          <atom:link rel="self" />
          <item></item>
          <item></item>
        </channel>
      </rss>
    `);
    expect(result.itemCount).toBe(2);
    expect(result.hasAtomSelfLink).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("extracts sitemap integrity metrics", () => {
    const result = evaluateSitemapXml(
      `
      <urlset>
        <url><loc>https://example.com/</loc></url>
        <url><loc>https://example.com/blog</loc></url>
        <url><loc>https://example.com/about</loc></url>
      </urlset>
      `,
      "https://example.com"
    );
    expect(result.urlCount).toBe(3);
    expect(result.hasHomeUrl).toBe(true);
    expect(result.hasBlogUrl).toBe(true);
    expect(result.issues).toHaveLength(0);
  });
});
