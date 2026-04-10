/**
 * Shared client-side validation for dashboard forms (light mode UI consumes string issue lists).
 */

import type { SiteConfigResponse } from "@/types/site";

const SITE_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SITE_GA4_ID_PATTERN = /^G-[A-Z0-9]{6,}$/i;

function siteIsValidWebUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function siteIsValidHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Site settings (GET/PATCH /api/site-config) — mirrors dashboard save rules.
 */
export function validateSiteSettingsForm(config: SiteConfigResponse): string[] {
  const errors: string[] = [];
  if (config.siteName.trim().length < 2) {
    errors.push("Site name must be at least 2 characters.");
  }
  const contactEmail = config.contactEmail?.trim() ?? "";
  if (contactEmail && !SITE_EMAIL_PATTERN.test(contactEmail)) {
    errors.push("Recipient email must be a valid email address.");
  }
  const webhook = config.contactWebhookUrl?.trim() ?? "";
  if (webhook && !siteIsValidHttpsUrl(webhook)) {
    errors.push("Webhook URL must use HTTPS.");
  }
  const backupHook = config.backupPostHookUrl?.trim() ?? "";
  if (backupHook && !siteIsValidHttpsUrl(backupHook)) {
    errors.push("Post-backup webhook URL must use HTTPS.");
  }
  const ga = config.googleAnalyticsId?.trim() ?? "";
  if (ga && !SITE_GA4_ID_PATTERN.test(ga)) {
    errors.push("Google Analytics ID must look like G-XXXXXXXXXX.");
  }
  const gh = config.links?.github?.trim() ?? "";
  if (gh && !siteIsValidWebUrl(gh)) {
    errors.push("GitHub URL must start with http:// or https://.");
  }
  const li = config.links?.linkedin?.trim() ?? "";
  if (li && !siteIsValidWebUrl(li)) {
    errors.push("LinkedIn URL must start with http:// or https://.");
  }
  if (Array.isArray(config.navItems)) {
    config.navItems.forEach((item, idx) => {
      const label = item.label.trim();
      const href = item.href.trim();
      if (!label) errors.push(`Navigation item #${idx + 1} is missing a label.`);
      if (!href) errors.push(`Navigation item #${idx + 1} is missing a link.`);
      if (href && !href.startsWith("/") && !siteIsValidWebUrl(href)) {
        errors.push(`Navigation item #${idx + 1} link must be an internal path or full URL.`);
      }
    });
  }
  return errors;
}

export const MEDIA_OPTIMIZE_MIN_BYTES_FLOOR = 50000;
export const MEDIA_OPTIMIZE_MIN_BYTES_CEILING = 500_000_000;

export function validateMediaOptimizePanel(optimizeMinBytes: number, optimizeMaxItems: number): string[] {
  const issues: string[] = [];
  if (!Number.isFinite(optimizeMinBytes)) {
    issues.push("Min size must be a valid number.");
  } else {
    if (!Number.isInteger(optimizeMinBytes)) {
      issues.push("Min size must be a whole number (bytes).");
    }
    if (optimizeMinBytes < MEDIA_OPTIMIZE_MIN_BYTES_FLOOR) {
      issues.push(`Min size must be at least ${MEDIA_OPTIMIZE_MIN_BYTES_FLOOR.toLocaleString("en-US")} bytes.`);
    }
    if (optimizeMinBytes > MEDIA_OPTIMIZE_MIN_BYTES_CEILING) {
      issues.push("Min size exceeds the safety cap (500 MB). Use a lower value.");
    }
  }
  if (!Number.isFinite(optimizeMaxItems) || !Number.isInteger(optimizeMaxItems)) {
    issues.push("Max items per run must be a whole number.");
  } else if (optimizeMaxItems < 1 || optimizeMaxItems > 25) {
    issues.push("Max items per run must be between 1 and 25.");
  }
  return issues;
}

export function validateBulkPostEdit(bulkEditCategory: string, bulkEditTags: string): string[] {
  const issues: string[] = [];
  const catTrim = bulkEditCategory.trim();
  if (bulkEditCategory.length > 0 && catTrim.length === 0) {
    issues.push("Category cannot be only whitespace.");
  }
  if (catTrim.length > 120) {
    issues.push("Category must be 120 characters or fewer.");
  }
  if (/[\r\n]/.test(bulkEditCategory)) {
    issues.push("Category cannot contain line breaks.");
  }
  if (bulkEditTags.trim()) {
    const segments = bulkEditTags.split(",");
    if (segments.some((s) => s.trim() === "")) {
      issues.push("Remove empty entries between commas in the tags field.");
    }
    const parts = segments.map((s) => s.trim()).filter((s) => s.length > 0);
    if (parts.length > 40) {
      issues.push("Use at most 40 comma-separated tags.");
    }
    for (const p of parts) {
      if (p.length > 64) {
        issues.push("Each tag must be 64 characters or fewer.");
        break;
      }
    }
  }
  return issues;
}
