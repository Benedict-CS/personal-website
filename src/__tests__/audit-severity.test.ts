import { classifyAuditActionSeverity, summarizeAuditSeverity } from "@/lib/audit-severity";

describe("audit severity", () => {
  it("classifies critical actions correctly", () => {
    expect(classifyAuditActionSeverity("post.delete")).toBe("critical");
    expect(classifyAuditActionSeverity("tags.merge")).toBe("critical");
  });

  it("classifies warning and info actions", () => {
    expect(classifyAuditActionSeverity("posts.bulk.update")).toBe("warning");
    expect(classifyAuditActionSeverity("system.link_check.scan")).toBe("warning");
    expect(classifyAuditActionSeverity("workflow.webhook.failed")).toBe("warning");
    expect(classifyAuditActionSeverity("editor.publish")).toBe("info");
  });

  it("summarizes severity buckets", () => {
    const summary = summarizeAuditSeverity([
      "post.delete",
      "posts.bulk.update",
      "editor.publish",
      "editor.publish",
    ]);

    expect(summary.critical).toBe(1);
    expect(summary.warning).toBe(1);
    expect(summary.info).toBe(2);
  });
});
