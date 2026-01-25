# 備份與移機

## 一、備份（在目前 VM 執行）

備份內容：**資料庫**（posts、notes、about config）、**public/about** 圖片、**cv.pdf**、**RustFS** 文章圖片。

```bash
cd ~/personal-website
./backup-data.sh
```

會產生 `backup-YYYYMMDD-HHMM.tar.gz`。請妥善保存此檔案。

若出現 `Permission denied` 在清理暫存目錄時，可忽略；`tar.gz` 已正確產生。

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

```bash
./restore-from-backup.sh backup-20260125-0631/backup.sql
```

**7. 重啟 app**

```bash
sudo docker compose restart app
```

**8. 驗證**

- 用瀏覽器開 `http://新VM的IP:3000`（或透過 NPM 的網址）
- 檢查首頁、Blog、About、Dashboard 登入是否正常
- 登入後應導回**同一網址**（你用來連線的那個），不會再跳到 domain 導致 520

---

## 三、Redirect 修正說明

登入後改為依**實際連線的 baseUrl** 做導向，不再強制用 `NEXTAUTH_URL`。

- 用 IP 連（例如 `http://192.168.1.100:3000`）登入 → 導回同 IP
- 用 domain 連（例如 `https://benedict.winlab.tw`）登入 → 導回同 domain

因此在新 VM 先以 IP 測試、或 DNS 尚未指到新 VM 時，不會再因導向 domain 出現 520。

---

## 四、日常備份建議

重要變更前可隨時執行：

```bash
cd ~/personal-website
./backup-data.sh
```

再將 `backup-*.tar.gz` 複製到別台機器或雲端保存。
