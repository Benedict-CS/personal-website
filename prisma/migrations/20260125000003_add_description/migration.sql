-- Add description field to Post table for card summaries
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "description" TEXT;
