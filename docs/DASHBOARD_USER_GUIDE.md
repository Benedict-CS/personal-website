# Dashboard User Guide

This guide is for non-technical users who manage the site from the dashboard.

Dashboard URL: `/dashboard`

---

## 1) Sign In and Setup

- Sign in with the admin password (`ADMIN_PASSWORD`).
- First-time users are guided through setup (site name, logo, navigation, footer).
- You can skip setup and edit everything later from Dashboard.

---

## 2) Content Areas

### Site Settings

Use **Content -> Site** to update:

- Brand name, logo, favicon, and SEO defaults.
- Navigation links and footer links.
- Auto-add custom pages to navigation (optional).

### Home, About, Contact

Use **Content -> Home/About/Contact** to edit public page content.

- About supports section visibility/order controls.
- Profile blocks (education, experience, projects, skills, achievements, volunteer) can be managed visually.

---

## 3) Editor Workflow (Draft -> Preview -> Publish)

For pages/posts edited in immersive editor mode:

- **Save Draft** stores work-in-progress safely.
- **Publish** sends approved content live.
- **Undo/Redo** is available in toolbar and keyboard shortcuts.
- **Auto-save and recovery** helps restore work after refresh/disconnect.

Recommended workflow:

1. Edit content.
2. Save draft.
3. Open preview link and review.
4. Publish when approved.

---

## 4) Preview Links

Use preview links when content is not yet public.

- Share read-only previews with reviewers/clients.
- No dashboard access is required for viewers.
- Preview is ideal for approval before publishing.

---

## 5) Scheduled Publish (Custom Pages)

In **Content -> Pages**, each page can have a scheduled publish datetime.

- Set a future date/time to auto-go-live.
- Clear schedule to return to manual publish control.
- Dashboard shows whether a page is currently live based on effective publish state.

---

## 6) Posts

In **Posts** you can:

- Create, edit, duplicate, publish/unpublish, and delete posts.
- Manage tags/categories and preview unpublished posts.
- Use version history to restore earlier content.

---

## 7) Media

In **Media** you can:

- Upload files used by posts/pages.
- Check usage and clean up unreferenced files.
- Assess optimization impact (`dry run`).
- Run real optimization with batch controls.
- Filter failed items and retry failed keys only.

---

## 8) Audit Log

In **Audit** you can monitor operations:

- Who changed what and when.
- Filter by action/resource.
- Read compact details quickly.
- Expand a row to inspect full payload and before/after changes.

---

## 9) Keyboard Shortcuts

- `Ctrl/Cmd + K`: open dashboard command palette
- `Ctrl/Cmd + Z`: undo
- `Ctrl/Cmd + Y` or `Cmd + Shift + Z`: redo

---

## 10) Dashboard Overview and Quick Actions

The Dashboard home page now includes an overview workspace:

- Live summary metrics (posts, custom pages, audit events today).
- Metric cards are clickable for drill-down (published posts, drafts, custom-page status, audit page).
- System status card (API, database, latency, auto-refresh).
- Recent activity stream from audit logs with category filters and search.
- Customizable quick actions.

In **Quick actions**, you can:

- Pin frequently used shortcuts.
- Reorder actions with up/down controls.
- Reset quick-action preferences to defaults.
- Use `Alt+1..9` on Dashboard overview to jump to visible quick actions by order.

Your quick-action order and pinned state are stored locally in your browser.

---

## 11) Best Practices

- Use draft + preview before publishing major updates.
- Prefer scheduled publish for timed launches.
- Run media optimization in batches during low-traffic windows.
- Review audit entries regularly for operational traceability.
