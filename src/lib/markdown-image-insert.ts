import { altTextFromImageFilename } from "@/lib/image-alt-from-filename";
import { appendResponsiveVariantsToUrl } from "@/lib/blog-image-srcset-url";

/** Builds a markdown image line with optional WxH in the title for layout stability and optional srcset in the URL fragment. */
export function markdownImageInsert(
  url: string,
  fileName: string,
  width?: number | null,
  height?: number | null,
  variants?: Array<{ descriptor: number; url: string }> | null
): string {
  const alt = altTextFromImageFilename(fileName);
  let href = url;
  if (variants && variants.length > 0) {
    href = appendResponsiveVariantsToUrl(url, variants);
  }
  if (width && height && width > 0 && height > 0) {
    return `![${alt}](${href} "${width}x${height}")`;
  }
  return `![${alt}](${href})`;
}
