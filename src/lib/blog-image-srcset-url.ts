/**
 * Encodes 640w / 1280w derivative URLs in the image URL fragment (fragments are not sent to the server).
 */

const FRAG_PREFIX = "rs=";

export function appendResponsiveVariantsToUrl(
  primaryUrl: string,
  variants: Array<{ descriptor: number; url: string }>
): string {
  if (!variants.length) return primaryUrl;
  const parts = variants.map((v) => `${v.descriptor}w=${encodeURIComponent(v.url)}`);
  return `${primaryUrl}#${FRAG_PREFIX}${parts.join("&")}`;
}

export type ParsedBlogImageUrl = {
  cleanSrc: string;
  srcSet?: string;
};

/**
 * Builds srcSet: derivative widths from the fragment plus the primary URL with width from title ("WxH").
 */
export function parseBlogImageUrl(src: string, titleDims?: { w: number; h: number } | null): ParsedBlogImageUrl {
  const hashIdx = src.indexOf("#");
  if (hashIdx === -1) {
    return { cleanSrc: src };
  }
  const cleanSrc = src.slice(0, hashIdx);
  const frag = src.slice(hashIdx + 1);
  if (!frag.startsWith(FRAG_PREFIX)) {
    return { cleanSrc: src };
  }
  const query = frag.slice(FRAG_PREFIX.length);
  const pairs = query.split("&").filter(Boolean);
  const chunks: string[] = [];
  for (const pair of pairs) {
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    const key = pair.slice(0, eq);
    const val = pair.slice(eq + 1);
    const mw = /^(\d+)w$/.exec(key);
    if (!mw) continue;
    const w = Number(mw[1]);
    const url = decodeURIComponent(val);
    if (url) chunks.push(`${url} ${w}w`);
  }
  const mainW =
    titleDims && titleDims.w > 0 ? Math.min(titleDims.w, 1920) : undefined;
  if (mainW && cleanSrc) {
    chunks.push(`${cleanSrc} ${mainW}w`);
  }
  if (chunks.length === 0) {
    return { cleanSrc };
  }
  return { cleanSrc, srcSet: chunks.join(", ") };
}
