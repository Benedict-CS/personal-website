# Harbor Push 完整設定與排錯紀錄

本文件記錄從 GitHub Actions 建置 Docker 映像並 push 到 Harbor（harbor.ben.winlab.tw）時遇到的問題與解決步驟、所有用到的指令。

---

## 1. 問題與對應關係

| 錯誤現象 | 原因 | 解法 |
|----------|------|------|
| `403 Forbidden` on **POST** `/service/token` | Docker/buildx 用 POST 要 token，Harbor 或 Nginx 只接受 GET | CI 改用 **skopeo** 推送（用 GET 要 token） |
| `401 Unauthorized` on `/v2/` | 帳密錯誤或未帶認證 | 確認 `HARBOR_USERNAME` / `HARBOR_PASSWORD`，或改用 Member 帳號 |
| `requested access to the resource is denied`（blob upload） | Robot 在 UI 無法勾選 Push，或權限不足 | 改用 **Member 使用者**（例如 `ci-push`）並給 **Developer** 角色 |
| `connection reset by peer`（PATCH blob upload） | Registry 回傳 **http** 的 upload URL，走 port 80 被 proxy 斷線 | Harbor 主機上設定 registry **relativeurls: true**，重啟 registry |
| `/app/public not found`（Docker build） | 專案沒有 `public` 目錄 | Dockerfile 內用 `RUN mkdir -p /app/public` 與 runner 階段 `RUN mkdir -p ./public` |

**解決問題的關鍵**：  
- **CI 端**：用 skopeo + docker-archive 推送、用 Member 帳號、專案名與 `HARBOR_PROJECT` 一致。  
- **Harbor 端**：`external_url` 設為 https、registry 使用相對 URL（`relativeurls: true`）、Member 有 Developer 權限。

---

## 2. Harbor 專案與權限（網頁操作）

1. 登入 Harbor：`https://harbor.ben.winlab.tw`
2. **Projects** → 確認有專案 **personal-website**（與 workflow 的 `HARBOR_PROJECT` 一致）
3. **建立 CI 用使用者（Member）**
   - **Administration** → **Users** → **+ New User**
   - Username：`ci-push`（可自訂）
   - Password：設一組密碼（之後放 GitHub Secrets）
   - 儲存
4. **把使用者加入專案**
   - 進入專案 **personal-website** → **Members** → **+ USER**
   - 選擇剛建立的使用者（例如 `ci-push`）
   - Role：**Developer**（可 push）
   - 儲存

若 Robot 的 Push 在 UI 是灰色無法勾選，一律改用上述 Member 帳號推送。

---

## 3. Harbor 主機設定（解決 connection reset / http URL）

在 **Harbor 安裝所在主機**上執行。

### 3.1 檢查 registry 目前設定

```bash
# 查 registry 容器 ID（名稱含 registry 的那個）
sudo docker ps | grep registry

# 查看容器內 config（將 <REGISTRY_CONTAINER_ID> 換成實際 ID，例如 1debbf630cf6）
sudo docker exec <REGISTRY_CONTAINER_ID> cat /etc/registry/config.yml
```

### 3.2 在本機找 registry 設定檔

```bash
# 常見路徑（Harbor 安裝目錄，例如 ~/harbor）
ls ~/harbor/common/config/registry/
cat ~/harbor/common/config/registry/config.yml
```

若沒有，從 compose 查掛載路徑：

```bash
grep -A 10 registry ~/harbor/docker-compose.yml
```

### 3.3 讓 registry 回傳相對 URL（解決 http → connection reset）

編輯本機的 registry config（路徑依上一步）：

```bash
sudo nano ~/harbor/common/config/registry/config.yml
```

在 **http** 區塊加上（或合併進既有 `http:`）：

```yaml
http:
  relativeurls: true
```

存檔後重啟 registry：

```bash
cd ~/harbor
sudo docker compose restart registry
# 或舊版：
# sudo docker-compose restart registry
# 或直接用容器 ID：
# sudo docker restart <REGISTRY_CONTAINER_ID>
```

### 3.4 harbor.yml 對外網址（建議）

確保對外一律用 https：

```yaml
hostname: harbor.ben.winlab.tw
external_url: https://harbor.ben.winlab.tw
```

修改後重新產生設定並重啟：

