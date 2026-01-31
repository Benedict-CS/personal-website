# Dashboard / Blog / Notes UX 功能驗證清單

> 如何驗證後台與編輯／閱讀相關的 UX 功能。

---

## 一、如何跑起來

1. **開發環境**
   ```bash
   npm run dev
   ```
   瀏覽器開：`http://localhost:3000`

2. **登入後台**
   - 點 Navbar 的登入或前往 `/auth/signin`
   - 登入後可進 `/dashboard/posts`、`/dashboard/notes` 等

3. **確認 Footer**
   - 進任一 dashboard 頁（例如 `/dashboard/posts`）
   - 視窗不要拉太高，內容少一點
   - 確認頁面最下方有 **Footer**（RSS、©、連結等），且不會被側欄或 nav 蓋住、也不會被「改掉」

---

## 二、Posts 列表篩選

| 步驟 | 預期 |
|------|------|
| 打開 `/dashboard/posts` | 看到「All」「Published」「Draft」三個 Tab |
| 點「Published」 | 只顯示已發布文章，網址為 `?status=published` |
| 點「Draft」 | 只顯示草稿，網址為 `?status=draft` |
| 點「All」 | 顯示全部，`?status` 消失或為 all |

---

## 三、編輯頁：存檔與選項

| 步驟 | 預期 |
|------|------|
| 進任一文章編輯 `/dashboard/posts/[id]` | 可編輯表單、有「Stay on page after save」勾選（預設勾選） |
| 改標題或內容後按 **Ctrl+S**（Mac：Cmd+S） | 會送出表單、顯示「Saved」，且**不跳轉**（勾選留頁時） |
| 取消「Stay on page after save」後再按存檔 | 存檔成功後**跳回** `/dashboard/posts` |
| 改內容後點「Update Post」 | 行為同上（依勾選決定留頁或回列表） |

---

## 四、編輯頁：未存檔提示

| 步驟 | 預期 |
|------|------|
| 在編輯頁改任意欄位 | 標題旁出現「Unsaved changes」 |
| 存檔成功 | 「Unsaved changes」消失，短暫顯示「Saved」 |
| 有未存檔時按「Cancel」 | 跳出「You have unsaved changes. Leave anyway?」，確認才離開 |
| 有未存檔時關閉分頁或重新整理 | 瀏覽器出現「確定要離開？」之類提示 |

---

## 五、編輯頁：自動儲存

| 步驟 | 預期 |
|------|------|
| 只改「Content」區塊、不按存檔 | 約 5 秒後自動送出（只送 content） |
| 自動送出成功 | 短暫顯示「Draft saved」 |
| 再改內容 | 再等約 5 秒會再自動存一次 |

---

## 六、編輯頁：專心模式（Focus）

| 步驟 | 預期 |
|------|------|
| 在編輯頁點「Focus」 | 只留下標題、Slug、Content、上傳圖片、Delete／Cancel／Update |
| Description、Tags、日期、分類、Publish/Pin、Stay on page 等 | 全部隱藏 |
| 再點「Exit focus」 | 上述欄位與勾選全部恢復顯示 |

---

## 七、編輯頁：預覽

| 步驟 | 預期 |
|------|------|
| 已發布文章點「Preview」 | 新分頁開 `/blog/[slug]` |
| 草稿文章點「Preview」 | 新分頁開 `/dashboard/notes/[slug]` |

---

## 八、Notes 閱讀：ToC、進度、鍵盤

| 步驟 | 預期 |
|------|------|
| 打開任一筆記 `/dashboard/notes/[slug]` | 頂部有閱讀進度條、右側有目錄（ToC） |
| 筆記有 H2/H3 | ToC 可點、會捲動到對應標題 |
| 同分類有上一篇/下一篇時按 **←** | 跳到上一篇筆記 |
| 按 **→** | 跳到下一篇筆記 |
| 游標在輸入框時按 ← / → | **不**觸發跳轉（避免干擾輸入） |

---

## 九、Blog 閱讀：鍵盤

| 步驟 | 預期 |
|------|------|
| 打開任一文章 `/blog/[slug]`，有上一篇/下一篇 | **←** 上一篇、**→** 下一篇 |
| 游標在 input/textarea 時 | ← / → 不觸發跳轉 |

---

## 十、列印樣式

| 步驟 | 預期 |
|------|------|
| 在文章頁或筆記頁按 **Ctrl+P**（Mac：Cmd+P）預覽列印 | 頂部進度條、Navbar、側欄 ToC、Footer 等不出現在預覽中 |
| 預覽內容 | 主要只剩標題與內文，適合列印或存 PDF |

---

## 十一、Dashboard 側欄當前頁

| 步驟 | 預期 |
|------|------|
| 在 `/dashboard/posts` | 側欄「Posts」較深色／粗體 |
| 在 `/dashboard/notes` | 「Notes」高亮 |
| 在 `/dashboard/posts/xxx` 編輯頁 | 「Posts」仍高亮（路徑以 `/dashboard/posts` 開頭） |

---

## 十二、Footer 與 Dashboard 佈局（本次修正）

| 步驟 | 預期 |
|------|------|
| 在任一 dashboard 頁、視窗高度一般 | 若內容不多，Footer 應在**視窗底部**出現（RSS、© 等） |
| 內容很長時捲動到底 | Footer 在**整頁最下方**，不被側欄覆蓋、不被「改掉」 |
| 側欄 | 固定在左側，不覆蓋 Footer 區域 |

若以上都符合，代表「dashboard nav bar 把 footer 改掉」的問題已排除，且各項 UX 功能可依此清單驗證。
