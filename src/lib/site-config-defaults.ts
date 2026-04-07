/**
 * Shared defaults for site config (safe to import from Client Components).
 * Do not import API routes or auth/redis from here.
 */
import type { NavItem } from "@/types/site";

export const DEFAULT_SITE_CONFIG_LINKS = {
  email: "",
  github: "",
  linkedin: "",
  rss: "",
} as const;

export const DEFAULT_NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
];
