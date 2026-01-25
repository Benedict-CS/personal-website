# 資料管理指南 (Data Management Guide)

## 資料儲存位置

### 1. PostgreSQL 資料庫
- **位置**: `./postgres-data/` (專案根目錄)
- **內容**: 所有文章、標籤等資料庫資料
- **持久化**: ✅ 使用 Docker Volume 掛載，資料會保存在主機上

### 2. RustFS 物件儲存
- **位置**: 
  - `./rustfs-data/` - 物件資料 (專案根目錄)
  - `./rustfs-logs/` - 日誌檔案 (專案根目錄)
- **內容**: 上傳的圖片、媒體檔案（用於文章內容）
- **持久化**: ✅ 使用 Docker Volume 掛載，資料會保存在主機上
- **說明**: 使用 RustFS 作為 S3-compatible 物件儲存（比 MinIO 快 2.3 倍）

### 3. 公開檔案（CV、About 圖片等）
- **位置**: `./public/`（專案根目錄）
  - `cv.pdf`：後台上傳的 CV
  - `about/`：大頭照、學校 / 專案 / 公司 logo 等
- **持久化**: ✅ 使用 Docker Volume 掛載 (`./public:/app/public`)，資料會保存在主機上
- **說明**: 這些檔案可直接透過網址訪問（如 `/cv.pdf`、`/api/about/serve/...`），不需經過 RustFS

## 驗證資料持久化

### 測試步驟

1. **建立測試資料**：
   ```bash
   # 1. 登入後台，建立一篇文章並上傳一張圖片
   # 2. 確認資料已儲存
   ```

2. **重啟容器測試**：
   ```bash
   # 停止所有容器
   sudo docker compose down
   
   # 重新啟動
   sudo docker compose up -d
   
   # 檢查資料是否還在
   # 登入後台，應該還能看到之前建立的文章
   ```

3. **檢查資料目錄**：
   ```bash
   # 查看資料庫檔案
   ls -lh ./postgres-data/
   
   # 查看 RustFS 資料
   ls -lh ./rustfs-data/
   ```

## 備份資料

### 完整備份

```bash
# 1. 停止容器（確保資料一致性）
sudo docker compose down

# 2. 備份資料目錄（含 DB、RustFS、public：CV、About 圖片等）
tar -czf backup-$(date +%Y%m%d-%H%M%S).tar.gz \
  postgres-data/ \
  rustfs-data/ \
  public/

# 3. 重新啟動容器
sudo docker compose up -d
```

### 只備份資料庫

```bash
# 使用 pg_dump 備份資料庫
sudo docker compose exec postgres pg_dump -U ben blog > backup-$(date +%Y%m%d).sql

# 還原資料庫
sudo docker compose exec -T postgres psql -U ben blog < backup-20240101.sql
```

### 手動初始化資料庫（備用方案）

如果 Prisma migrate 失敗，可以使用 `init-database.sql` 手動建立資料表：

```bash
# 執行 SQL 腳本
sudo docker compose exec -T postgres psql -U ben blog < init-database.sql
```

**注意**：正常情況下應該使用 `prisma migrate deploy`，這個 SQL 腳本只是備用方案。

## 遷移到其他 VM / 伺服器

### 完整搬家流程

#### 步驟 1: 在原伺服器上備份

```bash
# 1. 停止所有容器（確保資料一致性）
sudo docker compose down

# 2. 建立完整備份（含 public：CV、About 圖片等）
tar -czf website-backup-$(date +%Y%m%d-%H%M%S).tar.gz \
  postgres-data/ \
  rustfs-data/ \
  public/

# 3. 檢查備份檔案大小
ls -lh website-backup-*.tar.gz
```

#### 步驟 2: 傳輸備份檔案到新伺服器

**方法 A: 使用 SCP**

```bash
# 從原伺服器傳到新伺服器
scp website-backup-*.tar.gz user@new-server:/path/to/destination/
```

**方法 B: 使用 rsync**

```bash
# 直接同步資料目錄（不需要打包）
rsync -avz --progress \
  postgres-data/ \
  rustfs-data/ \
  public/ \
  user@new-server:/path/to/personal-website/
```

**方法 C: 下載到本地再上傳**

```bash
# 在原伺服器上下載到本地
# 然後上傳到新伺服器
```

#### 步驟 3: 在新伺服器上還原

