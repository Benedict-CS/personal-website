# OPUS Data-Sync & Guided UX Log

Date: 2026-04-09  
Protocol: Opus Data-Sync & Guided UX (4 loops)

## Loop 1 - Bulletproof DB & API Synchronization

Implemented a unified publication state layer and transactional write paths for posts:

- Added `src/lib/post-publication-state.ts` with:
  - `resolvePublicationState()` (`draft` | `scheduled` | `published`)
  - `normalizePublicationInput()` for deterministic `published`/`publishedAt` normalization
  - `withPublicationState()` to attach normalized state to API responses
- Updated `src/app/api/posts/route.ts`:
  - GET now decorates post payloads with `publicationState`.
  - POST now normalizes publication input and returns `publicationState`.
  - Added stronger public surface cache invalidation hooks.
- Updated `src/app/api/posts/[id]/route.ts`:
  - GET now returns `publicationState`.
  - PATCH now uses transactional persistence for version snapshots + post update.
  - Content-only updates and full updates now return publication-state-enriched payloads.
  - Cache invalidation now covers home/blog/archive/feed/sitemap/tag pages.
- Updated `src/app/api/posts/bulk/route.ts`:
  - Converted bulk paths to transactional operations.
  - Returns updated post payloads (when applicable), not only counts.
  - Revalidates affected post/tag public routes.
- Updated editor API return payloads:
  - `src/app/api/editor/inline-content/route.ts` now returns the saved object and `updatedAt`.
  - `src/app/api/editor/revisions/route.ts` now returns revision payload metadata.
- Updated `src/lib/audit.ts` to return created audit entry (or `null` on write failure), enabling richer API responses.

## Loop 2 - Anxiety-Free Editor State (Auto-Save & Publishing)

Implemented robust debounced editor autosave and explicit state feedback in immersive editor:

- Updated `src/components/editor/immersive-editor.tsx`:
  - Added debounced autosave-to-database for editor targets via shared `persistChanges()` flow.
  - Added explicit sync states: `saving`, `saved-draft`, `published`, `error`.
  - Added status signaling in floating editor status chips.
  - Manual save now flushes pending autosave timers before persistence.
  - Publishing custom pages triggers a premium success toast with direct live URL link.
- Updated `src/app/dashboard/posts/[id]/page.tsx`:
  - Distinct publish success path now emits a premium toast with direct `View live post` link.
  - Save badge reflects published state when applicable.
- Updated `src/contexts/toast-context.tsx`:
  - Toast API now supports `ReactNode` content for rich inline links.

## Loop 3 - Intuitive Guidance & Micro-Copy (Coach)

Added guidance improvements and leave-safety behavior:

- Improved editor placeholder coaching in immersive raw markdown mode:
  - `"Type '/' for commands or start writing your markdown here..."`
- Added lightweight tooltip system:
  - New `src/components/ui/tooltip-hint.tsx`
  - Applied to ambiguous icon controls in `src/app/dashboard/dashboard-shell.tsx` (mobile menu + sidebar collapse).
- Added explicit titles on key floating editor toolbar actions in:
  - `src/components/editor/floating-editor-toolbar.tsx`
- Added unsaved/in-flight leave guard in immersive editor:
  - Integrated with leave-guard context.
  - Navigation-away confirmation now triggers when dirty or save is in flight.

## Loop 4 - Cache Invalidation & Frontend Reactivity

Implemented stronger cache invalidation for post lifecycle updates:

- Added broad route + tag invalidation in post create/update/delete/bulk flows:
  - `revalidatePath("/")`
  - `revalidatePath("/blog")`
  - `revalidatePath("/blog/archive")`
  - `revalidatePath("/blog/[slug]")`
  - `revalidatePath("/blog/tag/[tag]")`
  - `revalidatePath("/feed.xml")`
  - `revalidatePath("/sitemap.xml")`
  - `revalidateTag("posts", "max")`
  - `revalidateTag("post:<slug>", "max")`
  - `revalidateTag("tag:<slug>", "max")`

This ensures public blog and derivative surfaces reflect dashboard writes without stale content windows.

## Verification Evidence

Executed and passed:

- `npm test -- api-posts.test.ts api-posts-id-patch.test.ts`
- `npm run lint` (no errors; one pre-existing warning in `security-txt-route.test.ts`)
- `NODE_OPTIONS="--max-old-space-size=4096" npm run build`

All synchronization, autosave UX, and invalidation changes compile and build successfully.
