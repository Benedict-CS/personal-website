-- CreateEnum
CREATE TYPE "BillingProvider" AS ENUM ('NONE', 'STRIPE', 'LEMON_SQUEEZY');

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN "billingProvider" "BillingProvider" NOT NULL DEFAULT 'NONE';
ALTER TABLE "Subscription" ADD COLUMN "lemonCustomerId" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "lemonSubscriptionId" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "lemonVariantId" TEXT;

-- AlterTable
ALTER TABLE "TenantSite" ADD COLUMN "defaultLocale" TEXT NOT NULL DEFAULT 'en';

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_lemonCustomerId_key" ON "Subscription"("lemonCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_lemonSubscriptionId_key" ON "Subscription"("lemonSubscriptionId");
