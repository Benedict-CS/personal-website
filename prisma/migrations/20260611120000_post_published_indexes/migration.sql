-- Add indexes used by public blog/feed/sitemap queries.
-- All blog listings filter by published=true and order by publishedAt or pinned+publishedAt.
-- CustomPage listings filter by published=true and order by `order`.

CREATE INDEX IF NOT EXISTS "Post_published_publishedAt_idx" ON "Post"("published", "publishedAt");
CREATE INDEX IF NOT EXISTS "Post_published_pinned_publishedAt_idx" ON "Post"("published", "pinned", "publishedAt");
CREATE INDEX IF NOT EXISTS "CustomPage_published_order_idx" ON "CustomPage"("published", "order");