```bash
cd ~/harbor
./prepare
sudo docker compose down && sudo docker compose up -d
```

### 3.5 若無法編輯本機 config（config 在容器內）

從容器匯出 → 本機編輯 → 複製回容器：

```bash
# 匯出
sudo docker exec <REGISTRY_CONTAINER_ID> cat /etc/registry/config.yml > /tmp/registry-config.yml

# 編輯（加上 relativeurls: true）
nano /tmp/registry-config.yml

# 複製回容器
sudo docker cp /tmp/registry-config.yml <REGISTRY_CONTAINER_ID>:/etc/registry/config.yml

# 重啟
sudo docker restart <REGISTRY_CONTAINER_ID>
```

---

## 4. NPM（Nginx Proxy Manager）建議設定

Harbor 前面若有 NPM，在該 Proxy Host 的進階／自訂 Nginx 可加上：

```nginx
client_max_body_size 0;
proxy_read_timeout 600s;
proxy_send_timeout 600s;
proxy_connect_timeout 600s;
```

存檔後重載 NPM。

---

## 5. GitHub Actions workflow 要點

- **登入**：`docker/login-action` 對 `HARBOR_HOST` 登入。
- **建映像**：`docker build`，再 `docker save ... -o image.tar`。
- **推送**：用 **skopeo** 從 tarball 推送，避免 Docker daemon API 版本問題與 POST token 403：
  - `skopeo copy --dest-creds "$USER:$PASS" "docker-archive:image.tar" "docker://$IMAGE"`

專案名必須與 Harbor 一致（例如 `HARBOR_PROJECT: personal-website`）。

### 5.1 使用 Secrets（建議）

不要將密碼寫在 workflow 裡，改用 GitHub Secrets：

- `HARBOR_HOST`：`harbor.ben.winlab.tw`
- `HARBOR_USERNAME`：例如 `ci-push`
- `HARBOR_PASSWORD`：該使用者的密碼
- `HARBOR_PROJECT`：`personal-website`

在 workflow 中改為：

```yaml
env:
  HARBOR_HOST: ${{ secrets.HARBOR_HOST }}
  HARBOR_USERNAME: ${{ secrets.HARBOR_USERNAME }}
  HARBOR_PASSWORD: ${{ secrets.HARBOR_PASSWORD }}
  HARBOR_PROJECT: ${{ secrets.HARBOR_PROJECT }}
```

（若未設 `HARBOR_PROJECT`，workflow 可預設為 `library`。）

---

## 6. 快速檢查清單

- [ ] Harbor 有專案 **personal-website**
- [ ] 有 Member 使用者（如 `ci-push`）且該使用者在專案內為 **Developer**
- [ ] `harbor.yml` 設 `external_url: https://harbor.ben.winlab.tw`
- [ ] Registry `config.yml` 有 `http: relativeurls: true` 並已重啟 registry
- [ ] NPM 逾時與 `client_max_body_size` 已放大（可選）
- [ ] GitHub Secrets 已設 `HARBOR_*`，workflow 使用 `secrets.HARBOR_*`
- [ ] Workflow 使用 skopeo 從 `docker-archive:image.tar` 推送

---

## 7. 測試 Harbor 上的 image 是否可用

在能連到 Harbor 的機器上（本機或伺服器）執行以下步驟，確認拉下來的 image 能正常跑。

### 7.1 拉取 image（Harbor 對 POST token 回 403 時請用 skopeo）

Docker 的 `docker pull` 會用 **POST** 向 Harbor 要 token，若你遇到 `403 Forbidden` on `/service/token`，請改用 **skopeo** 拉 image，再載入本機 Docker：

```bash
# 安裝 skopeo（若尚未安裝）
# Ubuntu/Debian:
sudo apt-get update && sudo apt-get install -y skopeo

# 用 skopeo 從 Harbor 拉 image 到本機（GET 要 token，不會 403）
# 替換 <USERNAME> <PASSWORD> 為你的 Harbor 帳密
skopeo copy --src-creds "<USERNAME>:<PASSWORD>" \
  docker://harbor.ben.winlab.tw/personal-website/personal-website:latest \
  docker-archive:personal-website.tar

# 載入到 Docker（之後就能 docker run）
sudo docker load -i personal-website.tar
```

載入後 image 名稱為 `harbor.ben.winlab.tw/personal-website/personal-website:latest`，可直接 `docker run`。

