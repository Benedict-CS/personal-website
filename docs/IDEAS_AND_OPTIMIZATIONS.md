# Ideas: New Features, Management, Optimizations & UI/UX

A list of concrete items you can implement when you have time. Order by your priority; no code here — just descriptions and where to touch.

---

## New features (practical)

| Idea | What | Where / notes |
|------|------|----------------|
| **Draft auto-save** | While editing a post or custom page, periodically save draft to DB (or localStorage) so refresh doesn’t lose content. | Post edit page: debounced PATCH or dedicated autosave API; show "Draft saved at HH:mm". |
| **Post scheduling** | Publish at a future date/time. | Add `publishedAt` (optional) to Post; cron or on-demand job to set `published = true` when `publishedAt <= now`; dashboard: date/time picker. |
| **RSS for tag/category** | e.g. `/feed/tag/infra` for a tag-specific feed. | ✅ Done: `app/feed/tag/[tag]/route.ts` returns XML for posts with that tag. |
| **Sitemap index / per-section** | Split sitemap into post sitemap + pages sitemap for large sites. | Extend `app/sitemap.ts` or add `app/sitemap/posts/route.ts` and reference in index. |
| **Email notification** | When contact form is submitted, send yourself an email (you already have Resend/SMTP). | Already in place; optional: add "Reply-to" in dashboard and optional CC. |
| **Simple backup trigger** | Button in dashboard: "Download backup" (DB dump + list of media keys) or "Trigger backup script". | New API route that runs `pg_dump` (or calls existing script) and returns file; or trigger `backup-data.sh` via API (protect with auth). |
| **Post preview link expiry** | Preview token with expiration (e.g. 24h). | ✅ Done: `previewTokenExpiresAt` on Post; preview page returns 404 when expired. |
| **Custom page templates** | e.g. "Portfolio", "Services" with pre-filled sections. | Add templateId to CustomPage or JSON schema; "New from template" in dashboard with preset content. |

---

## Management & operations

| Idea | What | Where / notes |
|------|------|----------------|
| **Dashboard: system info** | Show Node version, last deploy time, DB size, RustFS usage (if API exists). | New card on dashboard home or Settings; API route that runs safe commands or reads env/build time. |
| **Media usage** | Total size of uploads, count, "largest files" list. | API that lists S3 objects and sums size; dashboard Media page or dashboard home. |
| **Bulk post actions** | Select multiple posts → publish, unpublish, delete, add tag. | Posts list: checkboxes + toolbar "Publish selected", "Delete selected"; API bulk PATCH/DELETE. |
| **Tag merge** | Merge tag A into B (reassign all posts, delete A). | Dashboard Tags: "Merge into…" action; API that updates Post-Tag and deletes old tag. |
| **Audit log (simple)** | Log who (IP/session) did what (post created, config updated) and when. | New table or append-only log; write from API routes on mutating actions; dashboard "Recent activity" page. |
| **Export all content** | Export posts + custom pages as Markdown or JSON for backup. | API route (auth) that reads all posts/pages and returns ZIP or JSON; button in dashboard. |
| **Import posts** | Upload Markdown/JSON to create posts. | Dashboard: upload file; API parses and creates posts (with slug conflict handling). |

---

## Performance & technical optimization

| Idea | What | Where / notes |
|------|------|----------------|
| **ISR / revalidate for blog** | Cache blog list and post pages with `revalidate = 60`. | ✅ Done: `revalidate = 60` on blog list and post page; `revalidatePath` in posts API on create/update/delete. |
| **Image optimization** | Use Next.js Image for dashboard and public images. | Replace `<img>` with `<Image>` where URLs are from your domain; ensure `images.domains` or remotePatterns if needed. |
| **Lazy load dashboard chunks** | Reduce initial JS: lazy load heavy pages (e.g. About editor, Media). | `next/dynamic` for dashboard content pages; keep shell and nav eager. |
| **DB connection pooling** | If you see connection exhaustion under load. | Prisma connection pool (e.g. PgBouncer) or Prisma’s own pooling; document in DEPLOYMENT. |
| **S3 multipart / large uploads** | For large media, use multipart upload. | In upload API, if file size > threshold, use S3 multipart; optional progress in UI. |

---

## UI/UX (dashboard)

