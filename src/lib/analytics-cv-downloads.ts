import {
  isLikelyOutdatedFakeUserAgent,
  isLikelyScannerUserAgent,
} from "@/lib/analytics-noise";

/** Row shape for dashboard CV download detail (PageView and/or AuditLog). */

export type CvDownloadDetailRow = {
  path: string;
  ip: string;
  country?: string | null;
  city?: string | null;
  referrer?: string | null;
  userAgent?: string | null;
  createdAt: string;
};

type PageViewCvRow = {
  path: string;
  ip: string;
  country: string | null;
  city: string | null;
  referrer: string | null;
  userAgent: string | null;
  createdAt: Date;
};

type AuditCvRow = {
  ip: string | null;
  createdAt: Date;
  details: string | null;
};

function minuteBucket(iso: string): string {
  return iso.slice(0, 16);
}

function parseAuditCvRow(row: AuditCvRow): CvDownloadDetailRow | null {
  const ip = (row.ip || "").trim();
  if (!ip || ip === "unknown") return null;
  let referrer: string | null = null;
  let userAgent: string | null = null;
  let path = "/cv.pdf";
  if (row.details) {
    try {
      const d = JSON.parse(row.details) as Record<string, unknown>;
      if (typeof d.referrer === "string") referrer = d.referrer;
      if (typeof d.userAgent === "string") userAgent = d.userAgent;
      if (typeof d.path === "string") path = d.path;
    } catch {
      // ignore malformed JSON
    }
  }
  return {
    path,
    ip,
    country: null,
    city: null,
    referrer,
    userAgent,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Merge PageView CV rows with audit events; dedupe same IP within the same minute. */
export function mergeCvDownloadDetails(
  pageViews: PageViewCvRow[],
  audits: AuditCvRow[]
): CvDownloadDetailRow[] {
  const fromPv: CvDownloadDetailRow[] = pageViews.map((r) => ({
    path: r.path,
    ip: r.ip,
    country: r.country,
    city: r.city,
    referrer: r.referrer,
    userAgent: r.userAgent,
    createdAt: r.createdAt.toISOString(),
  }));
  const fromAudit = audits.map(parseAuditCvRow).filter((r): r is CvDownloadDetailRow => r !== null);
  /** Prefer PageView rows (geo) when two events share IP + minute. */
  const byKey = new Map<string, CvDownloadDetailRow>();
  for (const row of fromAudit) {
    const key = `${row.ip}|${minuteBucket(row.createdAt)}`;
    if (!byKey.has(key)) byKey.set(key, row);
  }
  for (const row of fromPv) {
    byKey.set(`${row.ip}|${minuteBucket(row.createdAt)}`, row);
  }
  const out = Array.from(byKey.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return out.slice(0, 50);
}

/** Crawler link-preview fetches (e.g. Facebook) are not job-applicant CV downloads. */
export function isHumanCvDownloadRow(row: CvDownloadDetailRow): boolean {
  return !isLikelyScannerUserAgent(row.userAgent) && !isLikelyOutdatedFakeUserAgent(row.userAgent);
}

export type VisitorByIpRow = {
  ip: string;
  count: number;
  lastVisit?: string;
  cvDownloads: number;
};

export type CvCountByIp = {
  ip: string;
  count: number;
  lastVisit?: string;
};

/**
 * Merge page-view totals with CV counts per IP.
 * A CV download is stored as a PageView on /cv.pdf — never show 0 views with 1 CV.
 */
export function mergeVisitorByIp(
  pageViewByIp: { ip: string; count: number; lastVisit?: string }[],
  cvByIp: CvCountByIp[]
): VisitorByIpRow[] {
  const map = new Map<string, VisitorByIpRow>();
  for (const p of pageViewByIp) {
    map.set(p.ip, { ip: p.ip, count: p.count, lastVisit: p.lastVisit, cvDownloads: 0 });
  }
  for (const cv of cvByIp) {
    const existing = map.get(cv.ip);
    if (existing) {
      existing.cvDownloads = cv.count;
      if (cv.lastVisit && (!existing.lastVisit || cv.lastVisit > existing.lastVisit)) {
        existing.lastVisit = cv.lastVisit;
      }
      existing.count = Math.max(existing.count, cv.count);
    } else {
      map.set(cv.ip, {
        ip: cv.ip,
        count: cv.count,
        lastVisit: cv.lastVisit,
        cvDownloads: cv.count,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    (b.lastVisit || "").localeCompare(a.lastVisit || "")
  );
}