```bash
# 1. 克隆專案（如果還沒有的話）
git clone <your-repo-url> personal-website
cd personal-website

# 2. 解壓備份檔案（如果使用 tar）
tar -xzf website-backup-*.tar.gz

# 或如果使用 rsync，資料已經在正確位置

# 3. 確保目錄權限正確
chmod -R 755 postgres-data/
chmod -R 755 rustfs-data/
chmod -R 755 public/

# 設置 RustFS 目錄權限（UID 10001）
sudo chown -R 10001:10001 rustfs-data/ rustfs-logs/ 2>/dev/null || true

# 4. 啟動服務
sudo docker compose up -d

# 5. 等待服務啟動
sleep 30

# 6. 驗證資料庫遷移狀態
sudo docker compose exec app npx prisma migrate status

# 7. 若未初始化或需套用新遷移，在 app 容器內執行（勿在 host 直接 npx prisma migrate）
./migrate.sh
# 或：sudo docker compose exec app npx prisma migrate deploy

# 8. 驗證資料
# - 訪問網站檢查文章是否還在
# - 檢查圖片是否正常顯示
# - 檢查 CV 是否可以下載
```

### PostgreSQL 資料庫搬家（單獨）

如果只需要搬移資料庫：

```bash
# 1. 在原伺服器上導出資料庫
sudo docker compose exec postgres pg_dump -U ben blog > database-backup.sql

# 2. 傳輸到新伺服器
scp database-backup.sql user@new-server:/path/

# 3. 在新伺服器上還原
# 先啟動服務（但資料庫是空的）
sudo docker compose up -d postgres
sleep 10

# 還原資料庫
sudo docker compose exec -T postgres psql -U ben blog < database-backup.sql
```

### RustFS 物件儲存搬家（單獨）

如果只需要搬移圖片：

```bash
# 1. 在原伺服器上停止 RustFS
sudo docker compose stop rustfs

# 2. 複製 RustFS 資料目錄
rsync -avz rustfs-data/ rustfs-logs/ user@new-server:/path/to/personal-website/

# 3. 在新伺服器上設置權限
sudo chown -R 10001:10001 rustfs-data/ rustfs-logs/

# 4. 在新伺服器上啟動 RustFS
sudo docker compose up -d rustfs

# 5. 驗證資料（使用 S3 API 或 Console）
# 訪問 http://localhost:9001 查看 Console
# 或使用 AWS CLI: aws --endpoint-url=http://localhost:9000 s3 ls s3://uploads/
```

### 驗證搬家成功

```bash
# 1. 檢查容器狀態
sudo docker compose ps

# 2. 檢查資料庫記錄數
sudo docker compose exec app npx prisma studio
# 或
sudo docker compose exec postgres psql -U ben blog -c "SELECT COUNT(*) FROM \"Post\";"

# 3. 檢查 RustFS 檔案（使用 S3 API）
# 可以使用 AWS CLI 或 rclone 檢查
# aws --endpoint-url=http://localhost:9000 s3 ls s3://uploads/
# 或訪問 Console: http://localhost:9001

# 4. 檢查 public 檔案（CV、About 圖片等）
ls -lh public/cv.pdf public/about/ 2>/dev/null || true

# 5. 訪問網站測試功能
```

## 資料目錄結構

```
personal-website/
├── postgres-data/          # PostgreSQL 資料（不要手動修改）
│   ├── base/
│   ├── global/
│   └── ...
├── rustfs-data/            # RustFS 物件儲存
│   └── ...                # 物件資料
├── rustfs-logs/            # RustFS 日誌
│   └── ...                # 日誌檔案
├── public/                 # 公開靜態檔案（持久化）
│   ├── cv.pdf             # CV
│   └── about/             # About 頁大頭照、logo 等
└── docker-compose.yml
```

## RustFS 物件儲存

**2025年1月更新**：使用 RustFS 作為物件儲存
- ✅ RustFS 是高性能、開源的 S3-compatible 物件儲存
- ✅ **2.3x 比 MinIO 更快**（4KB 對象測試）
- ✅ Apache 2.0 授權，活躍的開發社群（GitHub 20k+ stars）
- ✅ 單一服務架構，簡單易用
- ✅ 強大的 Console 管理界面
- 📖 詳細設定請參考 [RustFS 官網](https://rustfs.com) | [GitHub](https://github.com/rustfs/rustfs)
- 📖 遷移過程請參考 [blog.md](../blog.md)

## 重要注意事項

⚠️ **警告**：
- 不要直接修改 `postgres-data/` 或 `rustfs-data/` 目錄內的檔案
- 備份前務必停止容器，確保資料一致性
- 定期備份重要資料
- 遷移前測試備份還原流程
- RustFS 目錄需要正確的權限（UID 10001）

## 檢查資料大小

```bash
# 查看資料庫大小
du -sh ./postgres-data/

# 查看 RustFS 資料大小
du -sh ./rustfs-data/

# 查看總大小
du -sh ./postgres-data/ ./rustfs-data/
```
