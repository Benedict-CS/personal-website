-- Full-text search: add tsvector column and GIN index for title, description, content
-- Requires PostgreSQL 12+
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Post' AND column_name = 'search_vector'
  ) THEN
    ALTER TABLE "Post" ADD COLUMN "search_vector" tsvector
      GENERATED ALWAYS AS (
        to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,'') || ' ' || coalesce(content,''))
      ) STORED;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Post_search_vector_idx" ON "Post" USING GIN ("search_vector");
