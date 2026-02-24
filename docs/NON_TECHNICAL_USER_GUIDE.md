# Making the dashboard friendly for non-technical users

This doc summarizes changes and ideas so that **people without a CS background** can set up and manage their site without touching code — similar to Google Sites, but self-hosted and flexible.

---

## What we did

### 1. First-time flow
- **Redirect to setup:** When setup is not complete, visiting the dashboard home (`/dashboard`) redirects to the setup wizard. Users are guided through site name, logo, navigation, and footer.
- **Skip option:** "Skip wizard and go to dashboard" saves the current settings, marks setup complete, and goes to the dashboard. Everything can be edited later in **Content → Site settings**.

### 2. Next steps checklist (dashboard home)
After setup, the dashboard shows a **Next steps** card:
- Complete site setup ✓
- Add your first post or page → links to **New post**
- Add a custom page (e.g. Portfolio, Services) → links to **Content → Custom pages**
- Edit About & Contact content → links to **Content**
- **View your live site** link

So users see what to do next without reading docs.

### 3. Navigation: drag-and-drop
- In **Setup wizard (Step 3)** and **Content → Site settings → Navigation**, nav items are reordered by **dragging** the handle (⋮⋮), not only with ↑/↓.
- Short help text: "Label = text in menu, Link = URL (e.g. /about, /blog)."

### 4. Inline help (tooltips)
- **Meta description** (Site settings): Help icon explains it’s for search engines and can be left empty.
- **Slug** (Custom pages): Help icon explains that the slug becomes the URL path (e.g. `portfolio` → `/page/portfolio`) and to use lowercase and hyphens.
- More fields can get the same `FieldHelp` component where it helps non-technical users.

### 5. Empty states
- **No posts yet:** Dashboard shows a clear message and a **Write first post** button instead of a bare "No posts yet."

---

## Ideas for future (more freedom, more “like Google Sites”)

### Content / blocks
- **Home page sections:** Let users turn sections on/off (e.g. hide “Technical skills”) and reorder them (e.g. put “Latest posts” above the hero). Would need a small config (e.g. in site-content or site-config) and rendering that respects order/visibility.
- **About page sections:** Same idea — reorder or hide Education, Experience, Projects, Skills, Achievements. Stored as ordered list + visibility flags.
- **Block-based editing:** Replace raw markdown for custom pages with simple blocks (heading, text, image, button). Bigger change; could start with “insert image” and “insert button” in the existing markdown editor.

### Onboarding and guidance
- **Templates:** “Personal”, “Portfolio”, “Blog” presets that prefill nav, home sections, and sample content.
- **Short in-app tips:** e.g. “What is a slug?” in a small help panel or tour (one-time) on first visit to Custom pages.
- **Preview before publish:** For custom pages and posts, a prominent “Preview” that opens the public URL in a new tab.

### Commercial readiness (multi-user / SaaS)
- **Multi-tenant:** Separate sites per user/org (different DB or schema, subdomain or path).
- **Billing:** Stripe (or similar) for plans (e.g. one site, multiple sites, storage).
- **Invite/roles:** “Editor” can edit content but not site settings; “Admin” can do everything.
- **Terms, privacy, support:** Static pages and a contact or support channel.

### UX polish
- **Keyboard shortcuts:** Already have Cmd+K command palette; document it and add one or two more (e.g. Save).
- **Undo / history:** For critical actions (e.g. delete page), optional “Undo” toast.
- **Mobile-friendly dashboard:** Ensure Content and Site settings are usable on small screens (already partly done with RWD tables/cards).

---

## Where to add more help

- **Content → Home:** Help for “Primary CTA” and “Skills” (e.g. “One per line or comma-separated”).
- **Content → About:** Help for “Country code” (e.g. “Two letters, e.g. TW, US”) and for block “content” (Markdown allowed).
- **Posts:** Help for “Slug” and “Category” (e.g. “Used for grouping; optional”).
- **Site settings:** Help for “OG image” (e.g. “Shown when someone shares your site on social media”).

Use the existing `FieldHelp` component next to labels so help is optional and does not clutter the form.
