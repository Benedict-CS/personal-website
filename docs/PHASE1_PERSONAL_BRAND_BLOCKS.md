# Phase 1 — Personal brand block system

This project focuses on **personal websites** (blog, resume, about, contact). Phase 1 adds a **modular Personal Brand** library inside the **Site Block Builder** (`src/components/site-block-builder.tsx`) and matching renderers for SaaS tenant pages (`src/components/saas/block-renderer.tsx`).

## Blocks

| Block | Purpose | Data format (builder) |
|-------|---------|------------------------|
| **Professional hero** | Name, tagline, bio, profile image, two CTAs | Image URL + text fields |
| **Resume timeline** | Career history with vertical timeline preview | `Period\|Title\|Org\|Description` per line |
| **Project showcase** | Card grid with thumb, summary, link | `Title\|Summary\|URL\|Image URL` per line |
| **Skill grid** | Pills with Lucide icon keys | `Name\|icon-key\|Level` per line |
| **Contact form (modular)** | Field list for wiring to your contact flow | `Label\|text\|email\|textarea\|tel\|url\|required\|optional` |

Shared parsing lives in `src/lib/personal-brand-blocks.ts`. Skill icons reuse `src/components/personal-brand/skill-block-icon.tsx` (supported keys include `code`, `layers`, `pen-line`, `briefcase`, `circle`).

## Design system

- **Light-only:** The former “bold” preview theme used a dark panel; it now uses **light high-contrast** surfaces (`bg-slate-100`, dark text) so there is no dark mode.
- **Responsive:** New block previews use `flex-col` / `sm:flex-row`, responsive grids, and touch-friendly spacing.
- **Commerce blocks** are **removed from the section library** (existing pages that still reference `pricing` / `comparison` in saved JSON continue to serialize; they are not promoted in the UI).

## Starter templates

- **Personal starter** — hero, timeline, projects, contact.
- **Creative portfolio** — professional hero, team, testimonials, projects, CTA.
- **Resume & FAQ** — professional hero, stats, timeline, FAQ, CTA.

## SaaS JSON types

Tenant `VisualBlock.type` strings may be **PascalCase** or **camelCase**, for example `ProfessionalHero` / `professionalHero`, so imports from the builder or API stay compatible.
