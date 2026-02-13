# 可編輯網站內容 — 現況與後續

目標：**前端看得到的都能在後台編輯**，像 Google Sites 一樣直覺。

## 已可後台編輯

| 項目 | 後台位置 | 說明 |
|------|----------|------|
| **Site settings** | **Dashboard → Content → Site settings**（第一個卡片） | 以下全部在此頁 |
| 網站名稱、Logo、Favicon | Site settings → Branding & meta | 站名、Logo/Favicon 可貼 URL 或按「From Media」選圖 |
| Meta（分頁、SEO） | Site settings → Branding & meta | 預設 title、description、作者名 |
| **導覽列** | Site settings → Navigation | 項目順序（↑↓）、文字、連結；可新增/刪除 |
| **Footer** | Site settings → Footer links + Footer text | Email、GitHub、LinkedIn；Footer 文案（可改「All rights reserved」或第二行） |
| **OG 圖片** | Site settings → OG image | 社群分享用圖，可貼 URL 或「From Media」 |
| 首頁 | Content → Home | Hero 標題、副標、技能、CTA 按鈕 |
| Contact | Content → Contact | 表單上方說明文字 |
| About & CV | Content → About & CV | 大頭照、intro、學歷/經歷/專案、學校/公司 logo、CV PDF |
| 文章 | Posts / Notes | 標題、slug、內文、標籤、發布、置頂 |
| 媒體 | Media | 上傳圖片，文章內與 Site settings 的「From Media」 |
| **自訂頁面** | Content → Custom pages | 新增/編輯頁面（slug、標題、Markdown）；前台網址為 `/page/[slug]`，導覽可連結至此（如 /page/portfolio） |
| **版型** | Site settings → Branding & meta → Site template | 可選 Default、Minimal、Card，影響首頁與整體風格 |
| **首次設定** | Site settings 頂部橫幅 | 填好站名、Logo、導覽、Footer 後點「Mark setup as complete」；Dashboard 首頁會提示部署後必做 |

## 部署後必做

1. **Migrations**：容器啟動時會自動執行 `npx prisma migrate deploy`（見 Dockerfile CMD），不需手動跑。若未用 Docker，請在本機執行一次。
2. **第一次使用**：到 **Dashboard** 點「Start setup wizard」完成 Step 1～5（站名、Logo、導覽、Footer），或到 **Content → Site settings** 填寫後點「Mark setup as complete」。  
   Custom pages 說明（英文）：見 **docs/CUSTOM_PAGES.md**。

原則：**任何前端顯示的字或圖，都盡量有對應的後台欄位或「From Media」**，操作步驟越少越好。

### 媒體與儲存（統一在 S3 / RustFS）

| 來源 | 儲存位置 | 說明 |
|------|----------|------|
| **Media 頁、文章內圖片、Site settings（Logo / Favicon / OG）** | **S3** | `/api/upload` → `/api/media/serve/<檔名>` |
| **About 上傳（大頭照、學校/公司 logo 等）** | **S3** | `/api/about/upload` → 同上，key 前綴 `about-` |
| **CV PDF** | **S3** | `/api/cv/upload` → `/api/media/serve/cv.pdf`（固定 key，Media 列表不顯示） |

- **Clean unused images**：只刪 S3 中未引用檔；會檢查文章、SiteConfig、AboutConfig 內 `/api/media/serve/` 的網址，並永遠保留 `cv.pdf`。Logo / Favicon / OG / About 圖 / CV 不會被清掉。
- 舊的 About 圖片若仍是 `/api/about/serve/xxx`（本機 `public/about/`），仍可正常顯示；新上傳一律進 S3。

---

## 從零刻一個個人站（像 Google Sites）— 現在可以嗎？

**可以。** 不寫程式、只動後台，就能從零做出一個完整個人站：

| 步驟 | 在後台做什麼 | 對應位置 |
|------|--------------|----------|
| 1. 站名與品牌 | 站名、Logo、Favicon、瀏覽器標題、OG 圖 | Content → Site settings |
| 2. 導覽與 Footer | 導覽列項目（順序、文字、連結）、Footer 連結與文案 | Site settings → Navigation、Footer |
| 3. 首頁 | Hero 標題、副標、技能標籤、CTA 按鈕 | Content → Home |
| 4. 關於我 | 大頭照、簡介、學歷/經歷/專案、學校與公司 logo、CV PDF | Content → About & CV |
| 5. 聯絡 | 表單上方說明文字 | Content → Contact |
| 6. 部落格 | 新增/編輯文章、標籤、媒體 | Posts、Notes、Media、Tags |
| 7. 自訂頁面 | 新增頁面（如 Portfolio、Services） | Content → Custom pages；導覽連結填 `/page/slug` |

做完以上，前台就會是「你的」站：站名、導覽、首頁、關於、聯絡、部落格、自訂頁都可見且可改，不需改 code。

**目前還沒有、可之後補的：**

- **主題/顏色**：在後台選主色、字型或亮/暗主題（目前要改 code 或 Tailwind）。
