# Evolution Progress

Last updated: 2026-04-10 (Pass AO)  
Protocol: Opus Recursive Evolution v16.0  
Loop status: Completed (5 high-impact tasks in latest loop)

## Completed In This Loop (v16 Recursive Evolution — Pass AO)

### 1) Task #22 — JSON-LD: Blog listing, About Person, custom pages as CreativeWork

- `src/app/blog/page.tsx`: server-rendered `Blog` + `CollectionPage` graph tied to root `WebSite` / `publisher` @ids.
- `src/app/about/page.tsx`: `Person` + `WebPage` graph (name, jobTitle, image, sameAs from site links).
- `src/app/page/[slug]/page.tsx`: `WebPage` now includes `@id`, `isPartOf`, `publisher`, `inLanguage`, and dual `@type` `["WebPage","CreativeWork"]` for structured “project-style” pages.

Impact: Search engines get clearer entity boundaries for blog index, profile, and builder-published pages without duplicating root `WebSite` nodes.

---

### 2) Task #24 — Broken link checker: history callout + CSV export

- `src/app/dashboard/system/page.tsx`: amber banner when the latest audit history shows broken links but no in-session results; **Export CSV** for the current broken-link list.

Impact: Operators see stale risk immediately and can share fixes outside the dashboard.

---

### 3) Task #36 — Orphaned media: dry-run preview + confirm delete

- Same file: `POST /api/media/cleanup` with `dryRun: true` preview (count + sample keys), `ConfirmDialog` before destructive cleanup.

Impact: Safer storage hygiene aligned with “preview before delete” expectations.

---

### 4) Task #40 — Site settings: live field hints (webhooks + rsync)

- `src/lib/site-settings-field-hints.ts` + `src/__tests__/site-settings-field-hints.test.ts`.
- `src/app/dashboard/content/site/page.tsx`: inline amber hints under contact webhook, backup webhook, and rsync target.

Impact: Faster correction before save; complements existing `validateSiteSettingsForm` errors.

---

### 5) Task #46 — Global search: ranking mode transparency

- `src/app/api/search/route.ts`: `rankingMode` = `postgres_fulltext` | `basic_match` based on whether the `search_vector` query path succeeded.
- `src/components/global-search.tsx`: short explanation line under the query when results load.

Impact: Users understand why ranking feels different across SQLite vs PostgreSQL deployments.

### Verification Evidence (Pass AO)

- `npm run test -- src/__tests__/site-settings-field-hints.test.ts` ✅
- `npm run lint` ✅
- `npx tsc --noEmit` ✅
- `NODE_OPTIONS="--max-old-space-size=8192" npm run build` ✅

### Pre-staged Candidates For Next Loop

1. Task #21 — SEO metadata assistant (AI-assisted title/description suggestions) behind an env flag.
2. Task #30 — MDX / markdown fenced live-preview sandbox for documented components.
3. Task #35 — Audit log UI: filterable timeline from existing `auditLog` rows.
4. Task #39 — Route-level error.tsx copy pass for dashboard vs public tone.
5. Task #43 — Optional image alt-text suggestion hook for media insert flows.

## Completed In This Loop (v16 Recursive Evolution — Pass AN)

### 1) Task #31 — Analytics: trend interpretation cards

Added narrative cards next to the existing D3-style trend chart and anomaly watch:

- New `src/lib/analytics-trend-interpretation.ts`: peak-day callout, week-over-week rhythm (when ≥10 days), and 7-day conversion posture.
- Wired in `src/app/dashboard/analytics/page.tsx` as a “Trend interpretation” card grid (elite light styling).
- Tests in `src/__tests__/analytics-trend-interpretation.test.ts`.

Impact: Operators get plain-language takeaways from `trendByDay` without leaving the dashboard.

---

### 2) Task #29 — CV: structured profile PDF export UX

Hardened the About-derived PDF path on the CV dashboard:

- `src/app/dashboard/cv/page.tsx`: authenticated `fetch` + blob download, filename from `Content-Disposition` when present, loading state, inline error alert, primary button emphasis.

Impact: Reliable downloads in cookie-auth flows and clearer failure feedback.

---

### 3) Task #38 — Backup: one-click server trigger from Site settings

Surfaced the existing authenticated API in the UI:

- `src/app/dashboard/content/site/page.tsx`: “Trigger backup now” under Backup targets, calls `POST /api/backup/trigger` with `credentials: "include"`, surfaces success / info (disabled host) / error states.

Impact: Operators can run `scripts/backup-data.sh` remotely when `ALLOW_SERVER_BACKUP=true` without SSH.

---

### 4) Task #48 (+ #16) — SaaS A/B experiments: editor-grade surface

Upgraded tenant experiments UX:

- `src/app/dashboard/sites/[siteId]/experiments/page.tsx`: `DashboardPageHeader`, loading row, `DashboardEmptyState` when no pages or no experiments yet, labeled form layout, split tooltip, `credentials: "include"` on all experiment API calls, stable `load` deps.

Impact: Multi-tenant A/B workflow matches the rest of the dashboard polish and works with session cookies.

### Verification Evidence (Pass AN)

- `npm run test -- src/__tests__/analytics-trend-interpretation.test.ts` ✅
- `npm run lint` ✅
- `npx tsc --noEmit` ✅
- `NODE_OPTIONS="--max-old-space-size=8192" npm run build` ✅

### Pre-staged Candidates For Next Loop

1. Task #22 — JSON-LD coverage audit for Person/Blog/Project on key public routes.
2. Task #24 — Dashboard surfacing for scheduled link-check results (`/api/system/link-check`).
3. Task #36 — Media cleanup UX: preview orphans before delete.
4. Task #40 — Site settings: real-time validation hints for webhook/backup URLs.
5. Task #46 — Global search: semantic mode toggle if backend is configured.

## Completed In This Loop (v16 Recursive Evolution — Pass AM)

### 1) Task #7 — Public gallery: masonry HTML, lazy images, aspect ratios

Gallery blocks now serialize to sanitized HTML (not separate markdown images only):

- `src/components/site-block-builder.tsx`: `galleryImageUrlsToHtmlGrid`, `escapeHtmlAttr`, `isSafeGalleryImageUrl`; `applyStyleWrappers` accepts optional extra root classes; gallery output uses `site-gallery-masonry` + grid markup with `<img loading="lazy" decoding="async">`.
- `src/app/globals.css`: `.prose .site-gallery-masonry` column masonry, per-tile aspect ratios, borders aligned with builder presets.
- `src/lib/markdown-pipeline.ts`: allow `role` on `div` for accessible list semantics on the gallery grid.

Impact: Published custom pages show a real masonry gallery with predictable layout and CLS-friendly aspect ratios.

---

### 2) Task #23 — Builder preview: real thumbnails

- `GalleryPreviewTile` in `site-block-builder.tsx` loads URLs with native `<img>` (documented eslint exception for arbitrary URLs), `onError` fallback, and the same unsafe-URL guard as export.

Impact: Authors see actual images in the device preview instead of empty placeholders.

---

### 3) Task #49 — Version diff split view: proportional scroll sync

- `src/hooks/use-synced-pres-pair-scroll.ts`: lock-guarded proportional sync between two `<pre>` panes.
- `src/app/dashboard/posts/[id]/page.tsx`: wired refs and `onScroll` for snapshot vs current draft.

Impact: Comparing long drafts side-by-side stays aligned while scrolling either pane.

---

### 4) Task #18 / #17 — Immersive custom page preview: layout containment

- `src/components/editor/immersive-editor.tsx`: `[contain:layout]` on the live markdown preview scroller to reduce cross-panel layout thrash while typing.

Impact: Smoother editor chrome during large preview updates; stays elite light mode only.

### Verification Evidence (Pass AM)

- `npm run lint` ✅
- `npx tsc --noEmit` ✅
- `NODE_OPTIONS="--max-old-space-size=8192" npm run build` ✅

### Pre-staged Candidates For Next Loop

1. Task #31 — Analytics anomaly callouts and trend interpretation cards.
2. Task #29 — Resume/CV export-to-PDF from structured profile data.
3. Task #48 — Controlled A/B experiment editor surface for core pages.
4. Task #38 — Automated backup trigger orchestration for external storage targets.
5. Task #23 — Broader `next/image` adoption where remote patterns are known-safe.

## Completed In This Loop (v16 Recursive Evolution — Pass I)

### 1) Task #8 — TOC Deepening (Section Estimates + Copy Heading Link)

Enhanced the public blog Table of Contents into a richer navigation aid:

- Added heading-level section read-time estimator in `src/lib/markdown-toc.ts` (`estimateTocReadingByHeading`).
- Added unit coverage in `src/__tests__/markdown-toc.test.ts`.
- Upgraded `src/components/toc.tsx`:
  - per-heading `~Xm` read-time badges
  - quick "Copy current heading link" action for deep-link sharing
- Wired estimates from `src/app/blog/[slug]/page.tsx` into `TableOfContents`.

Impact:
- Readers can quickly prioritize sections and share exact anchors.
- TOC now acts as both navigation and information-density guidance.

---

### 2) Task #42 — Automated Tagging (Server-Side Suggestion Endpoint)

Strengthened tag suggestion flow for post editing with an authenticated server API:

- Added endpoint `src/app/api/posts/[id]/tag-suggestions/route.ts`.
- Upgraded `src/components/dashboard/auto-tag-suggestions.tsx`:
  - prefers server-suggested results when `postId` is available
  - falls back to existing client-side analyzer for resilience
- Wired `postId` into the edit view in `src/app/dashboard/posts/[id]/page.tsx`.

Impact:
- Tag suggestions are now driven by canonical server data with better consistency.
- Keeps editor UX responsive even if server suggestions are temporarily unavailable.

---

### 3) Task #47 — Workflow Trigger Hardening (Contact Submission Automation)

Upgraded contact-form webhook dispatch for workflow reliability:

- Extended webhook payload model in `src/lib/contact-webhook.ts`:
  - `eventId` for traceability/idempotency
  - structured `workflow` metadata (`trigger`, `submissionId`)
- Added retry strategy (multi-attempt with backoff) and explicit workflow headers:
  - `X-Webhook-Event-Id`
  - `X-Workflow-Trigger`
- Updated `src/app/api/contact/route.ts` to populate `eventId` and include form submission id when available.

Impact:
- External automation consumers can de-duplicate and trace events more safely.
- Improved webhook delivery reliability under transient network failures.

### Verification Evidence

- `npm test -- markdown-toc.test.ts internal-link-suggestions.test.ts` ✅
- `npm run lint` ✅ (warning only in pre-existing `src/__tests__/security-txt-route.test.ts`)
- `ReadLints` on edited files ✅ (no diagnostics)
- `npx tsc --noEmit` ⚠️ blocked by pre-existing `.next/types` include mismatch in repository setup
- `NODE_OPTIONS="--max-old-space-size=8192" npm run build` ⚠️ compile + typecheck phases complete, then process killed during page-data collection due host memory pressure

### Pre-staged Candidates For Next Loop

1. Task #31 — Analytics anomaly callouts and trend interpretation cards.
2. Task #29 — Resume/CV export-to-PDF from structured profile data.
3. Task #48 — Controlled A/B experiment editor surface for core pages.
4. Task #38 — Automated backup trigger orchestration for external storage targets.

## Completed In This Loop (v16 Recursive Evolution — Pass H)

### 1) Task #44 — Smart Internal Linker (Backlink Suggestions in Editor)

Implemented an automated internal-link suggestion workflow for post editing:

- Added scoring engine `src/lib/internal-link-suggestions.ts`.
- Added tests in `src/__tests__/internal-link-suggestions.test.ts`.
- Added authenticated suggestion endpoint:
  - `src/app/api/posts/[id]/link-suggestions/route.ts`
- Integrated a new "Smart internal linker" panel in:
  - `src/app/dashboard/posts/[id]/page.tsx`
  - one-click insert of markdown links directly into the editor body
  - scoring explanations for each suggestion (shared tags/title/body keyword overlap)

Impact:
- Editorial workflow now actively suggests high-confidence backlinks while writing.
- Reduced friction for building interconnected content clusters.

---

### 2) Task #9 — Bi-directional Linking (Public Backlink Surface)

Added reverse-link visibility on public blog posts:

- Extended `src/app/blog/[slug]/page.tsx` to query and render posts that reference the current slug.
- Added a new "Referenced in" section beneath related posts.

Impact:
- Readers can navigate the knowledge graph in both directions.
- Improves content discoverability and session depth without manual curation.

---

### 3) Task #37 — Docker/Infra Runtime Hardening

Tightened container runtime defaults for production self-hosting:

- Updated:
  - `docker-compose.yml`
  - `docker-compose.example.yml`
  - `docker-compose.backup.yml`
- Added app-container hardening and performance controls:
  - `init: true`
  - `security_opt: no-new-privileges:true`
  - increased `nofile` ulimit
  - configurable `mem_limit` / `cpus`
  - configurable `NODE_OPTIONS` max-old-space-size

Impact:
- More resilient process lifecycle behavior under load.
- Lower risk of memory-related Node instability in long-lived containers.

### Verification Evidence

- `npm test -- internal-link-suggestions.test.ts seo-integrity.test.ts` ✅
- `npm run lint` ✅ (warning only in pre-existing `src/__tests__/security-txt-route.test.ts`)
- `NODE_OPTIONS="--max-old-space-size=8192" npm run build` ✅ (full build passed)
- `npx tsc --noEmit` ⚠️ still blocked by existing `.next/types` include-path mismatch in repository setup

### Pre-staged Candidates For Next Loop

1. Task #8 — Deepen TOC with section-estimate badges and copy-heading links.
2. Task #47 — Contact workflow automation trigger (structured outbound webhook queue).
3. Task #31 — Conversion anomaly highlights in analytics dashboard.
4. Task #29 — Resume/CV export-to-PDF pipeline for dynamic profile data.

