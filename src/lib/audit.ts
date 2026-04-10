import { prisma } from "@/lib/prisma";

export type AuditAction =
  | "post.create"
  | "post.update"
  | "post.delete"
  | "site_config.update"
  | "site_content.update"
  | "about_config.update"
  | "media.cleanup"
  | "media.optimize"
  | "custom_page.create"
  | "custom_page.update"
  | "custom_page.delete"
  | "editor.draft.save"
  | "editor.publish"
  | "analytics.cv_download"
  | "analytics.lead_generated"
  | "workflow.webhook.delivered"
  | "workflow.webhook.failed"
  | "system.link_check.scan"
  | "import";

/**
 * Append an audit log entry. Fire-and-forget; errors are logged but not thrown.
 */
export async function auditLog(params: {
  action: AuditAction;
  resourceType: string;
  resourceId?: string | null;
  details?: string | null;
  ip?: string | null;
}): Promise<{
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  details: string | null;
  ip: string | null;
  createdAt: Date;
} | null> {
  try {
    return await prisma.auditLog.create({
      data: {
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId ?? null,
        details: params.details ?? null,
        ip: params.ip ?? null,
      },
    });
  } catch (e) {
    console.warn("Audit log write failed:", e);
    return null;
  }
}
