import { isPrivateUrl } from "@/lib/is-private-url";

/**
 * Environment-derived base URL only. No hardcoded site name, author, or links.
 * Branding and meta come from SiteConfig in the database.
 */
const envSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const defaultSiteUrl = "https://example.com";
export const siteUrl =
  envSiteUrl && !isPrivateUrl(envSiteUrl) ? envSiteUrl : defaultSiteUrl;
