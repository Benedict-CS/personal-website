# Platform Features (Overview)

English-only UI copy in the app. **Light theme only** — dark mode is not supported.

This document summarizes capabilities for operators, contributors, and future migration. For environment variables see [ENVIRONMENT.md](ENVIRONMENT.md); for deployment see [DEPLOYMENT.md](DEPLOYMENT.md) and [OPERATIONS_AND_RELIABILITY.md](OPERATIONS_AND_RELIABILITY.md).

---

## Public site

- **Pages:** Home, About, Blog (list, archive, **per-tag** `/blog/tag/[slug]` — **canonical URLs + Twitter/OG** where listed), Contact, dynamic `/page/[slug]` (canonical URL, Open Graph, Twitter summary, description from body via `metaDescriptionFromMarkdown` after stripping schedule/theme/brand hints), RSS (`/feed.xml`), sitemap. Custom page **bold** theme stays light (strong border, no dark panel).
- **Sitemap:** Custom page URLs use `isCustomPagePublicOnSite()` so **scheduled** drafts that are already live on `/page/[slug]` are included, not only rows with `published: true`.
- **Previews:** `/blog/preview` links to **Edit in dashboard**; `/page/preview` links to **visual editor** and **custom pages list** for faster iteration.
- **Blog posts:** Reading time, TOC, prev/next, related posts, share buttons, optional Giscus comments, Open Graph and Twitter metadata (including **Twitter image** for large cards), **Article + BreadcrumbList** JSON-LD. Meta descriptions use `metaDescriptionFromMarkdown()` so snippets stay within length limits without a redundant ellipsis on short posts.
- **Responsive layout:** Mobile-first grids, sticky TOC on large screens, readable typography (`prose-reading`).
- **404 page:** Quick links including **`/?search=open`** to launch the navbar **global search** panel (query param is removed after open).

---

## Content management (dashboard)

- **Posts:** Markdown editor (live preview, light-only), drag-and-drop images, media library insertion, templates, version history, autosave, **word count and estimated read time**, shareable **draft preview** links (`/blog/preview?token=…`), scheduling, categories, tags.
- **Shortcuts:** `Ctrl/Cmd+S` save, `Ctrl/Cmd+Enter` publish when applicable (see in-editor help).
- **Custom pages, home sections, site settings, media, tags, CV, analytics, audit log** — see [DASHBOARD_USER_GUIDE.md](DASHBOARD_USER_GUIDE.md). Custom pages list includes a collapsible **URLs, preview, and responsive layout** guide.
- **Visual editor** (`/editor/...`): **Unsaved changes** badge in the floating bar, browser tab title prefix `Unsaved ·`, and `beforeunload` guard; baseline resets after a successful save.

---

## Analytics and operations

- **Dashboard analytics:** Date range, IP filter, CSV export, opt-out for owner browser, destructive clear flows.
- **Visualization:** **Path distribution bars** (top paths by views), KPI cards (total views, **unique IPs** in the top list, CV downloads, avg. time on page, 403 counts), plus tabular breakdowns.
- **Health:** `/api/live` (liveness), `/api/health` (readiness + DB, **`node`** runtime, optional **`appVersion`** from `APP_VERSION` / `GIT_COMMIT`), `HEAD` supported, `Cache-Control: no-store` on probes. Dashboard cards poll health and show deployment label and Node.js version when present.
- **Smoke script:** `scripts/verify-health.sh` — curls `/api/live` and `/api/health`, then validates readiness JSON (`ok: true`, `node` present) with Python 3.
- **Dashboard:** Under **Manage**, **Posts** is listed next to media and site settings. **Site overview** includes an **Operations & portability** card (monitor URLs, repo doc paths, links to Analytics and Setup).

---

## Contact API

- **`POST /api/contact`** is rate-limited per IP (see `src/lib/rate-limit.ts`). HTTP **429** responses include **`Retry-After: 60`**, **`Cache-Control: no-store, private`**, and **`X-RateLimit-Remaining`**.

---

## Security and compliance

- **Responsible disclosure:** See [.github/SECURITY.md](../.github/SECURITY.md) for how to report issues without public disclosure.
- **Security contact file:** `GET /.well-known/security.txt` (RFC 9116). Configure `SECURITY_TXT_CONTACT` and optionally `SECURITY_TXT_POLICY` in the environment.
- **Headers:** CSP, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, optional HSTS via `ENABLE_HSTS` (aligned in `next.config.ts` and middleware for HTTPS).
- **Auth:** NextAuth session for dashboard; optional Turnstile after failed logins; rate limits (Redis-backed when `REDIS_URL` is set).

---

## Automation and quality gate

- **CI:** `npm run verify` — ESLint, TypeScript, Jest, production build (see [.github/workflows/ci.yml](../.github/workflows/ci.yml)).
- **Dependabot:** [.github/dependabot.yml](../.github/dependabot.yml) — weekly PRs for npm and GitHub Actions (review, run `verify`, then merge).
- **Docker:** Multi-stage image, non-root user, migration retries, Compose healthchecks, OCI labels.

---

## Related docs

| Topic | Doc |
|--------|-----|
| Phased roadmap | [PHASE1_ARCHITECTURE.md](PHASE1_ARCHITECTURE.md), [PHASE2_CMS.md](PHASE2_CMS.md), [PHASE3_OBSERVABILITY_AND_SECURITY.md](PHASE3_OBSERVABILITY_AND_SECURITY.md), [PHASE4_UI_AND_SEO.md](PHASE4_UI_AND_SEO.md) |
| API surface | [API.md](API.md) |
| Production checklist | [PRODUCTION_READINESS.md](PRODUCTION_READINESS.md) |
