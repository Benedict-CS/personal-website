-- AlterTable SiteConfig: add setupCompleted, templateId
ALTER TABLE "SiteConfig" ADD COLUMN IF NOT EXISTS "setupCompleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SiteConfig" ADD COLUMN IF NOT EXISTS "templateId" TEXT NOT NULL DEFAULT 'default';

-- CreateTable CustomPage (custom pages from dashboard, rendered at /page/[slug])
CREATE TABLE IF NOT EXISTS "CustomPage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomPage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CustomPage_slug_key" ON "CustomPage"("slug");
