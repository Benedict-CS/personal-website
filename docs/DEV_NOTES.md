# 開發筆記 (Development Notes)

本文件記錄專案開發過程中的關鍵技術決策和常見問題，幫助未來的開發者（或自己）快速進入狀況。

## 技術版本鎖定

### Prisma 版本
- **必須鎖定在 v5**，不要升級到 v7 預覽版
- **原因**：v7 預覽版在設定檔上有重大 breaking change，會導致專案無法正常運作
- **建議**：在 `package.json` 中明確指定版本，例如 `"prisma": "^5.0.0"`

## Next.js 15 重要變更

### Params 非同步處理
在 Next.js 15 中，`params` 現在是 **Promise**（非同步），這是一個重大變更。

#### 前端頁面 (Page Component)
```typescript
// ❌ 錯誤寫法 (Next.js 14)
export default function Page({ params }: { params: { id: string } }) {
  const id = params.id;
  // ...
}

// ✅ 正確寫法 (Next.js 15)
import { use } from "react";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  // ...
}
```

#### 後端 API Route
```typescript
// ❌ 錯誤寫法 (Next.js 14)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const post = await prisma.post.findUnique({
    where: { id: params.id }
  });
}

// ✅ 正確寫法 (Next.js 15)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const post = await prisma.post.findUnique({
    where: { id: id }
  });
}
```

**注意事項**：
- 前端 Client Component 使用 `use(params)` 解構
- 後端 Server Component/API Route 使用 `await params` 解構
- 這個變更會影響所有動態路由 (`[id]`, `[slug]` 等)

## 登入系統

### 目前實作
- 使用 **NextAuth.js v4** 的 Credentials Provider
- 登入方式：單一環境變數密碼 (`ADMIN_PASSWORD`)
- 登入後會建立 JWT session
- 後台路由 (`/dashboard/*`) 受到 middleware 保護

### 安全考量
- 目前使用簡易的環境變數密碼登入，適合個人專案
- 未來如需增強安全性，可考慮：
  - 多使用者系統
  - OAuth 整合
  - 更複雜的密碼驗證機制

## 資料庫架構

### Prisma Schema
- 使用 SQLite 作為資料庫
- 主要 Model：`Post`
  - `id`: String (主鍵)
  - `title`: String
  - `slug`: String (唯一)
  - `content`: String
  - `published`: Boolean
  - `createdAt`: DateTime
  - `updatedAt`: DateTime

### 查詢注意事項
- 前台部落格只顯示 `published: true` 的文章
- 後台管理可以查看所有文章（包含草稿）
- 使用 `findFirst` 而非 `findUnique` 來查詢 slug（因為 slug 可能不是唯一索引）

## 常見問題

### 1. "Failed to fetch post" 錯誤
- **原因**：通常是 Next.js 15 params 非同步問題
- **解決**：確保使用 `use(params)` 或 `await params` 正確解構

### 2. Prisma 查詢錯誤
- **原因**：可能是 Prisma 版本不匹配
- **解決**：確認使用 Prisma v5，不要升級到 v7

### 3. 登入後無法訪問後台
- **原因**：可能是 middleware 設定問題
- **解決**：檢查 `src/middleware.ts` 的 matcher 設定

## 開發建議

1. **版本鎖定**：在 `package.json` 中明確指定關鍵套件版本
2. **環境變數**：確保 `.env` 檔案包含所有必要的環境變數
3. **資料庫遷移**：使用 `npx prisma migrate dev` 進行資料庫遷移
4. **開發工具**：使用 `npx prisma studio` 查看資料庫內容

## Markdown & Image System

### Markdown 渲染引擎
- 使用 **react-markdown** + **rehype-highlight** 進行 Markdown 渲染
- 支援 **remark-gfm** (GitHub Flavored Markdown)，包含表格、任務列表等進階語法
- 統一使用 `<MarkdownRenderer />` 組件處理前台與後台的顯示邏輯
- 程式碼高亮使用 **highlight.js**，樣式為 Atom One Dark

### 圖片上傳系統
- **API 路徑**：`/api/upload`
- **接收格式**：FormData，欄位名稱為 `file`
- **儲存位置**：`public/uploads` 資料夾
- **檔名處理**：使用 `Date.now() + originalName` 自動重新命名，避免檔名衝突
- **檔案驗證**：只允許圖片格式 (jpeg, jpg, png, gif, webp)
- **回傳格式**：`{ url: "/uploads/檔名.jpg" }`

### 編輯器功能
- **即時預覽**：使用 Shadcn UI 的 `Tabs` 組件，提供 "Write" 和 "Preview" 兩個標籤
- **圖片上傳**：編輯器中提供 "Upload Image" 按鈕，上傳後自動插入 Markdown 圖片語法
- **游標位置**：上傳圖片後自動插入到游標所在位置，並保持游標焦點

### 樣式系統
- 使用自定義 CSS 類別 `.prose` 來美化 Markdown 排版（因為 Tailwind CSS v4 不支援 `@tailwindcss/typography` 的標準引入方式）
- 支援深色模式 (`.dark .prose`)
- 程式碼區塊使用深色背景，並提供懸浮的複製按鈕

### 技術細節
- **Next.js 15 設定**：圖片上傳 API 使用標準的 API Route 寫法，無需特殊緩存設定
- **組件封裝**：`MarkdownRenderer` 為 Client Component，統一處理所有 Markdown 渲染邏輯
- **複製功能**：程式碼區塊右上角提供複製按鈕，使用 `navigator.clipboard` API

## 未來改進方向

- [ ] 加入文章分類/標籤功能
- [ ] 實作文章搜尋功能
- [ ] 實作更完善的錯誤處理
- [ ] 加入單元測試和整合測試
- [ ] 圖片上傳改為使用雲端儲存 (如 AWS S3, Cloudinary)
- [ ] 支援圖片壓縮和優化