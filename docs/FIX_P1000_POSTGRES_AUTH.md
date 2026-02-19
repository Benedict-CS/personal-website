# 修復 P1000：Postgres 認證失敗

錯誤訊息：`Authentication failed against database server at postgres, the provided database credentials for ben are not valid`

## 原因

Postgres 第一次啟動時會用**當時**的 `POSTGRES_PASSWORD` 初始化資料庫，並把資料寫進 `postgres-data/`。  
若當時是**空密碼**或**別的密碼**，之後你在 `.env` 改成 `POSTGRES_PASSWORD=spin6199`，app 用新密碼連線，但資料庫裡存的仍是舊密碼，就會出現 P1000。

---

## 解法一：讓 Postgres 密碼與 .env 一致（保留現有資料）

在**伺服器**上，專案目錄下執行：

```bash
# 用你 .env 裡的密碼（例如 spin6199）
sudo docker compose exec postgres psql -U ben -d blog -c "ALTER USER ben PASSWORD 'spin6199';"
```

把 `spin6199` 改成你 `.env` 裡 **POSTGRES_PASSWORD** 的值（前後不要有空格、引號）。  
然後重啟 app：

```bash
sudo docker compose restart app
```

之後 app 用 `.env` 的密碼連線就會通過。

---

## 解法二：清空資料庫、用新密碼重新初始化（會刪除所有資料）

若**不需要**保留現有文章/設定，可以讓 Postgres 用現在的 `.env` 重新建一次：

```bash
cd /home/ben/personal-website   # 或你的專案路徑

# 1. 停掉所有容器
sudo docker compose down

# 2. 刪除 Postgres 資料（不可復原）
sudo rm -rf postgres-data

# 3. 確認 .env 裡 POSTGRES_PASSWORD 已填好
# 4. 重新啟動（Postgres 會用 .env 的密碼初始化）
sudo docker compose up -d

# 5. 跑 migration
sudo docker compose exec app npx prisma migrate deploy
```

之後再用 `./scripts/quick-build.sh` 或 `sudo docker compose up -d` 即可。
