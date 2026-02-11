# Dashboard UI/UX Improvements & Feature Ideas

Reference: how common admin dashboards (Notion, WordPress, Ghost, Vercel, Linear) design their back-office.

---

## 1. Navigation & Orientation

| Pattern | What others do | Current / Suggestion |
|--------|----------------|----------------------|
| **Breadcrumbs** | Show path: Dashboard > Posts > Edit "My Post" | Not present. Add so deep pages (e.g. Edit post, Edit note) show where you are and one-click back. |
| **Dashboard home** | Landing shows summary: draft count, recent posts, quick links | Root redirects to Analytics. Consider a real home with "X drafts", "Recent posts", "Quick actions". |
| **Sidebar active state** | Clear highlight + sometimes sub-items (e.g. Content > Home, Contact) | Active state exists; Content could expand to show Home / Contact / About in sidebar. |
| **Shortcuts** | Command palette (Cmd+K) to jump to any page or action | Not present. High impact: add a global Cmd+K that opens search → "New post", "Analytics", "Media", etc. |

---

## 2. Lists & Tables

| Pattern | What others do | Current / Suggestion |
|--------|----------------|----------------------|
| **Search** | Filter posts by title/slug; search media by name | Posts: no search. Add a simple title/slug search on Posts list. |
| **Bulk actions** | Select multiple rows → Publish / Unpublish / Delete | Single-row actions only. Add checkboxes + "Publish selected", "Delete selected". |
| **Sort** | Click column header to sort (date, title, status) | Fixed order (updatedAt desc). Add sortable columns or dropdown "Sort by: Last edited, Created, Title". |
| **Row actions** | Edit + optional Quick view, Duplicate, Delete | Only "Edit". Add "View" (open slug in new tab), "Duplicate" (clone as draft), "Delete" with confirm. |
| **Empty state** | Illustration + CTA: "Create your first post" with button | Plain "No posts found". Use friendly copy + primary CTA (e.g. "Create New Post"). |
| **Loading** | Skeleton rows or spinner for table | Some pages load without skeleton. Use table skeleton or card skeleton while loading. |

---

## 3. Forms & Editing

| Pattern | What others do | Current / Suggestion |
|--------|----------------|----------------------|
| **Unsaved changes** | Warn on leave: "You have unsaved changes" | Not present. Add beforeunload / router guard when form is dirty. |
| **Auto-save draft** | Save draft in background (e.g. every 30s) | Manual save only. Optional: debounced auto-save for post body. |
| **Preview** | "Preview" opens front-end URL in new tab | Can be done manually. Add a "Preview" button that opens `/blog/[slug]` (or draft preview if you support it). |
| **Slug from title** | Auto-fill slug from title; allow override | Already present on New Post. Keep. |

---

## 4. Feedback & Consistency

| Pattern | What others do | Current / Suggestion |
|--------|----------------|----------------------|
| **Toasts** | Success/error toast for save, delete, upload | Toasts exist. Ensure all mutations (delete post, cleanup media, etc.) show toast. |
| **Confirm dialogs** | Destructive actions use modal with clear copy | Many use `confirm()`. Consider a small modal component for "Delete post?" with Cancel / Delete. |
| **Loading buttons** | Button shows spinner + disabled during request | Some pages do; unify (e.g. "Saving...", "Deleting..."). |
| **Page title** | Document title = "Posts – Dashboard" for tabs/bookmarks | Check `<title>` per page; set in layout or each page. |

---

## 5. Content & Media

| Pattern | What others do | Current / Suggestion |
|--------|----------------|----------------------|
| **Media in posts** | In editor: pick from library or upload | Upload exists; "Insert from Media" in post editor would avoid re-upload. |
| **About / CV** | Single place for "Site content" | About & CV are under Content; nav already has separate About. Fine. |
| **Content sections** | Clear cards per section (Hero, Contact form) | Content index is clear. Optional: sub-nav or tabs on Content for Home / Contact. |

---

## 6. Feature Ideas (backlog)

- **Dashboard home widget**: Draft count, "Recent 5 posts", link to Analytics, last backup time (if you expose it).
- **Posts**: Search by title/slug; bulk publish/unpublish/delete; duplicate post; "View" link to `/blog/[slug]`.
- **Command palette**: Cmd+K → type "post", "analytics", "new post" → jump or run action.
- **Breadcrumbs**: Dashboard > Posts > Edit "Hello World".
- **Document title**: Set `<title>` per page (e.g. "Analytics – Dashboard").
- **Preview button**: On post edit, "Preview" opens front-end URL in new tab.
- **Unsaved changes warning**: When leaving edit page with dirty form.
- **Empty states**: Illustration + one primary CTA on Posts, Media, Tags when empty.
- **Sortable posts table**: By last edited, created, title A–Z.

---

## 7. Quick wins (high impact, low effort)

1. **Breadcrumbs** in dashboard layout for path depth > 1.
2. **Document title** per page (e.g. `export const metadata = { title: "Posts – Dashboard" }`).
3. **Posts empty state**: Friendly message + prominent "Create New Post" button.
4. **"View" link** on each post row (open `/blog/[slug]` in new tab).
5. **Preview button** on post edit page (link to `/blog/[slug]` or draft preview URL).
