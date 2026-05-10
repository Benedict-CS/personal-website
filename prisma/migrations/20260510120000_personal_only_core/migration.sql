-- Personal site only: drop multi-tenant / SaaS tables and tenant columns on shared models.

-- Detach retained tables from TenantSite and remove unused SiteConfig billing columns.
ALTER TABLE "Post" DROP CONSTRAINT IF EXISTS "Post_tenantSiteId_fkey";
ALTER TABLE "Post" DROP COLUMN IF EXISTS "tenantSiteId";

ALTER TABLE "Tag" DROP CONSTRAINT IF EXISTS "Tag_tenantSiteId_fkey";
ALTER TABLE "Tag" DROP COLUMN IF EXISTS "tenantSiteId";

ALTER TABLE "PostVersion" DROP CONSTRAINT IF EXISTS "PostVersion_tenantSiteId_fkey";
ALTER TABLE "PostVersion" DROP COLUMN IF EXISTS "tenantSiteId";

ALTER TABLE "AboutConfig" DROP CONSTRAINT IF EXISTS "AboutConfig_tenantSiteId_fkey";
ALTER TABLE "AboutConfig" DROP COLUMN IF EXISTS "tenantSiteId";

ALTER TABLE "SiteConfig" DROP CONSTRAINT IF EXISTS "SiteConfig_tenantSiteId_fkey";
ALTER TABLE "SiteConfig" DROP COLUMN IF EXISTS "tenantSiteId";
ALTER TABLE "SiteConfig" DROP COLUMN IF EXISTS "stripePublishableKey";
ALTER TABLE "SiteConfig" DROP COLUMN IF EXISTS "stripeSecretKey";

ALTER TABLE "BuilderPage" DROP CONSTRAINT IF EXISTS "BuilderPage_tenantSiteId_fkey";
ALTER TABLE "BuilderPage" DROP COLUMN IF EXISTS "tenantSiteId";

ALTER TABLE "BuilderTemplate" DROP CONSTRAINT IF EXISTS "BuilderTemplate_tenantSiteId_fkey";
ALTER TABLE "BuilderTemplate" DROP COLUMN IF EXISTS "tenantSiteId";

ALTER TABLE "BuilderComponent" DROP CONSTRAINT IF EXISTS "BuilderComponent_tenantSiteId_fkey";
ALTER TABLE "BuilderComponent" DROP COLUMN IF EXISTS "tenantSiteId";

ALTER TABLE "CustomPage" DROP CONSTRAINT IF EXISTS "CustomPage_tenantSiteId_fkey";
ALTER TABLE "CustomPage" DROP COLUMN IF EXISTS "tenantSiteId";

ALTER TABLE "SitePageContent" DROP CONSTRAINT IF EXISTS "SitePageContent_tenantSiteId_fkey";
ALTER TABLE "SitePageContent" DROP COLUMN IF EXISTS "tenantSiteId";

ALTER TABLE "AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_tenantSiteId_fkey";
ALTER TABLE "AuditLog" DROP COLUMN IF EXISTS "tenantSiteId";

ALTER TABLE "PageView" DROP CONSTRAINT IF EXISTS "PageView_tenantSiteId_fkey";
ALTER TABLE "PageView" DROP COLUMN IF EXISTS "tenantSiteId";

-- SaaS-only tables (order: dependents first; CASCADE for safety).
DROP TABLE IF EXISTS "VariantEvent" CASCADE;
DROP TABLE IF EXISTS "PageVariant" CASCADE;
DROP TABLE IF EXISTS "ABExperiment" CASCADE;
DROP TABLE IF EXISTS "Block" CASCADE;
DROP TABLE IF EXISTS "PageVersion" CASCADE;
DROP TABLE IF EXISTS "Page" CASCADE;
DROP TABLE IF EXISTS "SiteTemplate" CASCADE;
DROP TABLE IF EXISTS "MediaAsset" CASCADE;
DROP TABLE IF EXISTS "MediaFolder" CASCADE;
DROP TABLE IF EXISTS "EmailCampaign" CASCADE;
DROP TABLE IF EXISTS "MailingListContact" CASCADE;
DROP TABLE IF EXISTS "MailingList" CASCADE;
DROP TABLE IF EXISTS "FormSubmission" CASCADE;
DROP TABLE IF EXISTS "CRMContact" CASCADE;
DROP TABLE IF EXISTS "OrderItem" CASCADE;
DROP TABLE IF EXISTS "Order" CASCADE;
DROP TABLE IF EXISTS "CartItem" CASCADE;
DROP TABLE IF EXISTS "Cart" CASCADE;
DROP TABLE IF EXISTS "DiscountCode" CASCADE;
DROP TABLE IF EXISTS "ShippingZone" CASCADE;
DROP TABLE IF EXISTS "ProductVariant" CASCADE;
DROP TABLE IF EXISTS "Product" CASCADE;
DROP TABLE IF EXISTS "Category" CASCADE;
DROP TABLE IF EXISTS "Customer" CASCADE;
DROP TABLE IF EXISTS "VectorDocument" CASCADE;
DROP TABLE IF EXISTS "DeploymentJob" CASCADE;
DROP TABLE IF EXISTS "DomainCertificate" CASCADE;
DROP TABLE IF EXISTS "Account" CASCADE;
DROP TABLE IF EXISTS "Subscription" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;
DROP TABLE IF EXISTS "TenantSite" CASCADE;

DROP TYPE IF EXISTS "ExperimentStatus";
DROP TYPE IF EXISTS "CampaignStatus";
DROP TYPE IF EXISTS "FulfillmentStage";
DROP TYPE IF EXISTS "OrderStatus";
DROP TYPE IF EXISTS "ProductStatus";
DROP TYPE IF EXISTS "PageStatus";
DROP TYPE IF EXISTS "SiteStatus";
DROP TYPE IF EXISTS "BillingProvider";
DROP TYPE IF EXISTS "SubscriptionStatus";
DROP TYPE IF EXISTS "SitePlan";
