-- Optional comma-separated meta keywords for root layout SEO (personal brand / niche).
ALTER TABLE "SiteConfig" ADD COLUMN IF NOT EXISTS "metaKeywords" TEXT;
