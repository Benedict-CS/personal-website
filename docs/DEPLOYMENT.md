# Deployment Guide

This document covers running the app with Docker Compose, optional reverse proxy (Nginx Proxy Manager) for SSL, and CI/CD. **CI (build on PR) is set up and working; CD (auto-deploy on push to main) is optional and can be configured later** when your server and SSH keys are ready.

---

## Architecture overview

```
Internet
   ↓
[Optional] Nginx Proxy Manager (ports 80/443)
   ↓
Next.js App (Docker, port 3000)
   ↓
PostgreSQL + RustFS (Docker, internal)
```

---

## Deploying with Docker Compose

1. Clone the repo and configure `.env` (see [GETTING_STARTED.md](GETTING_STARTED.md) and [ENVIRONMENT.md](ENVIRONMENT.md)).
2. From the project root:
   ```bash
   docker compose up -d --build
   ```
3. Run migrations inside the app container:
   ```bash
   docker compose exec app npx prisma migrate deploy
   ```
   or use `./scripts/migrate.sh`.
4. Open `http://your-server-ip:3000` (or your domain if you already point it to the server).

For production, set `NEXTAUTH_URL` and `NEXT_PUBLIC_SITE_URL` in `.env` to your public HTTPS URL (e.g. `https://yourdomain.com`).

---

## Optional: Nginx Proxy Manager (SSL and reverse proxy)

To serve the site over HTTPS with a domain:

### 1. Install Nginx Proxy Manager

Example with Docker Compose in a separate directory:

```bash
mkdir -p ~/nginx-proxy-manager
cd ~/nginx-proxy-manager
```

Create `docker-compose.yml`:

```yaml
services:
  nginx-proxy-manager:
    image: jc21/nginx-proxy-manager:latest
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "81:81"   # Admin UI
    volumes:
      - ./data:/data
      - ./letsencrypt:/etc/letsencrypt
```

Run:

```bash
docker compose up -d
```

### 2. First-time NPM setup

- Open `http://your-server-ip:81` (or your domain:81 if already routed).
- Default login: `admin@example.com` / `changeme` (change on first login).

### 3. Add a proxy host for your site

1. In NPM: **Proxy Hosts** → **Add Proxy Host**.
2. **Details:**
   - **Domain Names:** your domain (e.g. `yourdomain.com`)
   - **Scheme:** `http`
   - **Forward Hostname / IP:** `localhost` or `127.0.0.1`
   - **Forward Port:** `3000`
   - Enable **Block Common Exploits** (and **Websockets** if needed).
3. **SSL:**
   - Request a new Let's Encrypt certificate.
   - Enable **Force SSL**, **HTTP/2**, **HSTS**.
   - Enter your email for Let's Encrypt.
4. Save. Wait for the certificate to be issued.

### 4. App configuration

Ensure `.env` on the server has:

- `NEXTAUTH_URL=https://yourdomain.com`
- `NEXT_PUBLIC_SITE_URL=https://yourdomain.com`

Restart the app container after changing env:

```bash
docker compose up -d --force-recreate app
```

---

## CI (continuous integration)

**Status: configured and working.**

- **Workflow:** `.github/workflows/ci.yml`
- **Triggers:** Pull requests targeting `main`, or manual dispatch.
- **Steps:** Install deps (`npm ci`), Prisma generate, lint, build. No deploy.

This ensures every PR can build before merge.

---

## CD (continuous deployment)

**Status: optional; configure when your server and SSH are ready.** (If your runner or server only has a private IP, GitHub cannot SSH to it from the cloud; see “Private IP / self-hosted runner” below.)

When CD is enabled, a **push to `main`** triggers:

1. Build (same as CI).
2. SSH to the deploy server.
3. Run `cd $DEPLOY_PATH && CI=1 ./scripts/manual-deploy.sh` (pull, build, migrate, restart).

### GitHub Secrets required for CD

In the repo: **Settings → Secrets and variables → Actions**, add:

| Secret | Required | Description |
|--------|----------|-------------|
| `DEPLOY_HOST` | Yes | Deploy target hostname or **public IP** (GitHub cannot reach private IPs) |
| `DEPLOY_USER` | Yes | SSH username (e.g. `ubuntu`, `deploy`) |
| `SSH_PRIVATE_KEY` | Yes | Full private key content (including BEGIN/END lines) for SSH login |
| `DEPLOY_PATH` | No | Project path on server; default `~/personal-website` |

### SSH key setup

1. Generate a key for deploy only:
   ```bash
   ssh-keygen -t ed25519 -C "github-deploy" -f ~/.ssh/deploy_key -N ""
   ```
2. Put the **public** key in `DEPLOY_USER`’s `~/.ssh/authorized_keys` on the server.
3. Put the **private** key contents into the GitHub secret `SSH_PRIVATE_KEY`.

### What `manual-deploy.sh` does

With `CI=1` it runs non-interactively:

- `git fetch origin main` and `git reset --hard origin/main`
- `docker compose build`
- `docker compose exec app npx prisma migrate deploy`
- Restart app (e.g. `docker compose up -d`)

So a push to `main` updates the live site without logging into the server.

### Private IP or no public SSH

If the deploy target has only a private IP (e.g. 10.x, 192.168.x), GitHub Actions in the cloud cannot SSH to it. Options:

1. **Self-hosted runner:** Install a [GitHub Actions self-hosted runner](https://docs.github.com/en/actions/guides/adding-self-hosted-runners) on a machine that can reach your server (or on the server itself). Run the deploy job on that runner and execute `./scripts/manual-deploy.sh` locally (or via SSH to the private IP from the runner). Do not use `DEPLOY_HOST` with a private IP from the cloud.
2. **Disable CD:** Do not set the deploy secrets, or remove/disable `.github/workflows/deploy.yml`. Deploy by hand: SSH to the server and run `./scripts/manual-deploy.sh`.

---

## Troubleshooting

- **502 Bad Gateway:** Check that the Next.js app is running (`docker compose ps`) and listening on 3000; check app logs (`docker compose logs app`).
- **SSL errors:** Ensure DNS for your domain points to the server and that ports 80 and 443 are reachable (e.g. Let's Encrypt needs port 80 for validation).
- **CD fails (SSH):** Verify `DEPLOY_HOST` is a public hostname/IP, and that the key in `SSH_PRIVATE_KEY` matches the public key in `authorized_keys` for `DEPLOY_USER`.
