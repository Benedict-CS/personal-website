-- Add volunteer blocks to AboutConfig and update default section order.
ALTER TABLE "AboutConfig"
ADD COLUMN IF NOT EXISTS "volunteerBlocks" TEXT NOT NULL DEFAULT '[]';

ALTER TABLE "AboutConfig"
ALTER COLUMN "sectionOrder" SET DEFAULT '["education","experience","volunteer","projects","skills","achievements"]';
