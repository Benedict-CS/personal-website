/** Default when CV_DOWNLOAD_FILENAME is unset */
export const DEFAULT_CV_DOWNLOAD_FILENAME = "Benedict_CV.pdf";

function sanitizeFilename(raw: string): string {
  const trimmed = raw.trim().slice(0, 200);
  const safe = trimmed.replace(/[^a-zA-Z0-9._-]+/g, "_");
  const base = safe.replace(/_+/g, "_").replace(/^_|_$/g, "") || "CV";
  return base.toLowerCase().endsWith(".pdf") ? base : `${base}.pdf`;
}

/**
 * Filename for Content-Disposition and <a download>. Set CV_DOWNLOAD_FILENAME in .env (e.g. Benedict_CV.pdf).
 */
export function getCvDownloadFilename(): string {
  const fromEnv = (process.env.CV_DOWNLOAD_FILENAME || "").trim();
  if (fromEnv) return sanitizeFilename(fromEnv);
  return DEFAULT_CV_DOWNLOAD_FILENAME;
}
