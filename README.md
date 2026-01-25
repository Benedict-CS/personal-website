# Benedict's Personal Website

Benedict 的個人網站 (Personal Website)

## 專案簡介

這是一個使用 Next.js 建立的個人網站專案，包含前端展示頁面與後台管理系統。

## 技術架構

### Frontend
- **Next.js 16.1.4** (App Router)
- **React 19**
- **Tailwind CSS 4**

### UI Library
- **Shadcn/ui** - 基於 Radix UI 的組件庫

### Backend & Database
- **PostgreSQL 15** - 透過 Prisma ORM 管理，儲存部落格文章和標籤
- **Prisma 5.22.0** - 資料庫 ORM（鎖定版本）
- **RustFS** - S3-compatible 高性能物件儲存，用於儲存文章圖片（比 MinIO 快 2.3 倍）

### Authentication
- **NextAuth.js v4** - Credentials Provider，使用環境變數密碼登入

### Infrastructure
- **Docker & Docker Compose** - 容器化部署
- **Nginx Proxy Manager** - 反向代理與 SSL 管理（可選）

### 架構圖

```
┌─────────────────┐
│   Web Browser   │
└────────┬────────┘
         │
         ↓
┌─────────────────┐      ┌──────────────┐
│ Nginx Proxy     │      │  Next.js App │
│ Manager (可選)  │──────→│  (Port 3000) │
└─────────────────┘      └──────┬───────┘
                                 │
                    ┌────────────┼────────────┐
                    ↓            ↓            ↓
            ┌─────────────┐ ┌──────────┐ ┌──────────┐
            │ PostgreSQL  │ │  RustFS  │ │  Public  │
            │  (Port 5432)│ │(Port 9000)│ │  (CV)   │
            └─────────────┘ └──────────┘ └──────────┘
```

## 功能列表

### 已完成功能
- ✅ **後台登入系統**：使用 NextAuth.js 實作簡易密碼登入
- ✅ **文章管理 (CRUD)**：
  - 建立新文章
  - 編輯文章
  - 刪除文章
  - 文章列表顯示
  - 發布狀態管理 (Published/Draft)
- ✅ **前台部落格展示**：
  - 部落格首頁（顯示已發布文章）
  - 文章內頁（根據 slug 顯示）
  - 響應式設計
- ✅ **圖片上傳系統**：支援本地儲存 (Local Filesystem)，自動重新命名防衝突
- ✅ **進階編輯器**：支援 Markdown 即時預覽 (Preview Mode) 與圖片拖曳/上傳
- ✅ **Markdown 渲染引擎**：使用 `react-markdown` + `rehype-highlight`
- ✅ **程式碼優化**：支援 Syntax Highlighting (Atom One Dark 風格) 與一鍵複製 (Copy Button)

## 環境變數 (.env)

**預設即可運行**：`docker-compose.yml` 已內建資料庫、RustFS、後台密碼等預設值，直接 `docker compose up` 即可。

若需自訂，在專案根目錄建立 `.env`，可覆寫：

```env
# 後台登入密碼（預設 benedict123）
ADMIN_PASSWORD=你的密碼

# NextAuth 加密金鑰（預設 change-me-in-production，生產請改）
NEXTAUTH_SECRET=請用 openssl rand -base64 32 生成

# 網站 URL（預設 https://benedict.winlab.tw）
NEXTAUTH_URL=https://你的網域
NEXT_PUBLIC_SITE_URL=https://你的網域
```

資料庫與 S3 帳密已寫在 `docker-compose.yml`，無須在 `.env` 重複設定。

## 常用指令

### 啟動開發伺服器
```bash
npm run dev -- -H 0.0.0.0
```

### 資料庫管理
```bash
npx prisma studio
```

### 建置專案
```bash
npm run build
```

### 啟動生產環境
```bash
npm start
```

## 專案結構

