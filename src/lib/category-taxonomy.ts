export type CategoryTaxonomyNode = {
  label: string;
  slug: string;
  count: number;
  children: CategoryTaxonomyNode[];
};

type CategoryTaxonomyInput = string | { path: string; count: number };

function normalizeCategoryPath(value: string): string[] {
  return value
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function slugifySegment(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Builds a nested taxonomy tree from slash-delimited category paths.
 */
export function buildCategoryTaxonomy(paths: CategoryTaxonomyInput[]): CategoryTaxonomyNode[] {
  const roots: CategoryTaxonomyNode[] = [];
  const bySlug = new Map<string, CategoryTaxonomyNode>();

  for (const rawInput of paths) {
    const rawPath = typeof rawInput === "string" ? rawInput : rawInput.path;
    const weight = typeof rawInput === "string" ? 1 : Math.max(1, Math.floor(rawInput.count));
    if (!rawPath || !rawPath.trim()) continue;
    const segments = normalizeCategoryPath(rawPath);
    if (segments.length === 0) continue;

    let parent: CategoryTaxonomyNode | null = null;
    const slugTrail: string[] = [];
    for (const segment of segments) {
      const segmentSlug = slugifySegment(segment);
      if (!segmentSlug) continue;
      slugTrail.push(segmentSlug);
      const slug = slugTrail.join("/");

      let node = bySlug.get(slug);
      if (!node) {
        node = {
          label: segment,
          slug,
          count: 0,
          children: [],
        };
        bySlug.set(slug, node);
        if (parent) parent.children.push(node);
        else roots.push(node);
      }
      node.count += weight;
      parent = node;
    }
  }

  const sortNodes = (nodes: CategoryTaxonomyNode[]) => {
    nodes.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
    nodes.forEach((node) => sortNodes(node.children));
  };
  sortNodes(roots);
  return roots;
}