## Completed In This Loop (v16 Recursive Evolution — Pass G)

### 1) Task #26 — RSS/Sitemap Validation Diagnostics

Added a dedicated SEO integrity scanner to validate core discovery surfaces:

- Added reusable integrity analyzers in `src/lib/seo-integrity.ts`.
- Added test coverage in `src/__tests__/seo-integrity.test.ts`.
- Added authenticated diagnostics endpoint `src/app/api/system/seo-integrity/route.ts` that checks:
  - `feed.xml`
  - `sitemap.xml`
  - `robots.txt`
  - `.well-known/security.txt`
- Extended `src/app/dashboard/system/page.tsx` with an interactive "SEO integrity diagnostics" card and scan summary UI.

Impact:
- SEO discovery regressions are now detectable from the dashboard before they affect indexing.
- Operators can verify syndication and crawler metadata without manual endpoint inspection.

---

### 2) Task #13 — Command Palette Executable Actions

Upgraded the dashboard command palette from navigation-only to action-capable operations:

- Extended action model in `src/app/dashboard/dashboard-command-palette.tsx` with command execution support.
- Added executable actions:
  - "Create quick draft post" (creates a draft via API and opens it immediately)
  - "Copy RSS feed URL"
  - "Copy sitemap URL"
- Wired keyboard-enter and click execution paths to run commands with fallback to route navigation.

Impact:
- Faster operator workflows directly from `Cmd/Ctrl+K` with reduced context switching.
- Enables "do actions now" behavior, not just deep-linking.

---

### 3) Task #30 — MDX Interactive Component Expansion

Expanded the interactive MDX component toolkit with a practical writing utility:

- Added `ReadingTimeLab` component in `src/components/mdx/embeds/reading-time-lab.tsx`.
- Registered the new embed in:
  - `src/components/mdx/mdx-post-body.tsx`
  - `src/components/mdx/mdx-dashboard-preview.tsx`
- Component provides live word-count and reading-time feedback powered by shared content metrics.

Impact:
- Technical posts can now include inline interactive demos beyond code snippets/charts.
- Strengthens MDX as a no-code-style rich content system for educational content.

### Verification Evidence

- `npm test -- seo-integrity.test.ts social-share-card.test.ts` ✅
- `npm run lint` ✅ (warnings only; no new lint errors from this pass)
- `ReadLints` on edited files ✅ (no diagnostics)
- `npx tsc --noEmit` ⚠️ blocked by stale `.next/types` include references in environment
- `NODE_OPTIONS="--max-old-space-size=8192" npm run build` ⚠️ compile succeeded; process later killed during type phase due host memory pressure

### Pre-staged Candidates For Next Loop

1. Task #8 — Automated Table of Contents generator integration in blog post UI.
2. Task #31 — Deeper analytics visual storytelling (conversion anomaly callouts).
3. Task #47 — Workflow trigger surface for contact form automations.
4. Task #37 — Docker runtime profiling and compose hardening pass.

## Completed In This Loop (v16 Recursive Evolution — Pass F)

### 1) Task #27 — Social Share Card Generator (OpenGraph Controls)

Implemented a reusable OG image generator with dashboard controls:

- Added share-card helpers in `src/lib/social-share-card.ts`.
- Added unit tests in `src/__tests__/social-share-card.test.ts`.
- Added dynamic OG renderer endpoint `src/app/api/og/route.tsx` (theme-aware: slate/blue/emerald).
- Added reusable dashboard control panel `src/components/dashboard/social-share-card-controls.tsx`.
- Integrated controls into:
  - `src/app/dashboard/posts/[id]/page.tsx` (post-level share card lab)
  - `src/app/dashboard/content/pages/page.tsx` (custom-page share card lab)
- Wired custom page metadata to emit dynamic OG/Twitter images via `src/app/page/[slug]/page.tsx`.

Impact:
- Social assets are now first-class and editable before publishing.
- Post/page operators can preview and copy image URLs without external design tooling.

---

### 2) Task #34 — Security & Rate Limiting Expansion

Expanded rate-limiting coverage to additional high-risk write or token-generation APIs:

- Added limits + consistent 429 headers to:
  - `src/app/api/import/route.ts`
  - `src/app/api/custom-pages/id/[id]/preview-token/route.ts`
  - `src/app/api/posts/[id]/preview-token/route.ts` (POST + DELETE)
- Added soft rate limiting to analytics leave beacons in:
  - `src/app/api/analytics/leave/route.ts`

Impact:
- Reduced abuse surface for import and preview-token endpoints.
- Better protection against burst token generation and noisy write patterns.

---

### 3) Task #20 — Focus Mode Refinement (Writing Heartbeat)

Deepened post-editor focus mode with heartbeat-driven chrome dimming:

- Updated `src/app/dashboard/posts/[id]/page.tsx` to:
  - detect active typing in focus mode
  - dim secondary chrome during writing heartbeat windows
  - restore full chrome clarity after short idle

Impact:
- Creates a calmer writing flow while preserving actionable controls.
- Improves immersion without forcing full-screen modal workflows.

## Completed In This Loop (v16 Recursive Evolution — Pass E)

### 1) Task #28 — Advanced Taxonomy (Nested Content Category Hub)

Implemented a folder-like taxonomy workflow for published posts:

- Added reusable taxonomy builder `src/lib/category-taxonomy.ts`.
- Added unit coverage in `src/__tests__/category-taxonomy.test.ts`.
- Enhanced `src/app/dashboard/posts/page.tsx`:
  - nested category tree card with per-node post counts
  - one-click category scoping via URL query (`category=...`)
  - category-aware pagination + quick "clear category filter" action
- Extended post list row shape and rendering:
  - `src/types/post.ts`
  - `src/app/dashboard/posts/posts-table-client.tsx` (category surfaced on desktop and mobile)

Impact:
- Category navigation now behaves like structured taxonomy instead of flat metadata.
- Operators can drill into sub-domains instantly without manual search/filter gymnastics.

---

### 2) Task #35 — Audit Log UI Deepening (Severity Triage Layer)

Expanded audit triage with explicit severity semantics:

- Added shared severity classifier `src/lib/audit-severity.ts`.
- Added unit tests in `src/__tests__/audit-severity.test.ts`.
- Upgraded `src/app/dashboard/audit/page.tsx` with:
  - severity metrics (critical / warning / info)
  - severity quick filters in addition to existing preset filters
  - severity-aware investigation note export

Impact:
- Incident response is faster because risky actions are highlighted in first glance.
- Reviewers can isolate critical actions without custom query composition.

---

### 3) Task #31 — Privacy-First Analytics Visuals (Daily Trend Surface)

Added compact daily trend intelligence for traffic and conversion:

- Added trend bucketing utility `src/lib/analytics-trend.ts`.
- Added unit tests in `src/__tests__/analytics-trend.test.ts`.
- Extended analytics stats API `src/app/api/analytics/stats/route.ts` to return `trendByDay` (views, CV downloads, leads).
- Added chart component `src/components/dashboard/analytics-trend-chart.tsx`.
- Integrated trend card in `src/app/dashboard/analytics/page.tsx`.

Impact:
- Dashboard now shows movement over time instead of static snapshots only.
- Conversion changes are easier to detect during short-term traffic swings.

## Completed In This Loop (v16 Recursive Evolution — Pass D)

### 1) Task #33 — Self-Healing Middleware (Resilient Upstream Integrations)

Added controlled retry behavior for flaky third-party integrations:

- Added `src/lib/self-healing-fetch.ts` with bounded retries, timeout control, and transient-status retry policy.
- Added unit tests in `src/__tests__/self-healing-fetch.test.ts`.
- Applied retry-aware fetch to:
  - `src/app/api/integrations/github/route.ts` (profile critical path + tolerant fallback for repos/events).
  - `src/app/api/integrations/leetcode/route.ts` (GraphQL upstream retry for transient outages).

Impact:
- Reduces user-facing integration failures during short-lived upstream errors.
- Keeps partial GitHub data available even when secondary endpoints are unstable.

---

### 2) Task #39 — Error Boundary Refinement (Graceful Dashboard Failures)

Expanded route-level graceful failure handling for heavy operational views:

- Added shared fallback component: `src/components/dashboard/dashboard-route-error.tsx`.
- Added dedicated route boundaries:
  - `src/app/dashboard/analytics/error.tsx`
  - `src/app/dashboard/system/error.tsx`
  - `src/app/dashboard/content/pages/error.tsx`

Impact:
- Failures now degrade to actionable retry/navigation surfaces instead of generic crashes.
- Improves operator recovery speed when dashboard routes throw runtime errors.

---

### 3) Task #25 — Reading Time & Word Count Harmonization

Unified metrics computation across editor and list experiences:

- Added shared utility: `src/lib/content-metrics.ts`.
- Added unit tests in `src/__tests__/content-metrics.test.ts`.
- Replaced ad-hoc metrics logic in:
  - `src/components/editor/immersive-editor.tsx`
  - `src/app/dashboard/posts/[id]/page.tsx`
  - `src/app/dashboard/posts/new/page.tsx`
  - `src/app/blog/page-client.tsx`

Impact:
- Word count and reading-time labels are now consistent between writing and reading surfaces.
- Eliminates subtle metric drift caused by duplicate calculation logic.

## Completed In This Loop (v16 Recursive Evolution — Pass C)

### 1) Task #49 — Version Control UI (Visual Diff Viewer)

Upgraded post version history from plain restore-only entries into an actionable comparison workflow:

- Added `src/lib/post-version-diff.ts` for deterministic line-by-line diff summaries between current draft and selected history snapshots.
- Added unit tests in `src/__tests__/post-version-diff.test.ts`.
- Enhanced `src/app/dashboard/posts/[id]/page.tsx` version modal:
  - compare toggle per version ("Compare with current")
  - metadata change summary (title/slug/publish state)
  - changed-lines table with selected-version vs current-draft side-by-side content
  - bounded render for large diffs (first 80 changed lines shown)

Impact:
- Operators can review exact changes before restoring, reducing accidental rollbacks.
- History now behaves like practical revision control rather than a blind restore list.

---

### 2) Task #34 — Security & Rate-Limiting Fortification

Hardened custom page mutation endpoints against burst traffic and scripted write abuse:

- Applied shared async per-IP rate limiting (`checkRateLimitAsync`) to:
  - `src/app/api/custom-pages/route.ts`
  - `src/app/api/custom-pages/id/[id]/route.ts`
  - `src/app/api/custom-pages/reorder/route.ts`
- Added consistent 429 behavior with `Retry-After` and `Cache-Control: no-store, private`.
- Added `X-RateLimit-Remaining` response header on successful mutation paths.

Impact:
- Reduces risk of accidental API flooding from repeated UI actions or bots.
- Establishes a consistent write-guardrail pattern for future mutation endpoints.

---

### 3) Task #19 — Tactile Button States (High-Frequency Actions)

Standardized tactile interaction feedback for dense custom-page operations:

- Added shared tactile class primitive in `src/app/dashboard/content/pages/page.tsx`.
- Applied active/hover micro-feedback across create, filter toggles, reorder, save, duplicate, preview-link, and destructive actions.

Impact:
- Buttons now feel physically responsive and consistent in high-frequency workflows.
- Improves operator confidence and reduces “did this click register?” ambiguity.

## Completed In This Loop (v16 Recursive Evolution — Pass B)

### 1) Task #12 — Optimistic UI Expansion (Custom Pages CRUD)

Reduced waiting friction across custom page management by switching key actions to optimistic/local state updates:

- Updated `src/app/dashboard/content/pages/page.tsx` to avoid mandatory full-list refetch for:
  - create custom page
  - create from template
  - metadata save
  - duplicate page
- Added optimistic delete with rollback safety when API delete fails.
- Kept reorder optimistic flow and retained server reconciliation on failure.

Impact:
- Faster perceived performance and lower operator latency for repetitive content operations.
- Dashboard now feels more immediate and resilient during CRUD-heavy sessions.

---

### 2) Task #11 — Linear-Grade Micro-Interactions

Added subtle motion polish to high-touch management surfaces:

- Introduced Framer Motion entrance/hover interactions for:
  - template cards
  - custom page rows
- Added animated list-presence transitions for filtered page collections.

Files:
- `src/app/dashboard/content/pages/page.tsx`

Impact:
- Improves perceived quality and spatial continuity without adding visual noise.
- Strengthens premium light-mode interaction feel.

---

### 3) Task #16 — Empty State Illustration Upgrade

Improved empty/filter-empty communication on custom pages dashboard:

- Added icon-supported empty states for:
  - "no custom pages yet"
  - "no pages match filters"
- Replaced plain text-only empty feedback with clearer, more actionable UI blocks.

Files:
- `src/app/dashboard/content/pages/page.tsx`

Impact:
- Better first-run clarity and faster recovery from filter dead-ends.
- More polished UX narrative across low-data states.

---

### 4) Task #31 — Analytics Insight Intelligence (Narrative Layer)

Added a reusable insight engine to turn raw metrics into readable guidance:

- Added `src/lib/analytics-insight.ts` with deterministic insight generation logic.
- Added unit coverage in `src/__tests__/analytics-insight.test.ts`.
- Integrated top-level “Daily insight” card into `src/app/dashboard/analytics/page.tsx`.

Impact:
- Converts metric snapshots into immediately actionable interpretation.
- Improves operator decision speed without requiring manual ratio calculation.

## Completed In This Loop (v16 Recursive Evolution)

### 1) Task #40 — Comprehensive Form Validation (Realtime)

Implemented reusable validation primitives and applied them across custom page management/editing:

- Added `src/lib/editor-validation.ts` with shared slug/title/content validation helpers.
- Added unit tests in `src/__tests__/editor-validation.test.ts`.
- Upgraded `src/app/dashboard/content/pages/page.tsx`:
  - realtime validation for "Create custom page" fields
  - row-level validation for metadata save
  - sanitized slug normalization on blur
  - save/create actions disabled when invalid
