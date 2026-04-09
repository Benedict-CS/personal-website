# CI/CD and GitHub Actions

This repository includes optional GitHub Actions workflows for **continuous integration** and **deployment**.

---

## CI (`/.github/workflows/ci.yml`)

Runs on **pull requests** targeting the `test` branch and on **workflow_dispatch**.

**Concurrency:** workflows use a **`concurrency` group** so a newer push to the same PR or branch **cancels** an in-progress run (faster feedback, less queue time).

**Permissions:** workflows declare **`permissions: contents: read`** (principle of least privilege for the `GITHUB_TOKEN`).

**Job timeouts:** CI and deploy **build** jobs use a **45-minute** ceiling; deploy **SSH** job **30 minutes**; Harbor build **60 minutes** — hung runners fail fast instead of burning minutes indefinitely.

| Step | Purpose |
|------|---------|
| `npm ci` | Reproducible installs |
| `npx prisma generate` | Prisma Client for build |
| `npm run verify` | ESLint, `tsc --noEmit`, Jest, production build |
| `npm audit --audit-level=critical` | Informational; does **not** fail the job (`continue-on-error`) — review the log for critical advisories |

The verify step uses placeholder secrets so the app can compile without a real database connection.

---

## CD (`/.github/workflows/deploy.yml`)

Runs on **push** to `test` and **workflow_dispatch**. Requires repository **Secrets**:

- `DEPLOY_HOST` — SSH host
- `DEPLOY_USER` — SSH user
- `SSH_PRIVATE_KEY` — private key for deploy
- Optional: `DEPLOY_PATH` — project directory on the server (default `~/personal-website`)

The deploy job runs `CI=1 ./scripts/manual-deploy.sh` on the server (see [DEPLOYMENT.md](DEPLOYMENT.md)). **Concurrency** is enabled so overlapping deploys for the same ref cancel the older run.

After deploy, the script probes **`GET /api/live`** and **`GET /api/health`** on `127.0.0.1:3000`.

---

## Harbor image build (`/.github/workflows/build-push-harbor.yml`)

Optional workflow to build and push a Docker image to a Harbor registry. Configure registry credentials and image name in the workflow or secrets as needed. Uses **concurrency** to avoid overlapping pushes for the same ref.

---

## Local parity

Before opening a PR, run the same checks locally:

```bash
npm ci
npx prisma generate
npm run verify
```

`verify` runs **lint**, **`tsc --noEmit`**, **unit tests**, and **production build** in sequence (see `package.json`). Alternatively, run individual scripts.

---

## Dependabot

[`.github/dependabot.yml`](../.github/dependabot.yml) opens weekly PRs for **npm** and **GitHub Actions** updates. Merge after `npm run verify` passes locally or on CI.

---

## Related

- [OPERATIONS_AND_RELIABILITY.md](OPERATIONS_AND_RELIABILITY.md) — health endpoints, scaling, backups
- [DEPLOYMENT.md](DEPLOYMENT.md) — server deploy procedures
- [OPERATIONS_QUICK_REFERENCE.md](OPERATIONS_QUICK_REFERENCE.md)
