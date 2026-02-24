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

---

## Contact form

The contact form can use **Resend** (recommended) or **SMTP**. Set the variables for one option only.

### Option A: Resend (recommended)

| Variable | Description | Example |
|----------|-------------|---------|
| `RESEND_API_KEY` | API key from [resend.com](https://resend.com). | `re_xxxxxxxx...` |
| `RESEND_FROM_EMAIL` | Sender address (must be verified in Resend). | `onboarding@resend.dev` or your domain |
| `CONTACT_EMAIL` | Recipient address for form submissions. | `you@example.com` |

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
