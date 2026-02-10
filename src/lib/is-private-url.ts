/**
 * Returns true if the IP is localhost or a private network address.
 * Use this to skip recording analytics for VM/LAN traffic (no SNAT = private IP).
 */
export function isPrivateIP(ip: string): boolean {
  if (!ip || ip === "unknown") return false;
  const s = ip.trim().toLowerCase();
  if (s === "localhost" || s === "127.0.0.1" || s === "::1") return true;
  if (s.startsWith("10.")) return true;
  if (s.startsWith("192.168.")) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(s)) return true;
  if (s.startsWith("::ffff:") && (s.startsWith("::ffff:10.") || s.startsWith("::ffff:192.168.") || /^::ffff:172\.(1[6-9]|2\d|3[01])\./.test(s))) return true;
  return false;
}

/**
 * Returns true if the URL points to localhost or a private network address.
 * Browsers show "look for and connect to devices on your local network" when
 * a page tries to access such URLs. Use this to avoid sending private URLs
 * to the client (redirects, metadata, etc.).
 */
export function isPrivateUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") return true;
    // Private ranges: 10.x, 172.16–31.x, 192.168.x
    if (host.startsWith("10.")) return true;
    if (host.startsWith("192.168.")) return true;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return true;
    return false;
  } catch {
    return true; // invalid URL, treat as private to be safe
  }
}
