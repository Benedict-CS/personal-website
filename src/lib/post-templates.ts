/**
 * Post template library.
 *
 * Provides a registry of reusable post templates — predefined content
 * structures with heading scaffolding, placeholder guidance, and
 * suggested tags/descriptions. Authors select a template when creating
 * a new post for consistent quality and faster starts.
 *
 * Templates are pure data — no DB or network required.
 */

export interface PostTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  suggestedTags: string[];
  suggestedDescription: string;
  content: string;
}

export interface AppliedTemplate {
  content: string;
  tags: string;
  description: string;
}

export const POST_TEMPLATES: PostTemplate[] = [
  {
    id: "tutorial",
    name: "Tutorial / How-To",
    icon: "📘",
    description: "Step-by-step guide with prerequisites, instructions, and wrap-up.",
    suggestedTags: ["Tutorial"],
    suggestedDescription: "A step-by-step guide to...",
    content: [
      "## Introduction",
      "",
      "Brief overview of what this tutorial covers and what the reader will learn by the end.",
      "",
      "## Prerequisites",
      "",
      "- List tools, knowledge, or setup required before starting",
      "- Link to installation guides or prior tutorials if needed",
      "",
      "## Step 1: Getting Started",
      "",
      "Describe the first major step with clear instructions.",
      "",
      "```bash",
      "# Example command or code snippet",
      "```",
      "",
      "## Step 2: Core Implementation",
      "",
      "Walk through the main implementation with code examples and explanations.",
      "",
      "## Step 3: Testing & Verification",
      "",
      "Show how to verify the implementation works correctly.",
      "",
      "## Troubleshooting",
      "",
      "Common issues and their solutions:",
      "",
      "- **Issue**: Description → **Fix**: Solution",
      "",
      "## Conclusion",
      "",
      "Summarize what was accomplished and suggest next steps or further reading.",
    ].join("\n"),
  },
  {
    id: "technical-deep-dive",
    name: "Technical Deep Dive",
    icon: "🔬",
    description: "In-depth exploration of a technology, pattern, or architecture decision.",
    suggestedTags: ["Deep Dive"],
    suggestedDescription: "An in-depth exploration of...",
    content: [
      "## Overview",
      "",
      "What this post explores and why it matters for practitioners.",
      "",
      "## Background & Context",
      "",
      "The history, motivation, and landscape surrounding this topic.",
      "",
      "## How It Works",
      "",
      "Detailed explanation of the core mechanism or architecture.",
      "",
      "### Key Concepts",
      "",
      "Define and explain the foundational ideas the reader needs.",
      "",
      "### Under the Hood",
      "",
      "Technical details, data flows, algorithms, or implementation specifics.",
      "",
      "## Practical Examples",
      "",
      "Real-world code samples or configurations demonstrating the concept.",
      "",
      "## Trade-offs & Considerations",
      "",
      "Honest analysis of when this approach works well and when it doesn't.",
      "",
      "## Conclusion",
      "",
      "Key takeaways and recommended resources for further study.",
    ].join("\n"),
  },
  {
    id: "comparison",
    name: "Comparison / vs.",
    icon: "⚖️",
    description: "Side-by-side comparison of tools, frameworks, or approaches.",
    suggestedTags: ["Comparison"],
    suggestedDescription: "A detailed comparison of...",
    content: [
      "## Introduction",
      "",
      "What is being compared, why these options are relevant, and who this comparison is for.",
      "",
      "## Quick Summary",
      "",
      "| Feature | Option A | Option B |",
      "|---------|----------|----------|",
      "| Performance | ... | ... |",
      "| Ease of Use | ... | ... |",
      "| Community | ... | ... |",
      "| Cost | ... | ... |",
      "",
      "## Option A: Overview",
      "",
      "What it is, key strengths, and ideal use cases.",
      "",
      "## Option B: Overview",
      "",
      "What it is, key strengths, and ideal use cases.",
      "",
      "## Detailed Comparison",
      "",
      "### Performance",
      "",
      "Benchmark data or qualitative analysis of speed, memory, and scalability.",
      "",
      "### Developer Experience",
      "",
      "Documentation quality, tooling, debugging, and learning curve.",
      "",
      "### Ecosystem & Community",
      "",
      "Package availability, community size, and long-term maintenance outlook.",
      "",
      "## Verdict",
      "",
      "Clear recommendation with reasoning: when to choose A vs B.",
    ].join("\n"),
  },
  {
    id: "til",
    name: "Today I Learned (TIL)",
    icon: "💡",
    description: "Short, focused insight — a single useful discovery or trick.",
    suggestedTags: ["TIL"],
    suggestedDescription: "A quick tip about...",
    content: [
      "## The Problem",
      "",
      "What I was trying to do and what went wrong or was unclear.",
      "",
      "## The Discovery",
      "",
      "The key insight, trick, or solution I found.",
      "",
      "```",
      "// Code example showing the solution",
      "```",
      "",
      "## Why It Works",
      "",
      "Brief explanation of the underlying mechanism.",
      "",
      "## References",
      "",
      "- [Link to documentation or source]()",
    ].join("\n"),
  },
  {
    id: "project-showcase",
    name: "Project Showcase",
    icon: "🚀",
    description: "Present a personal project with motivation, architecture, and lessons.",
    suggestedTags: ["Project"],
    suggestedDescription: "Showcasing my project...",
    content: [
      "## What I Built",
      "",
      "One-paragraph summary: what it does, who it's for, and the key value proposition.",
      "",
      "## Motivation",
      "",
      "Why I built this — the problem it solves or the learning goal it addressed.",
      "",
      "## Architecture & Tech Stack",
      "",
      "Overview of the technology choices and how they fit together.",
      "",
      "- **Frontend**: ...",
      "- **Backend**: ...",
      "- **Database**: ...",
      "- **Deployment**: ...",
      "",
      "## Key Features",
      "",
      "Highlight 3-5 notable features with screenshots or code snippets.",
      "",
      "## Challenges & Solutions",
      "",
      "The hardest problems encountered and how they were solved.",
      "",
      "## Lessons Learned",
      "",
      "What I would do differently next time and key takeaways.",
      "",
      "## Try It / Source Code",
      "",
      "- [Live Demo]()",
      "- [GitHub Repository]()",
    ].join("\n"),
  },
  {
    id: "listicle",
    name: "List / Resource Roundup",
    icon: "📋",
    description: "Curated list of tools, tips, resources, or recommendations.",
    suggestedTags: ["Resources"],
    suggestedDescription: "A curated list of...",
    content: [
      "## Introduction",
      "",
      "What this list covers and how items were selected.",
      "",
      "## 1. First Item",
      "",
      "**What it is**: Brief description.",
      "**Why it's great**: Key benefit or standout feature.",
      "**Link**: [Name]()",
      "",
      "## 2. Second Item",
      "",
      "**What it is**: Brief description.",
      "**Why it's great**: Key benefit or standout feature.",
      "**Link**: [Name]()",
      "",
      "## 3. Third Item",
      "",
      "**What it is**: Brief description.",
      "**Why it's great**: Key benefit or standout feature.",
      "**Link**: [Name]()",
      "",
      "## Honorable Mentions",
      "",
      "- Item A — quick note",
      "- Item B — quick note",
      "",
      "## Conclusion",
      "",
      "Summary of the best picks and guidance on choosing between them.",
    ].join("\n"),
  },
];

/**
 * Get a template by ID.
 */
export function getTemplate(id: string): PostTemplate | undefined {
  return POST_TEMPLATES.find((t) => t.id === id);
}

/**
 * Apply a template to produce content, tags, and description values
 * ready for insertion into the post editor.
 */
export function applyTemplate(templateId: string): AppliedTemplate | null {
  const template = getTemplate(templateId);
  if (!template) return null;

  return {
    content: template.content,
    tags: template.suggestedTags.join(", "),
    description: template.suggestedDescription,
  };
}

/**
 * Get all available template names and IDs for the picker UI.
 */
export function listTemplates(): Array<{ id: string; name: string; icon: string; description: string }> {
  return POST_TEMPLATES.map((t) => ({
    id: t.id,
    name: t.name,
    icon: t.icon,
    description: t.description,
  }));
}
