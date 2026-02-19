# 環境變數設定

專案依賴的環境變數請透過 `.env` 設定（**勿提交到 Git**）。

---

## 若 .env 被刪除了（無法從 GitHub 還原）

`.env` 不會進 Git，所以只能從範本重建：

```bash
cd /home/ben/personal-website   # 或你的專案路徑
cp .env.example .env
```

然後**一定要**編輯 `.env`，把裡面的佔位符改成**真實密碼與網址**（見下方變數說明）。  
若沒填 `POSTGRES_PASSWORD`，會出現：

```text
Error: P1000: Authentication failed against database server at `postgres`, the provided database credentials for `ben` are not valid.
```

改好後重新啟動：

```bash
sudo docker compose down
sudo docker compose up -d
# 或
./scripts/quick-build.sh
```

---

## 1. 建立 .env（首次或遺失時）

```bash
cp .env.example .env
```

再編輯 `.env`，將 `your-secure-password-here`、`your-nextauth-secret-here` 等改為實際密碼與網址。

## 2. 變數說明

| 變數 | 用途 | 範例 |
|------|------|------|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Docker Postgres 與 Prisma | `ben` / 強密碼 / `blog` |
| `DATABASE_URL` | 本機 `npm run dev` 連 DB 用 | `postgresql://ben:密碼@localhost:5432/blog` |
| `NEXTAUTH_SECRET` | NextAuth 簽章用 | `openssl rand -base64 32` 產生 |
| `NEXTAUTH_URL` | 站點網址（登入 callback） | 本機 `http://localhost:3000`，正式改為 https |
| `NEXT_PUBLIC_SITE_URL` | 前端用站點網址 | 同上 |
| `ADMIN_PASSWORD` | 後台登入密碼 | 自訂 |
| `RUSTFS_ROOT_*` / `S3_ACCESS_KEY` / `S3_SECRET_KEY` | RustFS（S3）登入 | 通常 S3_* 與 RUSTFS_ROOT_* 設成一樣 |
| `S3_BUCKET` | S3 bucket 名稱 | `uploads` |
| `RESEND_API_KEY` | 聯絡表單寄信（Resend） | 選填，不用聯絡表單可留空 |
| `CONTACT_EMAIL` | 聯絡表單收件信箱 | 選填 |

## 3. Docker Compose 使用 .env

`docker-compose.yml` 會自動讀取專案根目錄的 `.env`，所以：

- 建置 / 啟動前請確認已存在 `.env` 且變數已填好。
- 若沒有 `docker-compose.yml`，可從 `docker-compose.example.yml` 複製後再啟動。

## 4. 本機開發 (npm run dev)

- 需有 `DATABASE_URL`（指向本機或遠端 Postgres）。
- 需有 `NEXTAUTH_SECRET`、`NEXTAUTH_URL`、`ADMIN_PASSWORD`。
- 若本機也跑 RustFS，可設 `S3_*`；否則上傳功能可能失敗。

## 5. .env 不見了怎麼辦

1. 從範本複製：`cp .env.example .env`
2. 依照上表與 `.env.example` 內註解填入實際值。
3. 若之前有備份（例如伺服器上的舊 `.env` 或備份檔），可對照 `.env.example` 補回變數。