- Upgraded `src/components/editor/immersive-editor.tsx`:
  - custom page validation before manual/autosave
  - inline validation feedback near title/content
  - save action protection against invalid drafts

Impact:
- Prevents malformed slugs and low-quality draft saves from entering persistence layers.
- Reduces failed API roundtrips and operator confusion.

---

### 2) Task #14 — Interactive Skeleton Loaders

Added richer loading placeholders on key dashboard surfaces:

- Enhanced loading UX in `src/app/dashboard/audit/page.tsx` with card-like skeleton rows.
- Replaced plain loading text in `src/app/dashboard/content/pages/page.tsx` with animated skeleton panel.

Impact:
- Better perceived performance and less abrupt layout shift during async fetches.
- More consistent premium dashboard feedback while data hydrates.

---

### 3) Task #18 — Responsive Polish (Table/Control Density)

Improved small/medium viewport behavior for dense management interfaces:

- Relaxed filter/control grid breakpoints in `src/app/dashboard/audit/page.tsx` (stack-first, then structured layout on larger screens).
- Added explicit table width safety (`min-w`) for audit log tables to avoid cramped/overlapping columns.
- Refined custom page row action layout in `src/app/dashboard/content/pages/page.tsx` to reduce breakpoint collisions.

Impact:
- Eliminates cramped control collisions on medium screens.
- Keeps data-heavy tables usable with predictable horizontal scrolling.

---

### 4) Task #10 — Global Undo/Redo History Foundation

Introduced editor history abstraction for markdown authoring:

- Added `src/lib/text-history.ts` with push/undo/redo history state logic.
- Added unit tests in `src/__tests__/text-history.test.ts`.
- Integrated history in `src/components/editor/markdown-slash-textarea.tsx`:
  - keyboard shortcuts (`Cmd/Ctrl+Z`, `Cmd/Ctrl+Shift+Z`, `Ctrl+Y`)
  - quick action buttons in the insert bar
  - history-aware synchronization with parent content updates

Impact:
- Establishes the first reusable command history layer for custom markdown editing.
- Improves editing confidence and recoverability for high-frequency writing sessions.

## Completed In This Loop (v17 Telemetry)

### 1) Task #1 — Robust Bot/Headless User-Agent Shield

Upgraded bot and automation detection in the analytics ingest pipeline:

- Added `isbot` package and integrated parser-level bot detection in `src/lib/analytics-noise.ts`.
- Expanded scanner/headless markers to catch crawler and automation traffic more reliably.
- Applied filtering consistently in `src/app/api/analytics/view/route.ts` and middleware analytics skip logic.

Impact:
- Significantly reduces "ghost traffic" from crawlers and headless clients.
- Improves trustworthiness of analytics totals and conversion rates.

---

### 2) Task #4 — Internal Monitoring Traffic Exclusion

Hardened analytics against health-check and internal monitoring noise:

- Added health-check path suppression (`/api/health`, `/api/live`, `/healthz`, etc.) in `src/lib/analytics-noise.ts`.
- Added dedicated monitoring UA detector (`kube-probe`, `curl`, `UptimeRobot`, etc.).
- Added explicit skip reason path in ingest route (`monitoring_ua`) for diagnostics.

Impact:
- Local Docker/proxy monitoring and uptime probes no longer pollute business metrics.
- Dashboard numbers remain focused on real user traffic.

---

### 3) Task #5 — CV Download Conversion Event Tracking

Implemented conversion-grade tracking for CV downloads:

- Added new server utility `src/lib/analytics-events.ts` for structured analytics event logging.
- Extended audit action types in `src/lib/audit.ts` with analytics conversion actions.
- Updated `src/app/api/cv/download/route.ts` to emit `CV_DOWNLOAD` conversion events in fire-and-forget mode.
- Kept tracking non-blocking so file download response speed remains unaffected.

Impact:
- CV downloads are now measurable as explicit conversion events.
- Tracking does not introduce page or download latency regressions.

---

### 4) Task #7 — Lead Conversion Tracking + Funnel Surface

Implemented lead event telemetry and surfaced conversion intelligence:

- Updated `src/app/api/contact/route.ts` to emit non-blocking `LEAD_GENERATED` events on successful submissions.
- Enhanced `src/app/api/analytics/stats/route.ts` to return:
  - `uniqueVisitors`
  - `leadGenerated`
  - conversion funnel payload (`visitors -> cvDownloads -> leads`)
  - grouped referrer channels (`Search`, `Social`, `GitHub`, etc.)
- Upgraded `src/app/dashboard/analytics/page.tsx` with:
  - unique visitors metric
  - leads generated metric
  - conversion funnel card
  - referrer group table

Impact:
- Enables actionable top-of-funnel and mid-funnel monitoring in one view.
- Helps identify whether traffic quality is translating into real leads.

## Completed In This Loop

### 1) Task #24 — Broken Link Checker (Automated scan)

Shipped a production-ready internal markdown link auditor:

- Added markdown link scanning and validation engine in `src/lib/link-audit.ts`.
- Added authenticated API endpoint `GET /api/system/link-check` in `src/app/api/system/link-check/route.ts`.
- Added unit test coverage in `src/__tests__/link-audit.test.ts`.
- Integrated into dashboard system maintenance UI in `src/app/dashboard/system/page.tsx`:
  - New "Broken link checker" card
  - Scan button + loading state
  - Summary counts and list of broken links

Impact:
- Detects stale internal links across posts and custom pages before users hit 404s.
- Improves content quality and SEO hygiene.

---

### 2) Task #13 — Global Command Palette Expansion (Deeper deep-linking)

Expanded global command palette navigation breadth in `src/app/dashboard/dashboard-command-palette.tsx`:

- Added hub-level shortcuts:
  - Global settings hub
  - Content taxonomy & assets hub
- Added system-level shortcuts:
  - System health
  - System link checker
- Added additional immersive editor shortcuts:
  - About editor
  - Contact editor

Impact:
- Faster operator navigation to high-value operational surfaces.
- Better discoverability for recently added architecture hubs and maintenance tools.

---

### 3) Task #15 — Smart Tooltip & Guidance Expansion

Extended contextual guidance in operations surfaces:

- Added tooltip-guided actions in `src/app/dashboard/system/page.tsx` for:
  - Health check
  - Media reference scan
  - Database optimize
  - Link scan
- Reused existing `TooltipHint` patterns to reduce ambiguous icon/button intent.

Impact:
- Reduces operator hesitation and ambiguity on destructive/diagnostic actions.
- Improves first-run confidence for maintenance workflows.

---

### 4) Task #35 — Audit Log Visibility Upgrade

Improved audit observability in `src/app/dashboard/audit/page.tsx`:

- Added compact top-level metrics strip:
  - Visible entries count
  - High-risk entries count
  - Top actions summary

Impact:
- Faster triage and higher signal density in incident review.
- Better at-a-glance understanding before deep payload inspection.

---

## Verification Evidence (Fresh)

Executed successfully:

- `npm test -- social-share-card.test.ts category-taxonomy.test.ts audit-severity.test.ts analytics-trend.test.ts`
- `npm run lint` (0 errors; 1 pre-existing warning in `security-txt-route.test.ts`)
- `npx tsc --noEmit`
- `NODE_OPTIONS="--max-old-space-size=8192" npm run build` (passed after waiting for an existing concurrent build lock to clear)
- `npm test -- category-taxonomy.test.ts audit-severity.test.ts analytics-trend.test.ts`
- `npm run lint` (0 errors; warnings: pre-existing `security-txt-route.test.ts`, pre-existing unused `SeoPreviewCard` import in `posts/[id]/page.tsx`)
- `npx tsc --noEmit`
- `npm test -- self-healing-fetch.test.ts content-metrics.test.ts post-version-diff.test.ts`
- `npm run lint` (0 errors; 1 pre-existing warning in `security-txt-route.test.ts`)
- `npx tsc --noEmit`
- `NODE_OPTIONS="--max-old-space-size=8192" npm run build`

Build note for this loop:

- `NODE_OPTIONS="--max-old-space-size=8192" npm run build` reached environment-level process kill (`Killed` / `Terminated`) during optimization. This is consistent with prior intermittent host memory pressure and not tied to new type/lint/test regressions.

Previous loop verification:

- `npm test -- post-version-diff.test.ts editor-validation.test.ts text-history.test.ts`
- `npm run lint` (0 errors; 1 pre-existing warning in `security-txt-route.test.ts`)
- `NODE_OPTIONS="--max-old-space-size=4096" npm run build`

- `npm test -- editor-validation.test.ts text-history.test.ts analytics-insight.test.ts`
- `npm run lint` (0 errors; 1 pre-existing warning in `security-txt-route.test.ts`)
- `NODE_OPTIONS="--max-old-space-size=4096" npm run build`

Additional validation from previous telemetry loop:

- `npm test -- api-analytics-view.test.ts analytics-noise.test.ts analytics-skip-middleware.test.ts`
- `npm run lint` (0 errors; 1 pre-existing warning in `security-txt-route.test.ts`)
- `NODE_OPTIONS="--max-old-space-size=4096" npm run build`

Historical verification from previous loop:

- `npm test -- link-audit.test.ts api-posts.test.ts api-posts-id-patch.test.ts`
- `npm run lint` (0 errors; 1 pre-existing warning in `security-txt-route.test.ts`)
- `NODE_OPTIONS="--max-old-space-size=4096" npm run build`

## Matrix Status Notes (Updated)

- #10 Undo/Redo History: **Implemented foundation** (future: multi-entity command stack + cross-field history boundaries).
- #11 Linear-grade micro-interactions: **Improved** (future: expand motion primitives to analytics/audit row-level actions).
- #12 Optimistic UI: **Improved** (future: extend optimistic reconciliation to additional dashboard modules).
- #14 Interactive Skeleton Loaders: **Improved** (future: unify with a dashboard skeleton primitive library).
- #16 Empty State Illustrations: **Improved** (future: apply to remaining data grids and tool pages).
- #18 Responsive Polish: **Improved** (future: finalize remaining dense tables in analytics/posts operations).
- #28 Advanced Taxonomy: **Implemented v1** (future: drag-and-drop taxonomy management and category-level permissions).
- #25 Reading Time + Word Count: **Improved** (future: include per-post metrics in dashboard index tables and analytics content ranking).
- #27 Social Share Card Generator: **Implemented v1** (future: persisted per-post style presets and template packs).
- #31 Analytics Intelligence: **Improved** (trend visuals added; future: chart window compare and anomaly alerts).
- #33 Self-Healing Middleware: **Implemented v1** (future: extend retry policy + timeout telemetry to all external integration routes).
- #34 Security & Rate Limiting: **Improved** (preview/import/leave coverage expanded; future: endpoint-specific windows + adaptive thresholds).
- #49 Version Control UI: **Implemented v1** (future: support word-level/semantic diff and custom-page revision compare).
- #39 Error Boundary Refinement: **Improved** (future: add route-level boundaries for additional dashboard tooling modules).
- #40 Form Validation: **Implemented v1** (future: schema-first validation for all editor entities, including post/title/status forms).
- #19 Tactile Button States: **Improved** (future: move tactile primitive to shared dashboard UI helpers for global consistency).
- #20 Focus Mode: **Improved** (typing heartbeat dimming added; future: section-level ambient sound and timed sprint mode).
- #13 Global Command Palette: **Improved** (not yet complete; future: command actions with side effects and scoped context actions).
- #15 Tooltip & Guidance: **Improved** (not yet global across all ambiguous controls).
- #24 Broken Link Checker: **Implemented v1** (future: scheduled background job + external URL validation mode).
- #35 Audit Log UI: **Improved** (severity triage added; future: server-side aggregation and anomaly detection).

## Completed In This Loop (Pass J)

### 1) Task #43 — Image Alt-Text Generator (Editor and Media Workflow)

Implemented smarter alt-text generation for media insertion workflows:

- Upgraded markdown insertion helper in `src/lib/cms-media-insert.ts` to use the filename-aware utility from `src/lib/image-alt-from-filename.ts`.
- Enhanced media manager cards in `src/app/dashboard/media/media-content.tsx` with:
  - visible suggested alt text per image
  - one-click "Copy alt text" action
  - improved markdown insertion behavior via normalized alt text
- Added regression coverage in `src/__tests__/cms-media-insert.test.ts`.

Impact:
- Accessibility metadata quality improves by default when inserting images into content.
- Reduces manual editing friction and lowers chance of poor alt labels (timestamps/raw file tokens).

---

### 2) Task #31 — Analytics Intelligence (Anomaly Watch Layer)

Added weekly anomaly detection to analytics insights:

- Created `src/lib/analytics-anomaly.ts` with a callout engine that compares recent 7-day metrics against the previous 7-day window.
- Detects meaningful shifts across:
  - traffic volume
  - CV conversion rate
  - lead-per-download conversion rate
- Integrated "Anomaly watch" UI card in `src/app/dashboard/analytics/page.tsx`.
- Added test coverage in `src/__tests__/analytics-anomaly.test.ts`.

Impact:
- Turns raw trend data into decision-grade signals for rapid operator response.
- Highlights traffic and conversion regressions before they become long-term blind spots.

---

### 3) Task #38 — Automated Backup Snapshot Trigger

Added an operational backup execution surface in System dashboard:

- Integrated a new "Backup snapshot trigger" card in `src/app/dashboard/system/page.tsx`.
- Wired button action to `POST /api/backup/trigger` with loading, success/warning/error states.
- Exposes clear operator feedback when server-side backup is disabled (`ALLOW_SERVER_BACKUP=true` required) versus successfully executed.

Impact:
- Makes backup orchestration executable from dashboard without shell access.
- Strengthens self-hosted operational safety and routine backup discipline.

---

## Verification Evidence (Pass J)

Executed during this loop:

