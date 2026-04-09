# Site-wide professional UI/UX refresh — Implementation Plan

> **For agentic workers:** Use task checkboxes to track progress. Spec: `docs/superpowers/specs/2026-04-09-site-professional-refresh-design.md`.

**Goal:** Shared public and dashboard presentation primitives, consistent spacing and hierarchy, light-only — no dark mode.

**Architecture:** Add `src/components/public/public-layout.tsx` for marketing routes; extend `DashboardPageHeader` in `dashboard-ui.tsx`; migrate high-traffic pages first, then dashboard sub-routes and editor.

**Tech stack:** Next.js App Router, Tailwind 4, existing shadcn-style tokens in `globals.css`.

---

## Done (phase 1–3 partial)

- [x] Public primitives: `PublicPageShell`, `PublicSection`, `PublicPageHeader`, `PublicEmptyState`, container class exports.
- [x] Home, blog list, blog post shell, Contact, About outer chrome; article reading bar uses semantic tokens.
- [x] `DashboardPageHeader`: optional `eyebrow`, tighter action alignment.

## Remaining

- [x] Dashboard: `eyebrow` on all `DashboardPageHeader` usages (overview, posts, content, analytics, notes, tags, setup, cv, audit, tools, site/home/pages, media, operations, platform sites, billing).
- [x] Immersive editor: `EditorImmersiveHeader` + `publicSiteContainerClassName`; custom page missing slug uses `DashboardEmptyState`.
- [ ] Optional: replace remaining `text-slate-*` on About blocks with `text-foreground` / `border-border` in a focused pass (large file).

**Verify:** `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
