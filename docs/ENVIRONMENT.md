# Environment Variables Reference

This document describes every environment variable used by the project. Copy `.env.example` to `.env` and set values before running Docker Compose or the app.

---

## Required for Docker Compose

These must be set in `.env` (or exported) before `docker compose up`; the Compose file does not provide defaults for secrets.

| Variable | Description | Example |
|----------|-------------|---------|
| `POSTGRES_PASSWORD` | PostgreSQL password for the `POSTGRES_USER` account. | A strong password; e.g. `openssl rand -base64 24` |
| `RUSTFS_ROOT_PASSWORD` | RustFS admin password (console and S3). | A strong password |
| `ADMIN_PASSWORD` | Dashboard login password (NextAuth credentials). | Your chosen admin password |
| `NEXTAUTH_SECRET` | NextAuth.js encryption key. **Must be random in production.** | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Full URL of your site (used by NextAuth for callbacks). **Do not use localhost or private IP in production.** | `https://yourdomain.com` |
| `NEXT_PUBLIC_SITE_URL` | Public base URL (used in sitemap, canonical URLs, links). | Same as `NEXTAUTH_URL` |
| `S3_ACCESS_KEY` | S3-compatible access key (RustFS). | e.g. same as `RUSTFS_ROOT_USER` or a dedicated key |
| `S3_SECRET_KEY` | S3-compatible secret key (RustFS). | e.g. same as `RUSTFS_ROOT_PASSWORD` or a dedicated secret |

---

## Database (PostgreSQL)

| Variable | Description | Default / Note |
|----------|-------------|----------------|
| `DATABASE_URL` | Full PostgreSQL connection string. Used by Prisma and Next.js. | When using Docker, the app container gets this from Compose (host: `postgres`, port 5432). On the **host**, set this only if you run Prisma (e.g. `npx prisma migrate deploy`) locally; use `postgresql://user:pass@localhost:5432/blog`. |
| `POSTGRES_USER` | PostgreSQL username. | `ben` (in Compose default) |
| `POSTGRES_PASSWORD` | See Required above. | No default |
| `POSTGRES_DB` | Database name. | `blog` |

**Important:** Migrations must be run **inside the app container** when deploying with Docker (so the app uses the same `DATABASE_URL` as at runtime). Use:

```bash
docker compose exec app npx prisma migrate deploy
```

or the project script:

```bash
./scripts/migrate.sh
```

### Connection pooling (high traffic)

Under high concurrency, you may hit PostgreSQL connection limits. Two options:

1. **Prisma connection limit** — Add `?connection_limit=10` (or another number) to `DATABASE_URL`, e.g.  
   `postgresql://user:pass@host:5432/blog?connection_limit=10`. This caps how many connections the app opens to Postgres.