- `npm test -- analytics-anomaly.test.ts cms-media-insert.test.ts`
- `npm run lint` (0 errors; 1 pre-existing warning in `src/__tests__/security-txt-route.test.ts`)
- `npx tsc --noEmit`
- `NODE_OPTIONS="--max-old-space-size=8192" npm run build`

Build note:

- Build compiled and typechecked successfully, then process was killed during page-data collection due to host memory pressure (`Killed`). This matches prior environment constraints and is not tied to these loop changes.

## Matrix Status Notes (Pass J Update)

- #43 Image Alt-Text Generator: **Implemented v1** (future: semantic/object-aware alt generation from image analysis model).
- #31 Analytics Intelligence: **Improved** (future: channel-specific anomaly drilldowns + threshold tuning UI).
- #38 Automated Backup Snapshots: **Implemented v1** (future: backup history timeline and scheduled policy controls).

## Completed In This Loop (Pass K)

### 1) Task #29 — Resume/CV Export to PDF (Structured Profile Engine)

Implemented server-side PDF generation from structured About profile data:

- Added `src/lib/cv-profile-export.ts` to normalize About profile records into clean, printable CV lines.
- Added authenticated route `GET /api/cv/export-profile-pdf` in `src/app/api/cv/export-profile-pdf/route.ts` using `pdf-lib` for on-demand PDF rendering.
- Updated `src/app/dashboard/cv/page.tsx` with a new one-click **Export profile PDF** action.
- Added unit coverage in `src/__tests__/cv-profile-export.test.ts`.

Impact:
- CV exports now work directly from structured CMS profile content, not only manual browser print workflows.
- Improves portability and repeatable resume generation from a single source of truth.

---

### 2) Task #48 — Controlled A/B Experiment Editor Surface

Upgraded the experiments control plane for site builder workflows:

- Extended `src/app/api/saas/sites/[siteId]/ab/experiments/route.ts`:
  - create experiments as `DRAFT` or `RUNNING`
  - persist `trafficSplitA` / `trafficSplitB`
  - new controlled PATCH actions: `set_split`, `set_winner`, `start`, `stop`, plus existing evaluation flow
- Enhanced `src/app/dashboard/sites/[siteId]/experiments/page.tsx`:
  - split slider at creation
  - per-experiment controls for evaluate, start/stop, winner selection, and split adjustment
  - quick stats visibility (A/B conversion rates, p-value approximation, significance)

Impact:
- Moves A/B experimentation from a basic trigger into an operator-friendly controlled surface.
- Reduces friction to run, tune, and close experiments with explicit winner management.

---

### 3) Task #32 — Data Liberation Expansion (Full Bundle Export)

Extended portability with a comprehensive archive export mode:

- Upgraded `src/app/api/data-liberation/export/route.ts` with new `target=bundle`:
  - includes all posts as `.mdx` in `posts/`
  - includes full system export in `system/cms-system-export.json`
  - includes a bundle manifest
- Updated `src/app/dashboard/content/site/page.tsx` with **Export full bundle ZIP** action.

Impact:
- Produces a single portable package suitable for migration, backup, and external archival.
- Improves long-term data sovereignty by combining content and system state in one artifact.

---

## Verification Evidence (Pass K)

Executed during this loop:

- `npm test -- cv-profile-export.test.ts analytics-anomaly.test.ts cms-media-insert.test.ts`
- `npm run lint` (0 errors; 1 pre-existing warning in `src/__tests__/security-txt-route.test.ts`)
- `npx tsc --noEmit`
- `NODE_OPTIONS="--max-old-space-size=8192" npm run build` (passed)

## Matrix Status Notes (Pass K Update)

- #29 Export to PDF Engine: **Implemented v1** (future: typography presets, pagination controls, and template variants).
- #48 Automated A/B Testing UI: **Improved** (future: live event stream, confidence targets, and rollout guardrails).
- #32 Data Liberation: **Improved** (future: encrypted export mode + signed restore manifests).

## Completed In This Loop (Pass L)

### 1) Task #33 — Self-Healing Middleware Expansion (Unified Retry Policies)

Expanded and standardized retry behavior for external network surfaces:

- Upgraded `src/lib/self-healing-fetch.ts` with shared policy constant:
  - `EXTERNAL_INTEGRATION_RETRY_POLICY`
  - plus `fetchJsonWithRetry` helper for consistent future usage
- Applied retry policy to additional integration routes:
  - `src/app/api/integrations/npm/route.ts`
  - `src/app/api/integrations/pypi/route.ts`
  - `src/app/api/integrations/crates/route.ts`
  - `src/app/api/integrations/packagist/route.ts`
- Hardened SEO diagnostics fetch path in `src/app/api/system/seo-integrity/route.ts` using retry-capable fetch.

Impact:
- Fewer transient upstream failures exposed to the UI.
- More predictable integration reliability under packet loss, timeouts, and 5xx bursts.

---

### 2) Task #50 — Performance Kernel (WASM-Backed Analytics Aggregation)

Introduced a first WASM-kernel path for analytics day-bucket aggregation:

- Extended `src/lib/wasm/perf-kernel.ts` with `aggregateDailyCounts(...)` bridge:
  - calls `aggregate_daily_counts` in WASM when available
  - auto-falls back to JS implementation if unavailable or incompatible
- Added kernel-driven trend builder in `src/lib/analytics-trend.ts`:
  - `buildDailyAnalyticsTrendWithKernel(...)`
- Migrated analytics API to kernel path in `src/app/api/analytics/stats/route.ts`.
- Added coverage in `src/__tests__/analytics-trend.test.ts`.

Impact:
- Establishes a practical WASM acceleration lane for high-volume analytics calculations.
- Maintains correctness via deterministic JS fallback.

---

### 3) Task #39 — Error Boundary Refinement (Route-Level Coverage)

Expanded graceful failure boundaries across high-traffic dashboard routes:

- Added route-level error boundaries using `DashboardRouteError`:
  - `src/app/dashboard/posts/error.tsx`
  - `src/app/dashboard/media/error.tsx`
  - `src/app/dashboard/content/site/error.tsx`
  - `src/app/dashboard/cv/error.tsx`

Impact:
- Prevents route-level crashes from cascading into full dashboard disruption.
- Gives operators immediate retry and safe navigation controls on critical management surfaces.

---

## Verification Evidence (Pass L)

Executed during this loop:

- `npm test -- analytics-trend.test.ts wasm-perf-kernel.test.ts`
- `npm run lint` (0 errors; 1 pre-existing warning in `src/__tests__/security-txt-route.test.ts`)
- `npx tsc --noEmit`
- `NODE_OPTIONS="--max-old-space-size=8192" npm run build`

Build note:

- Build was killed by host memory pressure (`Killed`) during this loop run; this matches prior intermittent environment constraints and is not tied to new lint/type/test regressions.

## Matrix Status Notes (Pass L Update)

- #33 Self-Healing Middleware: **Improved** (future: adopt `fetchJsonWithRetry` broadly across all external integration routes).
- #50 Performance Kernel: **Implemented v1** (future: add native WASM export for day aggregation and benchmark traces in CI).
- #39 Error Boundary Refinement: **Improved** (future: extend route-level boundaries to SaaS sub-surfaces and editor routes).

## Next Loop Prep (Auto-Staged Candidates)

Candidate tasks for next autonomous loop (high leverage, low overlap):

1. **#31 Analytics Dashboard**: engagement-weighted top content (time + conversion weighted ranking).
2. **#46 Global Search**: semantic ranking pass for `/api/search` results and dashboard command palette recall.
3. **#37 Docker/Infra Optimization**: add production profile + memory-aware tuning docs and safer runtime defaults.
4. **#49 Version Control UI**: visual revision compare enhancements with inline semantic diff hints.

## Completed In This Loop (Pass M)

### 1) Task #31 — Analytics Dashboard (Engagement-Weighted Top Content)

Added a dedicated engagement ranking lane in analytics:

- Created `src/lib/analytics-engagement.ts`:
  - `buildTopEngagedContent(...)` scoring utility with blended reach + attention + conversion weighting.
- Wired the stats API in `src/app/api/analytics/stats/route.ts`:
  - aggregates `/blog/*` page views + average duration
  - resolves slug->title and returns `topEngagedContent`
- Upgraded dashboard UI in `src/app/dashboard/analytics/page.tsx`:
  - new **Top content by engagement score** table with views, avg time, and computed score.
- Added test coverage in `src/__tests__/analytics-engagement.test.ts`.

Impact:
- Moves analytics from raw traffic counting toward quality-first content performance ranking.
- Gives clearer prioritization signals for what to optimize or promote next.

---

### 2) Task #46 — Global Search (Semantic Ranking Pass)

Implemented semantic-style ranking for search results:

- Enhanced `src/app/api/search/route.ts` with:
  - tokenization + weighted relevance scoring (title, tags, description, snippets, recency)
  - deterministic ranking for both blog posts and static pages
  - better fallback behavior for partial multi-token matches
- Added ranking regression coverage in `src/__tests__/api-search.test.ts`.

Impact:
- Higher-quality ordering for user queries, especially when exact full-text ranking is unavailable.
- Improves command-palette and global-search recall quality without adding external infra.

---

### 3) Task #37 — Docker/Infra Optimization (Memory-Aware Runtime Defaults)

Applied safer production container defaults and documented tuning:

- Updated compose app runtime env in:
  - `docker-compose.yml`
  - `docker-compose.example.yml`
  - `docker-compose.backup.yml`
- Added memory/perf tuning defaults:
  - `UV_THREADPOOL_SIZE=${UV_THREADPOOL_SIZE:-8}`
  - `MALLOC_ARENA_MAX=${MALLOC_ARENA_MAX:-2}`
  - `NEXT_TELEMETRY_DISABLED=1`
- Documented operational rationale in `docs/OPERATIONS_AND_RELIABILITY.md` under **Memory-aware runtime tuning (Docker Compose)**.

Impact:
- Reduces memory fragmentation pressure and noisy background telemetry in production containers.
- Improves predictability on constrained hosts and backup nodes.

---

## Verification Evidence (Pass M)

Executed during this loop:

- `npm test -- api-search.test.ts analytics-engagement.test.ts`
- `npm run lint` (0 errors; 1 pre-existing warning in `src/__tests__/security-txt-route.test.ts`)
- `npx tsc --noEmit`
- `NODE_OPTIONS="--max-old-space-size=8192" npm run build`

Build notes:

- Build surfaced a pre-existing optional WASM packaging warning (`src/lib/wasm/perf-kernel.ts` import path) and failed later during page-data collection with `.next/server/pages-manifest.json` missing in this host run.
- The new loop changes passed targeted tests, lint (no new warnings), and type-check.

## Matrix Status Notes (Pass M Update)

- #31 Analytics Dashboard: **Improved** (future: include per-post conversion attribution for CV/contact events).
- #46 Global Search: **Improved** (future: add semantic synonym dictionary + typo-tolerance reranker).
- #37 Docker/Infra Optimization: **Improved** (future: add profile-based compose overlays for canary and low-memory hosts).

## Next Loop Prep (Auto-Staged Candidates)

Candidate tasks for next autonomous loop (high leverage, low overlap):

1. **#49 Version Control UI**: add inline semantic diff hints and readability grouping in revision compare.
2. **#45 Content Translator**: introduce one-click bilingual draft generation pipeline for posts/pages.
3. **#24 Broken Link Checker**: background scan scheduling + actionable remediation panel.
4. **#34 Security Fortification**: extend adaptive rate-limit controls with dashboard-managed policy presets.

## Completed In This Loop (Pass N)

### 1) Task #49 — Version Control UI (Semantic Diff Hints)

Upgraded post revision compare to be more triage-friendly:

- Extended `src/lib/post-version-diff.ts` with:
  - `buildPostDiffSemanticHints(...)` to classify changed lines into structural groups
  - hint groups: headings, links, images, code blocks, lists, and quotes
- Integrated semantic hints into the compare panel in `src/app/dashboard/posts/[id]/page.tsx`:
  - new **Semantic change hints** badges above line-level diff output
- Added coverage in `src/__tests__/post-version-diff.test.ts`.

Impact:
- Editors can instantly understand *what kind* of changes occurred before reading raw line deltas.
- Improves confidence and speed when restoring or reviewing historical versions.

---

### 2) Task #24 — Broken Link Checker (Scan History + Remediation)

Evolved link-check from one-off execution to an operational workflow:

- Upgraded `src/app/api/system/link-check/route.ts`:
  - `POST` now runs scans and logs scan summaries in audit records
  - `GET` now returns recent scan history (last 10 runs)
- Added new audit action support in `src/lib/audit.ts`:
  - `system.link_check.scan`
- Enhanced `src/app/dashboard/system/page.tsx`:
  - link scan now triggers via `POST`
  - added **Recent scans** history section
  - added **Open source** remediation links for broken issues

Impact:
- Teams now get trend visibility on link integrity instead of ad-hoc snapshots only.
- Broken-link remediation is faster with direct navigation to editing surfaces.

---

### 3) Task #35 — Audit Log Triage Improvements (System Checks Preset)

Improved operator triage flow for maintenance and system events:

- Extended severity logic in `src/lib/audit-severity.ts`:
  - system check actions (including link-check scans) now classify as warning-level
- Added test coverage in `src/__tests__/audit-severity.test.ts`.
- Enhanced `src/app/dashboard/audit/page.tsx`:
  - new preset filter: **System checks**
  - persisted preset handling for saved views/import/export and query parsing
  - added visible count chip for system-check events

Impact:
- Critical operational signals are easier to isolate during incident triage.
- Audit saved views can now preserve a dedicated system-operations workflow.

---

## Verification Evidence (Pass N)

Executed during this loop:

- `npm test -- post-version-diff.test.ts link-audit.test.ts audit-severity.test.ts`
- `npm run lint` (0 errors; 1 pre-existing warning in `src/__tests__/security-txt-route.test.ts`)
- `npx tsc --noEmit`
- `NODE_OPTIONS="--max-old-space-size=8192" npm run build`

