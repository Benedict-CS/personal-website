-- CreateTable
CREATE TABLE "SiteConfig" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "siteName" TEXT NOT NULL DEFAULT 'My Site',
    "logoUrl" TEXT,
    "faviconUrl" TEXT,
    "metaTitle" TEXT NOT NULL DEFAULT '',
    "metaDescription" TEXT,
    "authorName" TEXT,
    "links" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteConfig_pkey" PRIMARY KEY ("id")
);

-- Insert default row so singleton exists
INSERT INTO "SiteConfig" ("id", "siteName", "metaTitle", "links", "updatedAt")
VALUES (1, 'My Site', '', '{}', NOW());