2. **PgBouncer** — Run [PgBouncer](https://www.pgbouncer.org/) in front of Postgres and point the app’s `DATABASE_URL` at PgBouncer (e.g. port 6432). Use **transaction** or **session** mode; run migrations with a direct Postgres URL (not through PgBouncer). Document the PgBouncer connection string and the direct Postgres URL for migrations in your runbook.

No code changes are required; only `DATABASE_URL` (and optionally infrastructure) change.

---

## RustFS (S3-compatible storage)

| Variable | Description | Default |
|----------|-------------|---------|
| `RUSTFS_ROOT_USER` | RustFS admin username. | `rustfsadmin` |
| `RUSTFS_ROOT_PASSWORD` | See Required above. | — |
| `S3_ACCESS_KEY` | S3 API access key (often same as RustFS admin user). | — |
| `S3_SECRET_KEY` | S3 API secret. | — |
| `S3_BUCKET` | Bucket name for uploads. | `uploads` (app creates it if missing) |

The app container receives `S3_ENDPOINT=http://rustfs:9000` and `S3_REGION=us-east-1` from Docker Compose; you do not set those in `.env` unless you override the Compose env.

---

## Authentication (NextAuth)

| Variable | Description | Example |
|----------|-------------|---------|
| `ADMIN_PASSWORD` | Password for the single dashboard user (credentials provider). | Your secure password |
| `NEXTAUTH_SECRET` | Secret used to sign cookies and tokens. | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Canonical URL of the site (no trailing slash). | `https://benedict.winlab.tw` |
| `NEXT_PUBLIC_SITE_URL` | Same as `NEXTAUTH_URL`; used in client-side links and sitemap. | Same value |

### Login CAPTCHA (optional)

After a few failed login attempts, the sign-in page requires a [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/) challenge. If these are not set, CAPTCHA is skipped (rate limit and lockout still apply).

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Turnstile site key (public). | From Cloudflare dashboard |
| `TURNSTILE_SECRET_KEY` | Turnstile secret key (server-side verification). | From Cloudflare dashboard |

---

## Contact form

The contact form can use **Resend** (recommended) or **SMTP**. Set the variables for one option only.

### Option A: Resend (recommended)

| Variable | Description | Example |
|----------|-------------|---------|
| `RESEND_API_KEY` | API key from [resend.com](https://resend.com). | `re_xxxxxxxx...` |
| `RESEND_FROM_EMAIL` | Sender address (must be verified in Resend). | `onboarding@resend.dev` or your domain |
| `CONTACT_EMAIL` | Recipient address for form submissions. | `you@example.com` |
| `CONTACT_CC` | Optional. CC addresses (comma-separated). | `team@example.com` |
| `CONTACT_BCC` | Optional. BCC addresses (comma-separated). | `archive@example.com` |

Emails are sent with **Reply-To** set to the submitter’s email so you can reply directly.

### Option B: SMTP (e.g. Gmail)

For Gmail you must use an [App Password](https://support.google.com/accounts/answer/185833), not your normal password.

| Variable | Description | Example |
|----------|-------------|---------|
| `SMTP_HOST` | SMTP server. | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port (TLS often 587). | `587` |
| `SMTP_USER` | SMTP username (full email). | `you@gmail.com` |
| `SMTP_PASS` | SMTP password (app password for Gmail). | 16-character app password |
| `SMTP_FROM` | From header. | `Contact Form <you@gmail.com>` |
| `CONTACT_EMAIL` | Recipient for form submissions. | `you@example.com` |
| `CONTACT_CC` | Optional. CC addresses (comma-separated). | `team@example.com` |
| `CONTACT_BCC` | Optional. BCC addresses (comma-separated). | `archive@example.com` |

---

## Blog comments (Giscus)

Comments under blog posts use [Giscus](https://giscus.app) (GitHub Discussions). If these variables are not set, the comment block is hidden.

**Setup:**

1. **Enable Discussions** on your repo (you already did this).
2. **Install the [Giscus app](https://github.com/apps/giscus)** on the repo so visitors can post comments via GitHub.
3. Open **[giscus.app](https://giscus.app)** → enter `Benedict-CS/personal-website` → choose **Discussion mapping**: “pathname” → choose **Category** (e.g. “Announcements” or create “Comments”) → copy the generated IDs.
4. Add to `.env`:

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_GISCUS_REPO` | `owner/repo` | `Benedict-CS/personal-website` |
| `NEXT_PUBLIC_GISCUS_REPO_ID` | From giscus.app | `R_kgDO...` |
| `NEXT_PUBLIC_GISCUS_CATEGORY` | Category name | `Announcements` or `Comments` |
| `NEXT_PUBLIC_GISCUS_CATEGORY_ID` | From giscus.app | `DIC_kwDO...` |

Restart the app (or rebuild) after changing these. Comments will appear at the bottom of each blog post.

---

## Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `ANALYTICS_SECRET` | Secret for server-side analytics beacon (middleware calls `/api/analytics/view`). If set, the middleware can log page views. | Not set (analytics disabled) |
| `ANALYTICS_EXCLUDED_IPS` | Comma-separated IPs or prefixes to exclude from counts. Trailing dot = subnet (e.g. `140.113.` excludes 140.113.x.x). | Not set |
| `SENTRY_DSN` | Sentry DSN for error reporting. When set, Sentry is enabled (client/server/edge configs). | Not set |
| `NEXT_PUBLIC_SENTRY_DSN` | Optional; can be used by client config if different from `SENTRY_DSN`. | — |
| `SENTRY_ORG` | Sentry organization (for source maps upload in build). | Optional |
| `SENTRY_PROJECT` | Sentry project name. | Optional |

---

## Example `.env` (minimal for local run)

```env
POSTGRES_USER=ben
POSTGRES_PASSWORD=your-secure-db-password
POSTGRES_DB=blog

RUSTFS_ROOT_USER=rustfsadmin
RUSTFS_ROOT_PASSWORD=your-rustfs-password

ADMIN_PASSWORD=your-dashboard-password
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000

S3_ACCESS_KEY=rustfsadmin
S3_SECRET_KEY=your-rustfs-password
S3_BUCKET=uploads

CONTACT_EMAIL=you@example.com
RESEND_API_KEY=re_xxxxxxxx
RESEND_FROM_EMAIL=onboarding@resend.dev
```

For production, set `NEXTAUTH_URL` and `NEXT_PUBLIC_SITE_URL` to your public HTTPS URL and use strong, unique passwords and a random `NEXTAUTH_SECRET`.
