import {
  siteSettingsBackupRsyncHint,
  siteSettingsHttpsWebhookHint,
  buildSiteSettingsLiveHints,
} from "@/lib/site-settings-field-hints";
import type { SiteConfigResponse } from "@/types/site";

describe("site-settings-field-hints", () => {
  it("warns when rsync field looks like HTTP", () => {
    expect(siteSettingsBackupRsyncHint("https://example.com/backup")).toContain("rsync");
    expect(siteSettingsBackupRsyncHint("user@host::module/path")).toBeNull();
  });

  it("requires https for webhook hints", () => {
    expect(siteSettingsHttpsWebhookHint("http://example.com/hook")).toContain("https");
    expect(siteSettingsHttpsWebhookHint("https://example.com/hook")).toBeNull();
  });

  it("buildSiteSettingsLiveHints aggregates fields", () => {
    const hints = buildSiteSettingsLiveHints({
      siteName: "Test",
      logoUrl: null,
      faviconUrl: null,
      metaTitle: "",
      metaDescription: null,
      metaKeywords: null,
      authorName: null,
      links: { email: "", github: "", linkedin: "" },
      socialLinks: {},
      navItems: [],
      footerText: null,
      copyrightText: null,
      ogImageUrl: null,
      googleAnalyticsId: null,
      setupCompleted: false,
      templateId: "default",
      themeMode: "light",
      autoAddCustomPagesToNav: true,
      contactEmail: null,
      contactWebhookUrl: "http://insecure.example/hook",
      backupRsyncTarget: "https://wrong.example",
      backupPostHookUrl: null,
    } as SiteConfigResponse);
    expect(hints.contactWebhookUrl).toBeTruthy();
    expect(hints.backupRsyncTarget).toBeTruthy();
  });
});
