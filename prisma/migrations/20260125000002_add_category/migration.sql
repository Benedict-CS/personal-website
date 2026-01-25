-- Add category and order fields to Post table
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "order" INTEGER NOT NULL DEFAULT 0;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "Post_category_order_idx" ON "Post"("category", "order");
CREATE INDEX IF NOT EXISTS "Post_category_createdAt_idx" ON "Post"("category", "createdAt");
