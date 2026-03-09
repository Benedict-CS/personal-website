"use client";

import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

interface MarkdownTemplateInserterProps {
  onInsert: (markdown: string) => void;
  compact?: boolean;
}

const TEMPLATES: Array<{ id: string; label: string; markdown: string }> = [
  {
    id: "hero",
    label: "Hero section",
    markdown: `# Your main headline

Short supporting paragraph that explains the value clearly.

[Primary CTA](#) · [Secondary CTA](#)
`,
  },
  {
    id: "features",
    label: "Feature grid",
    markdown: `## Features

| Feature | Description |
| --- | --- |
| Fast setup | Ready in minutes with simple configuration. |
| Flexible content | Supports Markdown, media, and custom pages. |
| Production ready | Backup, health check, and analytics included. |
`,
  },
  {
    id: "faq",
    label: "FAQ",
    markdown: `## Frequently asked questions

### What problem does this solve?
It provides a complete and easy editing flow for non-technical users.

### How fast can I launch?
Most users can publish a full website in under one hour.
`,
  },
  {
    id: "timeline",
    label: "Timeline",
    markdown: `## Timeline

- **2025 Q1** - Planning and requirements.
- **2025 Q2** - MVP launch and first users.
- **2025 Q3** - UX improvements and automation.
- **2025 Q4** - Team scale and commercial rollout.
`,
  },
  {
    id: "pricing",
    label: "Pricing cards",
    markdown: `## Pricing

### Starter
- 1 website
- Basic analytics
- Email support

### Pro
- Unlimited pages
- Advanced analytics
- Priority support
`,
  },
  {
    id: "cta",
    label: "Call-to-action",
    markdown: `---

## Ready to get started?

Build your site today and publish in minutes.

[Get Started](#)
`,
  },
];

export function MarkdownTemplateInserter({
  onInsert,
  compact = false,
}: MarkdownTemplateInserterProps) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50/70 p-2">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-600">
        <Sparkles className="h-3.5 w-3.5" />
        Smart blocks
      </div>
      <div className="flex flex-wrap gap-2">
        {TEMPLATES.map((t) => (
          <Button
            key={t.id}
            type="button"
            variant="outline"
            size={compact ? "sm" : "default"}
            className="bg-white"
            onClick={() => onInsert(t.markdown)}
          >
            {t.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

