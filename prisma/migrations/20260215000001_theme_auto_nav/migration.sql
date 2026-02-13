-- AlterTable SiteConfig: add themeMode, autoAddCustomPagesToNav
ALTER TABLE "SiteConfig" ADD COLUMN IF NOT EXISTS "themeMode" TEXT NOT NULL DEFAULT 'system';
ALTER TABLE "SiteConfig" ADD COLUMN IF NOT EXISTS "autoAddCustomPagesToNav" BOOLEAN NOT NULL DEFAULT true;
