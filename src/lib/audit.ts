import { prisma } from "@/lib/prisma";

export type AuditAction =
  | "post.create"
  | "post.update"
  | "post.delete"
  | "site_config.update"
  | "custom_page.create"
  | "custom_page.update"
  | "custom_page.delete"
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
}): Promise<void> {
  try {
    await prisma.auditLog.create({
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
  }
}
