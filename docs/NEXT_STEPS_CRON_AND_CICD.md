# 下一步：自動備份（3）＋ CI/CD（4）

## 一、3. 排好自動備份（在「跑網站的伺服器」上做）

全部在 **同一台跑 Docker 的機器**（例如 ben@website）上執行，用**會跑網站的那個使用者**（不要用 root）。

### Step 1：安裝並啟動 cron

```bash
sudo apt install -y cron
sudo systemctl enable cron
sudo systemctl start cron
```

### Step 2：讓自己能用 docker（不用 sudo）

```bash
sudo usermod -aG docker $USER
```

**登出再登入**（或重開機）後生效。之後可用 `groups` 確認有沒有 `docker`。

### Step 3：Git push 免密（cron 才會 push 成功）

- **建議：用 SSH key**
  - 若還沒有：`ssh-keygen -t ed25519 -C "your@email"`，然後把 `~/.ssh/id_ed25519.pub` 加到 GitHub → Settings → SSH and GPG keys。
  - 測試：`ssh -T git@github.com` 出現 "Hi xxx! You've successfully authenticated" 即可。
- 專案用 SSH  clone 或改 remote 為 SSH：
  ```bash
  cd /home/ben/personal-website
  git remote -v
  # 若是 https，可改為 SSH：
  # git remote set-url origin git@github.com:Benedict-CS/personal-website.git
  ```

### Step 4：建立 log 目錄

```bash
mkdir -p /home/ben/personal-website/logs
```

### Step 5：手動跑一次（確認備份 + push 會成功）

```bash
cd /home/ben/personal-website
./scripts/run-cron-jobs.sh --no-clean
```

- 若出現「pg_dump 失敗」：代表目前使用者還不能直接跑 `docker compose`，確認 Step 2 後登出再登入。
- 若出現「Git push failed」：代表 push 還要密碼或權限，確認 Step 3。

### Step 6：排程每天 0:00 跑

```bash
crontab -e
```

在編輯器裡**貼上**（路徑依你實際專案位置調整）：

```
PROJECT_DIR=/home/ben/personal-website

# 每日 0:00 備份 + git add/commit/push
0 0 * * * cd "$PROJECT_DIR" && ./scripts/run-cron-jobs.sh --no-clean >> "$PROJECT_DIR/logs/cron.log" 2>&1
```

存檔離開。之後每天凌晨會自動備份並 push 到 GitHub。

**看有沒有跑**：`tail -f /home/ben/personal-website/logs/cron.log`（當天 0:00 後才有新內容）。

---

## 二、4. CI/CD 要做什麼？（二選一）

你要的是：**程式碼一更新就自動建 Docker image、推到 Harbor、必要時自動/手動部署**。

### 情境 A：Harbor 從公網或 VPN 連得到（例如有固定 IP 或網域）

用 **GitHub Actions** 就好，不用自己架 Jenkins。

1. **在 GitHub 設 Secrets**  
   Repo → Settings → Secrets and variables → Actions → New repository secret，新增：
   - `HARBOR_HOST`：例如 `harbor.yourcompany.com`（不要加 `https://`）
   - `HARBOR_USERNAME`：Harbor 登入帳號
   - `HARBOR_PASSWORD`：密碼或 Robot Account token
   - （選填）`HARBOR_PROJECT`：專案名稱，例如 `library`

2. **啟用 workflow**  
   專案裡已有 `.github/workflows/build-push-harbor.yml`，push 到 `main`（或你設的 branch）就會：
   - 建 Docker image
   - push 到 Harbor：`HARBOR_HOST/HARBOR_PROJECT/personal-website:latest`（及 sha）

3. **部署端（內網）**  
   在跑服務的機器上，定期或手動：
   - `docker pull 你的HarbOR_HOST/專案/personal-website:latest`
   - 再重啟容器（例如用你的 `docker compose up -d` 或 K8s 更新 image）。

詳細可看：`docs/CI_CD_GUIDE.md` 的「方案 A」。

---

### 情境 B：Harbor 只在內網，或想練 Jenkins

用 **Jenkins + Harbor**，全部在內網完成 build 與 push。

1. **準備一台 VM（或實機）**  
   可同一台跑：Harbor + Jenkins（練習用）；或 Harbor 一台、Jenkins 一台。

2. **裝 Harbor**  
   - 照官方：<https://goharbor.io/docs/2.10/install-config/>  
   - 建一個專案（例如 `library`），並建一個 Robot Account（或一般帳號）給 Jenkins 用。

3. **裝 Jenkins**  
   - 安裝 Jenkins，裝外掛：Docker Pipeline、Git 等。  
   - 新增一個 **Pipeline** job，Pipeline script 可參考 `docs/CI_CD_GUIDE.md` 裡的「九、Jenkins Pipeline 範例」（建 image、push 到 Harbor）。  
   - 在 Job 裡設 **Build Triggers**：  
     - 勾選「GitHub hook trigger for GITScm polling」或「Trigger builds remotely」，並在 GitHub repo 的 Settings → Webhooks 填 Jenkins 的 webhook URL。

4. **觸發方式**  
   - push 到 GitHub → GitHub 打 webhook → Jenkins 建 image → push 到 Harbor。  
   - 部署端再從 Harbor pull 新 image 並重啟服務（手動或另寫腳本）。

詳細可看：`docs/CI_CD_GUIDE.md` 的「方案 B」與「九、Jenkins Pipeline 範例」。

---

## 總結

| 項目 | 要做的事 |
|------|----------|
| **3. 自動備份** | 在網站伺服器上：裝 cron、加 docker 群組、設 Git SSH、手動跑一次 `run-cron-jobs.sh --no-clean`、`crontab -e` 加每天 0:00。 |
| **4. CI/CD** | **A**：Harbor 可從外網連 → 在 GitHub 設 Harbor secrets，用現成 `build-push-harbor.yml`；**B**：Harbor 只內網 → 架 Jenkins + Harbor，用 doc 裡的 Pipeline 範例 + webhook。 |

先完成 3，再依你環境選 4 的 A 或 B 做即可。
