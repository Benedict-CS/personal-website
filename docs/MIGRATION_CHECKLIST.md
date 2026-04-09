# Migration and Portability Checklist

Use this when moving the site to a new host, region, or Kubernetes cluster. The app is **stateless** at the HTTP layer; persistence is **PostgreSQL**, **object storage (S3-compatible)**, and **uploads on disk** where configured.

---

## 1. Data to move

| Asset | Notes |
|-------|--------|
| **PostgreSQL** | Dump/restore (`pg_dump` / `pg_restore`) or managed backup. Run `npx prisma migrate deploy` on the target before traffic. |
| **Object storage** | Bucket contents (RustFS/MinIO/S3). Copy objects and keep the same key layout if possible. |
| **`public/` uploads** | If the app stores files under `./public` (Compose volume), rsync or replicate the directory. |
| **Secrets** | Copy `.env` equivalents only through a secure channel — never commit real secrets. |

---

## 2. Environment parity

1. Set **`DATABASE_URL`**, **`NEXTAUTH_SECRET`**, **`NEXTAUTH_URL`**, **`NEXT_PUBLIC_SITE_URL`** to the new public origin.
2. Configure **S3** variables (`S3_ENDPOINT`, keys, bucket) for the new storage.
3. Optional: **`REDIS_URL`** for shared rate limits across replicas.
4. Optional: **`SECURITY_TXT_CONTACT`** / **`SECURITY_TXT_POLICY`** for `/.well-known/security.txt`.
5. Set **`APP_VERSION`** or **`GIT_COMMIT`** so health checks and dashboards show which build is running.
6. Re-issue or rotate **`ANALYTICS_SECRET`** if you treat analytics as environment-specific.

See [ENVIRONMENT.md](ENVIRONMENT.md) for the full variable list.

---

## 3. Verification after cutover

```bash
npm run verify
./scripts/verify-health.sh https://your-new-domain.example
```

On the server after Docker deploy, `scripts/manual-deploy.sh` checks **`GET /api/live`** and **`GET /api/health`**.

---

## 4. DNS and TLS

- Point DNS to the new load balancer or host.
- Enable HTTPS before setting **`ENABLE_HSTS=true`** (see [ENVIRONMENT.md](ENVIRONMENT.md)).

---

## Related

- [OPERATIONS_AND_RELIABILITY.md](OPERATIONS_AND_RELIABILITY.md)
- [DEPLOYMENT.md](DEPLOYMENT.md)
- [FEATURES.md](FEATURES.md)
