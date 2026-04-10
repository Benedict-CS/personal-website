import type { SiteConfigResponse } from "@/types/site";

/**
 * Non-blocking hints for Site settings inputs (save still uses validateSiteSettingsForm).
 */
export function siteSettingsBackupRsyncHint(value: string | null | undefined): string | null {
  const v = value?.trim() ?? "";
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) {
    return "This field expects an rsync destination (e.g. user@host:/path or host::module), not an HTTP URL.";
  }
  return null;
}

export function siteSettingsHttpsWebhookHint(value: string | null | undefined): string | null {
  const v = value?.trim() ?? "";
  if (!v) return null;
  try {
    const u = new URL(v);
    if (u.protocol !== "https:") {
      return "Use https:// for webhooks so payloads are not sent in clear text.";
    }
  } catch {
    return "Enter a full URL starting with https://";
  }
  return null;
}

export type SiteSettingsLiveHints = {
  contactWebhookUrl: string | null;
  backupPostHookUrl: string | null;
  backupRsyncTarget: string | null;
};

export function buildSiteSettingsLiveHints(config: SiteConfigResponse): SiteSettingsLiveHints {
  return {
    contactWebhookUrl: siteSettingsHttpsWebhookHint(config.contactWebhookUrl),
    backupPostHookUrl: siteSettingsHttpsWebhookHint(config.backupPostHookUrl),
    backupRsyncTarget: siteSettingsBackupRsyncHint(config.backupRsyncTarget),
  };
}
