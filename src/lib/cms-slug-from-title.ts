import { normalizeSlug } from "@/lib/utils";

/**
 * Turn a post title into a URL slug (same rules as the legacy inline editors).
 * Collapses runs of hyphens so results align with {@link validateSlug}.
 */
export function slugifyPostTitle(title: string): string {
  const raw = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/_+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalizeSlug(raw);
}
