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
- Use preset filter chips (Deletes, Bulk ops, Imports, Optimizations) for faster incident review.
- Pin important rows for follow-up and toggle `Pinned only` to focus on bookmarked incidents.
- Save frequently used filter combinations as local `Saved views`, assign categories, then `Rename`, `Overwrite`, `Reapply last view`, `Copy link`, set a `Startup default`, or `Export/Import JSON`.
- Use quick shortcuts `Alt+Shift+1..9` to apply the first nine visible saved views, and switch sort mode (`Recent`, `Frequent`, `Name`) to match your workflow.
- Use batch actions for saved views: select multiple entries, delete selected views, or move selected views to another category in one step.
- Batch delete uses a two-step confirmation with a delete preview list to reduce accidental removals.
- For destructive bulk delete, enter `DELETE` to unlock the final confirm action.
- `Import JSON` now shows an import preview (valid count, limit impact, sample names) before you apply it.
- Use **Archive** on a saved view to hide it from the main list without deleting it; toggle **Show archived** to see or **Unarchive** to restore. Your **Show archived** preference is remembered across sessions.
- Use **Quick save** to save the current filters as a new view with an auto-generated name (e.g. Quick save 14:32) without typing.
- Use **Skip to main content** (Tab from the top of any dashboard page) for faster keyboard navigation.
- In **Audit**, use **Copy current filters** to copy the current filter state as a URL (share or bookmark). The **Active** line summarizes applied filters at a glance.
- Use **Date range** (From/To) to limit entries to a specific period, and **Export visible as CSV** to download the currently filtered list for reporting.
- For faster setup, you can `Duplicate` an existing saved view and tweak it, or `Export selected` to share only the chosen views.
- When deleting saved views, use `Undo` in the inline recovery bar to quickly restore recently removed items.
- Read compact details quickly.
- Expand a row to inspect full payload and before/after changes.
- Use `Copy note` on any row to generate a structured investigation template for issue tracking.

---

## 9) Keyboard Shortcuts

- `Ctrl/Cmd + K`: open dashboard command palette
- `Ctrl/Cmd + Z`: undo
- `Ctrl/Cmd + Y` or `Cmd + Shift + Z`: redo

---

## 10) Dashboard Overview and Quick Actions

The Dashboard home page now includes an overview workspace:

- Live summary metrics (posts, custom pages, audit events today).
- You can refresh overview metrics manually with `Refresh now` and see the last refresh timestamp.
- Metric cards are clickable for drill-down (published posts, drafts, custom-page status, audit page).
- A risk summary strip highlights warning events today and links directly to risk-focused Audit view.
- System status card (API, database, latency, auto-refresh) with expandable diagnostics.
- Recent activity stream from audit logs with category filters, search, and optional auto-refresh.
- Severity badges highlight higher-risk operations, and `High risk only` isolates warning-level events.
- Each recent activity item includes an `Investigate` shortcut to open Audit with prefilled action filters.
- You can also use `Investigate current view` to jump to Audit with the current overview filter context.
- `Copy investigate link` lets you share the same filtered audit investigation URL with collaborators.
- Customizable quick actions.

In **Quick actions**, you can:

- Pin frequently used shortcuts.
- Reorder actions with up/down controls.
- Track usage automatically and apply `Smart order` to sort actions by frequency.
- Each action now shows a `Last used` relative timestamp for quick workflow awareness.
- Reset quick-action preferences to defaults.
- Use `Alt+1..9` on Dashboard overview to jump to visible quick actions by order.

Your quick-action order and pinned state are stored locally in your browser.

---

## 11) Best Practices

- Use draft + preview before publishing major updates.
- Prefer scheduled publish for timed launches.
- Run media optimization in batches during low-traffic windows.
- Review audit entries regularly for operational traceability.
