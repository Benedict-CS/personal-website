# Feature status (from backlog)

Status of items from the original todo / IDEAS list. **Done** = implemented; **Partial** = partly done; **Not done** = not implemented.

---

## Quick wins

| Item | Status | Notes |
|------|--------|-------|
| loading.tsx | **Done** | Dashboard: content/*, media, tags, posts, setup, cv, notes all have loading.tsx (skeleton-style). |
| revalidate | **Done** | `revalidate = 60` on blog list and post page; `revalidatePath` in posts API on create/update/delete. |
| skip-to-content | **Done** | In root layout; `.skip-link` in globals.css. |
| reading progress | **Done** | `ReadingProgress` on blog post and preview pages. |
| breadcrumbs clickable | **Done** | Dashboard breadcrumbs use `LeaveGuardLink` for non-last segments. |
| toast "View on site" | **Done** | Post edit page and site config success message include "View on site" link. |
| empty states | **Done** | Posts list and media have empty state + CTA. |

---

## UI Dashboard

| Item | Status | Notes |
|------|--------|-------|
| Skeleton | **Done** | loading.tsx uses animate-pulse skeleton blocks. |
| Confirm dialogs | **Done** | Delete post, delete media, bulk actions, analytics clear use `ConfirmDialog`. |
| Shortcuts | **Done** | Post edit: ⌘S save, ⌘Enter publish; command palette ⌘K. |
| Dark mode | **Not done** | `ThemeApplier` currently forces `data-theme="light"`; no dashboard dark theme. |
| Mobile nav | **Not done** | No bottom nav or drawer for small screens; sidebar only. |

---

## UI Public

| Item | Status | Notes |
|------|--------|-------|
| TOC | **Done** | `TableOfContents` on blog post page. |
| Print | **Done** | `@media print` in globals.css (hide nav/footer/sidebar). |
| Share | **Done** | `ShareButtons` on blog post page. |
| Related posts | **Done** | Up to 5 related posts by tag on blog post page. |

---

## Features

| Item | Status | Notes |
|------|--------|-------|
| Draft autosave | **Done** | Post edit: debounced 5s autosave (content + meta), `autosave: true` in API; "Draft saved" toast. |
| publishedAt | **Partial** | Column in schema + migration; no UI (date picker) and no logic yet (cron or read-time "show if publishedAt ≤ now"). |
| Tag RSS | **Done** | `/feed/tag/[tag]` returns RSS for that tag. |
| Preview expiry | **Done** | `previewTokenExpiresAt` in schema; preview page returns 404 when expired. |
| Page templates | **Not done** | No "New from template" (Portfolio, Services) for custom pages. |
| Backup trigger | **Done (minimal)** | Dashboard has `DashboardBackupTrigger`; API returns instructions (does not run backup script). |

---

## Management

| Item | Status | Notes |
|------|--------|-------|
| System info | **Not done** | No Node version / deploy time / DB size card on dashboard. |
| Media usage | **Not done** | No total size or "largest files" on Media page. |
| Bulk actions | **Done** | Posts: select multiple → publish / unpublish / delete; bulk edit category, tags, published. Media: bulk delete. |
| Tag merge | **Not done** | Tags page has cleanup (quotes); no "Merge A into B". |
| Audit log | **Not done** | No table or page for "who did what when". |
| Export/import | **Not done** | No export-all (Markdown/JSON) or import-posts API/UI. |

---

## Perf

| Item | Status | Notes |
|------|--------|-------|
| next/image | **Partial** | Used on media page; not everywhere (e.g. public blog images). |
| Dashboard dynamic import | **Partial** | Only MDEditor uses `next/dynamic`; other heavy dashboard pages are not lazy-loaded. |

---

## Summary

- **Done:** Quick wins (loading, revalidate, skip-to-content, reading progress, breadcrumbs, View on site, empty states); dashboard skeleton, confirm dialogs, shortcuts; public TOC, print, share, related posts; draft autosave, tag RSS, preview expiry, backup trigger (instructions only); bulk actions (posts + media).
- **Partial:** publishedAt (schema only), next/image (some pages), dashboard dynamic (MDEditor only).
- **Not done:** Dark mode (dashboard/public), mobile nav, page templates, system info, media usage, tag merge, audit log, export/import.
