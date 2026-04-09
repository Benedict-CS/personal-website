/**
 * Platform i18n: dashboard SaaS builder and tenant storefronts.
 * All user-facing copy for these dictionaries stays in English by default; additional
 * locales are for routing, html[lang], and future translated strings.
 */

export const PLATFORM_DEFAULT_LOCALE = "en";

/** BCP 47 tags supported for cookie negotiation and TenantSite.defaultLocale. */
export const PLATFORM_LOCALES = ["en", "es", "de", "ja"] as const;

export type PlatformLocale = (typeof PLATFORM_LOCALES)[number];

export const SAAS_LOCALE_COOKIE = "saas_locale";

export function isPlatformLocale(value: string | undefined | null): value is PlatformLocale {
  return !!value && (PLATFORM_LOCALES as readonly string[]).includes(value);
}

/**
 * Pick best locale from Accept-Language (first matching prefix).
 */
export function negotiatePlatformLocale(acceptLanguage: string | null): PlatformLocale {
  if (!acceptLanguage || !acceptLanguage.trim()) return PLATFORM_DEFAULT_LOCALE;
  const parts = acceptLanguage.split(",").map((p) => p.trim().split(";")[0]?.toLowerCase() ?? "");
  for (const part of parts) {
    const short = part.split("-")[0];
    if (isPlatformLocale(short)) return short;
    if (isPlatformLocale(part)) return part;
  }
  return PLATFORM_DEFAULT_LOCALE;
}
