# Phase 2 — Core Platform and Admin (CMS)

This document tracks CMS and dashboard improvements: editing flow, draft previews, templates, and responsive (RWD) content.

---

## Post editor UX

- **Stats:** Word count and estimated reading time update as you type (aligned with public post reading time).
- **Shortcuts:** Collapsible **Editor shortcuts and preview tips** (`Ctrl/Cmd+S` save, `Ctrl/Cmd+Enter` publish when applicable).
- **Preview:** Live Markdown preview uses the **light** theme only; **Share draft link** is for reviewers without a login.

---

## Draft preview (posts)

- **Share draft link** generates a tokenized URL: `/blog/preview?token=…` (read-only draft view).
- **Public help page:** A request to `/blog/preview` **without** a token shows instructions (not a silent 404).
- **Analytics:** Stored referrers strip sensitive query parameters (see `src/lib/analytics-referrer.ts`).
- **Post editor:** The edit screen includes inline help explaining the above (see `src/app/dashboard/posts/[id]/page.tsx`).

---

## Templates and RWD

- Site-level templates are configured in **Dashboard → Content → Site settings** (`templateId`, nav, footer).
- **Custom pages** (`Dashboard → Content → Custom pages`): inline help explains public URL `/page/[slug]`, builder, preview links, and templates; checkboxes use light styling only.
- Public layouts use responsive utilities (`container`, breakpoints, `min()` widths on editor pages).
- Block builder themes (`clean` / `soft` / `bold`) apply to SaaS builder flows; the personal blog uses the main layout and prose styles in `globals.css`.

---

## Related

- [DASHBOARD_USER_GUIDE.md](DASHBOARD_USER_GUIDE.md)
- [SITE_SETTINGS.md](SITE_SETTINGS.md)
- [PHASE1_ARCHITECTURE.md](PHASE1_ARCHITECTURE.md)
