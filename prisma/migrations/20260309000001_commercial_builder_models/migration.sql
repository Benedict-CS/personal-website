-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "description" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "previewToken" TEXT,
    "previewTokenExpiresAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostVersion" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL,
    "tags" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "versionNumber" INTEGER NOT NULL,

    CONSTRAINT "PostVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AboutConfig" (
    "id" TEXT NOT NULL,
    "profileImage" TEXT,
    "heroName" TEXT,
    "heroTagline" TEXT,
    "heroPhone" TEXT,
    "heroEmail" TEXT,
    "heroPortfolioLabel" TEXT,
    "heroPortfolioUrl" TEXT,
    "introText" TEXT,
    "aboutMainContent" TEXT,
    "educationBlocks" TEXT NOT NULL DEFAULT '[]',
    "experienceBlocks" TEXT NOT NULL DEFAULT '[]',
    "projectBlocks" TEXT NOT NULL DEFAULT '[]',
    "schoolLogos" TEXT NOT NULL DEFAULT '[]',
    "projectImages" TEXT NOT NULL DEFAULT '[]',
    "companyLogos" TEXT NOT NULL DEFAULT '[]',
    "contactHeading" TEXT,
    "contactText" TEXT,
    "contactLinks" TEXT NOT NULL DEFAULT '[]',
    "technicalSkills" TEXT NOT NULL DEFAULT '[]',
    "achievements" TEXT NOT NULL DEFAULT '[]',
    "sectionOrder" TEXT NOT NULL DEFAULT '["education","experience","projects","skills","achievements"]',
    "sectionVisibility" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AboutConfig_pkey" PRIMARY KEY ("id")
);

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
    "navItems" JSONB NOT NULL DEFAULT '[]',
    "footerText" TEXT,
    "ogImageUrl" TEXT,
    "setupCompleted" BOOLEAN NOT NULL DEFAULT false,
    "templateId" TEXT NOT NULL DEFAULT 'default',
    "themeMode" TEXT NOT NULL DEFAULT 'light',
    "autoAddCustomPagesToNav" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuilderPage" (
    "id" TEXT NOT NULL,
    "ownerKey" TEXT NOT NULL,
    "siteScope" TEXT NOT NULL DEFAULT 'default',
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "seoMetadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuilderPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuilderBlock" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" JSONB NOT NULL DEFAULT '{}',
    "styling" JSONB NOT NULL DEFAULT '{}',
    "order" INTEGER NOT NULL DEFAULT 0,
    "visibility" TEXT NOT NULL DEFAULT 'all',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuilderBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuilderBlockVersion" (
    "id" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "content" JSONB NOT NULL DEFAULT '{}',
    "styling" JSONB NOT NULL DEFAULT '{}',
    "versionNumber" INTEGER NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BuilderBlockVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuilderPageVersion" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL DEFAULT '{}',
    "versionNumber" INTEGER NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BuilderPageVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuilderTemplate" (
    "id" TEXT NOT NULL,
    "ownerKey" TEXT NOT NULL,
    "siteScope" TEXT NOT NULL DEFAULT 'default',
    "name" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'clean',
    "brand" JSONB NOT NULL DEFAULT '{}',
    "blocks" JSONB NOT NULL DEFAULT '[]',
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuilderTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuilderComponent" (
    "id" TEXT NOT NULL,
    "ownerKey" TEXT NOT NULL,
    "siteScope" TEXT NOT NULL DEFAULT 'default',
    "name" TEXT NOT NULL,
    "block" JSONB NOT NULL DEFAULT '{}',
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuilderComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomPage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SitePageContent" (
    "id" TEXT NOT NULL,
    "page" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SitePageContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "details" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageView" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "country" TEXT,
    "city" TEXT,
    "durationSeconds" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PostToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Post_slug_key" ON "Post"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Post_previewToken_key" ON "Post"("previewToken");

-- CreateIndex
CREATE INDEX "Post_category_order_idx" ON "Post"("category", "order");

-- CreateIndex
CREATE INDEX "Post_category_createdAt_idx" ON "Post"("category", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag"("slug");

-- CreateIndex
CREATE INDEX "PostVersion_postId_idx" ON "PostVersion"("postId");

-- CreateIndex
CREATE INDEX "PostVersion_postId_createdAt_idx" ON "PostVersion"("postId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AboutConfig_id_key" ON "AboutConfig"("id");

-- CreateIndex
CREATE INDEX "BuilderPage_ownerKey_siteScope_updatedAt_idx" ON "BuilderPage"("ownerKey", "siteScope", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "BuilderPage_ownerKey_siteScope_slug_key" ON "BuilderPage"("ownerKey", "siteScope", "slug");

-- CreateIndex
CREATE INDEX "BuilderBlock_pageId_order_idx" ON "BuilderBlock"("pageId", "order");

-- CreateIndex
CREATE INDEX "BuilderBlockVersion_blockId_createdAt_idx" ON "BuilderBlockVersion"("blockId", "createdAt");

-- CreateIndex
CREATE INDEX "BuilderBlockVersion_blockId_versionNumber_idx" ON "BuilderBlockVersion"("blockId", "versionNumber");

-- CreateIndex
CREATE INDEX "BuilderPageVersion_pageId_createdAt_idx" ON "BuilderPageVersion"("pageId", "createdAt");

-- CreateIndex
CREATE INDEX "BuilderPageVersion_pageId_versionNumber_idx" ON "BuilderPageVersion"("pageId", "versionNumber");

-- CreateIndex
CREATE INDEX "BuilderTemplate_ownerKey_siteScope_updatedAt_idx" ON "BuilderTemplate"("ownerKey", "siteScope", "updatedAt");

-- CreateIndex
CREATE INDEX "BuilderTemplate_siteScope_isShared_updatedAt_idx" ON "BuilderTemplate"("siteScope", "isShared", "updatedAt");

-- CreateIndex
CREATE INDEX "BuilderComponent_ownerKey_siteScope_updatedAt_idx" ON "BuilderComponent"("ownerKey", "siteScope", "updatedAt");

-- CreateIndex
CREATE INDEX "BuilderComponent_siteScope_isShared_updatedAt_idx" ON "BuilderComponent"("siteScope", "isShared", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CustomPage_slug_key" ON "CustomPage"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "SitePageContent_page_key" ON "SitePageContent"("page");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "PageView_path_idx" ON "PageView"("path");

-- CreateIndex
CREATE INDEX "PageView_createdAt_idx" ON "PageView"("createdAt");

-- CreateIndex
CREATE INDEX "PageView_ip_idx" ON "PageView"("ip");

-- CreateIndex
CREATE INDEX "PageView_country_idx" ON "PageView"("country");

-- CreateIndex
CREATE UNIQUE INDEX "_PostToTag_AB_unique" ON "_PostToTag"("A", "B");

-- CreateIndex
CREATE INDEX "_PostToTag_B_index" ON "_PostToTag"("B");

-- AddForeignKey
ALTER TABLE "PostVersion" ADD CONSTRAINT "PostVersion_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuilderBlock" ADD CONSTRAINT "BuilderBlock_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "BuilderPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuilderBlockVersion" ADD CONSTRAINT "BuilderBlockVersion_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "BuilderBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuilderPageVersion" ADD CONSTRAINT "BuilderPageVersion_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "BuilderPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PostToTag" ADD CONSTRAINT "_PostToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PostToTag" ADD CONSTRAINT "_PostToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

