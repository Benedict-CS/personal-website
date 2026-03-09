# Commercial WYSIWYG Builder Architecture

This document defines the production architecture for the light-only, block-based WYSIWYG builder.

## Goals

- Deliver a non-technical editing experience similar to Wix, Google Sites, and WordPress page builders.
- Keep rendering deterministic between dashboard preview and public output.
- Support reusable components, shared templates, and multi-site scope isolation.
- Maintain strong reliability with server-side persistence, version history, and controlled publishing states.

## Core Domain Model

The builder introduces the following Prisma models:

- `BuilderPage`: Logical page document (`slug`, `title`, `status`, `seoMetadata`) scoped by `ownerKey + siteScope`.
- `BuilderBlock`: Ordered block entities attached to one page (`type`, `content`, `styling`, `visibility`, `order`).
- `BuilderBlockVersion`: Immutable snapshots of block content/styling before change.
- `BuilderPageVersion`: Immutable full-page snapshots used for rollback and audit.
- `BuilderTemplate`: Reusable page-level presets (theme, brand, blocks), optionally shared.
- `BuilderComponent`: Reusable block-level snippets, optionally shared.

## Ownership and Multi-Site Isolation

The API extracts identity from session and applies isolation through:

- `ownerKey`: Current authenticated account key (session email fallback).
- `siteScope`: Tenant/site identifier (`default` if not provided), normalized to URL-safe format.

Every query in builder routes is restricted by these fields to prevent cross-site leakage.

## API Surface

The builder backend exposes:

- `GET/POST /api/builder/pages`
- `GET/PATCH/DELETE /api/builder/pages/[id]`
- `GET/PUT /api/builder/pages/[id]/blocks`
- `GET/POST /api/builder/templates`
- `PATCH/DELETE /api/builder/templates/[id]`
- `GET/POST /api/builder/components`
- `PATCH/DELETE /api/builder/components/[id]`

## Versioning Strategy

- Block updates through `PUT /pages/[id]/blocks` persist `BuilderBlockVersion` before overwrite.
- Page metadata updates through `PATCH /pages/[id]` persist `BuilderPageVersion` snapshots.
- Version models are append-only and indexed by `(entityId, versionNumber)` and `(entityId, createdAt)`.

## Rendering Contract

Blocks are serialized to Markdown-compatible output with wrapper classes:

- `preset-*`
- `spacing-*`
- `radius-*`
- `shadow-*`
- `align-*`

Theme and brand metadata are embedded as HTML comments:

- `<!-- site-theme:... -->`
- `<!-- site-brand:{...} -->`

Public renderer strips metadata comments and applies theme/brand styles.

## Dashboard Builder UX Contract

The visual builder supports:

- Section library search and quick insertion.
- Drag/sort, collapse/expand, duplicate, remove.
- Per-block style controls.
- Live desktop/mobile preview.
- Media insertion from library and direct upload.
- Template library import/export.
- Reusable component save/load/delete.
- One-click starter templates.

## Security and Operational Notes

- All builder endpoints require authenticated sessions.
- Shared templates/components are readable across the same `siteScope`, but write/delete remains owner-restricted.
- Keep upload APIs behind session checks and file-type validation.
- Prefer server-side sanitization for any untrusted rich text in future rich editor upgrades.

## Recommended Next Iterations

- Add explicit role model (`owner`, `editor`, `viewer`) and block-level permission matrix.
- Add publish workflow (`draft -> review -> published`) with approval logs.
- Add server-side collaboration lock or CRDT strategy for concurrent editing.
- Add dedicated canvas renderer component to remove markdown intermediate for fully visual fidelity.
