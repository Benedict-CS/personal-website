-- AlterTable: add navItems, footerText, ogImageUrl to SiteConfig
ALTER TABLE "SiteConfig" ADD COLUMN IF NOT EXISTS "navItems" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "SiteConfig" ADD COLUMN IF NOT EXISTS "footerText" TEXT;
ALTER TABLE "SiteConfig" ADD COLUMN IF NOT EXISTS "ogImageUrl" TEXT;