若你那邊 Harbor 已接受 POST token，也可用一般登入＋拉取：

```bash
docker login harbor.ben.winlab.tw -u <USERNAME> -p <PASSWORD>
docker pull harbor.ben.winlab.tw/personal-website/personal-website:latest
```

### 7.2 只驗證「能跑起來」（最小測試）

用一個**假的 DATABASE_URL** 只驗證容器會啟動、不立刻崩潰（migrate 會失敗沒關係，重點是 image 可執行）：

```bash
docker run --rm -p 3000:3000 \
  -e DATABASE_URL="postgresql://dummy:dummy@host.docker.internal:5432/dummy" \
  harbor.ben.winlab.tw/personal-website/personal-website:latest
```

若看到 Prisma migrate 報錯但 **node server.js 有啟動**，或 process 有跑一陣子才因 DB 錯誤退出，都算 image 本身是好的。按 `Ctrl+C` 結束。

### 7.3 完整可用的測試（有真實 DB 與 .env）

若有專案根目錄的 `.env`（含正確的 `DATABASE_URL`、`NEXTAUTH_*` 等），可掛入容器做完整測試：

```bash
cd /path/to/personal-website
docker run --rm -p 3000:3000 --env-file .env \
  harbor.ben.winlab.tw/personal-website/personal-website:latest
```

- 若 DB 在**本機**，容器內連不到 `localhost`，請把 `.env` 裡的 `DATABASE_URL` 改成用 `host.docker.internal`（Mac/Windows）或 host 的實際 IP（Linux）。
- 瀏覽器開 `http://localhost:3000`，能開首頁或登入頁即代表 image 可用。

### 7.4 檢查清單

- [ ] `docker pull` 成功
- [ ] `docker run` 後容器有啟動（不立刻 exit 1）
- [ ] 有真實 DB 時，可開 `http://localhost:3000` 並看到畫面

---

## 8. 在 website-backup 上完整跑一份（postgres + rustfs + app）

**新起一個 website（新環境、新 DB）**：只要起一次 stack 就好。App 的 Docker image 在啟動時會自動跑 `prisma migrate deploy`，所以**不用手動 migrate**；只要用的是從 Harbor 拉下來的 image（用 skopeo 載入），就會有 Prisma 所需檔案並自動建表。

若要在 backup VM 上跑完整 stack 做測試（不連到 website 的 DB），步驟如下。

### 8.1 準備 app image（因 403 無法 docker pull，用 skopeo）

```bash
skopeo copy --src-creds "USER:PASS" \
  docker://harbor.ben.winlab.tw/personal-website/personal-website:latest \
  docker-archive:personal-website.tar
sudo docker load -i personal-website.tar
```

載入後 image 名稱為 `harbor.ben.winlab.tw/personal-website/personal-website:latest`。**請用這個 image 跑 compose**（`docker-compose.backup.yml` 已指定此名稱），不要用舊的 `personal-website-app:latest`，否則會缺 Prisma wasm、無法自動 migrate。

### 8.2 複製 compose 與 .env 到 backup VM

在 backup 上建一個目錄，例如 `~/personal-website-backup`，放入：

- `docker-compose.backup.yml`（專案裡的 `docker-compose.backup.yml`）
- `.env`（從 website 複製或依 `.env.example` 填寫，**不需**填 DATABASE_URL 的 host，compose 會用 `postgres:5432`）

### 8.3 啟動

```bash
cd ~/personal-website-backup
sudo docker compose -f docker-compose.backup.yml up -d
```

- Postgres、RustFS、App 會一起起來；app 對外 port 為 **3001**（避免與 host 上 3000 衝突）。
- 開啟：`http://<backup 的 IP>:3001`

### 8.4 更新 app image 後重啟

重新用 skopeo 拉 image、`docker load`，再：

```bash
sudo docker tag harbor.ben.winlab.tw/personal-website/personal-website:latest personal-website-app:latest
sudo docker compose -f docker-compose.backup.yml up -d --force-recreate app
```

---

## 9. 參考

- Harbor 安裝目錄：`~/harbor`（依實際環境）
- Workflow：`.github/workflows/build-push-harbor.yml`
- 其他 CI/CD 說明：`docs/CI_CD_GUIDE.md`
