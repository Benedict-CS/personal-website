# 系統架構 (System Architecture)

## 整體架構

```
┌─────────────────────────────────────────────────────────┐
│                    Internet                              │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
        ┌────────────────────────┐
        │  Nginx Proxy Manager   │  (可選，用於 SSL)
        │   Port 80/443          │
        └────────────┬───────────┘
                     │
                     ↓
        ┌────────────────────────┐
        │   Next.js Application  │
        │   Port 3000            │
        │   (Docker Container)   │
        └─────┬──────────────────┘
              │
    ┌─────────┼─────────┐
    ↓         ↓         ↓
┌────────┐ ┌──────────┐ ┌────────┐
│Postgres│ │ RustFS   │ │ Public │
│ :5432  │ │ :9000    │ │  (CV)  │
└────────┘ └──────────┘ └────────┘
```

## 服務說明

### 1. Next.js Application
- **容器名稱**: `personal-website-app`
- **端口**: `3000`
- **功能**: 
  - 前端頁面渲染
  - API 路由處理
  - 後台管理系統
- **資料持久化**: 
  - `./public:/app/public` (CV 檔案)

### 2. PostgreSQL Database
- **容器名稱**: `personal-website-postgres`
- **端口**: `5432` (內部)
- **資料庫**: `blog`
- **用戶**: `ben`
- **資料持久化**: 
  - `./postgres-data:/var/lib/postgresql/data`

### 3. RustFS Object Storage
- **容器名稱**: `personal-website-rustfs`
- **端口**: 
  - `9000` - S3 API (對外)
  - `9001` - Console (對外，管理界面)
- **功能**: S3-compatible 高性能物件儲存（比 MinIO 快 2.3 倍）
- **資料持久化**: 
  - `./rustfs-data` (物件資料)
  - `./rustfs-logs` (日誌)
- **Bucket**: `uploads`
- **預設帳號**: `rustfsadmin` / `rustfsadmin`
- **文檔**: [RustFS 官網](https://rustfs.com) | [GitHub](https://github.com/rustfs/rustfs)

## 資料流程

### 文章建立流程
```
User → Dashboard → API (/api/posts) → Prisma → PostgreSQL
```

### 圖片上傳流程
```
User → Dashboard → API (/api/upload) → S3 Client → RustFS
```

### CV 上傳流程
```
User → Dashboard → API (/api/cv/upload) → File System → ./public/cv.pdf
```

## 資料儲存

### 資料庫 (PostgreSQL)
- **位置**: `./postgres-data/`
- **內容**: 
  - `Post` 表 - 文章資料
  - `Tag` 表 - 標籤資料
  - `_PostToTag` 表 - 文章-標籤關聯

### 物件儲存 (RustFS)
- **位置**: `./rustfs-data/` (物件資料)
- **內容**: 文章中的圖片檔案
- **訪問**: 透過 `/api/media/serve/[filename]` API

### 靜態檔案 (Public)
- **位置**: `./public/`
- **內容**: 
  - `cv.pdf` - CV 檔案
  - 其他靜態資源（SVG 圖示等）
- **訪問**: 直接透過 URL（如 `/cv.pdf`）

## 安全架構

### 認證流程
```
User → /dashboard → Middleware → NextAuth → Session
```

### 保護的路由
- `/dashboard/*` - 需要登入
- `/api/posts/*` - 需要登入
- `/api/cv/*` - 需要登入
- `/api/media/cleanup` - 需要登入

### 公開路由
- `/` - 首頁
- `/blog` - 部落格列表
- `/blog/[slug]` - 文章頁面
- `/about` - 關於頁面
- `/cv.pdf` - CV 下載

## 網路架構

### 容器網路
- 所有容器在同一個 Docker 網路中
- 容器間透過服務名稱通訊：
  - `postgres:5432`
  - `rustfs:9000`

### 對外端口
- `3000` - Next.js App（可選，如果不用 Nginx）
- `9000` - RustFS S3 API（可選，通常不需要對外）
- `9001` - RustFS Console（可選，管理用）

## 擴展性

### 水平擴展
- Next.js App 可以運行多個實例（需要共享 session）
- PostgreSQL 可以設定主從複製
- RustFS 支援分散式模式（多節點部署）

### 垂直擴展
- 增加容器資源限制
- 優化資料庫查詢
- 使用 CDN 加速靜態資源

## 監控與日誌

### 日誌位置
- 應用日誌: `sudo docker compose logs app`
- 資料庫日誌: `sudo docker compose logs postgres`
- RustFS 日誌: `sudo docker compose logs rustfs` 或 `./rustfs-logs/`

### 健康檢查
- 所有服務都有健康檢查設定
- 使用 `docker compose ps` 查看狀態
