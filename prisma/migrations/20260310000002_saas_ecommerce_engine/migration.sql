-- CreateEnum
CREATE TYPE "SitePlan" AS ENUM ('FREE', 'PRO', 'BUSINESS', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED');

-- CreateEnum
CREATE TYPE "SiteStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "PageStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'COMPLETED', 'CANCELED');

-- CreateEnum
CREATE TYPE "FulfillmentStage" AS ENUM ('NEW', 'PICKING', 'PACKING', 'SHIPPED', 'DELIVERED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'owner',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'owner',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "siteId" TEXT,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "plan" "SitePlan" NOT NULL DEFAULT 'FREE',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantSite" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "SiteStatus" NOT NULL DEFAULT 'DRAFT',
    "customDomain" TEXT,
    "subdomain" TEXT,
    "logoUrl" TEXT,
    "themeTokens" JSONB NOT NULL DEFAULT '{}',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantSite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "categoryId" TEXT,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "basePriceCents" INTEGER NOT NULL DEFAULT 0,
    "compareAtCents" INTEGER,
    "trackInventory" BOOLEAN NOT NULL DEFAULT true,
    "totalStock" INTEGER NOT NULL DEFAULT 0,
    "media" JSONB NOT NULL DEFAULT '[]',
    "attributes" JSONB NOT NULL DEFAULT '{}',
    "seoMetadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "options" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cart" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "customerId" TEXT,
    "sessionKey" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "discountCodeId" TEXT,
    "shippingZoneId" TEXT,
    "subtotalCents" INTEGER NOT NULL DEFAULT 0,
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    "shippingCents" INTEGER NOT NULL DEFAULT 0,
    "taxCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL DEFAULT 0,
    "checkedOutAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartItem" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPriceCents" INTEGER NOT NULL,
    "lineTotalCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscountCode" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "discountType" TEXT NOT NULL DEFAULT 'percentage',
    "discountValue" INTEGER NOT NULL,
    "minSubtotalCents" INTEGER NOT NULL DEFAULT 0,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscountCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingZone" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "countries" JSONB NOT NULL DEFAULT '[]',
    "baseRateCents" INTEGER NOT NULL DEFAULT 0,
    "freeOverCents" INTEGER,
    "estimatedDaysMin" INTEGER,
    "estimatedDaysMax" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "customerId" TEXT,
    "orderNumber" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "fulfillmentStage" "FulfillmentStage" NOT NULL DEFAULT 'NEW',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "subtotalCents" INTEGER NOT NULL DEFAULT 0,
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    "shippingCents" INTEGER NOT NULL DEFAULT 0,
    "taxCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL DEFAULT 0,
    "discountCodeId" TEXT,
    "shippingZoneId" TEXT,
    "shippingAddress" JSONB NOT NULL DEFAULT '{}',
    "billingAddress" JSONB NOT NULL DEFAULT '{}',
    "payment" JSONB NOT NULL DEFAULT '{}',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "title" TEXT NOT NULL,
    "sku" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,
    "lineTotalCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteTemplate" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "previewUrl" TEXT,
    "pages" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Page" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "PageStatus" NOT NULL DEFAULT 'DRAFT',
    "seoMetadata" JSONB NOT NULL DEFAULT '{}',
    "draftBlocks" JSONB NOT NULL DEFAULT '[]',
    "publishedTree" JSONB NOT NULL DEFAULT '[]',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageVersion" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "status" "PageStatus" NOT NULL DEFAULT 'DRAFT',
    "snapshot" JSONB NOT NULL DEFAULT '{}',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Block" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "parentId" TEXT,
    "type" TEXT NOT NULL,
    "content" JSONB NOT NULL DEFAULT '{}',
    "styles" JSONB NOT NULL DEFAULT '{}',
    "interactions" JSONB NOT NULL DEFAULT '{}',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Block_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaFolder" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "folderId" TEXT,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "storageKey" TEXT NOT NULL,
    "publicUrl" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "tenantSiteId" TEXT,
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
    "tenantSiteId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostVersion" (
    "id" TEXT NOT NULL,
    "tenantSiteId" TEXT,
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
    "tenantSiteId" TEXT,
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
    "tenantSiteId" TEXT,
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
    "tenantSiteId" TEXT,
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
    "tenantSiteId" TEXT,
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
    "tenantSiteId" TEXT,
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
    "tenantSiteId" TEXT,
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
    "tenantSiteId" TEXT,
    "page" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SitePageContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "tenantSiteId" TEXT,
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
    "tenantSiteId" TEXT,
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
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Account_siteId_role_idx" ON "Account"("siteId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "Account_userId_siteId_key" ON "Account"("userId", "siteId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeCustomerId_key" ON "Subscription"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "Subscription_userId_status_idx" ON "Subscription"("userId", "status");

-- CreateIndex
CREATE INDEX "Subscription_siteId_status_idx" ON "Subscription"("siteId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TenantSite_slug_key" ON "TenantSite"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "TenantSite_customDomain_key" ON "TenantSite"("customDomain");

-- CreateIndex
CREATE UNIQUE INDEX "TenantSite_subdomain_key" ON "TenantSite"("subdomain");

-- CreateIndex
CREATE INDEX "Category_siteId_name_idx" ON "Category"("siteId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Category_siteId_slug_key" ON "Category"("siteId", "slug");

-- CreateIndex
CREATE INDEX "Product_siteId_status_updatedAt_idx" ON "Product"("siteId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "Product_siteId_categoryId_idx" ON "Product"("siteId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_siteId_slug_key" ON "Product"("siteId", "slug");

-- CreateIndex
CREATE INDEX "ProductVariant_siteId_productId_updatedAt_idx" ON "ProductVariant"("siteId", "productId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_siteId_sku_key" ON "ProductVariant"("siteId", "sku");

-- CreateIndex
CREATE INDEX "Customer_siteId_createdAt_idx" ON "Customer"("siteId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_siteId_email_key" ON "Customer"("siteId", "email");

-- CreateIndex
CREATE INDEX "Cart_siteId_updatedAt_idx" ON "Cart"("siteId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Cart_siteId_sessionKey_key" ON "Cart"("siteId", "sessionKey");

-- CreateIndex
CREATE INDEX "CartItem_siteId_cartId_idx" ON "CartItem"("siteId", "cartId");

-- CreateIndex
CREATE INDEX "CartItem_siteId_productId_variantId_idx" ON "CartItem"("siteId", "productId", "variantId");

-- CreateIndex
CREATE INDEX "DiscountCode_siteId_active_endsAt_idx" ON "DiscountCode"("siteId", "active", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "DiscountCode_siteId_code_key" ON "DiscountCode"("siteId", "code");

-- CreateIndex
CREATE INDEX "ShippingZone_siteId_name_idx" ON "ShippingZone"("siteId", "name");

-- CreateIndex
CREATE INDEX "Order_siteId_status_updatedAt_idx" ON "Order"("siteId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "Order_siteId_fulfillmentStage_updatedAt_idx" ON "Order"("siteId", "fulfillmentStage", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Order_siteId_orderNumber_key" ON "Order"("siteId", "orderNumber");

-- CreateIndex
CREATE INDEX "OrderItem_siteId_orderId_idx" ON "OrderItem"("siteId", "orderId");

-- CreateIndex
CREATE INDEX "SiteTemplate_siteId_updatedAt_idx" ON "SiteTemplate"("siteId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SiteTemplate_siteId_key_key" ON "SiteTemplate"("siteId", "key");

-- CreateIndex
CREATE INDEX "Page_siteId_status_updatedAt_idx" ON "Page"("siteId", "status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Page_siteId_slug_key" ON "Page"("siteId", "slug");

-- CreateIndex
CREATE INDEX "PageVersion_siteId_createdAt_idx" ON "PageVersion"("siteId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PageVersion_pageId_versionNumber_key" ON "PageVersion"("pageId", "versionNumber");

-- CreateIndex
CREATE INDEX "Block_siteId_pageId_order_idx" ON "Block"("siteId", "pageId", "order");

-- CreateIndex
CREATE INDEX "Block_pageId_parentId_order_idx" ON "Block"("pageId", "parentId", "order");

-- CreateIndex
CREATE INDEX "MediaFolder_siteId_parentId_idx" ON "MediaFolder"("siteId", "parentId");

-- CreateIndex
CREATE UNIQUE INDEX "MediaFolder_siteId_path_key" ON "MediaFolder"("siteId", "path");

-- CreateIndex
CREATE INDEX "MediaAsset_siteId_folderId_createdAt_idx" ON "MediaAsset"("siteId", "folderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_siteId_storageKey_key" ON "MediaAsset"("siteId", "storageKey");

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
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "TenantSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "TenantSite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantSite" ADD CONSTRAINT "TenantSite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "TenantSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "TenantSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "TenantSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "TenantSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "TenantSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_discountCodeId_fkey" FOREIGN KEY ("discountCodeId") REFERENCES "DiscountCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_shippingZoneId_fkey" FOREIGN KEY ("shippingZoneId") REFERENCES "ShippingZone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "TenantSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountCode" ADD CONSTRAINT "DiscountCode_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "TenantSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingZone" ADD CONSTRAINT "ShippingZone_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "TenantSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "TenantSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_discountCodeId_fkey" FOREIGN KEY ("discountCodeId") REFERENCES "DiscountCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_shippingZoneId_fkey" FOREIGN KEY ("shippingZoneId") REFERENCES "ShippingZone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "TenantSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteTemplate" ADD CONSTRAINT "SiteTemplate_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "TenantSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Page" ADD CONSTRAINT "Page_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "TenantSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageVersion" ADD CONSTRAINT "PageVersion_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "TenantSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageVersion" ADD CONSTRAINT "PageVersion_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageVersion" ADD CONSTRAINT "PageVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "TenantSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Block"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaFolder" ADD CONSTRAINT "MediaFolder_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "TenantSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaFolder" ADD CONSTRAINT "MediaFolder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "MediaFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "TenantSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "MediaFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_tenantSiteId_fkey" FOREIGN KEY ("tenantSiteId") REFERENCES "TenantSite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_tenantSiteId_fkey" FOREIGN KEY ("tenantSiteId") REFERENCES "TenantSite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostVersion" ADD CONSTRAINT "PostVersion_tenantSiteId_fkey" FOREIGN KEY ("tenantSiteId") REFERENCES "TenantSite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostVersion" ADD CONSTRAINT "PostVersion_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AboutConfig" ADD CONSTRAINT "AboutConfig_tenantSiteId_fkey" FOREIGN KEY ("tenantSiteId") REFERENCES "TenantSite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteConfig" ADD CONSTRAINT "SiteConfig_tenantSiteId_fkey" FOREIGN KEY ("tenantSiteId") REFERENCES "TenantSite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuilderPage" ADD CONSTRAINT "BuilderPage_tenantSiteId_fkey" FOREIGN KEY ("tenantSiteId") REFERENCES "TenantSite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuilderBlock" ADD CONSTRAINT "BuilderBlock_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "BuilderPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuilderBlockVersion" ADD CONSTRAINT "BuilderBlockVersion_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "BuilderBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuilderPageVersion" ADD CONSTRAINT "BuilderPageVersion_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "BuilderPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuilderTemplate" ADD CONSTRAINT "BuilderTemplate_tenantSiteId_fkey" FOREIGN KEY ("tenantSiteId") REFERENCES "TenantSite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuilderComponent" ADD CONSTRAINT "BuilderComponent_tenantSiteId_fkey" FOREIGN KEY ("tenantSiteId") REFERENCES "TenantSite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomPage" ADD CONSTRAINT "CustomPage_tenantSiteId_fkey" FOREIGN KEY ("tenantSiteId") REFERENCES "TenantSite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SitePageContent" ADD CONSTRAINT "SitePageContent_tenantSiteId_fkey" FOREIGN KEY ("tenantSiteId") REFERENCES "TenantSite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantSiteId_fkey" FOREIGN KEY ("tenantSiteId") REFERENCES "TenantSite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageView" ADD CONSTRAINT "PageView_tenantSiteId_fkey" FOREIGN KEY ("tenantSiteId") REFERENCES "TenantSite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PostToTag" ADD CONSTRAINT "_PostToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PostToTag" ADD CONSTRAINT "_PostToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

