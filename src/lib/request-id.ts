import { randomBytes } from "crypto";

const INCOMING_ID_RE = /^[a-zA-Z0-9._-]{8,128}$/;

/**
 * Reuses a client- or proxy-supplied id when valid; otherwise generates a new id.
 * Use for the x-request-id response header and log correlation (HA / multi-instance debugging).
 */
export function getOrCreateRequestId(headers: Headers): string {
  const incoming =
    headers.get("x-request-id") ||
    headers.get("x-correlation-id") ||
    headers.get("x-trace-id");
  if (incoming) {
    const t = incoming.trim();
    if (INCOMING_ID_RE.test(t)) return t;
  }
  return randomBytes(16).toString("hex");
}
