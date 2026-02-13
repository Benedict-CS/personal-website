# Custom Pages (English)

Custom pages let you add arbitrary pages (e.g. Portfolio, Services) from the dashboard. They are stored in the **CustomPage** table and rendered at `/page/[slug]`.

## Where the CustomPage table is used

| Place | Usage |
|-------|--------|
| **Dashboard → Content → Custom pages** | List, create, edit, delete, and **drag-to-reorder** custom pages. Slug and title are required; content is Markdown. |
| **Frontend** | Each page is rendered at **`/page/[slug]`** (e.g. `/page/portfolio`). The route is `src/app/page/[slug]/page.tsx`; it loads the page by slug from the database and renders Markdown in a card layout. |
| **Navigation** | In **Site settings → Navigation**, add a link with href `/page/your-slug` to show the custom page in the navbar. |
| **API** | `GET /api/custom-pages` — list (ordered by `order`, then `createdAt`). `POST /api/custom-pages` — create (auth). `GET /api/custom-pages/slug/[slug]` — get one by slug (public). `PATCH /api/custom-pages/id/[id]` — update (auth). `DELETE /api/custom-pages/id/[id]` — delete (auth). `POST /api/custom-pages/reorder` — set order by sending `{ orderedIds: string[] }` (auth). |

## Schema (Prisma)

- `id` (uuid), `slug` (unique), `title`, `content` (Markdown), `order` (integer, for dashboard list order), `createdAt`, `updatedAt`.

## Reorder

On **Content → Custom pages**, use the grip handle (⋮⋮) to drag and drop. Order is persisted via `POST /api/custom-pages/reorder` and used when listing pages.
