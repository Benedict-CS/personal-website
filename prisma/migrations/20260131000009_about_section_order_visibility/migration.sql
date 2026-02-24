-- AlterTable
ALTER TABLE "AboutConfig" ADD COLUMN "sectionOrder" TEXT NOT NULL DEFAULT '["education","experience","projects","skills","achievements"]';
ALTER TABLE "AboutConfig" ADD COLUMN "sectionVisibility" TEXT NOT NULL DEFAULT '{}';
