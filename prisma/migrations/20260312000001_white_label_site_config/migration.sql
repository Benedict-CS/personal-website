-- AlterTable: add white-label fields to SiteConfig (copyrightText, socialLinks, googleAnalyticsId, stripe keys)
ALTER TABLE "SiteConfig" ADD COLUMN IF NOT EXISTS "copyrightText" TEXT;
ALTER TABLE "SiteConfig" ADD COLUMN IF NOT EXISTS "socialLinks" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "SiteConfig" ADD COLUMN IF NOT EXISTS "googleAnalyticsId" TEXT;
ALTER TABLE "SiteConfig" ADD COLUMN IF NOT EXISTS "stripePublishableKey" TEXT;
ALTER TABLE "SiteConfig" ADD COLUMN IF NOT EXISTS "stripeSecretKey" TEXT;
