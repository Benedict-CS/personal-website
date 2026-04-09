/**
 * Shared parsing and markdown emission for Personal Brand block types
 * (site-block-builder and SaaS block-renderer).
 */

export type TimelineEntry = {
  period: string;
  title: string;
  organization: string;
  description: string;
};

export type ProjectEntry = {
  title: string;
  summary: string;
  link: string;
  imageUrl: string;
};

export type SkillEntry = {
  name: string;
  iconKey: string;
  level: string;
};

export type FormFieldEntry = {
  label: string;
  fieldType: "text" | "email" | "textarea" | "tel" | "url";
  required: boolean;
};

export function parseTimelineText(raw: string): TimelineEntry[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|").map((p) => p.trim());
      return {
        period: parts[0] ?? "",
        title: parts[1] ?? "",
        organization: parts[2] ?? "",
        description: parts.slice(3).join(" · ") || "",
      };
    });
}

export function parseProjectsText(raw: string): ProjectEntry[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|").map((p) => p.trim());
      return {
        title: parts[0] ?? "",
        summary: parts[1] ?? "",
        link: parts[2] ?? "",
        imageUrl: parts[3] ?? "",
      };
    });
}

export function parseSkillsText(raw: string): SkillEntry[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|").map((p) => p.trim());
      return {
        name: parts[0] ?? "",
        iconKey: (parts[1] ?? "circle").toLowerCase().replace(/\s+/g, "-"),
        level: parts[2] ?? "",
      };
    });
}

export function parseFormFieldsText(raw: string): FormFieldEntry[] {
  const allowed: FormFieldEntry["fieldType"][] = ["text", "email", "textarea", "tel", "url"];
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|").map((p) => p.trim());
      const label = parts[0] ?? "Field";
      const ft = (parts[1] ?? "text").toLowerCase() as FormFieldEntry["fieldType"];
      const fieldType = allowed.includes(ft) ? ft : "text";
      const reqRaw = (parts[2] ?? "").toLowerCase();
      const required = reqRaw === "required" || reqRaw === "yes" || reqRaw === "true";
      return { label, fieldType, required };
    });
}

export function timelineToMarkdown(entries: TimelineEntry[]): string {
  return entries
    .map((e) => {
      const head = [e.period, e.title, e.organization].filter(Boolean).join(" · ");
      const body = e.description ? `\n${e.description}` : "";
      return `### ${head}${body}`;
    })
    .join("\n\n");
}

export function projectsToMarkdown(entries: ProjectEntry[]): string {
  return entries
    .map((p) => {
      const link = p.link ? `[${p.title || "Project"}](${p.link})` : p.title;
      const img = p.imageUrl ? `\n![${p.title}](${p.imageUrl})` : "";
      const sum = p.summary ? `\n${p.summary}` : "";
      return `${link}${sum}${img}`;
    })
    .join("\n\n");
}

export function skillsToMarkdown(entries: SkillEntry[]): string {
  return entries.map((s) => `- **${s.name}**${s.level ? ` — ${s.level}` : ""}`).join("\n");
}

export function formFieldsToMarkdown(entries: FormFieldEntry[]): string {
  return entries
    .map((f) => `- ${f.label} (${f.fieldType}${f.required ? ", required" : ""})`)
    .join("\n");
}