| Idea | What | Where / notes |
|------|------|----------------|
| **Loading skeletons** | Replace generic spinner with skeleton for list/detail. | Add `loading.tsx` (or skeleton components) for dashboard/posts, dashboard/media, dashboard/content/*. |
| **Empty states** | Friendly illustration + CTA when no posts, no media, no tags. | Posts list, Media, Tags: when length === 0, show illustration + "Create first post" etc. |
| **Confirm before destructive action** | Delete post, delete media, clear analytics: confirm dialog. | Use existing `ConfirmDialog`; ensure every delete path (post, custom page, media, tag) uses it. |
| **Keyboard shortcuts** | e.g. ⌘S save, ⌘K already exists; ⌘Enter publish. | In post/edit and content pages: `useEffect` with keydown; show shortcuts in command palette or help. |
| **Breadcrumb links** | Clickable breadcrumb (Dashboard > Content > Site settings). | `DashboardBreadcrumbs`: make each segment a link (except current page). |
| **Form dirty state** | Warn when leaving with unsaved changes (you have LeaveGuard). | Ensure all forms that mutate data use LeaveGuard or explicit "Unsaved changes" warning. |
| **Success feedback** | After save: toast + optional "View on site" link. | After PATCH/POST in content/post pages: toast("Saved"); optional link to public URL. |
| **Mobile: bottom nav or drawer** | On small screens, sidebar is awkward; add bottom nav or slide-out menu. | Dashboard shell: media query; below breakpoint show bottom nav or hamburger → drawer with same nav items. |
| **Dark mode** | Site config has themeMode; apply it to dashboard and public site. | Add `next-themes` or class on `<html>` from themeMode; dashboard and public layout read theme and apply `dark:` classes. |
| **Inline validation** | Show field-level errors (e.g. slug format, required) before submit. | Forms: on blur or on change validate and set local error state; display under each field. |
| **Pagination or infinite scroll** | Posts list, media list: don’t load all at once. | Posts: API already supports pagination; dashboard posts list: add page size and "Load more" or page numbers. |

---

## UI/UX (public site)

| Idea | What | Where / notes |
|------|------|----------------|
| **Skip to content** | Accessibility: link at top to jump to main content. | Layout: first focusable element "Skip to main content" linking to `#main` or main landmark. |
| **Reading progress** | Thin bar at top showing scroll progress in long posts. | Blog post layout: `useRef` + scroll listener; fixed bar with `width: progress%`. |
| **Table of contents** | For long posts, show headings and anchor links in sidebar or top. | Parse Markdown headings (rehype-slug already adds ids); component that renders list of links to #heading-id. |
| **Print styles** | Clean print: hide nav/footer, expand content. | `print.css` or `@media print` in globals: hide header/footer/sidebar, show only main content. |
| **Share buttons** | Share post to Twitter, LinkedIn, copy link. | Post page: "Share" with Web Share API or static links (twitter.com/intent/..., linkedin.com/shareArticle). |
| **Related posts** | Show 3–5 related posts (same tag or recent). | Blog post page: fetch by tag or recent; section "Related" at bottom. |
| **Estimated read time** | You have `calculateReadingTime`; show it prominently. | Already on cards; ensure single post page shows it near title. |
| **Dark mode (public)** | Respect themeMode (light/dark/system) from site config. | Same as dashboard: apply theme to public layout and tailwind `dark:` variants. |

---

## Security & robustness

| Idea | What | Where / notes |
|------|------|----------------|
| **Rate limit dashboard login** | You have login rate limit; ensure it’s strict enough. | Review `lib/login-rate-limit`; optional: add CAPTCHA after N failures. |
| **CSP headers** | Reduce XSS risk. | `next.config` or Nginx: Content-Security-Policy; start with report-only, then enforce. |
| **Security headers** | X-Frame-Options, X-Content-Type-Options, etc. | Same as CSP; document in DEPLOYMENT. |
| **Input sanitization** | Strip or escape HTML in post/custom page content where needed. | If you render HTML (e.g. rehype-raw), ensure sanitization; or restrict to safe tags. |

---

## Quick wins (low effort)

- Add `loading.tsx` for dashboard routes that don’t have one (e.g. content/home, content/about, media).
- Add empty-state message + CTA on dashboard posts list when there are no posts.
- Make breadcrumb segments clickable (except current).
- Add "View on site" link in toast after saving post or site config.
- Add `revalidate = 60` (or 300) to blog list and post pages.
- Add skip-to-content link in public layout.
- Add reading progress bar on blog post page.

---

## Suggested order (if you want a path)

1. **Quick wins** (loading, empty states, breadcrumb links, revalidate, skip-to-content, reading progress).
2. **Management** (bulk post actions, tag merge, export content) — saves time as content grows.
3. **Features** (draft autosave, post scheduling, preview expiry) — improves daily use.
4. **UI polish** (dark mode, mobile nav, confirm dialogs everywhere, inline validation).
5. **Advanced** (audit log, import posts, backup trigger from dashboard).

You can pick any subset and implement in any order; this doc is a backlog, not a spec.
