-- Full schema for PostgreSQL (no Prisma CLI required)
-- Run: psql -U ben -d blog -f init-db.sql

CREATE TABLE IF NOT EXISTS "Post" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "Post_slug_key" ON "Post"("slug");
CREATE INDEX IF NOT EXISTS "Post_category_order_idx" ON "Post"("category", "order");
CREATE INDEX IF NOT EXISTS "Post_category_createdAt_idx" ON "Post"("category", "createdAt");

CREATE TABLE IF NOT EXISTS "Tag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "Tag_slug_key" ON "Tag"("slug");

CREATE TABLE IF NOT EXISTS "_PostToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_PostToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Post" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_PostToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "_PostToTag_AB_unique" ON "_PostToTag"("A", "B");
CREATE INDEX IF NOT EXISTS "_PostToTag_B_index" ON "_PostToTag"("B");

CREATE TABLE IF NOT EXISTS "PostVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL,
    "tags" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "versionNumber" INTEGER NOT NULL,
    CONSTRAINT "PostVersion_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "PostVersion_postId_idx" ON "PostVersion"("postId");
CREATE INDEX IF NOT EXISTS "PostVersion_postId_createdAt_idx" ON "PostVersion"("postId", "createdAt");

CREATE TABLE IF NOT EXISTS "AboutConfig" (
    "id" TEXT NOT NULL,
    "profileImage" TEXT,
    "schoolLogos" TEXT NOT NULL DEFAULT '[]',
    "projectImages" TEXT NOT NULL DEFAULT '[]',
    "companyLogos" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AboutConfig_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "AboutConfig_id_key" ON "AboutConfig"("id");
