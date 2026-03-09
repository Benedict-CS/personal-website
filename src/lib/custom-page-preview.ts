import { createHmac, timingSafeEqual } from "crypto";

type PreviewPayload = {
  id: string;
  exp: number;
};

function base64UrlEncode(input: string): string {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (normalized.length % 4)) % 4;
  return Buffer.from(normalized + "=".repeat(padLength), "base64").toString("utf8");
}

function sign(input: string): string {
  const secret = process.env.NEXTAUTH_SECRET || "dev-preview-secret";
  return createHmac("sha256", secret).update(input).digest("base64url");
}

export function createCustomPagePreviewToken(pageId: string, ttlSeconds = 60 * 60 * 24): string {
  const payload: PreviewPayload = {
    id: pageId,
    exp: Math.floor(Date.now() / 1000) + Math.max(60, ttlSeconds),
  };
  const encoded = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
}

export function verifyCustomPagePreviewToken(token: string): PreviewPayload | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expected = sign(encoded);
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    sigBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(sigBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encoded)) as PreviewPayload;
    if (!payload?.id || typeof payload.exp !== "number") return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