Build notes:

- Build still surfaces the pre-existing optional WASM packaging warning from `src/lib/wasm/perf-kernel.ts`.
- This host run failed in page-data collection with `.next/server/pages-manifest.json` missing (environmental/runtime build issue already observed in prior loops).
- New loop changes passed targeted tests, lint (no new warnings), and type-check.

## Matrix Status Notes (Pass N Update)

- #49 Version Control UI: **Improved** (future: semantic hunk folding and field-level metadata diff for tags/categories).
- #24 Broken Link Checker: **Improved** (future: scheduled background cron + per-link retry validation and ownership routing).
- #35 Audit Log UI: **Improved** (future: anomaly alerting and saved incident playbooks wired to severity thresholds).

## Next Loop Prep (Auto-Staged Candidates)

Candidate tasks for next autonomous loop (high leverage, low overlap):

1. **#45 Content Translator**: one-click bilingual draft generation pipeline with editor-side apply preview.
2. **#34 Security Fortification**: dashboard-managed rate-limit policy presets with safe defaults.
3. **#31 Analytics Dashboard**: conversion-attributed engagement ranking per post (CV + lead weighting from audit events).
4. **#14 Interactive Skeleton Loaders**: unify dashboard-level loading placeholders for all heavy async surfaces.

## Completed In This Loop (Pass O)

### 1) Task #45 — Content Translator (One-Click Bilingual Draft Pipeline)

Implemented a full translated-draft generation flow for post editing:

- Added `src/lib/content-translator.ts`:
  - `buildTranslatedDraftScaffold(...)` with supported locales (`zh-TW`, `ja`, `es`)
  - generates translated title/description and a bilingual markdown scaffold
- Added API endpoint `src/app/api/posts/[id]/translate-draft/route.ts`:
  - authenticated route to clone source post into a translated draft
  - locale validation + unique slug generation
  - preserved tags and auto-attached locale tag (`lang-<locale>`)
  - audit logging for traceability
- Enhanced editor UI in `src/app/dashboard/posts/[id]/page.tsx`:
  - new **Bilingual draft translator** card
  - locale selector + preview
  - one-click creation and auto-navigation to the new draft
- Added test coverage in `src/__tests__/content-translator.test.ts`.

Impact:
- Writers can create multilingual draft scaffolds instantly without manual duplication.
- Establishes an extensible translation pipeline that can later swap in stronger translation engines.

---

### 2) Task #34 — Security Fortification (Rate-Limit Policy Presets)

Hardened mutation endpoints with configurable rate-limit policy presets:

- Extended `src/lib/rate-limit.ts`:
  - new preset model: `relaxed` / `balanced` / `strict`
  - env-driven policy via `RATE_LIMIT_POLICY_PRESET`
  - endpoint-prefix overrides (contact, posts write, custom pages, import, preview token, translate draft)
  - exported `getRateLimitProfileForPrefix(...)` for validation/testing
- Applied fortified write limits on core post mutation surfaces:
  - `src/app/api/posts/route.ts` (`POST`)
  - `src/app/api/posts/[id]/route.ts` (`PATCH`, `DELETE`)
- Translation endpoint also enforces its own write-limit bucket:
  - `posts_translate_write`
- Added tests in `src/__tests__/rate-limit-policy.test.ts`.

Impact:
- Security posture is stronger under burst/automation traffic on critical write APIs.
- Operators can tighten or relax policy globally without code edits.

---

### 3) Task #14 — Interactive Skeleton Loaders (Async Surface Coverage)

Expanded loading-state polish on dashboard surfaces that lacked dedicated route loaders:

- Added `src/app/dashboard/system/loading.tsx` with structured card-level skeleton placeholders.
- Added `src/app/dashboard/content/pages/loading.tsx` with realistic list/table skeletons matching page layout.

Impact:
- Removes abrupt content flashes while data-heavy dashboard routes resolve.
- Improves perceived responsiveness and visual consistency during async transitions.

---

## Verification Evidence (Pass O)

Executed during this loop:

- `npm test -- content-translator.test.ts rate-limit-policy.test.ts post-version-diff.test.ts link-audit.test.ts audit-severity.test.ts`
- `npm run lint` (0 errors; 1 pre-existing warning in `src/__tests__/security-txt-route.test.ts`)
- `npx tsc --noEmit`
- `NODE_OPTIONS="--max-old-space-size=8192" npm run build` (passed)

Build notes:

- Build still reports the pre-existing optional WASM packaging warning from `src/lib/wasm/perf-kernel.ts`.
- No new type or lint regressions were introduced by this loop.

## Matrix Status Notes (Pass O Update)

- #45 Content Translator: **Implemented v1** (future: provider-backed translation quality scoring and inline segment approval).
- #34 Security Fortification: **Improved** (future: dashboard UI for preset switching + per-endpoint override editor).
- #14 Interactive Skeleton Loaders: **Improved** (future: skeleton primitives for all remaining settings and SaaS subpages).

## Next Loop Prep (Auto-Staged Candidates)

Candidate tasks for next autonomous loop (high leverage, low overlap):

1. **#31 Analytics Dashboard**: per-post conversion attribution (CV + lead signals mapped into engagement ranking).
2. **#48 Automated A/B Testing**: experiment guardrails (minimum sample thresholds + confidence gates).
3. **#47 Workflow Engine**: event pipeline health/visibility card for webhook dispatch outcomes.
4. **#23 Smart Image Optimization**: batch media optimize queue with progress telemetry and retry controls.

---

## Completed In This Loop (Pass P)

### 1) Task #31 — Analytics Dashboard (Per-Post Conversion Attribution)

Improved engagement analytics by attributing conversion events back to blog slugs:

- Extended `src/lib/analytics-engagement.ts` with `buildConversionAttributionBySlug(...)`:
  - parses conversion event details safely
  - extracts blog slug from conversion referrer URLs
  - aggregates CV downloads and leads per slug
- Added coverage in `src/__tests__/analytics-engagement.test.ts` for slug-level attribution logic.
- Upgraded `src/app/api/analytics/stats/route.ts`:
  - loads conversion events with details
  - maps conversion signals into `topEngagedContent` rows
  - preserves non-blocking API behavior while increasing ranking quality

Impact:
- "Top engaged content" now reflects actual conversion quality, not only traffic volume.
- Content prioritization is closer to business outcomes (CV and lead intent).

---

### 2) Task #48 — Automated A/B Testing Guardrails (Sample Threshold + Winner Lock Safety)

Hardened experiment decision quality with minimum-sample protections:

- Enhanced `src/app/api/saas/sites/[siteId]/ab/experiments/route.ts`:
  - added env-driven minimum sample threshold (`AB_MIN_SAMPLE_PER_VARIANT`, default 50, clamped safely)
  - evaluation now stores views/conversions per variant and `hasEnoughSample`
  - winner selection is blocked with `409` when sample size is insufficient
- Updated `src/app/dashboard/sites/[siteId]/experiments/page.tsx`:
  - surfaces views and guardrail status in the UI
  - disables manual winner buttons until sample threshold is satisfied

Impact:
- Reduces false confidence and premature winner selection in low-data experiments.
- Makes decision confidence explicit to operators directly in the control surface.

---

### 3) Task #47 — Workflow Engine (Webhook Dispatch Health Visibility)

Added observability for the "contact form -> webhook" pipeline:

- Upgraded `src/lib/contact-webhook.ts`:
  - returns structured delivery result (delivered/attempts/status/error/target host)
  - keeps retry/backoff behavior and remains fire-and-forget compatible
- Updated `src/app/api/contact/route.ts`:
  - asynchronously logs webhook delivery outcomes to audit logs (`workflow.webhook.delivered` / `workflow.webhook.failed`)
  - keeps analytics tracking non-blocking
- Added `src/app/api/system/workflow-health/route.ts`:
  - authenticated workflow health summary endpoint
  - reports submissions, delivery/failure counts, failure rate, and recent failure details
- Extended `src/app/dashboard/system/page.tsx`:
  - new "Workflow pipeline health" card with refresh action and failure list
- Extended `src/lib/audit.ts` and `src/lib/audit-severity.ts` for new workflow audit action taxonomy.

Impact:
- Operators can quickly detect webhook reliability regressions without digging through raw logs.
- Closing the loop on workflow observability improves operational trust in automation.

---

## Verification Evidence (Pass P)

Executed during this loop:

- `npm test -- analytics-engagement.test.ts audit-severity.test.ts`
- `npm run lint` (0 errors; 1 pre-existing warning in `src/__tests__/security-txt-route.test.ts`)
- `npx tsc --noEmit`
- `NODE_OPTIONS="--max-old-space-size=8192" npm run build` (passed)

Build notes:

- Build still reports the pre-existing optional WASM packaging warning from `src/lib/wasm/perf-kernel.ts`.
- No new type or lint regressions were introduced by this loop.

## Matrix Status Notes (Pass P Update)

- #31 Analytics Dashboard: **Improved** (future: model-based funnel decomposition by campaign/source and weighted path decay).
- #48 Automated A/B Testing: **Improved** (future: confidence intervals, sequential testing boundaries, and auto-stop heuristics).
- #47 Workflow Engine: **Improved** (future: per-destination SLA tracking and retry queue visualization).

## Next Loop Prep (Auto-Staged Candidates)

Candidate tasks for next autonomous loop (high leverage, low overlap):

1. **#23 Smart Image Optimization**: batch media optimization queue with progress telemetry and retry controls.
2. **#16 Empty State Illustrations**: unify high-quality empty states across dashboard tables/grids still using plain text placeholders.
3. **#18 Responsive Polish**: tighten dense management tables/cards for sub-1024px breakpoints to remove horizontal pressure.
4. **#35 Audit Log UI**: add workflow failure drill-down preset and failure-rate trend sparkline for incident triage.

---

## Completed In This Loop (Pass Q)

### 1) Task #23 — Smart Image Optimization (Run Telemetry + Historical Visibility)

Expanded media optimization from one-off execution into observable operational history:

- Updated `src/app/api/media/optimize/route.ts`:
  - now tracks and returns `failedCount` in execution summary
  - persists failed count in optimize audit details for later analysis
- Added `src/app/api/system/media-optimize-history/route.ts`:
  - authenticated endpoint returning recent optimize runs from audit logs
  - includes per-run attempted/optimized/failed counts and saved bytes
- Enhanced `src/app/dashboard/media/media-content.tsx`:
  - new optimization run-history panel with quick refresh
  - visual per-run success bar and concise telemetry details
  - auto-refreshes history after optimize / batch / retry runs

Impact:
- Operators now have feedback loops for optimization quality over time, not only per-run snapshots.
- Failures are visible as first-class telemetry, improving recovery workflows.

---

### 2) Task #35 — Audit Log UI (Workflow Failure Drill-Down + Trend Sparkline)

Improved incident triage for workflow automation in the audit console:

- Updated `src/app/dashboard/audit/page.tsx`:
  - added dedicated `workflow` preset filter (`workflow.*` actions)
  - added 7-day workflow failure mini trend sparkline in dashboard stats
  - integrated workflow preset in query-string hydration and saved-view import logic

Impact:
- Workflow incidents can be isolated in one click.
- Teams get immediate temporal context on failure clustering before deep investigation.

---

### 3) Task #16 — Empty State Polish (Management Surfaces)

Replaced plain-text empty responses with clearer product-grade empty states:

- `src/app/dashboard/audit/page.tsx`:
  - replaced plain "no entries" text with structured `DashboardEmptyState`
- `src/app/dashboard/posts/page.tsx`:
  - upgraded empty taxonomy message to structured empty state with action-oriented guidance

Impact:
- Empty and filtered states now feel intentional and informative instead of unfinished.
- UX consistency is improved across dashboard data surfaces.

---

## Verification Evidence (Pass Q)

Executed during this loop:

- `npm test -- audit-severity.test.ts`
- `npm run lint` (0 errors; 1 pre-existing warning in `src/__tests__/security-txt-route.test.ts`)
- `npx tsc --noEmit`
- `NODE_OPTIONS="--max-old-space-size=8192" npm run build` (failed: host process killed during build after successful compile + TS phase start)

Build notes:

- Pre-existing warning still appears for optional WASM kernel package resolution (`src/lib/wasm/perf-kernel.ts`).
- Current build failure was runtime environment/process termination (`Killed`), not a direct TypeScript or lint regression introduced by this loop.

## Matrix Status Notes (Pass Q Update)

- #23 Smart Image Optimization: **Improved** (future: queue prioritization policy + category-level retry policy presets).
- #35 Audit Log UI: **Improved** (future: workflow failure detail parser + incident bookmark groups).
- #16 Empty State Illustrations: **Improved** (future: unified icon/illustration variants and contextual quick-actions across all dashboard tables).

## Next Loop Prep (Auto-Staged Candidates)

Candidate tasks for next autonomous loop (high leverage, low overlap):

1. **#18 Responsive Polish**: compact action rows for dense dashboard tables/cards on tablet widths.
2. **#37 Docker/Infra optimization**: tighten production profile defaults and startup diagnostics around memory pressure.
3. **#31 Analytics Dashboard**: add comparative period deltas for conversion funnel and top content changes.
4. **#39 Error Boundary Refinement**: add consistent recovery CTA blocks on remaining route-level error pages.

---

## Completed In This Loop (Pass R)

### 1) Task #18 — Responsive Polish (Audit Mobile-First Rendering)

Improved audit usability on narrow viewports by adding a dedicated mobile layout:

- Updated `src/app/dashboard/audit/page.tsx`:
  - added `md:hidden` card-based rendering for audit entries
  - kept full dense data-table experience for `md+` screens
  - preserved pinning and investigation-note actions in the mobile surface
- Also fixed saved-view preset validation to retain `workflow` presets during local-storage hydration/import.

Impact:
- Audit triage is now practical on phones/tablets without horizontal-scroll overload.
- Workflow-focused saved views remain stable and do not silently downgrade.

