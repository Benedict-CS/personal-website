import { NextResponse } from "next/server";

const SECURITY_TXT_HEADERS = {
  "Content-Type": "text/plain; charset=utf-8",
  "Cache-Control": "public, max-age=3600",
} as const;

/**
 * RFC 9116 security.txt for responsible disclosure contact hints.
 * Set SECURITY_TXT_CONTACT (e.g. mailto:security@example.com) and optionally SECURITY_TXT_POLICY (URL).
 */
export async function HEAD() {
  return new NextResponse(null, { status: 200, headers: SECURITY_TXT_HEADERS });
}

export async function GET() {
  const contact = process.env.SECURITY_TXT_CONTACT?.trim() ?? "";
  const policy = process.env.SECURITY_TXT_POLICY?.trim() ?? "";
  const lines: string[] = [];
  if (contact) {
    lines.push(`Contact: ${contact}`);
  }
  if (policy) {
    lines.push(`Policy: ${policy}`);
  }
  lines.push("Preferred-Languages: en");
  if (!contact) {
    lines.unshift(
      "# Add SECURITY_TXT_CONTACT to your environment (e.g. mailto:you@domain) to publish a contact line."
    );
  }
  const body = `${lines.join("\n")}\n`;
  return new NextResponse(body, {
    status: 200,
    headers: SECURITY_TXT_HEADERS,
  });
}
