"use server";

import { auditLog } from "@/lib/audit";
import { normalizeIP } from "@/lib/analytics-excluded-ips";
import { sanitizeReferrerForAnalytics } from "@/lib/analytics-referrer";
import { getTrustedClientIp } from "@/lib/client-ip";
import type { NextRequest } from "next/server";

export type AnalyticsEventName = "CV_DOWNLOAD" | "LEAD_GENERATED";

type TrackAnalyticsEventParams = {
  request: NextRequest;
  event: AnalyticsEventName;
  details?: Record<string, unknown>;
};

function toSafeDetails(details: Record<string, unknown> | undefined): string | null {
  if (!details) return null;
  try {
    const raw = JSON.stringify(details);
    return raw.length <= 2000 ? raw : `${raw.slice(0, 1997)}...`;
  } catch {
    return null;
  }
}

function extractUtmFromReferrer(referrer: string | null): Record<string, string> {
  if (!referrer) return {};
  try {
    const url = new URL(referrer);
    const pairs = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;
    const out: Record<string, string> = {};
    for (const key of pairs) {
      const value = url.searchParams.get(key);
      if (value) out[key] = value;
    }
    return out;
  } catch {
    return {};
  }
}

function toAuditAction(event: AnalyticsEventName): "analytics.cv_download" | "analytics.lead_generated" {
  return event === "CV_DOWNLOAD" ? "analytics.cv_download" : "analytics.lead_generated";
}

/**
 * Writes conversion-like events to audit logs for analytics dashboards.
 * This function is intended to run in fire-and-forget mode from API routes.
 */
export async function trackAnalyticsEvent({
  request,
  event,
  details,
}: TrackAnalyticsEventParams): Promise<void> {
  const ipRaw = getTrustedClientIp(request);
  const ip = ipRaw ? normalizeIP(ipRaw) : null;
  const referrer = sanitizeReferrerForAnalytics(request.headers.get("referer"));
  const userAgent = request.headers.get("user-agent")?.slice(0, 256) ?? null;
  const eventDetails = {
    ...details,
    referrer,
    userAgent,
    ...extractUtmFromReferrer(referrer),
  };
  await auditLog({
    action: toAuditAction(event),
    resourceType: "analytics_event",
    details: toSafeDetails(eventDetails),
    ip,
  });
}
