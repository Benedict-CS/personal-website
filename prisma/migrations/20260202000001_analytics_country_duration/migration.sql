-- AlterTable: add country and durationSeconds to PageView
ALTER TABLE "PageView" ADD COLUMN IF NOT EXISTS "country" TEXT;
ALTER TABLE "PageView" ADD COLUMN IF NOT EXISTS "durationSeconds" INTEGER;

-- CreateIndex (optional, for country aggregation)
CREATE INDEX IF NOT EXISTS "PageView_country_idx" ON "PageView"("country");
