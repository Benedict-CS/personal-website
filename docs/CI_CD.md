# CI/CD 說明

## 目前有的流程

| 流程 | 觸發時機 | 做的事 |
|------|----------|--------|
| **CI** (`.github/workflows/ci.yml`) | PR 到 main、或手動觸發 | 檢查程式可否建置（npm ci、prisma generate、lint、build） |
| **CD** (`.github/workflows/deploy.yml`) | **push 到 main**、或手動觸發 | 先跑建置，通過後 SSH 到伺服器執行 `scripts/manual-deploy.sh` |

也就是說：**有 domain（例如 benedict.winlab.tw）並有一台可 SSH 的 VM 就可以做 CI/CD**。  
push 到 `main` 後會自動部署到該台機器，不需登入伺服器手動跑腳本。

---

## CD 前置條件

1. **伺服器**：benedict.winlab.tw 指到的那台 VM（或你實際部署的機器）。
2. **伺服器上已有 repo**：例如 `git clone ... ~/personal-website`，且該目錄可執行 `./scripts/manual-deploy.sh`。腳本內使用 `sudo docker compose`，所以 `DEPLOY_USER` 須能免密碼執行 sudo（或改為將使用者加入 docker 群組並改腳本不用 sudo）。
3. **GitHub Secrets**：在 repo 設定裡加入以下 Secrets，CD 才會成功。

---

## 要設定的 GitHub Secrets

到 **GitHub repo → Settings → Secrets and variables → Actions**，新增：

| Secret 名稱 | 必填 | 說明 |
|-------------|------|------|
| `DEPLOY_HOST` | ✅ | 部署目標主機，例如 `benedict.winlab.tw` 或**對外可連的 public IP**（**不可用 private IP**，GitHub 雲端連不到） |
| `DEPLOY_USER` | ✅ | SSH 登入的使用者名稱（例如 `ubuntu`、`deploy`） |
| `SSH_PRIVATE_KEY` | ✅ | 用來登入上述使用者的 **私鑰完整內容**（含 `-----BEGIN ... KEY-----` 與 `-----END ... KEY-----`） |
| `DEPLOY_PATH` | 選填 | 專案在伺服器上的路徑；不設則用 `~/personal-website` |

### SSH 金鑰設定方式

1. 在本機產生一組專給 deploy 用的金鑰（不要用日常用的）：
   ```bash
   ssh-keygen -t ed25519 -C "github-deploy" -f ~/.ssh/deploy_benedict -N ""
   ```
2. **公鑰**放到伺服器：  
   `~/.ssh/deploy_benedict.pub` 的內容貼到伺服器上 `DEPLOY_USER` 的 `~/.ssh/authorized_keys`。
3. **私鑰**放到 GitHub：  
   把 `~/.ssh/deploy_benedict` 的**整個檔案內容**（含第一行、最後一行）貼到 GitHub Secret `SSH_PRIVATE_KEY`。

這樣 GitHub Actions 就能用這把金鑰 SSH 到你的 VM 執行部署。

---

## 部署時實際在伺服器上做的事

CD 觸發後會 SSH 到 `DEPLOY_HOST`，以 `DEPLOY_USER` 身分執行：

```bash
cd "${DEPLOY_PATH:-$HOME/personal-website}"
CI=1 ./scripts/manual-deploy.sh
```

`CI=1` 會讓 `manual-deploy.sh` 以非互動模式跑：  
`git fetch origin main` → `git reset --hard origin/main` → `docker compose build` → `prisma migrate deploy` → 重啟 app。  
所以你只要 **push 到 main**，就會自動更新 benedict.winlab.tw 上的站。

---

## 若機器只有 private IP（例如 10.x、192.168.x）

GitHub Actions 跑在 GitHub 的雲端，**無法連到你的 private IP**，所以 `DEPLOY_HOST` 填 private IP 會失敗。

可改為使用 **Self-hosted runner**：

1. 在那台 VM（或同網段內可 SSH 到該 VM 的機器）上安裝 [GitHub Actions self-hosted runner](https://docs.github.com/en/actions/guides/adding-self-hosted-runners)。
2. 把 `.github/workflows/deploy.yml` 的 `deploy` job 改為在該 runner 上執行（`runs-on: self-hosted` 或你設的 label），在 job 裡直接執行 `./scripts/manual-deploy.sh`（或 `ssh user@private-ip 'cd ... && CI=1 ./scripts/manual-deploy.sh'`），不要用 `appleboy/ssh-action` 從雲端連線。

這樣部署邏輯在你自己網路內跑，就能用 private IP 或 localhost。

---

## 若暫時不想用 CD

- 不要設定上述 Secrets，或刪掉 `.github/workflows/deploy.yml`，就不會有自動部署。
- 部署方式維持不變：SSH 登入伺服器，在專案目錄執行 `./scripts/manual-deploy.sh` 即可。

---

## 小結

- **CI**：已有，用來確認程式能 build。  
- **CD**：已加好 workflow，只要在 GitHub 設好 `DEPLOY_HOST`、`DEPLOY_USER`、`SSH_PRIVATE_KEY`（以及需要的話 `DEPLOY_PATH`），push 到 main 就會自動部署到 benedict.winlab.tw 那台機器，不難設定。
