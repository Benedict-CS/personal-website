# Dashboard User Guide

This guide explains how to use the **dashboard** to manage your site **without writing any code**. It is aimed at non-technical users: you can change content, navigation, and layout through the web interface.

---

## Logging in

- **URL:** Go to your site and open `/dashboard` (e.g. `https://yourdomain.com/dashboard`).
- **Password:** Use the password set in the environment variable `ADMIN_PASSWORD` (only one user).
- After login you will either see the **dashboard home** or, on first use, the **setup wizard**.

---

## First-time setup wizard

When the site has not been marked as “setup complete,” visiting the dashboard will redirect you to the **setup wizard**.

- **Steps:** You are guided through: (1) Site name and browser tab title, (2) Logo and favicon, (3) Top menu links, (4) Footer (email and social links), (5) Completion.
- **Labels:** Each step uses plain language (e.g. “Site name (what appears in the top bar),” “Browser tab title (what appears in the tab)”).
- **Skip:** You can click “Skip wizard and go to dashboard.” Your current entries are saved and you can change everything later under **Content → Site settings**.

---

## Dashboard home (after setup)

On the dashboard home you will see:

- **Next steps:** A short checklist: complete site setup, add your first post, add a custom page, edit About & Contact, and a link to **View your live site**.
- **Posts:** If there are no posts, a **Write first post** button; otherwise a list of recent posts and links to manage them.
- **Shortcuts:** Use the sidebar to go to Posts, Content, Media, Tags, Analytics, etc.

**Keyboard shortcut:** Press **⌘K** (Mac) or **Ctrl+K** (Windows/Linux) to open the command palette and jump to any section.

---

## Content → Site settings

Here you configure the **global** parts of your site:

- **Branding & meta:** Site name (navbar), logo, favicon, default page title (browser tab), meta description (search engines), author name. Help icons (ⓘ) explain what each field does.
- **Navigation:** The links that appear in the top menu. You can **drag** items by the handle (⋮⋮) to reorder them. Each item has a **Label** (text in the menu) and a **Link** (URL, e.g. `/about`, `/blog`). You can add or remove links. Option “Auto-add custom pages to navigation” appends published custom pages to the end of the menu.
- **Footer:** Email, GitHub URL, LinkedIn URL, optional footer text.
- **OG image:** Image used when the site is shared on social networks (optional). You can paste a URL or choose from Media.

**Templates:** At the top, **Personal**, **Portfolio**, and **Blog** buttons apply a preset (menu order and layout style). You can still edit everything after applying.

Always click **Save** after changing settings.

---

## Content → Home

Edit the **home page** content:

- **Hero:** Title and subtitle.
- **CTA buttons:** Primary, secondary, and contact button (text and link).
- **Technical skills:** A list of skills (one per line or comma-separated).
- **Home page sections:** A card that lets you **show/hide** and **reorder** sections: Hero, Latest Articles, Technical Skills. Use the checkboxes to show or hide; drag to change order. Click **Save Home Page** when done.

---

## Content → About & CV

Edit the **About** page and upload your CV:

- **Profile and hero:** Photo, name, tagline, intro text.
- **About page sections:** A card with checkboxes for **Education**, **Experience**, **Projects**, **Skills**, **Achievements**. Uncheck to hide a section on the public About page. Click **Save section visibility** after changes.
- **Education / Experience / Projects:** Each block has fields (e.g. title, organization, country code, date range, content). Country code is two letters (e.g. TW, US) and is shown as a flag. Use the **Save** button for each block.
- **Technical skills / Achievements:** Edit the lists and save.
- **CV:** Upload a PDF; it will be available for download on the public site.

---

## Content → Contact

Edit the **Contact** page text and any contact details shown there. The contact **form** (how messages are sent) is configured via environment variables (see [ENVIRONMENT.md](ENVIRONMENT.md)); the dashboard only edits the visible content of the page.

---

## Content → Custom pages

Create and manage **custom pages** (e.g. Portfolio, Services) that appear at `/page/your-slug`.

- **Slug:** The URL path (e.g. `portfolio` → `/page/portfolio`). Use lowercase letters, numbers, and hyphens only. A help icon explains this.
- **Title:** The page title and, if auto-add to nav is on, the menu label.
- **Content:** Markdown. You can type or paste Markdown. Use **Insert image** or **Insert button** to pick a file from Media; the editor will insert the correct Markdown for you.
- **Preview:** When editing a page, use **Preview** to open the public page in a new tab (save first if you changed the slug).
- **Order:** Drag rows to reorder pages. Toggle **Public** / **Draft** and **Edit** / **Remove** as needed.

---

## Posts

- **List:** View all posts, filter by status (Published/Draft), sort, search. Use **Previous** / **Next** at the bottom when there are many posts.
- **New post:** Click **Create New** (or “Write first post” when the list is empty). Fill in title, slug, content (Markdown), tags, category, and set Published or Draft. Use **Insert from Media** in the editor to add images.
- **Edit:** Open a post to edit. **Preview** opens the public blog post (or draft preview) in a new tab. **Version History** lets you view or restore earlier versions. For drafts you can generate a **Share draft link** for read-only preview.
- **Publish / Unpublish:** Change status from the list or inside the post.

### Videos (YouTube, Vimeo) in Markdown

You can embed demo videos in post or custom page content in two ways:

1. **Link as embed (easiest)**  
   In your Markdown, add a normal link to a YouTube or Vimeo video. The renderer will show it as an embedded player (16:9) instead of a plain link.

   - YouTube: `[Watch demo](https://www.youtube.com/watch?v=VIDEO_ID)` or `[Watch](https://youtu.be/VIDEO_ID)`
   - Vimeo: `[Watch on Vimeo](https://vimeo.com/123456789)`

2. **Raw HTML iframe**  
   Because the site uses **rehype-raw**, you can paste the embed code from YouTube or Vimeo (the **Share → Embed** iframe snippet). For example:

   ```html
   <div class="my-4" style="aspect-ratio: 16/9; max-width: 100%;">
     <iframe src="https://www.youtube.com/embed/VIDEO_ID" title="YouTube" allowfullscreen class="w-full h-full rounded-lg"></iframe>
   </div>
   ```

Use the link form when you only need a single video; use the iframe when you want to customise size or options.

---

## Media

- **Upload:** Add images (or other files) for use in posts and pages.
- **Use:** When editing a post or custom page, use **Insert image** or **Insert button** to pick a file from Media; the app inserts the correct URL or Markdown.
- **Cleanup:** You can remove files that are no longer referenced in any post or page (use the cleanup option with care).

---

## Analytics (optional)

If analytics are enabled (via `ANALYTICS_SECRET` and middleware), the dashboard can show page views and basic stats. Use the **Analytics** item in the sidebar.

---

## Tips

- **Help icons (ⓘ):** Next to some fields; click to read a short explanation.
- **Save:** Always click Save (or the specific save button for each block) after editing; changes are not auto-saved.
- **Preview:** Use **Preview** on posts and custom pages to see how they look on the public site before publishing.
- **View your live site:** From the dashboard home or the top bar (“View site”) to open the public site in a new tab.
