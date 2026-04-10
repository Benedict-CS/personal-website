export type AuditSeverity = "critical" | "warning" | "info";

const CRITICAL_MARKERS = [".delete", ".restore", ".merge"];
const WARNING_MARKERS = [".bulk", ".import", ".cleanup", ".optimize", "system.", "link_check", "workflow."];

export function classifyAuditActionSeverity(action: string): AuditSeverity {
  const normalized = action.toLowerCase();
  if (CRITICAL_MARKERS.some((marker) => normalized.includes(marker))) return "critical";
  if (WARNING_MARKERS.some((marker) => normalized.includes(marker))) return "warning";
  return "info";
}

export function summarizeAuditSeverity(actions: string[]): Record<AuditSeverity, number> {
  return actions.reduce<Record<AuditSeverity, number>>(
    (acc, action) => {
      acc[classifyAuditActionSeverity(action)] += 1;
      return acc;
    },
    { critical: 0, warning: 0, info: 0 }
  );
}