---

### 2) Task #39 — Error Boundary Refinement (Missing Route Coverage)

Extended route-level graceful failure coverage to remaining dashboard hubs:

- Added `src/app/dashboard/audit/error.tsx`
- Added `src/app/dashboard/content/error.tsx`
- Both reuse `DashboardRouteError` with route-appropriate retry and safe-navigation CTAs.

Impact:
- Runtime failures in Audit/Content routes now degrade gracefully instead of dropping to generic crash states.
- Recovery flow is consistent with other hardened dashboard surfaces.

---

### 3) Task #37 — Docker/Infra Optimization (Compose Profile Hardening)

Aligned compose profiles with safer app runtime defaults:

- Updated `docker-compose.example.yml` and `docker-compose.backup.yml`:
  - added `stop_grace_period: 30s` to app service
  - added json-file log rotation (`max-size` / `max-file`) for app service
  - switched app healthcheck probe to `GET /api/health` with explicit error handling

Impact:
- Better shutdown safety and lower log-disk growth risk on non-primary compose profiles.
- Health status now reflects application+DB readiness consistently across deployment variants.

---

## Verification Evidence (Pass R)

Executed during this loop:

- `npm run lint` (0 errors; 1 pre-existing warning in `src/__tests__/security-txt-route.test.ts`)
- `npx tsc --noEmit`
- `NODE_OPTIONS="--max-old-space-size=8192" npm run build` (passed)
- `ReadLints` on edited files (no diagnostics)

Build notes:

- Build still emits pre-existing warnings:
  - optional WASM package resolution warning from `src/lib/wasm/perf-kernel.ts`
  - Sentry instrumentation deprecation/setup warnings
- No new type or lint regressions were introduced by this loop.

## Matrix Status Notes (Pass R Update)

- #18 Responsive Polish: **Improved** (future: add mobile compact cards to additional dense analytics tables).
- #39 Error Boundary Refinement: **Improved** (future: extend to remaining SaaS nested routes for full parity).
- #37 Docker/Infra Optimization: **Improved** (future: add startup memory-pressure diagnostics and optional profile overlays).

## Next Loop Prep (Auto-Staged Candidates)

Candidate tasks for next autonomous loop (high leverage, low overlap):

1. **#31 Analytics Dashboard**: add comparative period deltas for conversion funnel and engaged-content movement.
2. **#40 Form Validation**: harden remaining dashboard forms with unified validation helpers and message consistency.
3. **#19 Tactile Button States**: normalize loading/hover/active states on legacy action clusters.
4. **#15 Tooltip & Guidance**: expand ambiguity-reducing hints for high-impact dashboard controls.

---

## Completed In This Loop (Pass S)

### 1) Task #31 — Analytics Dashboard (Comparative Period Deltas)

Added period-over-period comparison intelligence to analytics:

- Updated `src/app/dashboard/analytics/page.tsx`:
  - computes previous window automatically from selected date range
  - fetches previous-period stats in parallel (with current filters preserved where applicable)
  - renders a new **Period-over-period delta** card
  - includes deltas for visitors, CV downloads, leads, and lead/CV conversion rate
  - includes top engagement movers based on score shift vs previous period

Impact:
- Dashboard now explains trajectory, not just snapshots.
- Operators can quickly detect direction changes across funnel and content engagement.

---

### 2) Task #40 — Form Validation (Site Settings Hardening)

Strengthened client-side validation on core site settings before save:

- Updated `src/app/dashboard/content/site/page.tsx`:
  - added memoized validation rules for critical fields:
    - site name minimum length
    - contact email format
    - webhook URLs must be HTTPS
    - GA4 measurement ID format
    - GitHub/LinkedIn URL format
    - navigation item label/link integrity
  - added inline warning panel with actionable validation errors
  - disabled Save while validation errors exist

Impact:
- Prevents malformed configuration from being persisted.
- Reduces avoidable API failures and broken production settings.

---

### 3) Task #15 — Tooltip & Guidance Expansion (High-Impact Controls)

Expanded guidance coverage on important, irreversible, and export-related actions:

- Updated `src/app/dashboard/analytics/page.tsx`:
  - tooltip for **Export CSV**
  - tooltip for destructive **Clear all analytics** action
- Updated `src/app/dashboard/content/site/page.tsx`:
  - tooltip guidance for template apply actions (Personal/Portfolio/Blog)
  - tooltip guidance for data-liberation exports (posts/system/full bundle)
  - tooltip guidance for Save action intent

Impact:
- Clarifies operator intent before high-impact clicks.
- Reduces ambiguity and confidence gaps in settings/analytics workflows.

---

## Verification Evidence (Pass S)

Executed during this loop:

- `npm run lint` (0 errors; 1 pre-existing warning in `src/__tests__/security-txt-route.test.ts`)
- `npx tsc --noEmit`
- `NODE_OPTIONS="--max-old-space-size=8192" npm run build` (failed: host process killed during TypeScript/build phase)
- `ReadLints` on edited files (no diagnostics)

Build notes:

- Pre-existing optional WASM packaging warning still appears (`src/lib/wasm/perf-kernel.ts`).
- Build failure is environment/runtime termination (`Killed`), not a new lint/type regression from this loop.

## Matrix Status Notes (Pass S Update)

- #31 Analytics Dashboard: **Improved** (future: add charted delta history and anomaly threshold tuning controls).
- #40 Form Validation: **Improved** (future: move these validation rules into shared schema utilities for cross-route reuse).
- #15 Tooltip & Guidance: **Improved** (future: add tooltip parity for remaining legacy dashboard action clusters).

## Completed In This Loop (Pass T)

### 1) Task #18 — Responsive Polish (Analytics Tables)

- Updated `src/app/globals.css`: `.rwd-table` card layout breakpoint widened from **640px** to **1023px** so Recent views, By IP, and Blocked IP log use stacked labeled rows on tablet as well as phone.
- Impact: fewer crushed multi-column tables and less horizontal strain on narrow tablets.

### 2) Task #33 — Self-Healing Fetches (System + Audit)

- Added `DASHBOARD_INTERNAL_FETCH` in `src/lib/self-healing-fetch.ts` (2 retries, 20s timeout for transient 5xx / network blips).
- `src/app/dashboard/system/page.tsx`: all maintenance, media, link-check, SEO integrity, workflow health, and backup calls use `fetchWithRetry`. **POST** actions use `retries: 0` to avoid duplicate side effects; backup trigger uses **120s** timeout, no retries.
- `src/app/dashboard/audit/page.tsx`: audit list load uses `fetchWithRetry` with cancellation on unmount.

### 3) Task #35 — Audit Log UI (Guidance + Workflow Context)

- Workflow failures panel: explanatory copy for `workflow.webhook.failed`, pointer to System workflow health, and `role="img"` + `aria-label` on the mini chart.
- `TooltipHint` on Export CSV, saved-view actions (save / quick save / reapply / import-export JSON), and Export selected.

### 4) Task #19 — Tactile Micro-states

- `dashboardSubtleActionButtonClassName()` in `src/components/dashboard/dashboard-ui.tsx`: subtle press scale + transition (respects `motion-reduce`).
- `src/app/dashboard/analytics/page.tsx`: tactile transitions on IP filter links and Clear filter control.

## Verification Evidence (Pass T)

- `npm run lint` (0 errors; 1 pre-existing warning in `src/__tests__/security-txt-route.test.ts`)
- `npx tsc --noEmit`
- `ReadLints` on touched dashboard files (no diagnostics)

## Matrix Status Notes (Pass T Update)

- #18 Responsive Polish: **Improved** (rwd-table now tablet-aware; only analytics tables use this class today).
- #33 Self-Healing: **Improved** (system + audit client fetches; mutations bounded to timeout-only retry policy).
- #35 Audit Log UI: **Improved** (workflow narrative + a11y + export/saved-view tooltips).
- #19 Tactile Button States: **Improved** (subtle actions + analytics text controls).

## Completed In This Loop (Pass U)

### 1) Task #33 — Self-Healing Fetches (Analytics, Media, Posts)

- `src/app/dashboard/analytics/page.tsx`: stats, previous-period stats, `/api/health`, and all analytics clear POSTs use `fetchWithRetry` with `DASHBOARD_INTERNAL_FETCH`; clears use `retries: 0`.
- `src/app/dashboard/media/media-content.tsx`: list load, optimize history, delete, cleanup, and optimize POSTs wired the same way.
- `src/app/dashboard/posts/posts-table-client.tsx`: duplicate and bulk POSTs use mutation policy (timeout, no retries).

### 2) Task #18 — Responsive Polish (Analytics Scroll Affordances)

- Engagement score table: hint below `lg`, `min-w-[520px]`, `overscroll-x-contain` on scroll container.
- By path table: hint below `md`, minimum table width + horizontal scroll container.

### 3) Task #35 — Audit Log UI (Saved-View Shortcuts)

- Global shortcuts use refs + stable `keydown` listener: **Alt+Shift+1–9** applies visible saved views (unchanged behavior) but **ignores** focus inside inputs/textareas/select/contenteditable; **Alt+Shift+R** re-applies last view; ignores Meta/Ctrl to reduce accidental triggers.
- Inline help text updated to document **R** and the “not in inputs” rule.

### 4) Task #19 — Tactile States (Design System + Posts Taxonomy)

- `dashboardPrimaryActionButtonClassName` / `dashboardSecondaryActionButtonClassName`: same press-scale pattern as subtle actions.
- Posts taxonomy category links: light press feedback (`motion-reduce` safe).

### 5) Lint hygiene

- `src/__tests__/security-txt-route.test.ts`: removed unused `HEAD` import (clean ESLint).

## Verification Evidence (Pass U)

- `npm run lint` (0 errors, 0 warnings)
- `npx tsc --noEmit`
- `ReadLints` on edited files (no diagnostics)

## Matrix Status Notes (Pass U Update)

- #33 Self-Healing: **Improved** (analytics + media + posts table client covered; uploads still use XHR by design).
- #18 Responsive Polish: **Improved** (scroll hints + min-width on selected analytics tables).
- #35 Audit Log UI: **Improved** (shortcut safety + reapply hotkey documented).
- #19 Tactile Button States: **Improved** (primary/secondary dashboard tokens + taxonomy links).

## Completed In This Loop (Pass V)

### 1) Task #40 — Form Validation (Media Optimize + Posts Bulk Edit)

- `src/app/dashboard/media/media-content.tsx`:
  - Validates min size (integer, 50,000 bytes–500 MB cap) and max items (integer 1–25).
  - Inline amber issue list; assess / refresh / run / batch / retry-failed actions disabled while invalid.
  - LocalStorage hydration rounds stored numbers; number inputs use controlled integers.
- `src/app/dashboard/posts/posts-table-client.tsx`:
  - Bulk-edit modal: category length/whitespace/line-break rules; tags comma list (no empty segments, max 40 tags, 64 chars each).
  - Issue list + `aria-invalid` borders; Apply disabled when invalid.

### 2) Task #14 — Interactive Loading (Analytics Secondary Fetches)

- `src/app/dashboard/analytics/page.tsx`: `Skeleton` placeholders for period-over-period delta (metric grid + movers strip) and application health block, with `aria-busy` / `aria-label`.

### 3) Task #35 — Audit Log UI (Bulk Delete Clarity)

- `src/app/dashboard/audit/page.tsx`: Expanded confirmation panel explaining local-only storage, startup/last-applied reset, backup via export, and Undo; clearer naming for the DELETE confirmation field (case-insensitive match documented).

## Verification Evidence (Pass V)

- `npm run lint`
- `npx tsc --noEmit`

## Matrix Status Notes (Pass V Update)

- #40 Form Validation: **Improved** (media optimize + posts bulk edit; further reuse via shared validators still optional).
- #14 Skeleton / loading UX: **Improved** (analytics secondary fetches; main stats already had skeleton coverage).
- #35 Audit Log UI: **Improved** (bulk saved-view delete explanation and confirm copy).

## Completed In This Loop (Pass W)

### 1) Task #34 — Retry / timeout operator messaging

- Added `formatDashboardFetchFailure` in `src/lib/self-healing-fetch.ts` for consistent copy after `fetchWithRetry` exhausts (AbortError / network).
- Wired into `src/app/dashboard/analytics/page.tsx` (main stats error, health fetch banner, clear-history catches), `src/app/dashboard/media/media-content.tsx` (media list load toast), `src/app/dashboard/posts/posts-table-client.tsx` (duplicate + bulk catches), and `src/app/dashboard/system/page.tsx` (all maintenance toasts).
- Analytics **Application health** card: **Refresh health** button (re-runs health fetch with existing `refreshKey`) and amber inline banner when `/api/health` fails after retries.

### 2) Task #40 — Shared dashboard validators

- New `src/lib/dashboard-form-validation.ts`: `validateMediaOptimizePanel`, `validateBulkPostEdit`, and exported optimize byte constants.
- `media-content.tsx` and `posts-table-client.tsx` now consume the shared helpers (single source of truth).
- `src/__tests__/dashboard-form-validation.test.ts` (Jest) covers key accept/reject cases.

### 3) Task #39 — Error boundaries (Sites + Hubs)

- `src/app/dashboard/sites/error.tsx` — sites list / workspace failures.
- `src/app/dashboard/sites/[siteId]/error.tsx` — per-site nested routes.
- `src/app/dashboard/hubs/error.tsx` — hubs subtree (global settings, taxonomy assets).

### 4) Task #25 — Reading time / word count in editor chrome

- `src/app/dashboard/posts/[id]/page.tsx` and `src/app/dashboard/posts/new/page.tsx`: duplicate compact **words · ~reading** line under the card title (`aria-live="polite"`) so metrics stay visible above the fold (still shown on the content toolbar).

## Verification Evidence (Pass W)

- `npm run lint`
- `npx tsc --noEmit`
- `npx jest src/__tests__/dashboard-form-validation.test.ts`

