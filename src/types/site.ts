/** Nav link: label + href */
export type NavItem = { label: string; href: string };

/** Breadcrumb segment: label, optional href (last item often has no href) */
export type BreadcrumbItem = { label: string; href?: string };

/** Social links keyed by platform (twitter, instagram, linkedin, github, youtube, etc.). */
export type SocialLinksMap = Record<string, string>;

/** Site config shape used for layout/meta (from DB or fallback). White-label: no hardcoded tenant strings. */
export type SiteConfigForRender = {
  siteName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  metaTitle: string;
  metaDescription: string | null;
  /** Comma-separated keywords for default layout metadata; omit empty. */
  metaKeywords: string | null;
  authorName: string | null;
  links: { email?: string; github?: string; linkedin?: string; rss?: string };
  socialLinks: SocialLinksMap;
  navItems: NavItem[];
  footerText: string | null;
  copyrightText: string | null;
  ogImageUrl: string | null;
  googleAnalyticsId: string | null;
  setupCompleted: boolean;
  templateId: string;
  themeMode: "light";
  url: string;
};

/** Dashboard API response for GET /api/site-config (editable site settings). */
export type SiteConfigResponse = {
  siteName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  metaTitle: string;
  metaDescription: string | null;
  /** Comma-separated keywords for default layout metadata; omit empty. */
  metaKeywords: string | null;
  authorName: string | null;
  links: { email?: string; github?: string; linkedin?: string; rss?: string };
  socialLinks: SocialLinksMap;
  navItems: NavItem[];
  footerText: string | null;
  copyrightText: string | null;
  ogImageUrl: string | null;
  googleAnalyticsId: string | null;
  setupCompleted: boolean;
  templateId: string;
  themeMode: "light";
  autoAddCustomPagesToNav: boolean;
  contactEmail?: string | null;
  /** POST JSON to this URL when a contact form is submitted (Discord, Telegram, LINE bridges). */
  contactWebhookUrl?: string | null;
  /** Optional rsync destination for scripts/backup-data.sh (e.g. user@nas::module/path/). */
  backupRsyncTarget?: string | null;
  /** Optional URL to POST JSON after a backup archive is created. */
  backupPostHookUrl?: string | null;
};
