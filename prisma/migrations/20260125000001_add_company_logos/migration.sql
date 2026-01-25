-- Add companyLogos column to AboutConfig table
ALTER TABLE "AboutConfig" ADD COLUMN IF NOT EXISTS "companyLogos" TEXT NOT NULL DEFAULT '[]';
