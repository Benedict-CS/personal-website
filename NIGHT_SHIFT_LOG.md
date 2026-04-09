# Night shift log

Uninterrupted five-loop session **2026-04-09**.

---

## Ninth pass (same day) — five-loop mega-task

### Loop 1 — Public nav light polish

- **`src/components/navbar.tsx`** — semantic Tailwind (**`border-border`**, **`bg-background/80`**, **`shadow-sm`**, **`text-foreground`**, **`text-primary`**, **`bg-accent`**, **`text-muted-foreground`**) instead of raw **`var(--*)`**; shared **`signOutAndGoHome`** (**`useCallback`**) for desktop and mobile sign-out.

### Loop 2 — CMS: definition list insert

- **`src/lib/cms-definition-list-insert.ts`** — **`buildCmsDefinitionListMarkdown()`** for CommonMark-style term / **`: definition`** blocks (glossaries, API docs).
- **`src/__tests__/cms-definition-list-insert.test.ts`** — structure checks.
- **`src/components/markdown-template-inserter.tsx`** — **Definition list** smart-block button (**`TextQuote`** icon).

### Loop 3 — Immersive editor typing path

- **`src/components/editor/immersive-editor.tsx`** — **`patchHome`**, **`patchContact`**, **`patchAbout`**, **`patchCustomPageTitle`** call **`setState` directly**; **`ContentEditableField`** already wraps **`onChange`** in **`startTransition`**, avoiding double-transition latency on each keystroke.

### Loop 4 — Go module proxy integration

- **`src/app/api/integrations/gomodule/route.ts`** — **`GET /api/integrations/gomodule?module=github.com/org/repo`** → **`proxy.golang.org/.../@latest`** (**`Version`**, optional release **`Time`** surfaced as **`description`**).
- **`src/__tests__/api-integrations-gomodule.test.ts`** — mocked **`fetch`** tests.
- **`src/app/dashboard/tools/ast-lab/ast-lab-client.tsx`** — eighth registry card (**`Terminal`** icon), default query **`github.com/gin-gonic/gin`**.

### Loop 5 — Global error boundary + docs

- **`src/app/global-error.tsx`** — error **`digest`** read via **`useMemo`** with defensive **`try/catch`** (aligned with **`src/app/error.tsx`**).
- This log section.

### Verification (ninth pass)

- `npm run lint`
- `npm run build`
- `npm test -- --testPathPatterns=cms-definition-list-insert`
- `npm test -- --testPathPatterns=api-integrations-gomodule`

---

## Eighth pass (same day) — five-loop mega-task

### Loop 1 — Light-mode polish

- **`src/components/footer.tsx`** — semantic Tailwind (**`border-border`**, **`bg-muted/50`**, **`text-muted-foreground`**, **`hover:text-foreground`**) instead of raw **`var(--*)`** for the global footer (aligns with dashboard token usage).

### Loop 2 — CMS: collapsible block insert

- **`src/lib/cms-details-block-insert.ts`** — **`buildCmsDetailsBlockMarkdown()`** returns an HTML **`<details>` / `<summary>`** starter for long posts where raw HTML is allowed.
- **`src/__tests__/cms-details-block-insert.test.ts`** — structure checks.
- **`src/components/markdown-template-inserter.tsx`** — **Collapsible** smart-block button (**`PanelBottom`** icon).

### Loop 3 — Immersive editor typing UX

- **`src/components/editor/immersive-editor.tsx`** — **`patchHome`**, **`patchContact`**, **`patchAbout`**, **`patchCustomPageTitle`** wrap **`ContentEditableField`** updates in **`startTransition`**; home section **DndKit** reorder uses **`startTransition`** as well (keeps heavy chrome updates off the critical input path).

### Loop 4 — Hex.pm (Elixir) integration

- **`src/app/api/integrations/hexpm/route.ts`** — **`GET /api/integrations/hexpm?package=name`** → **`hex.pm/api/packages/:name`**; **`name`**, **`version`** (stable → latest → first release), **`description`**, **`license`**; **`400` / `404` / `502`**, cache headers, **`try/catch`**.
- **`src/__tests__/api-integrations-hexpm.test.ts`** — mocked **`fetch`** tests.
- **`ast-lab-client.tsx`** — seventh registry panel (default **`ecto`**); registry grid **`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`** for seven cards without ultra-narrow **`2xl:grid-cols-6`**.

### Loop 5 — Error boundary + docs

