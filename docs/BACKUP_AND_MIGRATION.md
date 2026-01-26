# 備份與移機

## 一、備份（在目前 VM 執行）

備份內容：**資料庫**（posts、notes、about config）、**public/about** 圖片、**cv.pdf**、**RustFS** 文章圖片。

```bash
cd ~/personal-website
./backup-data.sh
```

**備份流程說明：**
1. 執行 `pg_dump` 產生 `backup.sql`（資料庫備份）
2. 複製 `public/about/` 和 `public/cv.pdf`
3. 複製 `rustfs-data/`（文章圖片）
4. 打包成 `backup-YYYYMMDD-HHMM.tar.gz`
5. 清理臨時目錄

**輸出檔案：**
- `backup-YYYYMMDD-HHMM.tar.gz` - 包含所有備份內容的壓縮檔

**注意：** 若出現 `Permission denied` 在清理暫存目錄時，可忽略；`tar.gz` 已正確產生。

---

## 二、移機到新 VM

### 事前準備

- 新 VM 已安裝 Docker、Docker Compose
- 可將 `backup-*.tar.gz` 傳到新 VM（scp、隨身碟等）

### 步驟

**1. 複製備份檔到新 VM**

例如用 scp：
```bash
scp backup-20260125-0631.tar.gz user@new-vm-ip:~/
```

**2. 在新 VM 上 clone 專案**

```bash
git clone https://github.com/Benedict-CS/personal-website.git
cd personal-website
```

**3. 解壓備份檔（檔名依實際為主）**

```bash
tar -xzvf ~/backup-20260125-0631.tar.gz
```

解壓後會產生 `backup-20260125-0631/` 目錄，裡面包含：
- `backup.sql` - 資料庫備份（由 `backup-data.sh` 自動產生）
- `public/about/` - About 頁面圖片
- `public/cv.pdf` - CV 檔案
- `rustfs-data/` - RustFS 文章圖片

**4. 還原 public/about、cv.pdf、rustfs-data**

```bash
cp -r backup-20260125-0631/public/about public/
cp backup-20260125-0631/public/cv.pdf public/
sudo cp -r backup-20260125-0631/rustfs-data ./
```

**5. 啟動服務**

```bash
sudo docker compose up -d
```

**6. 還原資料庫**

`backup.sql` 檔案已經包含在解壓後的目錄中，直接使用：

```bash
./restore-from-backup.sh backup-20260125-0631/backup.sql
```

**7. 重啟 app**

```bash
sudo docker compose restart app
```

**8. 新 VM 的 .env（避免登入後 520）**

在新 VM 專案目錄建立或修改 `.env`，讓 **NEXTAUTH_URL、NEXT_PUBLIC_SITE_URL** 等於你**實際用來連線的網址**：

- 若用 IP 測試：`http://新VM的IP:3000`
- 若已用 domain（NPM）指到新 VM：`https://benedict.winlab.tw`

範例（用 IP 時）：

```env
NEXTAUTH_URL=http://192.168.1.100:3000
NEXT_PUBLIC_SITE_URL=http://192.168.1.100:3000
ADMIN_PASSWORD=你的密碼
NEXTAUTH_SECRET=你的secret
```

其餘如 `POSTGRES_*`、`S3_*` 等可照舊 VM，或沿用 docker-compose 預設。修改後執行：

```bash
sudo docker compose up -d --force-recreate app
```

**9. 驗證**

- 用瀏覽器開你設的網址（IP 或 domain）
- 檢查首頁、Blog、About、Dashboard 登入
- 登入後應導回同一網址，不會再跳到錯誤的 domain 導致 520

---

## 三、Redirect 與 520 說明

登入後會導向 **NEXTAUTH_URL**。若新 VM 仍用舊的 `https://benedict.winlab.tw`，但 DNS 還指到別台或連不到，就會 520。

**作法**：在新 VM 的 `.env` 把 `NEXTAUTH_URL`、`NEXT_PUBLIC_SITE_URL` 改成你**實際連線的網址**（IP 或 domain），重啟 app 後再登入。

---

## 四、日常備份建議

重要變更前可隨時執行：

```bash
cd ~/personal-website
./backup-data.sh
```

再將 `backup-*.tar.gz` 複製到別台機器或雲端保存。
