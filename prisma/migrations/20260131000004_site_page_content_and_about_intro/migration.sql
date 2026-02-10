-- AlterTable
ALTER TABLE "AboutConfig" ADD COLUMN IF NOT EXISTS "introText" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "SitePageContent" (
    "id" TEXT NOT NULL,
    "page" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SitePageContent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "SitePageContent_page_key" ON "SitePageContent"("page");