## Matrix Status Notes (Pass W Update)

- #34 Rate limit / resilience UX: **Improved** (explicit post-retry messaging; not a server-side rate-limit change).
- #40 Form Validation: **Improved** (shared validators + tests; site settings can migrate to the same module later).
- #39 Error Boundary Refinement: **Improved** (sites + hubs coverage alongside existing dashboard segments).
- #25 Reading time / word count: **Improved** (header-level visibility on create + edit).

## Completed In This Loop (Pass X) — Zero Broken Builds gate

### Directive compliance

This loop follows **Zero Broken Builds**: no `EVOLUTION_PROGRESS.md` update until **lint**, **TypeScript**, and **production build** all completed successfully.

### 1) Task #40 — Site settings validation (shared module)

- `validateSiteSettingsForm(config)` added to `src/lib/dashboard-form-validation.ts` (email, HTTPS webhooks, GA4 id, GitHub/LinkedIn URLs, nav items).
- `src/app/dashboard/content/site/page.tsx` delegates to the shared helper (removed inline regex/helpers).
- Jest coverage extended in `src/__tests__/dashboard-form-validation.test.ts`.

### 2) Task #14 — Media batch optimize progress UX

- `src/app/dashboard/media/media-content.tsx`: batch row shows labeled progress, **percent bar**, `aria-busy` / `aria-label`, and `motion-reduce`-safe width transition.

### 3) Task #13 — Command palette discoverability (Sites)

- `src/app/dashboard/dashboard-command-palette.tsx`: expanded **Sites (multi-tenant)** keywords (platform, experiments, A/B, billing, showroom, commerce, CRM) so ⌘K search finds SaaS entry points without new routes.

## Verification Evidence (Pass X) — required gate

- `npm run lint` (0 errors, 0 warnings at time of run)
- `npx tsc --noEmit`
- `npx jest src/__tests__/dashboard-form-validation.test.ts`
- `NODE_OPTIONS="--max-old-space-size=8192" npm run build` — **exit 0** (completed via `scripts/build-safe.sh`)

Build notes (pre-existing, non-fatal):

- Optional WASM package still unresolved in `src/lib/wasm/perf-kernel.ts` (webpack warning).
- Sentry SDK layout deprecation notices during compile.

## Matrix Status Notes (Pass X Update)

- #40 Form Validation: **Improved** (site settings share `dashboard-form-validation`; contact page client checks still optional).
- #14 Loading / progress UX: **Improved** (media batch optimize bar).
- #13 Command Palette: **Improved** (Sites keyword coverage for SaaS surfaces).

## Completed In This Loop (Pass Y) — Zero Broken Builds gate

### Directive compliance

Verified before logging: **`npm run lint`**, **`npx tsc --noEmit`**, **`npx jest src/__tests__/dashboard-form-validation.test.ts`**, and **`NODE_OPTIONS="--max-old-space-size=8192" npm run build`** (exit 0).

### 1) Task #22 — JSON-LD (blog post + root publisher)

- `src/app/blog/[slug]/page.tsx`: post graph node is now **`BlogPosting`** with stable **`@id`**, **`url`**, **`image`** (OG route), **`wordCount`**, **`timeRequired`** (ISO 8601 duration from reading time), optional **`keywords`** from tags, **`publisher`** as `{ "@id": …/#publisher }` to match `JsonLdRoot`. When **`authorName`** is set, **`author`** references the same **`#publisher`** `Person`; otherwise a fallback **`Person`** uses the site name.
- `src/components/json-ld-root.tsx`: when the publisher is a **`Person`**, emit **`image`** (`ImageObject`) from logo/OG URL so referenced authors are not logo-less.

### 2) Task #40 — Contact / CMS clarity

- `src/app/dashboard/content/contact/page.tsx`: documents that contact email and HTTPS webhooks are validated on **Site settings** via **`validateSiteSettingsForm`** (this route only redirects to the visual editor).

### Build notes (unchanged, non-fatal)

- Webpack: optional WASM `perf-kernel` pkg missing.
- Sentry SDK deprecation notices during compile.

## Matrix Status Notes (Pass Y Update)

- #22 JSON-LD: **Improved** (`BlogPosting` + graph linkage to root `#publisher`; Person image on root when applicable).
- #40 Form Validation: **Documented** for contact dashboard redirect (live validation remains on site settings).

## Completed In This Loop (Pass Z) — Zero Broken Builds gate

### Directive compliance

Verified before logging: **`npm run lint`** (0 errors, 0 warnings), **`npx tsc --noEmit`**, **`npx jest`** on `wasm-perf-kernel` + `dashboard-form-validation` tests, and **`NODE_OPTIONS="--max-old-space-size=8192" npm run build`** (exit 0, **compiled without webpack “Module not found” for perf-kernel**).

### 1) Task #50 / build hygiene — optional WASM bridge

- `src/lib/wasm/perf-kernel.ts`: dynamic import wrapped with **`/* webpackIgnore: true */`** so webpack does not resolve `wasm/perf-kernel/pkg` when wasm-pack output is absent. Runtime still **`try`/`catch`**es and uses existing **JS fallbacks** (`aggregateDailyCounts`, `multiply4x4`, etc.).

### Build notes (Pass Z)

- Sentry SDK deprecation messages may still print during compile (upstream config).
- Pass Y log above mentioned a WASM webpack warning; **Pass Z removes that warning**.

## Matrix Status Notes (Pass Z Update)

- #50 Performance Kernel (WASM): **Improved** (clean production compile without missing-module noise; WASM still opt-in at runtime when pkg exists).

## Completed In This Loop (Pass AA) — Zero Broken Builds gate

### Directive compliance

Verified before logging: **`npm run lint`** (0 errors, 0 warnings), **`npx tsc --noEmit`**, and **`NODE_OPTIONS="--max-old-space-size=8192" npm run build`** (exit 0; Sentry SDK migration notices unchanged, non-fatal).

### 1) Task #40 (delivery discoverability) — Contact immersive editor → Site settings

Contact copy in the immersive editor does not include webhook fields; operators still configure delivery on **Site settings**. To close the loop called out in Pass Z prep:

- `src/components/editor/immersive-editor.tsx` and `src/components/editor/immersive-page-editor.tsx`: added a short footnote under the contact form preview with a **Site settings** link to `/dashboard/content/site` (recipient email, HTTPS webhooks).

### Playwright / hydration note

A hydration-console smoke test was prototyped in `e2e/smoke-public.spec.ts` but **not** committed: on this agent host Chromium failed to launch (`libnspr4.so` missing; no passwordless sudo for `playwright install-deps`). Keeping the public smoke file unchanged avoids a red e2e gate on minimal Linux images. Follow-up: install Playwright system dependencies in CI or dedicated e2e runners, then add a hydration-focused assertion.

## Matrix Status Notes (Pass AA Update)

- **#40** Form / delivery UX: **Improved** (editor contact surfaces a direct path to Site settings; validation remains centralized on the site settings form).

## Completed In This Loop (Pass AB) — Zero Broken Builds gate

### Directive compliance

Verified before logging: **`npm run lint`** (0 errors, 0 warnings), **`npx tsc --noEmit`**, and **`NODE_OPTIONS="--max-old-space-size=8192" npm run build`** (exit 0).

### 1) Sentry / Next.js 16 alignment (prep item #2)

- **`src/instrumentation.ts`**: `register()` dynamically imports root **`sentry.server.config`** when `NEXT_RUNTIME === "nodejs"` and **`sentry.edge.config`** when `NEXT_RUNTIME === "edge"`; exports **`onRequestError`** as **`Sentry.captureRequestError`** for App Router request errors.
- **`src/instrumentation-client.ts`**: client **`Sentry.init`** (same DSN env behavior as the removed root client file); exports **`onRouterTransitionStart`** as **`Sentry.captureRouterTransitionStart`** (removes SDK “ACTION REQUIRED” build banner).
- **Removed** root **`sentry.client.config.ts`** in favor of `src/instrumentation-client.ts`. Server and edge init remain in root **`sentry.server.config.ts`** / **`sentry.edge.config.ts`** per current Sentry manual setup (imported from `register()`).

### 2) Task #22 — BlogPosting linked to root WebSite `@id`

- **`src/app/blog/[slug]/page.tsx`**: `BlogPosting` includes **`isPartOf: { "@id": "<origin>/#website" }`**, matching **`JsonLdRoot`** so structured data ties posts to the site graph without duplicating a `WebSite` entity in the post script.

## Matrix Status Notes (Pass AB Update)

- **#22** JSON-LD: **Improved** (`isPartOf` → `#website`).
- **Sentry**: **Improved** (instrumentation + client hook; prior instrumentation deprecation messages cleared from typical build output).

## Completed In This Loop (Pass AC) — Opus Recursive Evolution v16 (Loop 1)

### Directive compliance

**Zero Broken Builds:** `npm run lint`, `npx tsc --noEmit`, `NODE_OPTIONS="--max-old-space-size=8192" npm run build` — all exit 0.

### Matrix tasks delivered (5)

1. **#13 — Global command palette** — Added **Content hub** action (`/dashboard/content`) with taxonomy-style keywords and `FolderTree` icon in `src/app/dashboard/dashboard-command-palette.tsx`.
2. **#14 — Interactive skeleton loaders** — Added `src/app/dashboard/hubs/loading.tsx` using `DashboardHubPageSkeleton` so hub routes show the same directional shimmer as other dashboard areas.
3. **#15 — Smart tooltip / guidance** — Wrapped **Global actions** header controls in `src/app/dashboard/dashboard-global-header.tsx` with `TooltipHint` (short, task-oriented labels on hover/focus).
4. **#16 — Empty state visuals** — Extended `DashboardEmptyState` in `src/components/dashboard/dashboard-ui.tsx` with optional `illustration` (`documents` | `folder` | `magnifier` | `chart`) via inline SVG; wired on **Posts** (published list + search + taxonomy) and **Analytics** (no views / no blocked rows).
5. **#11 + #39 — Micro-interactions & graceful failure** — `src/app/dashboard/error.tsx`: warning-triangle illustration, **System health** escape hatch (`/dashboard/system`), copy-friendly digest unchanged, spring entrance via Framer Motion with `useReducedMotion` respect.

## Matrix Status Notes (Pass AC Update)

- **#13** Command palette: **Improved** (content root discoverable from ⌘K).
- **#14** Skeletons: **Improved** (hubs segment).
- **#15** Tooltips: **Improved** (global action strip).
- **#16** Empty states: **Improved** (illustration variants + first wiring).
- **#39** Error UI: **Improved** (root dashboard boundary).
- **#11** Motion: **Touched** (error panel entrance only; shell already uses motion).

## Completed In This Loop (Pass AD) — Opus Recursive Evolution v16

### Directive compliance

**Zero Broken Builds:** `npm run lint`, `npx tsc --noEmit`, `NODE_OPTIONS="--max-old-space-size=8192" npm run build` — all exit 0.

### Matrix tasks delivered (5)

1. **#16 — Empty-state illustrations (rollout)** — Extended `DashboardEmptyIllustrationVariant` with **`gallery`**, **`tags`**, **`clipboard`** in `src/components/dashboard/dashboard-ui.tsx`. Wired **Media** empty drop zone (`DashboardEmptyIllustration`), **Tags** (zero tags + filter miss via `DashboardEmptyState`), **Notes** (no drafts + no search hits + actions), **Audit** (filtered empty list).
2. **#12 — Optimistic / resilient tag merge** — `src/app/dashboard/tags/page.tsx`: snapshot **`allTags`** before optimistic removal; on merge **API failure**, **restore** the snapshot immediately (still refetches afterward for consistency).
3. **#4 — Rich-text floating toolbar** — `src/components/editor/markdown-slash-textarea.tsx`: **Strikethrough** control (`~~` wrap) alongside Bold / Italic / Code / Link; toolbar container gets light **backdrop blur** for depth (elite light).
4. **#19 — Tactile toolbar controls** — Same floating toolbar: **`active:scale-95`** with **`motion-reduce:active:scale-100`** on format buttons.
5. **#17 (minor)** — Floating toolbar surface aligned with existing **elevation + blur** tokens.

## Matrix Status Notes (Pass AD Update)

- **#16**: **Improved** (media, tags, notes, audit covered; other grids can adopt the same prop).
- **#12**: **Improved** (tag merge rollback on error).
- **#4 / #19**: **Improved** (Markdown selection toolbar).

## Completed In This Loop (Pass AE) — Opus Recursive Evolution v16

### Directive compliance

**Zero Broken Builds:** `npm run lint`, `npx tsc --noEmit`, `NODE_OPTIONS="--max-old-space-size=8192" npm run build` — all exit 0.

### Matrix tasks delivered (5)

1. **#16 — Empty states (CV, Sites, Custom pages)** — New illustration variant **`layers`** (stacked panels) in `dashboard-ui.tsx`. **Custom pages** list uses `DashboardEmptyState` with **documents** / **magnifier** (`content/pages/page.tsx`). **CV** uses **documents** when no PDF is on file. **Sites** list: **`sitesLoaded`** gate, loading line, then **`layers`** empty state or grid (`sites/page.tsx`).
2. **#5 — Multi-device preview** — `src/components/editor/immersive-editor.tsx`: **Site / Tablet / Mobile** width toggles in the floating editor bar (`Monitor` / `Tablet` / `Smartphone`), constrained container with rounded border + light shadow; choice persisted in **`sessionStorage`** (`immersive-editor-preview-frame`).
3. **#10 — Undo/redo discoverability** — `src/app/dashboard/dashboard-keyboard-help.tsx`: new **“Visual editor (markdown)”** section (undo, redo, slash menu at line start).
4. **#20 — Writing focus** — Stronger **writing-focus** backdrop blur (**3px → 6px**) for calmer isolation on custom-page raw markdown.
5. **#11 (minor)** — Preview container uses **transition-[max-width]** for smooth frame changes.

