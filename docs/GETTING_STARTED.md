# Getting Started: New Project Setup

This guide walks you through setting up the personal website from scratch: cloning, environment variables, first run, and verifying the dashboard.

---

## Prerequisites

- **Docker** and **Docker Compose** installed (e.g. on Ubuntu: `sudo apt install docker.io docker-compose-plugin`)
- **Git**
- (Optional) A domain and HTTPS reverse proxy (e.g. Nginx Proxy Manager) for production

---

## Step 1: Clone the repository

```bash
git clone <your-repo-url> personal-website
cd personal-website
```

---

## Step 2: Configure environment variables

1. Copy the example file:

   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your values. **Minimum required:**

   - **Database:** `POSTGRES_PASSWORD` (choose a strong password)
   - **RustFS:** `RUSTFS_ROOT_PASSWORD`
   - **Auth:** `ADMIN_PASSWORD` (dashboard login), `NEXTAUTH_SECRET` (generate: `openssl rand -base64 32`)
   - **URLs:** For local: `NEXTAUTH_URL=http://localhost:3000`, `NEXT_PUBLIC_SITE_URL=http://localhost:3000`. For production: use your public HTTPS URL (e.g. `https://yourdomain.com`)
   - **S3 (RustFS):** `S3_ACCESS_KEY` and `S3_SECRET_KEY` (you can use the same as `RUSTFS_ROOT_USER` and `RUSTFS_ROOT_PASSWORD` for simplicity), `S3_BUCKET=uploads`
   - **Contact form:** Either Resend (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`) or SMTP variables, and `CONTACT_EMAIL` (recipient)

Full reference: [ENVIRONMENT.md](ENVIRONMENT.md).

**Example for local development:**

```env
POSTGRES_USER=ben
POSTGRES_PASSWORD=myDbPassword123
POSTGRES_DB=blog

RUSTFS_ROOT_USER=rustfsadmin
RUSTFS_ROOT_PASSWORD=myRustfsPassword123

ADMIN_PASSWORD=admin123
NEXTAUTH_SECRET=run-openssl-rand-base64-32-to-generate
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000

S3_ACCESS_KEY=rustfsadmin
S3_SECRET_KEY=myRustfsPassword123
S3_BUCKET=uploads

CONTACT_EMAIL=you@example.com
RESEND_API_KEY=re_xxxx
RESEND_FROM_EMAIL=onboarding@resend.dev
```

**Important:** Never commit `.env` to Git. It is listed in `.gitignore`.

---

## Step 3: Start services with Docker Compose

From the project root:

```bash
docker compose up -d --build
```

This builds the Next.js app and starts three containers:

- **postgres** – PostgreSQL 15 (port 5432)
- **rustfs** – S3-compatible object storage (ports 9000 API, 9001 Console)
- **app** – Next.js app (port 3000)

Wait until all containers are healthy (about 30–60 seconds). Check:

```bash
docker compose ps
```

All services should show as “healthy” or “running”.

---

## Step 4: Run database migrations

Migrations must run **inside the app container** so they use the same `DATABASE_URL` as the running app.

**Option A – script (recommended):**

```bash
./scripts/migrate.sh
```

**Option B – manual:**

```bash
docker compose exec app npx prisma migrate deploy
```

Verify:

```bash
docker compose exec app npx prisma migrate status
```

You should see “Database schema is up to date.”

---

## Step 5: Open the site and log in

1. Open **http://localhost:3000** (or your server IP and port if remote).
2. Go to **http://localhost:3000/dashboard**.
3. Log in with the password you set for `ADMIN_PASSWORD`.

On first visit, you may be redirected to the **setup wizard** (site name, logo, navigation, footer). You can complete it or skip and configure everything later under **Content → Site settings**.

---

## Step 6: Optional – RustFS Console

To manage buckets and objects via the web UI:

1. Open **http://localhost:9001** (RustFS Console).
2. Log in with `RUSTFS_ROOT_USER` and `RUSTFS_ROOT_PASSWORD`.
3. The app creates the `uploads` bucket on first upload; you can also create it manually.

---

## Troubleshooting

### "Application error: a server-side exception" or 500 on the site

- Usually means the database schema is not up to date. Run migrations again:
  ```bash
  ./scripts/migrate.sh
  ```
  or `docker compose exec app npx prisma migrate deploy`, then reload the page.

### "Environment variable not found: DATABASE_URL" when running Prisma on the host

- Do **not** run `npx prisma migrate deploy` on the host unless you have set `DATABASE_URL` in `.env` to point to a running Postgres (e.g. `localhost:5432`). Prefer running migrations inside the app container (see Step 4).

### Containers not healthy

- Check logs: `docker compose logs app`, `docker compose logs postgres`, `docker compose logs rustfs`.
- Ensure `.env` has all required variables and no typos (see [ENVIRONMENT.md](ENVIRONMENT.md)).
- For RustFS, ensure ports 9000 and 9001 are free; wait for the health check to pass (start period ~30s).

### Contact form not sending

- If using Resend: verify `RESEND_API_KEY` and `RESEND_FROM_EMAIL`; ensure the sender domain is verified in Resend.
- If using SMTP (Gmail): use an App Password, not your normal password, and set `SMTP_*` variables.

---

## Next steps

- **Content:** Use the dashboard to add posts, edit Home/About/Contact, and create custom pages. See [DASHBOARD_USER_GUIDE.md](DASHBOARD_USER_GUIDE.md).
- **Production:** Set `NEXTAUTH_URL` and `NEXT_PUBLIC_SITE_URL` to your HTTPS domain; put a reverse proxy (e.g. Nginx Proxy Manager) in front of port 3000. See [DEPLOYMENT.md](DEPLOYMENT.md).
- **CI/CD:** CI (build on PR) is ready; CD (auto-deploy on push) is documented in [DEPLOYMENT.md](DEPLOYMENT.md) and can be configured when your server and SSH are ready.
