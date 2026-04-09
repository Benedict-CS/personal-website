"use client";

import { Button } from "@/components/ui/button";
import { MarkdownEditorChrome } from "@/components/markdown/markdown-editor-chrome";
import { buildAutoTocMarkdownBlock } from "@/lib/markdown-toc";
import { BookOpen, Calendar, CircleAlert, Clock, Eraser, ListTree, PanelBottom, Sparkles, TextQuote } from "lucide-react";
import { buildBlogPostLinkMarkdown } from "@/lib/cms-post-link";
import { buildCmsCalloutMarkdown } from "@/lib/cms-callout-insert";
import { buildCmsDateInsertMarkdown } from "@/lib/cms-date-insert";
import { buildReadingTimeInsertMarkdown } from "@/lib/cms-reading-time-insert";
import { buildCmsDetailsBlockMarkdown } from "@/lib/cms-details-block-insert";
import { buildCmsDefinitionListMarkdown } from "@/lib/cms-definition-list-insert";

interface MarkdownTemplateInserterProps {
  onInsert: (markdown: string) => void;
  /** Current post body; used to generate an anchor TOC from existing headings. */
  sourceMarkdown?: string;
  /** When set, enables a one-click public blog path link for this slug. */
  postSlug?: string;
  compact?: boolean;
  /** Normalize whitespace on the full body (trim line ends, collapse blank runs). */
  onTidyBody?: () => void;
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
  sourceMarkdown = "",
  postSlug = "",
  compact = false,
  onTidyBody,
}: MarkdownTemplateInserterProps) {
  const slugTrim = postSlug.trim();
  const blogLinkMd = slugTrim ? buildBlogPostLinkMarkdown(slugTrim) : "";

  return (
    <MarkdownEditorChrome label="Smart blocks" icon={Sparkles}>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          size={compact ? "sm" : "default"}
          className="gap-1.5"
          title="Insert a Contents section with links to ## and ### headings in this post"
          onClick={() => onInsert(buildAutoTocMarkdownBlock(sourceMarkdown))}
        >
          <ListTree className="h-3.5 w-3.5" aria-hidden />
          Auto TOC
        </Button>
        <Button
          type="button"
          variant="secondary"
          size={compact ? "sm" : "default"}
          className="gap-1.5"
          disabled={!blogLinkMd}
          title={
            blogLinkMd
              ? "Insert a markdown link to the public blog URL for this post’s slug"
              : "Save a slug first to insert a blog link"
          }
          onClick={() => {
            if (blogLinkMd) onInsert(blogLinkMd);
          }}
        >
          <BookOpen className="h-3.5 w-3.5" aria-hidden />
          Blog link
        </Button>
        <Button
          type="button"
          variant="secondary"
          size={compact ? "sm" : "default"}
          className="gap-1.5"
          title="Insert an italic estimated reading time from the current draft word count"
          onClick={() => onInsert(buildReadingTimeInsertMarkdown(sourceMarkdown))}
        >
          <Clock className="h-3.5 w-3.5" aria-hidden />
          Reading time
        </Button>
        {onTidyBody ? (
          <Button
            type="button"
            variant="secondary"
            size={compact ? "sm" : "default"}
            className="gap-1.5"
            title="Trim trailing spaces per line and collapse extra blank lines in the full draft"
            onClick={() => onTidyBody()}
          >
            <Eraser className="h-3.5 w-3.5" aria-hidden />
            Tidy markdown
          </Button>
        ) : null}
        <Button
          type="button"
          variant="secondary"
          size={compact ? "sm" : "default"}
          className="gap-1.5"
          title="Insert the current date (long form + ISO) for changelogs or bylines"
          onClick={() => onInsert(buildCmsDateInsertMarkdown())}
        >
          <Calendar className="h-3.5 w-3.5" aria-hidden />
          Today’s date
        </Button>
        <Button
          type="button"
          variant="secondary"
          size={compact ? "sm" : "default"}
          className="gap-1.5"
          title="Insert a labeled callout (blockquote) for tips, warnings, or asides"
          onClick={() => onInsert(buildCmsCalloutMarkdown())}
        >
          <CircleAlert className="h-3.5 w-3.5" aria-hidden />
          Callout
        </Button>
        <Button
          type="button"
          variant="secondary"
          size={compact ? "sm" : "default"}
          className="gap-1.5"
          title="Insert an HTML details/summary collapsible block (works where raw HTML is allowed)"
          onClick={() => onInsert(buildCmsDetailsBlockMarkdown())}
        >
          <PanelBottom className="h-3.5 w-3.5" aria-hidden />
          Collapsible
        </Button>
        <Button
          type="button"
          variant="secondary"
          size={compact ? "sm" : "default"}
          className="gap-1.5"
          title="Insert a Markdown definition list (term / : definition) for glossaries"
          onClick={() => onInsert(buildCmsDefinitionListMarkdown())}
        >
          <TextQuote className="h-3.5 w-3.5" aria-hidden />
          Definition list
        </Button>
        {TEMPLATES.map((t) => (
          <Button
            key={t.id}
            type="button"
            variant="outline"
            size={compact ? "sm" : "default"}
            className="bg-card"
            onClick={() => onInsert(t.markdown)}
          >
            {t.label}
          </Button>
        ))}
      </div>
    </MarkdownEditorChrome>
  );
}