- **`src/app/error.tsx`** — error **`digest`** derived with **`useMemo`** and existing defensive **`try/catch`** (stable read when **`error`** reference changes).
- This log section.

### Verification (eighth pass)

- `npm run lint`
- `npm run build`
- `npm test -- --testPathPatterns=cms-details-block-insert`
- `npm test -- --testPathPatterns=api-integrations-hexpm`

---

## Seventh pass (same day) — five-loop mega-task

### Loop 1 — Dashboard / editor UI polish

- **`src/components/editor/immersive-editor-overlay.tsx`** — remaining **`var(--*)`** Tailwind replaced with semantic utilities (**`border-border`**, **`bg-card/90`**, **`bg-background`**, **`text-foreground`**, **`shadow-lg`**, etc.) for a consistent light immersive chrome.

### Loop 2 — CMS: slug safety + shared slugify

- **`src/lib/cms-slug-from-title.ts`** — **`slugifyPostTitle`** (title → slug, hyphen collapse, uses **`normalizeSlug`**).
- **`src/__tests__/cms-slug-from-title.test.ts`** — unit tests.
- **`src/app/dashboard/posts/new/page.tsx`** — title changes still sync the slug via **`slugifyPostTitle`**; **Regenerate from title** button if the slug was edited manually.
- **`src/app/dashboard/posts/[id]/page.tsx`** — **title edits no longer overwrite the slug** (avoids accidental URL changes for published posts); **Regenerate from title** applies **`slugifyPostTitle`** when the author intends to update the slug.

### Loop 3 — Refactor + immersive performance

- **`src/components/editor/immersive-surface-classes.ts`** — **`IMMERSIVE_OVERLAY_PANEL_SCROLLABLE`** shared class for the draggable overlay panel.
- **`immersive-editor.tsx`** — **`onCustomPageBlockChange`** wrapped in **`startTransition`** (visual builder path matches the deferred raw-markdown updates).

### Loop 4 — Packagist (Composer) integration

- **`src/app/api/integrations/packagist/route.ts`** — **`GET /api/integrations/packagist?package=vendor/name`** → **`repo.packagist.org/p2/...json`**; returns **`name`**, **`version`**, **`description`**, **`license`**; **`400` / `404` / `502`**, cache headers, **`try/catch`**.
- **`src/__tests__/api-integrations-packagist.test.ts`** — mocked **`fetch`** tests.
- **`ast-lab-client.tsx`** — sixth registry panel (default **`symfony/http-foundation`**); grid **`2xl:grid-cols-6`**.

### Loop 5 — Resilience + docs

- Re-checked **`global-error.tsx`**: **`reset`** already in **`try/catch`** with **`window.location`** fallback.
- New Packagist route follows the same JSON + HTTP error pattern as npm/PyPI/NuGet/RubyGems.
- This log section.

### Verification (seventh pass)

- `npm run lint`
- `npm run build`
- `npm test -- --testPathPatterns=cms-slug-from-title`
- `npm test -- --testPathPatterns=api-integrations-packagist`

---

## Sixth pass (same day) — five-loop mega-task

### Loop 1 — Dashboard UI polish

- **`src/components/dashboard-system-status.tsx`** — semantic Tailwind (**`text-foreground`**, **`text-muted-foreground`**, **`border-border`**, **`bg-muted`**) instead of raw **`var(--*)`** (overview card).
- **`src/components/markdown/markdown-editor-chrome.tsx`** — **`shadow-sm`** for the smart-blocks toolbar shell.

### Loop 2 — CMS: live draft stats

- **`src/lib/cms-post-draft-stats.ts`** — **`computePostDraftMarkdownStats`** (words, lines, characters; reuses **`markdown-source-metrics`**).
- **`src/__tests__/cms-post-draft-stats.test.ts`** — unit tests.
- **`src/components/dashboard/post-draft-markdown-stats.tsx`** + **`dashboard-typography-classes.ts`** (**`DASHBOARD_META_LINE_CLASS`**) — read-only strip under **Smart blocks** on **new post** and **edit post**.

### Loop 3 — Refactor + immersive typing

- Shared meta typography constant for the stats strip (reusable for other dashboard microcopy).
- **`src/components/editor/immersive-editor.tsx`** — custom-page raw Markdown updates go through **`startTransition`** so large editor chrome can stay responsive while **`ImmersiveCustomMarkdownField`** RAF-batches value sync.

### Loop 4 — RubyGems integration

