-- AlterTable CustomPage: add published (default true so existing pages stay public)
ALTER TABLE "CustomPage" ADD COLUMN IF NOT EXISTS "published" BOOLEAN NOT NULL DEFAULT true;
