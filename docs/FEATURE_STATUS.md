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
| Dark mode | **Not done** | Skipped per user request. |
| Mobile nav | **Done** | Hamburger + drawer on small screens; sidebar hidden on md below. |

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
| publishedAt | **Done** | Schema + UI (Schedule publish at datetime); blog/API treat as published when publishedAt ≤ now. |
| Tag RSS | **Done** | `/feed/tag/[tag]` returns RSS for that tag. |
| Preview expiry | **Done** | `previewTokenExpiresAt` in schema; preview page returns 404 when expired. |
| Page templates | **Done** | Custom pages: "From template" buttons for Portfolio and Services. |
| Backup trigger | **Done (minimal)** | Dashboard has `DashboardBackupTrigger`; API returns instructions (does not run backup script). |

---

## Management

| Item | Status | Notes |
|------|--------|-------|
| System info | **Done** | Dashboard shows Node version and DB size (pg_database_size). |
| Media usage | **Done** | Media page shows file count and total storage size. |
| Bulk actions | **Done** | Posts: select multiple → publish / unpublish / delete; bulk edit category, tags, published. Media: bulk delete. |
| Tag merge | **Done** | Tags page: list all tags + "Merge into..." dropdown; POST /api/tags/merge. |
| Audit log | **Done** | AuditLog model; logged from post create/update/delete and import; /dashboard/audit page. |
| Export/import | **Done** | GET /api/export (JSON); POST /api/import; Export/Import buttons on dashboard. |

---

## Perf

| Item | Status | Notes |
|------|--------|-------|
| next/image | **Done** | Blog (markdown), About, dashboard media/about; all use `unoptimized` to preserve original format (no WebP). |
| Dashboard dynamic import | **Done** | About editor and Media page use `next/dynamic` with loading skeleton; MDEditor already dynamic. |

---

## Advanced / Ops

| Item | Status | Notes |
|------|--------|-------|
| Sitemap split | **Done** | `generateSitemaps()` returns id 0 (static + custom pages) and id 1 (blog posts); `/sitemap/0.xml`, `/sitemap/1.xml`. |
| Form inline validation | **Done** | Slug format (lowercase, hyphens) and required title on blur/change; post edit, new post, custom pages. |
| List pagination / Load more | **Done** | Posts: server-side pagination (page, limit 20). Media: client "Load more" (24 per page). |
| Security headers | **Done** | X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy; CSP report-only. |
| S3 multipart + progress | **Done** | Server: multipart upload for files ≥ 5MB. Client: XHR upload with progress bar (file count + %). |

---

## Summary

- **Done:** Quick wins; dashboard skeleton, confirm dialogs, shortcuts, mobile nav (drawer); public TOC, print, share, related posts; draft autosave, publishedAt (UI + logic), tag RSS, preview expiry, page templates, backup trigger; system info (Node + DB size), media usage, tag merge, audit log, export/import; bulk actions; next/image (unoptimized); dashboard lazy (About, Media); sitemap split; form inline validation; list pagination / Load more; security headers (CSP report-only); S3 multipart + upload progress.
- **Not done:** Dark mode (skipped per user request).
