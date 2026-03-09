export type VisualBlock = {
  id: string;
  type: string;
  content: Record<string, unknown>;
  styles: Record<string, unknown>;
};

export type SitePageRecord = {
  id: string;
  siteId: string;
  slug: string;
  title: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  draftBlocks: VisualBlock[];
  publishedTree: VisualBlock[];
};

