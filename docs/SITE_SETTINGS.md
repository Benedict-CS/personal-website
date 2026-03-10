# Site Settings

Site settings (Dashboard → Content → Site settings) control branding, navigation, and metadata across the public site. All values are stored in the database and apply to the whole site.

## What each setting affects

| Setting | Affects |
|--------|--------|
| **Site name** | Navbar logo text, metadata title template (`%s \| Site name`), footer fallback |
| **Logo URL** | Navbar logo image |
| **Favicon URL** | Browser tab icon (all pages) |
| **Meta title / description** | Default SEO title and description, Open Graph, Twitter cards |
| **Author name** | Metadata author/creator, RSS feed, JSON-LD |
| **Navigation (navbar links)** | Main menu: label and URL for each link; custom pages can be auto-appended |
| **Copyright** | Footer: full copyright line (supports `{year}`) |
| **Social links** | Footer: Twitter, Instagram, LinkedIn, GitHub, YouTube icon links |
| **Footer links** | Footer: email, GitHub, LinkedIn, RSS; optional footer text line |
| **OG image** | Social share image (Facebook, Twitter, etc.) |
| **Google Analytics ID** | GA4 measurement script on all pages when set |
| **Template / theme** | Layout variant (default, minimal, card); light-only |

## Where they appear

- **Navbar**: site name, logo, nav items (and auto-added custom pages if enabled).
- **Footer**: copyright line (or © year + name + footer text), email/social icons, RSS.
- **All pages**: favicon, meta title/description, OG image, GA script (if configured).
- **RSS/feeds**: title, description, author from site config.

## Home page sections

Home page section order and custom Markdown sections are managed under **Dashboard → Content → Home sections**, not Site settings. There you can add, remove, reorder, show/hide, and edit sections (including custom Markdown blocks).

## RSS feed

The site exposes an RSS feed at `/feed.xml` (and per-tag at `/feed/tag/[tag]`). Title, description, and author come from site config. The feed is linked in the layout for autodiscovery.
