/**
 * Expands HTML comments in markdown into safe embed placeholders for developer blocks
 * (GitHub / LeetCode). Used by MarkdownRenderer for custom pages and blog posts.
 */
export function expandDevEmbeds(markdown: string): string {
  let s = markdown;
  s = s.replace(/<!--\s*embed:github:([^:]+):([^>\n]+?)\s*-->/gi, (_m, variant, user) => {
    const v = String(variant).trim().toLowerCase() === "repos" ? "repos" : "overview";
    const u = String(user).trim();
    if (!/^[\w-]{1,40}$/.test(u)) return "";
    return `<div class="dev-embed-github" data-user="${escAttr(u)}" data-variant="${escAttr(v)}"></div>`;
  });
  s = s.replace(/<!--\s*embed:leetcode:([^>\n]+?)\s*-->/gi, (_m, user) => {
    const u = String(user).trim();
    if (!/^[\w_-]{1,40}$/.test(u)) return "";
    return `<div class="dev-embed-leetcode" data-user="${escAttr(u)}"></div>`;
  });
  return s;
}

function escAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