- **`src/app/api/integrations/rubygems/route.ts`** — **`GET /api/integrations/rubygems?gem=name`** → **`rubygems.org/api/v1/gems/{name}.json`** (**`name`**, **`version`**, **`description`** from **`info`**, **`license`** from first entry when present); **`400` / `404` / `502`**, cache headers, **`try/catch`**.
- **`src/__tests__/api-integrations-rubygems.test.ts`** — mocked **`fetch`** tests.
- **`ast-lab-client.tsx`** — fifth registry panel; grid **`md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5`**.

### Loop 5 — Resilience + docs

- **`src/app/not-found.tsx`** — **`getSiteConfigForRender`** wrapped in **`try/catch`** so config/DB issues cannot break the 404 page; footer uses **`text-muted-foreground`** and omits empty URL.

### Verification (sixth pass)

- `npm run lint`
- `npm run build`
- `npm test -- --testPathPatterns=cms-post-draft-stats`
- `npm test -- --testPathPatterns=api-integrations-rubygems`

---

## Fifth pass (same day) — five-loop mega-task

### Loop 1 — Dashboard UI polish

- Broad **`var(--*)` → semantic Tailwind** pass across **`src/app/dashboard/`** (audit, content pages, media, posts, shell, nav, breadcrumbs, operations, overview, loading skeletons, **`src/app/error.tsx`**).
- **`src/components/dashboard/dashboard-ui.tsx`** / **`dashboard-skeleton-primitives.tsx`** — **`shadow-sm`** instead of **`shadow-[var(--shadow-sm)]`**; skeleton pulse uses **`bg-muted`** / **`border-border`**.
- **`src/components/editor/immersive-editor.tsx`** — glass variables replaced with **`border-border`**, **`bg-card`**, **`shadow-lg`**, **`ring`**, **`primary`**, **`muted`** utilities for a consistent light surface.

### Loop 2 — CMS: tidy markdown

- **`src/lib/cms-normalize-markdown.ts`** — **`normalizeMarkdownWhitespace`** (trim line ends, collapse 3+ blank lines, CRLF normalize, document trim).
- **`src/__tests__/cms-normalize-markdown.test.ts`** — unit tests.
- **`src/components/markdown-template-inserter.tsx`** — optional **`onTidyBody`** + **Tidy markdown** button; wired on **new post** and **edit post** screens.

### Loop 3 — Refactor + typing UX

- **`src/components/dashboard/dashboard-drag-zone-classes.ts`** — shared drop-zone classes; **`media-content`** and **`posts/[id]`** use **`DASHBOARD_DROP_ZONE_*`**.
- **`src/components/editor/content-editable-field.tsx`** — **`startTransition`** around **`onInput`** updates; **`focus:ring-ring`** (immersive home/contact/about fields stay responsive under heavy parent trees).

### Loop 4 — NuGet integration

- **`src/app/api/integrations/nuget/route.ts`** — **`GET /api/integrations/nuget?package=Id`** via NuGet Search API (exact package id); **`400` / `404` / `502`**, cache headers, **`try/catch`**.
- **`src/__tests__/api-integrations-nuget.test.ts`** — mocked **`fetch`** tests.
- **`ast-lab-client.tsx`** — fourth registry panel (**NuGet**); grid **`md:grid-cols-2 xl:grid-cols-4`**.

### Loop 5 — Resilience + docs

- **`src/app/dashboard/error.tsx`** — safe **`errorDigest`** via **`useMemo`** + defensive reads for **`digest`**; copy uses **`String()`**; **`reset`** already wrapped in **`try/catch`**.
- This log section.

### Verification (fifth pass)

- `npm run lint`
- `npm run build`
- `npm test -- --testPathPatterns=cms-normalize-markdown`
- `npm test -- --testPathPatterns=api-integrations-nuget`

---

## Fourth pass (same day)

