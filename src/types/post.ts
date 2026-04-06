/** Post row as returned by dashboard posts list API. */
export type PostRow = {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  publishedAt?: string | null;
  viewCount?: number;
  createdAt: string;
  updatedAt: string;
  tags: { name: string; slug: string }[];
};
