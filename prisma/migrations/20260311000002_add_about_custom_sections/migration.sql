-- Add customizable section payloads for About page.
ALTER TABLE "AboutConfig"
ADD COLUMN IF NOT EXISTS "customSections" TEXT NOT NULL DEFAULT '[]';
