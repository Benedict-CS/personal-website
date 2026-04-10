import {
  MEDIA_OPTIMIZE_MIN_BYTES_FLOOR,
  validateBulkPostEdit,
  validateMediaOptimizePanel,
  validateSiteSettingsForm,
} from "@/lib/dashboard-form-validation";
import type { SiteConfigResponse } from "@/types/site";

describe("validateMediaOptimizePanel", () => {
  it("accepts defaults in range", () => {
    expect(validateMediaOptimizePanel(250000, 10)).toEqual([]);
  });

  it("rejects min below floor", () => {
    expect(validateMediaOptimizePanel(1000, 10).length).toBeGreaterThan(0);
  });

  it("rejects non-integer max items", () => {
    expect(validateMediaOptimizePanel(MEDIA_OPTIMIZE_MIN_BYTES_FLOOR, 1.5).length).toBeGreaterThan(0);
  });
});

const minimalSiteConfig = (): SiteConfigResponse => ({
  siteName: "OK",
  logoUrl: null,
  faviconUrl: null,
  metaTitle: "",
  metaDescription: null,
  metaKeywords: null,
  authorName: null,
  links: {},
  socialLinks: {},
  navItems: [{ label: "Home", href: "/" }],
  footerText: null,
  copyrightText: null,
  ogImageUrl: null,
  googleAnalyticsId: null,
  setupCompleted: true,
  templateId: "default",
  themeMode: "light",
  autoAddCustomPagesToNav: true,
  contactEmail: null,
  contactWebhookUrl: null,
  backupRsyncTarget: null,
  backupPostHookUrl: null,
});

describe("validateSiteSettingsForm", () => {
  it("accepts minimal valid config", () => {
    expect(validateSiteSettingsForm(minimalSiteConfig())).toEqual([]);
  });

  it("rejects short site name", () => {
    const c = minimalSiteConfig();
    c.siteName = "x";
    expect(validateSiteSettingsForm(c).length).toBeGreaterThan(0);
  });

  it("rejects http webhook", () => {
    const c = minimalSiteConfig();
    c.contactWebhookUrl = "http://example.com/hook";
    expect(validateSiteSettingsForm(c).some((m) => m.includes("HTTPS"))).toBe(true);
  });
});

describe("validateBulkPostEdit", () => {
  it("allows empty fields", () => {
    expect(validateBulkPostEdit("", "")).toEqual([]);
  });

  it("flags whitespace-only category when user typed spaces", () => {
    expect(validateBulkPostEdit("   ", "").length).toBeGreaterThan(0);
  });

  it("flags empty tag segments", () => {
    expect(validateBulkPostEdit("", "a,,b").length).toBeGreaterThan(0);
  });
});
