# 完整部署指南 (Complete Setup Guide)

本指南提供從零開始部署個人網站的完整步驟。

## 前置需求

- Ubuntu/Debian Linux 伺服器
- Docker 和 Docker Compose 已安裝
- Git 已安裝
- 網域（可選，用於 HTTPS）

## 步驟 1: 克隆專案

```bash
# 克隆專案到本地
git clone <your-repo-url> personal-website
cd personal-website
```

## 步驟 2: 環境變數設定

專案使用 Docker Compose，環境變數在 `docker-compose.yml` 中已設定預設值，但建議建立 `.env` 檔案自訂：

```bash
# 建立 .env 檔案（可選）
cat > .env << 'EOF'
ADMIN_PASSWORD=your-secure-password-here
NEXTAUTH_SECRET=your-random-secret-key-here
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
EOF
```

**重要環境變數說明**：
- `ADMIN_PASSWORD`: 後台登入密碼（預設：`benedict123`）
- `NEXTAUTH_SECRET`: NextAuth 加密金鑰（建議使用隨機字串）
- `NEXTAUTH_URL`: NextAuth 回調 URL（生產環境使用 HTTPS）
- `NEXT_PUBLIC_SITE_URL`: 網站公開 URL

## 步驟 3: 啟動服務

### 第一次部署（乾淨建置）

```bash
# 1. 停止並清除舊容器（如果有的話）
sudo docker compose down -v

# 2. 建置並啟動所有服務
sudo docker compose up -d --build

# 3. 等待服務啟動（約 30 秒）
sleep 30

# 4. 檢查服務狀態
sudo docker compose ps
```

### 初始化 RustFS（物件儲存）

```bash
# 執行 RustFS 初始化腳本
./init-rustfs.sh

# 腳本會自動：
# - 創建數據和日誌目錄
# - 設置目錄權限（UID 10001）
# - 啟動 RustFS 服務
# 
# 完成後，可以訪問 Console 建立 bucket：
# http://localhost:9001
# 帳號: rustfsadmin
# 密碼: rustfsadmin
```

**注意**：應用程式會在第一次上傳時自動建立 `uploads` bucket，所以手動建立是可選的。

### 初始化資料庫

```bash
# 執行資料庫遷移（建立資料表）
sudo docker compose exec app npx prisma migrate deploy

# 驗證遷移狀態
sudo docker compose exec app npx prisma migrate status
```

## 步驟 4: 驗證部署

### 檢查服務狀態

```bash
# 查看所有容器狀態
sudo docker compose ps

# 應該看到三個容器都是 "healthy" 或 "running"
# - personal-website-postgres (healthy)
# - personal-website-rustfs (healthy)
# - personal-website-app (healthy)
```

### 檢查應用日誌

```bash
# 查看應用日誌（應該沒有錯誤）
sudo docker compose logs app --tail 50
```

### 測試網站

1. **訪問網站**：`http://your-server-ip:3000`
2. **測試後台登入**：`http://your-server-ip:3000/dashboard`
   - 使用設定的 `ADMIN_PASSWORD` 登入
3. **測試功能**：
   - 建立一篇文章
   - 上傳一張圖片
   - 上傳 CV

## 步驟 5: 設定反向代理（可選）

如果需要使用網域和 HTTPS，請參考 [DEPLOYMENT.md](./DEPLOYMENT.md) 設定 Nginx Proxy Manager。

## 常用指令

### 快速建置（小修改）

```bash
./quick-build.sh
```

### 乾淨建置（重大變更）

```bash
./clean-build.sh
```

### 查看日誌

```bash
# 應用日誌
sudo docker compose logs -f app

# 所有服務日誌
sudo docker compose logs -f

# 特定服務日誌
sudo docker compose logs -f postgres
sudo docker compose logs -f rustfs
```

### 重啟服務

```bash
# 重啟所有服務
sudo docker compose restart

# 重啟單一服務
sudo docker compose restart app
```

### 停止服務

```bash
# 停止所有服務（保留資料）
sudo docker compose stop

# 停止並刪除容器（保留資料）
sudo docker compose down

# 停止並刪除容器和資料（⚠️ 危險！會刪除所有資料）
sudo docker compose down -v
```

## 故障排除

### 服務無法啟動

```bash
# 檢查日誌
sudo docker compose logs

# 檢查端口是否被占用
sudo netstat -tlnp | grep -E "3000|5432|9000|9001"

# 如果 9000 或 9001 被占用，可能是舊的 MinIO 容器
# 執行清理：sudo docker stop $(sudo docker ps -q --filter 'publish=9000') 2>/dev/null || true

# 檢查磁碟空間
df -h
```

### 資料庫連線錯誤

```bash
# 檢查 PostgreSQL 是否運行
sudo docker compose ps postgres

# 檢查資料庫是否初始化
sudo docker compose exec app npx prisma migrate status

# 如果未初始化，執行遷移
sudo docker compose exec app npx prisma migrate deploy
```

### CV 上傳失敗

```bash
# 檢查 public 目錄權限
ls -ld ./public

# 修正權限
chmod 777 ./public

# 重啟應用
sudo docker compose restart app
```

## 下一步

- 設定反向代理和 SSL：參考 [DEPLOYMENT.md](./DEPLOYMENT.md)
- 資料備份和搬家：參考 [DATA_MANAGEMENT.md](./DATA_MANAGEMENT.md)
- 開發指南：參考 [DEV_NOTES.md](./DEV_NOTES.md)