```
personal-website/
├── src/                    # 原始碼
│   ├── app/               # Next.js App Router
│   │   ├── api/          # API Routes
│   │   ├── dashboard/    # 後台管理頁面
│   │   ├── blog/         # 部落格頁面
│   │   └── ...
│   ├── components/        # React 組件
│   └── lib/              # 工具函數
├── prisma/                # Prisma 設定與遷移
├── public/                # 靜態檔案（CV 等）
├── docs/                  # 文件
├── docker-compose.yml     # Docker Compose 設定
├── Dockerfile             # Docker 建置檔案
├── quick-build.sh         # 快速建置腳本
├── clean-build.sh         # 乾淨建置腳本
└── init-database.sql      # 手動初始化資料庫 SQL（備用方案）
```

**資料目錄**（執行後產生）：
- `postgres-data/` - PostgreSQL 資料庫檔案
- `rustfs-data/` - RustFS 物件儲存檔案
- `rustfs-logs/` - RustFS 日誌檔案

## 後台管理

### 登入

- **URL**: `/dashboard`
- **密碼**: 環境變數 `ADMIN_PASSWORD`（預設：`benedict123`）
- **功能**：
  - Posts - 文章管理（建立、編輯、刪除）
  - CV - CV 檔案上傳
  - Media - 媒體檔案管理

### 資料庫管理

使用 Prisma ORM 管理 PostgreSQL，所有資料庫操作透過 Prisma 進行。

**重要**：請在 **app 容器內** 執行 Prisma 指令，勿在 host 直接執行 `npx prisma migrate deploy`。  
生產環境的 `DATABASE_URL` 由 docker-compose 提供；在 host 執行會找不到 `DATABASE_URL` 或無法連線 DB。

```bash
# 執行遷移（推薦：使用腳本）
./migrate.sh

# 或手動在容器內執行
sudo docker compose up -d
sudo docker compose exec app npx prisma migrate deploy

# 查看遷移狀態
sudo docker compose exec app npx prisma migrate status

# 開啟 Prisma Studio（資料庫 GUI）
sudo docker compose exec app npx prisma studio
```

## 快速開始

### 完整部署流程

詳細的部署步驟請參考 [docs/SETUP.md](docs/SETUP.md)

**快速部署**：

```bash
# 1. 克隆專案
git clone <your-repo-url> personal-website
cd personal-website

# 2. 啟動服務
sudo docker compose up -d --build

# 3. 初始化資料庫（須在 app 容器內執行）
./migrate.sh
# 或：sudo docker compose exec app npx prisma migrate deploy

# 4. 訪問網站
# http://your-server-ip:3000
```

### 建置與部署腳本

- **手動部署**（拉碼、建置、遷移、重啟）：`./manual-deploy.sh`
- **僅執行遷移**：`./migrate.sh`（會先確保服務已啟動）
- **快速建置**（小修改）：`./quick-build.sh`
- **乾淨建置**（重大變更）：`./clean-build.sh`

詳細說明請參考 [BUILD_GUIDE.md](BUILD_GUIDE.md)

### 故障排除

- **網站出現 500 / "Application error: a server-side exception"**  
  多半是資料庫尚未執行最新遷移（例如新增 `pinned` 等欄位）。請在專案目錄執行：
  ```bash
  ./migrate.sh
  ```
  或 `sudo docker compose exec app npx prisma migrate deploy`，再重新整理頁面。

- **`npx prisma migrate deploy` 報錯 "Environment variable not found: DATABASE_URL"**  
  請勿在 host 直接執行。改在 app 容器內執行：`./migrate.sh` 或 `sudo docker compose exec app npx prisma migrate deploy`。

## 文件

- **[SETUP.md](docs/SETUP.md)** - 完整部署指南（從零開始）
- **[DEPLOYMENT.md](docs/DEPLOYMENT.md)** - Nginx Proxy Manager 設定與 SSL
- **[DATA_MANAGEMENT.md](docs/DATA_MANAGEMENT.md)** - 資料備份、搬家指南
- **[DEV_NOTES.md](docs/DEV_NOTES.md)** - 開發筆記與技術決策
- **[BUILD_GUIDE.md](BUILD_GUIDE.md)** - 建置方式選擇與故障排除
