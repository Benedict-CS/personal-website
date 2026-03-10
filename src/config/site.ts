import { isPrivateUrl } from "@/lib/is-private-url";

/**
 * Environment-derived base URL only. No tenant-facing constants (name, author, links).
 * All branding and meta come from SiteConfig in the database (white-label).
 */
const envSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const defaultSiteUrl = "https://example.com";
export const siteUrl =
  envSiteUrl && !isPrivateUrl(envSiteUrl) ? envSiteUrl : defaultSiteUrl;