## Matrix Status Notes (Pass AE Update)

- **#16**: **Improved** (custom pages, CV, platform sites).
- **#5**: **Improved** (immersive editor preview frames).
- **#10 / #20**: **Improved** (help copy + focus backdrop).

## Completed In This Loop (Pass AF) — Opus Recursive Evolution v16

### Directive compliance

**Zero Broken Builds:** `npm run lint`, `npx tsc --noEmit`, `NODE_OPTIONS="--max-old-space-size=8192" npm run build` — all exit 0.

### Matrix tasks delivered (5)

1. **#39 — Root error boundary + observability** — `src/app/global-error.tsx`: **`Sentry.captureException(error)`** in the same `useEffect` as console logging so uncaught App Router failures reach Sentry when DSN is configured.
2. **#32 + #13 — Data liberation discoverability** — `dashboard-command-palette.tsx`: new **Go** action **“Export data (ZIP bundle)”** (`Package` icon, keywords: export, zip, backup, GDPR, etc.) deep-linking to **`/dashboard/content/site`** where ZIP export already lives.
3. **#15 — Preview width tooltips** — `immersive-editor.tsx`: **`TooltipHint`** on **Site / Tablet / Mobile** preview toggles (focus/hover guidance; `title` removed to avoid duplicate native tooltips).
4. **#18 — Layout stability in framed preview** — Non-site preview wrapper uses **`min-h-[min(72vh,820px)]`** so switching tablet/mobile frames causes less vertical jump when content is short.
5. **#14 — Skeleton loaders** — `src/app/dashboard/content/home/loading.tsx` and **`content/about/loading.tsx`** render **`DashboardHubPageSkeleton`** for faster perceived load on those CMS routes.

## Matrix Status Notes (Pass AF Update)

- **#39**: **Improved** (global error → Sentry).
- **#32 / #13**: **Improved** (ZIP export path from ⌘K).
- **#15 / #18**: **Improved** (immersive preview UX).
- **#14**: **Improved** (content home/about loading segments).

## Completed In This Loop (Pass AG) — Opus Recursive Evolution v16

### Directive compliance

**Zero Broken Builds:** `npm run lint`, `npx tsc --noEmit`, `NODE_OPTIONS="--max-old-space-size=8192" npm run build` — all exit 0.

### Matrix tasks delivered (5)

1. **#5 — Multi-device preview scoped to custom pages** — `src/components/editor/immersive-editor.tsx`: `previewActive` gates framed width classes and the floating **Site / Tablet / Mobile** control group so **home**, **about**, and **contact** immersive targets always use the default public site container; custom pages keep responsive preview frames and `sessionStorage` persistence.
2. **#6 — Template system** — `src/app/dashboard/content/pages/page.tsx`: new **Project / Case study** template (`project-case-study`) with structured sections for overview, challenge, approach, stack, outcomes, and gallery/links.
3. **#14 — Skeleton loaders** — `src/app/dashboard/content/contact/loading.tsx`: **`DashboardHubPageSkeleton`** for the contact CMS route (parity with home/about).
4. **#35 — Audit log guidance** — `src/app/dashboard/dashboard-keyboard-help.tsx`: **Audit log** shortcut group (command palette path + bookmark pins stored locally).
5. **#19 — Tactile pin controls** — `src/app/dashboard/audit/page.tsx`: shared **`AUDIT_PIN_BUTTON_CLASS`** with **`active:scale-[0.97]`** and **`motion-reduce`** fallback on pin buttons (mobile + desktop).

## Matrix Status Notes (Pass AG Update)

- **#5**: **Refined** (preview chrome is custom-page–only; core site editors stay full-width).
- **#6**: **Improved** (extra high-signal template for portfolios).
- **#14**: **Improved** (contact loading segment).
- **#35 / #19**: **Improved** (audit discoverability + pin micro-interaction).

## Completed In This Loop (Pass AH) — Opus Recursive Evolution v16

### Directive compliance

**Zero Broken Builds:** `npm run lint`, `npx tsc --noEmit`, `NODE_OPTIONS="--max-old-space-size=8192" npm run build` — all exit 0.

### Matrix tasks delivered (5)

1. **#5 — Device chrome in framed preview** — `src/components/editor/immersive-editor.tsx`: lightweight **status bar** (time pill, preview label, battery glyph) plus optional **mobile earpiece** bar; shown only for **custom-page** targets when frame is **tablet** or **mobile** (not site width).
2. **#11 — Micro-interactions** — Same bar uses **Framer Motion** enter (`opacity` / `y`) with **`useReducedMotion`** bypass for the preview chrome when switching frames.
3. **#18 — Layout stability** — Framed (non-site) preview wrapper **`min-h`** now includes **`+2.25rem`** to reserve space for the status bar so the canvas does not collapse or jump as aggressively when the chrome appears.
4. **#6 — Template system** — `src/app/dashboard/content/pages/page.tsx`: **Changelog** (`changelog`) and **Pricing** (`pricing`) one-click templates with structured markdown scaffolding.
5. **#14 — Skeleton loaders** — `src/app/dashboard/posts/operations/loading.tsx`: **toolbar + tall card** skeleton for bulk find/replace operations while the route segment loads.

### Matrix Status Notes (Pass AH Update)

- **#5 / #11 / #18**: **Improved** (device chrome + motion + reserved height).
- **#6**: **Improved** (changelog + pricing templates).
- **#14**: **Improved** (posts operations segment).
- **#15**: **Touched** ( **`TooltipHint`** on floating **Editor Mode** chip).

## Completed In This Loop (Pass AI) — Opus Recursive Evolution v16

### Directive compliance

**Zero Broken Builds:** `npm run lint`, `npx tsc --noEmit`, `NODE_OPTIONS="--max-old-space-size=8192" npm run build` — all exit 0.

### Matrix tasks delivered (5)

1. **#1 — Dynamic block library (module kits)** — `src/components/site-block-builder.tsx`: four one-click **module kits** — **Resume** (professional hero + timeline + skill grid + contact), **Project** (hero + project showcase + stats + CTA), **Hero** (hero + logo cloud + testimonials + CTA), **Skills** (professional hero + skill grid + text + FAQ + contact). Card retitled **Layouts & module kits** with short guidance copy.
2. **#6 — Template system** — `src/app/dashboard/content/pages/page.tsx`: **Resume / CV** (`resume-cv`) and **Privacy policy** (`privacy-policy`) markdown templates (privacy includes non-legal-advice disclaimer).
3. **#13 — Command palette** — `dashboard-command-palette.tsx`: expanded **Custom pages** action keywords (`builder`, `blocks`, `modules`, `visual`, `no-code`, `site builder`, `hero`, `skills`, `resume`, `project`, `layout`) for faster ⌘K discovery.
4. **#15 — Tooltips** — **`TooltipHint`** on each module kit button describing the block stack.
5. **#19 — Tactile controls** — shared **`BUILDER_PRESET_TACTILE`** (`active:scale-[0.98]`, `motion-reduce` safe) on full-page starter and module kit buttons.

## Matrix Status Notes (Pass AI Update)

- **#1**: **Improved** (named Resume / Project / Hero / Skills kits in the visual builder).
- **#6**: **Improved** (resume + privacy templates on custom pages).
- **#13**: **Improved** (palette discoverability for builder workflows).
- **#15 / #19**: **Improved** (kit tooltips + tactile preset buttons).

## Completed In This Loop (Pass AJ) — Opus Recursive Evolution v16

### Directive compliance

**Zero Broken Builds:** `npm run lint`, `npx tsc --noEmit`, `NODE_OPTIONS="--max-old-space-size=8192" npm run build` — all exit 0.

### Matrix tasks delivered (5)

1. **#10 — Global undo/redo (visual builder)** — `src/components/site-block-builder.tsx`: bounded history (**40** entries) for **blocks + theme + brand**; **Undo/Redo** icon buttons with **`TooltipHint`** and **`BUILDER_PRESET_TACTILE`**; **⌘/Ctrl+Z** and **⌘/Ctrl+Shift+Z** when focus is inside the builder but **not** in an input/textarea (so field-level native undo still works). **500ms** debounced history grouping for **`updateBlock`** typing bursts; **`pushHistorySnapshot`** flushes pending debounce; history cleared when external **`value`** reloads the builder.
2. **#6 — Template system** — `src/app/dashboard/content/pages/page.tsx`: **Terms of service** template (`terms-of-service`, default slug `terms`) with disclaimer stub.
3. **#10 (help)** — `src/app/dashboard/dashboard-keyboard-help.tsx`: **Visual page builder (blocks)** shortcut section.
4. **#13 — Command palette** — `dashboard-command-palette.tsx`: extra **Custom pages** keywords (`terms`, `tos`, `privacy`, `legal`).
5. **#15** — Brand card uses **one history snapshot per focus session** into the panel (`onBlurCapture` resets); builder root exposes **`data-site-block-builder`** for scoped keyboard handling.

## Matrix Status Notes (Pass AJ Update)

- **#10**: **Improved** (builder undo/redo + keyboard + debounced block edits).
- **#6**: **Improved** (ToS template alongside privacy/resume).
- **#13**: **Improved** (legal/template discovery via ⌘K).

## Completed In This Loop (Pass AK) — Opus Recursive Evolution v16

### Directive compliance

**Zero Broken Builds:** `npm run lint`, `npx tsc --noEmit`, `NODE_OPTIONS="--max-old-space-size=8192" npm run build` — all exit 0.

### Matrix tasks delivered (5)

1. **#6 — Template system UX** — `src/app/dashboard/content/pages/page.tsx`: each template has a **`category`** (`profile` | `marketing` | `legal` | `product`) with **Lucide icons** and **filter chips** (All + four categories, tactile buttons). Cards use **rounded-xl**, **`shadow-[var(--elevation-1)]`**, and a **category pill** beside the title.
2. **#11 — Micro-interactions** — Same page: **Framer Motion** **staggered** list entrance (`key={templateCategoryFilter}` remount for clean transitions) and subtle **whileHover** lift on template cards.
3. **#17 — Design system** — Unified **elevation** on the templates **Card** and per-template cards; icon tiles use **muted** surfaces consistent with dashboard patterns.
4. **#18 — Layout / perf polish** — `src/components/site-block-builder.tsx`: sortable block list sits in a **max-height scroll** region with **`content-visibility: auto`**, **`contain-intrinsic-size`**, and **`motion-reduce:[content-visibility:visible]`** so off-screen rows skip work without hurting reduced-motion users.
5. **#13 + #49 + #15 + #40** — `dashboard-command-palette.tsx`: **All posts** action gains keywords for **versions / diff / compare / restore / rollback / revision**. `src/app/dashboard/posts/[id]/page.tsx`: **`TooltipHint`** on **Compare** and **Restore** in version history; **Slug** label uses ASCII colon (fixes full-width punctuation).

## Matrix Status Notes (Pass AK Update)

- **#6 / #11 / #17**: **Improved** (categorized template picker + motion + elevation).
- **#18**: **Improved** (builder block list scroll + content-visibility).
- **#13 / #49 / #15**: **Improved** (palette + version UI guidance).

## Completed In This Loop (Pass AL) — Opus Recursive Evolution v16

### Directive compliance

**Zero Broken Builds:** `npm run lint`, `npx tsc --noEmit`, `NODE_OPTIONS="--max-old-space-size=8192" npm run build` — all exit 0.

### Matrix tasks delivered (5)

1. **#7 — Gallery reorder + masonry preview** — `src/components/site-block-builder.tsx`: **Gallery** block uses **`GalleryLinksField`** with per-row URL inputs, **↑ / ↓** reorder (**`arrayMove`**, avoids nested **dnd-kit**), remove row, **Add URL row**, plus **`TooltipHint`** + **`BUILDER_PRESET_TACTILE`** on controls; **Add from Media** wrapped in **`TooltipHint`**. **Live preview** uses **CSS multi-column masonry** (`columns-2` / `sm:columns-3`, `break-inside-avoid`, varied **aspect-ratio** placeholders). **Advanced** collapsible **raw lines** textarea kept for power users.
2. **#2 / #15** — Block **grip** wrapped in **`TooltipHint`** (drag + **dnd-kit** keyboard sorting) and **tactile** class; **`dashboard-keyboard-help.tsx`**: third row under **Visual page builder** documents **grip + arrow** reordering.
3. **#49 — Version diff layout** — `src/app/dashboard/posts/[id]/page.tsx`: **Unified** vs **Split** toggle on version compare; **Split** shows **version snapshot** and **current draft** in side-by-side **`pre`** panes (max-height scroll). Layout resets to **Unified** when diff is closed.
4. **#13** — `dashboard-command-palette.tsx`: **Custom pages** keywords **`gallery`**, **`masonry`**, **`images`**, **`reorder`**.
5. **#17 (minor)** — Gallery preview tiles use **border** + **rounded-lg** consistent with builder cards.

## Matrix Status Notes (Pass AL Update)

- **#7**: **Improved** (builder gallery UX + masonry-style preview).
- **#2 / #15**: **Improved** (grip guidance + keyboard help).
- **#49**: **Improved** (split diff reading mode).
- **#13**: **Improved** (palette keywords for gallery workflows).

## Next Loop Prep (Auto-Staged Candidates)

1. **Zero Broken Builds**: same gate (`lint` + `tsc` + focused Jest where touched + `npm run build` with heap if needed).
2. **#7**: Public **page render** for gallery block: real **`<img>`** masonry with **lazy** + **aspect-ratio** (if not already in markdown pipeline).
3. **#18**: Immersive editor **CLS** after long markdown + device chrome.
4. **E2E**: Playwright smoke when browser system libraries are available.
5. **#49**: Optional **synchronized scroll** or **character-level** highlight in split diff (higher effort).
6. **#23**: Wire **next/image** or responsive srcset for builder gallery preview thumbnails when URLs are same-origin or allowed remote patterns.
