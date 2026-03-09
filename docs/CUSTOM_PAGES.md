# Custom Pages

Custom pages allow non-technical users to create and manage additional pages (for example, Services, Portfolio, or Landing pages) without coding.

Public route: `/page/[slug]`

---

## What Users Can Do

- Create, edit, duplicate, delete, and reorder pages from Dashboard.
- Filter by status and search by title/slug.
- Use one-click starter templates.
- Work with a safe content lifecycle: draft -> preview -> publish.
- Schedule a page to go live at a specific date/time.
- Generate read-only preview links for stakeholder review before publishing.

---

## Publishing Model

Each custom page has:

- `published`: manual publish switch.
- `scheduledPublishAt`: optional datetime for automatic go-live.
- `effectivePublished`: computed state used by UI and public route.

`effectivePublished` becomes true when either:

- `published` is true, or
- `scheduledPublishAt` is set and its timestamp is in the past.

---

## Preview Links

Preview links provide read-only access to page content without making the page public.

- Token-based access.
- Can be shared with collaborators or clients.
- Intended for review workflows before publication.

API route: `POST /api/custom-pages/id/[id]/preview-token`

Preview page route: `/page/preview`

---

## Dashboard UX Highlights

- Metadata editing: title, slug, status, schedule.
- Reorder controls for page ordering safety.
- Quick status visibility: live/draft/scheduled.
- Schedule clear action for fast rollback to manual publish mode.

---

## API Surface

- `GET /api/custom-pages` - list pages (includes scheduling metadata).
- `POST /api/custom-pages` - create page.
- `GET /api/custom-pages/slug/[slug]` - fetch public page by slug (respects effective publish state).
- `PATCH /api/custom-pages/id/[id]` - update page fields and content.
- `DELETE /api/custom-pages/id/[id]` - delete page.
- `POST /api/custom-pages/reorder` - persist custom order.
- `POST /api/custom-pages/id/[id]/preview-token` - issue preview token.
- `GET /api/custom-pages/preview` - resolve token and return preview payload.

---

## Audit Logging

Custom page operations are tracked:

- `custom_page.create`
- `custom_page.update`
- `custom_page.delete`

For update operations, before/after snapshots are stored to support change reviews in the audit UI.
