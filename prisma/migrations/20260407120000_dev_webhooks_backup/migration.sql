-- Developer integrations: contact webhooks, optional backup targets (used by scripts + dashboard)
ALTER TABLE "SiteConfig" ADD COLUMN "contactWebhookUrl" TEXT;
ALTER TABLE "SiteConfig" ADD COLUMN "backupRsyncTarget" TEXT;
ALTER TABLE "SiteConfig" ADD COLUMN "backupPostHookUrl" TEXT;
