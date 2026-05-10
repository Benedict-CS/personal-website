# API Reference

This document lists REST API routes and their intended use. All routes are under the base URL (e.g. `https://yoursite.com`).

---

## Public (no auth)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/site-config` | Site config for render (nav, meta, logo). Cached. |
| GET | `/api/site-content?page=home` | Home page content (sections, CTAs). |
| GET | `/api/site-content?page=contact` | Contact page content. |
| GET | `/api/custom-pages/slug/[slug]` | Custom page by slug (public). |
| GET | `/api/custom-pages/preview` | Preview token validation (query). |
| POST | `/api/contact` | Contact form submit. Rate limited per IP; **429** returns `Retry-After: 60`, `Cache-Control: no-store`, `X-RateLimit-Remaining`. |
| GET | `/api/search` | Global search (posts, pages). |
| GET | `/.well-known/security.txt` | Security contact hints (RFC 9116); set `SECURITY_TXT_CONTACT` / `SECURITY_TXT_POLICY`. |
| GET, HEAD | `/api/live` | Liveness (no DB). `HEAD` returns status only. |
| GET, HEAD | `/api/health` | Readiness (DB ping). JSON includes `uptimeSeconds`, `node` (Node.js version), and may include `appVersion` (`APP_VERSION` / `GIT_COMMIT`). `Cache-Control: no-store`. |
| GET, HEAD | `/api/v1/health` | Same as `/api/health`; `GET` JSON includes `version: "v1"` plus optional `appVersion` and `node`. |
| GET | `/api/giscus-config` | Giscus comment widget config. |
| POST | `/api/analytics/view` | Page view (requires `X-Analytics-Secret`). |
| POST | `/api/analytics/leave` | Leave event (duration). |
| GET | `/api/media/serve/[filename]` | Serve uploaded media by filename. |
| GET | `/api/about/serve/[filename]` | Serve About section image. |

---

## Auth (NextAuth)

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/auth/*` | NextAuth (signin, signout, session, csrf). |
| GET | `/api/auth/captcha-required` | Whether CAPTCHA is required for sign-in. |

---

## Dashboard (session required)

All routes below require a valid NextAuth session (cookie). Return `401 Unauthorized` otherwise.

### Site and content

| Method | Path | Description |
|--------|------|-------------|
| PATCH | `/api/site-config` | Update site config (nav, meta, contact email). |
| PATCH | `/api/site-content` | Update home or contact content. |
| GET/PATCH | `/api/custom-pages/*` | CRUD and reorder custom pages. |
| GET/POST/PATCH | `/api/about/config` | About config. |
| POST | `/api/about/upload` | Upload About image. |
| GET | `/api/about/cleanup` | List or delete unused About images. |

### Posts and tags

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/posts` | List or create posts. |
| GET/PATCH/DELETE | `/api/posts/[id]` | Single post. |
| POST | `/api/posts/[id]/duplicate` | Duplicate post. |
| POST | `/api/posts/bulk` | Bulk actions. |
| GET/POST | `/api/posts/[id]/versions` | Version history. |
| POST | `/api/posts/[id]/versions/[versionId]/restore` | Restore version. |
| GET/POST | `/api/posts/[id]/preview-token` | Create preview token. |
| GET/PATCH | `/api/tags` | Tags. |
| POST | `/api/tags/merge` | Merge tags. |
| POST | `/api/tags/cleanup` | Cleanup unused tags. |

### Media

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/media` | List media. |
| POST | `/api/upload` | Upload file. |
| DELETE | `/api/media/delete` | Delete media. |
| GET | `/api/media/usage` | Usage and unused file analysis. |
| POST | `/api/media/optimize` | Optimize images (dry-run or execute). |
| POST | `/api/media/cleanup` | Delete unused media. |

### Editor and CV

| Method | Path | Description |
|--------|------|-------------|
| PATCH | `/api/editor/inline-content` | Inline editor save (home/contact). |
| GET/POST | `/api/editor/revisions` | List or create revision. |
| GET | `/api/editor/revisions/[id]` | Single revision. |
| POST | `/api/cv/upload` | Upload CV PDF. |
| GET | `/api/cv/download` | Download CV. |

### Audit and analytics

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/audit` | Audit log (filtered). |
| GET | `/api/analytics/stats` | Analytics stats. |
| POST | `/api/analytics/clear` | Clear analytics. |

### Backup and export/import

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/backup/trigger` | Trigger backup (returns instructions). |
| POST | `/api/export` | Export data. |
| POST | `/api/import` | Import data. |

---

## Visual builder (dashboard editor)

Routes under `/api/builder/*` support the block/template library used by the immersive editor (`SiteBlockBuilder`).

---

## Rate limiting and security

- **Contact form:** Rate limited by IP.
- **Sign-in:** Rate limited; CAPTCHA required after N failures (see login-rate-limit).
- **APIs:** Session required for write and dashboard endpoints; validate and sanitize all inputs; Prisma parameterizes queries.

### Middleware (`src/proxy.ts`)

Responses may include **`x-request-id`** for log correlation.

| Situation | Status | Notable headers |
|-----------|--------|-----------------|
| IP blocked (`ACCESS_BLOCK_IP_PREFIXES` / `ACCESS_ALLOW_IPS`; full-site by default when prefixes set; **`ACCESS_BLOCK_ADMIN_ONLY=1`** or **`ACCESS_BLOCK_PUBLIC=0`** for selective 403) | **403** (see [ENVIRONMENT.md](ENVIRONMENT.md)) | `Cache-Control: no-store, private` |

**HSTS:** `Strict-Transport-Security` is added by middleware only when **`ENABLE_HSTS=true`** and the request is served over HTTPS (see [ENVIRONMENT.md](ENVIRONMENT.md)). This matches `next.config.ts` static headers.