- **`src/components/dashboard/dashboard-overlay-classes.ts`** — shared **`DASHBOARD_OVERLAY_SCRIM`** and **`DASHBOARD_MODAL_PANEL_BASE`** for dashboard overlays (scrim + card panel).
- **`src/app/dashboard/dashboard-command-palette.tsx`** — palette shell uses those constants and semantic Tailwind (**`border-border`**, **`bg-card`**, **`text-foreground`**, **`bg-accent`**, etc.) instead of raw **`var(--*)`**.
- **`src/app/dashboard/dashboard-keyboard-help.tsx`** — same overlay token pattern (from earlier in this pass).
- **`src/lib/cms-reading-time-insert.ts`** + **`src/__tests__/cms-reading-time-insert.test.ts`** — helper to insert a Markdown reading-time line from source text; **`src/components/markdown-template-inserter.tsx`** adds a **Reading time** quick action.
- **`src/app/api/integrations/crates/route.ts`** — **`GET /api/integrations/crates?crate=name`** → crates.io crate metadata (**`name`**, **`version`**, **`description`**, **`license`** placeholder **`null`**); defensive JSON and HTTP errors.
- **`src/__tests__/api-integrations-crates.test.ts`** — mocked **`fetch`** coverage for the crates route.
- **`src/app/dashboard/tools/ast-lab/ast-lab-client.tsx`** — third registry panel (**crates.io**) wired to **`/api/integrations/crates`** (default query **`serde`**); registry row grid **`md:grid-cols-2 xl:grid-cols-3`**.

### Verification (fourth pass)

- `npm run lint`
- `npm run build`
- `npm test -- --testPathPatterns=cms-reading-time-insert`
- `npm test -- --testPathPatterns=api-integrations-crates`
- `npm test -- --testPathPatterns=api-integrations-npm` and `api-integrations-pypi` (regression)

---

## Third pass — Dashboard UI / semantic tokens

- **`src/components/dashboard/dashboard-form-classes.ts`** — **`DASHBOARD_FORM_LABEL_CLASS`** for consistent CMS form labels (`text-sm font-medium text-foreground`).
- **`src/app/dashboard/posts/new/page.tsx`** and **`src/app/dashboard/posts/[id]/page.tsx`** — field labels use the shared constant (including pinned label via **`cn(...)`**).
- **`src/app/dashboard/tools/ast-lab/ast-lab-client.tsx`** — Markdown + syntax-tree panes and **AstNodeView** use **`border-border`**, **`bg-card`**, **`text-foreground`**, **`text-muted-foreground`**, **`shadow-sm`**, etc., instead of raw **`var(--*)`** classes.
- **`src/app/dashboard/error.tsx`** — error title uses **`text-foreground`**.
- **`src/app/dashboard/posts/posts-table-client.tsx`** — bulk-edit heading uses **`text-foreground`**.

---

## Loop 2 — CMS: copy public post URL

- **`src/app/dashboard/posts/[id]/page.tsx`** — when **`published`** and slug is non-empty, **Copy public URL** copies **`{origin}/blog/{slug}`** to the clipboard (toast on success/failure). Complements **Preview** (opens tab) and draft preview links.

---

## Loop 3 — Refactor + immersive typing UX

- **`src/components/dashboard/registry-lookup-shell.tsx`** — reusable panel for “package name → integration API” UIs (input, **Look up**, error slot, children for results).
- **`src/app/dashboard/tools/ast-lab/ast-lab-client.tsx`** — **`RegistryMetaDl`** for shared npm/PyPI result layout; npm block refactored onto **`RegistryLookupShell`**.
- **`src/components/editor/immersive-editor.tsx`** — **`pulseImmersiveTypingChrome`** / **`endImmersiveTypingChrome`** wrap **`setImmersiveTypingDim`** in **`startTransition`** so typing stays responsive while chrome dims.

---

## Loop 4 — Developer integration: PyPI API + AST Lab

- **`src/app/api/integrations/pypi/route.ts`** — **`GET /api/integrations/pypi?package=name`** → latest **`name`**, **`version`**, **`description`** (summary), **`license`** from **`pypi.org/pypi/.../json`**; validation, **400** / **404** / **502**, cache headers, **`try/catch`**.
- **`src/__tests__/api-integrations-pypi.test.ts`** — validation, success (mocked **`fetch`**), 404.
- **AST Lab** — second column: **PyPI** lookup using **`RegistryLookupShell`** + **`RegistryMetaDl`**.

---

## Loop 5 — Resilience + documentation

- New **PyPI** route follows the same defensive JSON + HTTP error pattern as **npm**.
- **`NIGHT_SHIFT_LOG.md`** — this file.

---

## Verification

- `npm run lint`
- `npm run build`
- `npm test -- --testPathPatterns=api-integrations-pypi`
- `npm test -- --testPathPatterns=api-integrations-npm` (regression)

---

## Prior passes (same day, before third)

Earlier runs added broad **`DashboardPageHeader`** coverage, markdown quick-insert, **`ContentEditableField`**, **`/api/integrations/npm`**, keyboard save on new post, **`useCmsFormSaveShortcut`** on edit post, and error-boundary digest hardening. See git history for the full timeline.
