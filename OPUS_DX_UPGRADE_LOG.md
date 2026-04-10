# OPUS DX Upgrade Log

Date: 2026-04-09

This document records a full five-loop DX/UX overhaul run for the Next.js Personal CMS.

## Loop 1 — Elite Markdown & Code Block Experience

### Markdown rendering pipeline upgrade

- Added `rehype-pretty-code` and integrated it into `src/lib/markdown-pipeline.ts`.
- Replaced `rehype-highlight` in the active markdown plugin chain.
- Kept `rehypeRaw`, sanitization, slugging, KaTeX, and spacing plugins intact.

### Code block wrapper improvements

- Enhanced code block metadata support:
  - `src/components/markdown-renderer.tsx`
  - `src/components/markdown/markdown-components-server.tsx`
- Added filename extraction from fenced code meta (`file=`, `filename=`, `title=`).
- Upgraded `src/components/markdown/blog-markdown-pre.tsx`:
  - language badge retained
  - optional file-name badge added
  - one-click copy remains with animated success checkmark

### Typography/readability tuning

- Updated markdown article class for stronger reading flow and wrapping:
  - `src/lib/markdown-pipeline.ts`
- Existing prose and mobile polish in `globals.css` kept consistent with light-mode typography direction.

## Loop 2 — Zero-Friction CRUD & Editor UX

### Global CRUD keyboard shortcuts

- Added reusable hook:
  - `src/hooks/use-cms-crud-shortcuts.ts`
- Integrated in:
  - `src/app/dashboard/posts/new/page.tsx`
    - `Cmd/Ctrl + Enter` => set publish flag and submit
  - `src/app/dashboard/posts/[id]/page.tsx`
    - `Cmd/Ctrl + Enter` => publish + save
    - `Cmd/Ctrl + Backspace/Delete` => open styled delete confirmation modal
- Existing `Cmd/Ctrl + S` save shortcut behavior retained via `useCmsFormSaveShortcut`.

### Immersive editor synchronized scrolling

- Added raw markdown + live preview synchronized scrolling in:
  - `src/components/editor/immersive-editor.tsx`
- Added side-by-side preview panel in raw custom-page mode using `MarkdownRenderer`.
- Used scroll ratio synchronization between textarea and preview container.

### Optimistic CRUD updates

- Improved bulk media deletion UX with optimistic list updates:
  - `src/app/dashboard/media/media-content.tsx`
- Immediate UI removal now occurs before network completion, with rollback on failure.

## Loop 3 — Absolute Portability (Data Liberation)

### Export API

- Added authenticated export route:
  - `src/app/api/data-liberation/export/route.ts`
- `target=posts`:
  - exports all posts as a ZIP archive
  - each file is `.mdx` with frontmatter + markdown body
  - includes `manifest.json`
- `target=system`:
  - exports site config + about config + custom pages + editable site pages + analytics logs as JSON

### Settings UI integration

- Added Data Liberation section in:
  - `src/app/dashboard/content/site/page.tsx`
- Added buttons:
  - Export posts ZIP
  - Export system JSON
- Includes loading state, download handling, and success/error feedback.

## Loop 4 — Autonomous Maintenance & Management

### System health dashboard tab

- Added new dashboard route:
  - `src/app/dashboard/system/page.tsx`
- Features:
  - Database health check
  - Orphaned media scan + cleanup actions
  - Database optimize action

### Maintenance API

- Added:
  - `src/app/api/system/maintenance/route.ts`
- GET:
  - runs DB health check (`SELECT 1`)
  - returns measured latency and engine type
- POST (`action=optimize-db`):
  - SQLite => `VACUUM`
  - PostgreSQL => `ANALYZE`

### Navigation and IA wiring

- Added System Health into grouped dashboard IA:
  - `src/app/dashboard/dashboard-nav.tsx`
- Added breadcrumb support:
  - `src/app/dashboard/dashboard-breadcrumbs.tsx`

## Loop 5 — Quality-of-Life Polish

### Form and modal behavior refinements

- Ensured modal first-input autofocus in bulk edit modal:
  - `src/app/dashboard/posts/posts-table-client.tsx`
- Existing Esc-to-close behavior preserved and consistent.

### Toast system refinements

- Extended toast type support with warning status:
  - `src/contexts/toast-context.tsx`
- Final standardized visual categories:
  - Success (green)
  - Error (red)
  - Warning (amber)
  - Info (neutral card)

### Cohesion alignment updates included in this run

- Introduced/used shared UI cohesion primitives:
  - `src/components/ui/ui-cohesion.ts`
- Continued normalization of modal, shadow, spacing, and easing usage in key UI components.

## Dependencies Added

- `jszip` (for ZIP export packaging)
- `rehype-pretty-code` (for upgraded syntax highlighting pipeline)

## Verification

- `npm run lint`
  - Passes with one unrelated pre-existing warning in `src/__tests__/security-txt-route.test.ts`
- `npm run test -- markdown-heading-outline.test.ts api-github-integration-route.test.ts`
  - Passes
- `NODE_OPTIONS="--max-old-space-size=4096" npm run build`
  - Passes
