# CI/CD 與內網部署指南

本專案已具備 **CI**（GitHub Actions 建置 + 測試），若要做到 **CD**（自動建 Docker 映像、推到 Harbor、觸發內網部署），可以依下面幾種方式選一種來練技術。

---

## 一、你現在有什麼

| 項目 | 狀態 |
|------|------|
| **CI** | 已有 `.github/workflows/ci.yml`：PR 到 `test` 或手動觸發 → build + lint |
| **Docker** | 有 `docker-compose.example.yml`，app 使用 `Dockerfile` 建置 |
| **部署目標** | 內網（Harbor、實際跑服務的環境在內網） |

所以：**可以做 CI/CD**，而且很適合用 **Docker image 推到 Harbor** 當作 CD 的一環。

---

## 二、整體流程可以怎麼設計

```
程式碼變更 (push/PR)
    ↓
CI：build、lint、測試
    ↓
CD：建 Docker image → push 到 Harbor
    ↓
內網：從 Harbor 拉 image，更新服務（K8s / docker-compose / 自訂腳本）
```

「觸發 CD」有兩種常見做法：

1. **GitHub Actions 直接推 Harbor**  
   - 條件：GitHub 要能連到你的 Harbor（Harbor 有公網或 VPN/跳板）。
2. **內網自己觸發**  
   - 例如：Jenkins / GitLab Runner / 自建 runner 在內網，用 **webhook** 或 **輪詢** 知道「有新版」再建 image、推 Harbor、部署。

你問的「用 Jenkins + webhook 觸發 CD」就是第 2 種的經典做法。

---

## 三、方案 A：GitHub Actions → 直接推 Docker 到 Harbor（最省事）

**適合**：Harbor 能被 GitHub 連到（有公網或透過 self-hosted runner 在內網）。

- **CI**：沿用現有 `ci.yml`（或同一個 workflow 裡先跑 build）。
- **CD**：同一個或另一個 workflow：
  - 建 Docker image
  - 登入 Harbor
  - `docker push` 到 Harbor 指定專案

**優點**：不用多一台 Jenkins，設定簡單。  
**缺點**：Harbor 若純內網、GitHub 連不到，就要用下面的方案 B。

Harbor 登入通常用：
- **Username + Password**，或
- **Robot Account**（Harbor 專案裡建 Robot，權限只給 push）。

範例 workflow 已放在：`.github/workflows/build-push-harbor.yml`（見下方說明）。

---

## 四、方案 B：內網 CI/CD（Jenkins / GitLab CE / Gitea + Drone）

**適合**：程式碼在內網、或 Harbor 只有內網，希望「全部在內網完成 CI/CD」。

### 1. 用 Jenkins（你提到的）

- **觸發 CD**：用 **webhook**。
  - Git 伺服器（GitHub / GitLab / Gitea）推送到某個 branch 時，打 Jenkins 的 webhook URL。
  - Jenkins 收到後執行 job：拉程式碼 → 建 Docker image → 推 Harbor → 可再觸發部署（例如呼叫 K8s 或跑腳本）。
- **練習重點**：Pipeline、憑證管理、Harbor 登入、shell/docker 指令。

### 2. 用 GitLab CE（All-in-one）

- Git 倉庫 + CI/CD 都在 GitLab。
- **GitLab Runner** 裝在內網（同一台 VM 或另一台），跑 `docker build`、`docker push` 到 Harbor。
- 觸發方式：push/merge 就觸發 pipeline，不需額外 webhook。
- **練習重點**：`.gitlab-ci.yml`、Runner 註冊、Harbor 登入、Docker-in-Docker 或 Kaniko。

### 3. Gitea + Drone / Woodpecker（輕量）

- Gitea 當 Git，Drone/Woodpecker 當 CI/CD，用 webhook 串接。
- Runner 在內網建 image、推 Harbor。
- **練習重點**：webhook、pipeline 寫法、Harbor 整合。

---

## 五、Harbor 與 Jenkins 要開新 VM 嗎？

可以，而且很適合拿來練技術：

| 做法 | 說明 |
|------|------|
| **一機多服** | 一台 VM 跑：Harbor + Jenkins（或 GitLab）。資源需求較低，適合練習。 |
| **分開** | 一台 VM 只跑 Harbor，一台只跑 Jenkins（或 GitLab）。更接近生產架構，方便之後擴充。 |

**建議**：  
- 先 **一機**：Harbor + Jenkins（或 GitLab CE），練熟流程。  
- 之後再視需要拆成兩台（Harbor 一台、CI 一台）。

**Open source 工具建議**（都開源、可自建）：

- **Harbor**：私有 Docker Registry，業界常用，和你目標一致。  
- **Jenkins**：經典 CI/CD，外掛多、webhook 好接。  
- **GitLab CE**：若想一次練 Git + CI/CD，可替代 Jenkins。  
- **Gitea**：輕量 Git，配 Drone 很適合內網小團隊。

---

## 六、內網「觸發 CD」的幾種方式

1. **Webhook（推薦）**  
   - Git 伺服器（GitHub / GitLab / Gitea）在 push 時呼叫 Jenkins（或 Drone）的 webhook。  
   - Jenkins 收到後跑「建 image → 推 Harbor」的 job。  
   - 若程式碼在 **外網 GitHub**、Jenkins 在 **內網**：需要內網能出網拉程式碼，或改用「輪詢 / 自建 runner 在外網」等變形。

2. **輪詢**  
   - Jenkins 定期檢查 Git 某 branch 是否有新 commit，有就跑 job。  
   - 不需 webhook，但即時性較差。

3. **Self-hosted GitHub Runner 在內網**  
   - 在內網裝 GitHub Actions Runner，跑 workflow 時在內網建 image、推 Harbor。  
   - 觸發仍是「push/PR」，但 build/push 發生在內網，Harbor 不需對公網開放。

4. **手動觸發**  
   - 在 Jenkins/GitLab 上按「Build」或「Run pipeline」，適合先練熟流程再自動化。

---

## 七、本專案已提供的檔案

- **`.github/workflows/ci.yml`**  
  - 現有 CI：PR 到 `test` 或手動觸發 → `npm ci`、`prisma generate`、lint、build。

- **`.github/workflows/build-push-harbor.yml`**（見下一段）  
  - 範例：建 Docker image、推到 Harbor。  
  - 你要在 GitHub 設好 secrets：`HARBOR_HOST`、`HARBOR_USERNAME`、`HARBOR_PASSWORD`（或改用 Robot token）。  
  - 若 Harbor 在內網、GitHub 連不到，可把這份 workflow 的邏輯改到 **Jenkins pipeline** 或 **GitLab CI** 裡用。

---

## 八、總結建議（想練技術時）

1. **可以做 CI/CD**：CI 已有，CD 就是「建 image → 推 Harbor → 內網拉 image 部署」。  
2. **Docker image 丟到 Harbor**：完全可以，且是常見做法。  
3. **觸發 CD**：  
   - 若 GitHub 能連 Harbor → 用 **GitHub Actions** 建 image 推 Harbor 最簡單。  
   - 若全部要在內網 → 用 **Jenkins + webhook**（或 GitLab CE）在內網建 image、推 Harbor。  
4. **Open source**：Harbor + Jenkins（或 GitLab CE）都開源，建議開 **1 台 VM** 先跑 Harbor + Jenkins，練熟再考慮拆成 2 台。  
5. **練習順序**：  
   - 先在本機或 VM 用 `docker build` / `docker-compose` 建出 image、手動推 Harbor。  
   - 再接上 GitHub Actions 或 Jenkins pipeline，自動建、自動推。  
   - 最後再加「從 Harbor 拉 image 更新服務」的步驟（K8s / compose / 腳本），就完成一條完整 CI/CD。

---

## 九、Jenkins Pipeline 範例（內網建 image 推 Harbor）

若你用 Jenkins 在內網跑 CD（例如 GitHub 只觸發 webhook，實際 build 在 Jenkins），可用下面 **Declarative Pipeline** 做「建 image → 推 Harbor」：

```groovy
pipeline {
  agent any
  environment {
    HARBOR_HOST   = 'harbor.yourcompany.com'   // 改成你的 Harbor
    HARBOR_PROJECT = 'library'                  // 或你的專案名
    IMAGE_NAME    = 'personal-website'
  }
  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }
    stage('Build & Push') {
      steps {
        script {
          docker.withRegistry("https://${env.HARBOR_HOST}", 'harbor-credentials') {
            def img = docker.build("${env.HARBOR_HOST}/${env.HARBOR_PROJECT}/${env.IMAGE_NAME}:${env.BUILD_NUMBER}")
            img.push()
            img.push('latest')
          }
        }
      }
    }
  }
}
```

在 Jenkins 裡：

1. **Manage Jenkins → Credentials** 新增 Kind「Username with password」：ID 設為 `harbor-credentials`，帳密為 Harbor 使用者或 Robot Account。
2. **Job → Build Triggers** 勾選「GitHub hook trigger for GITScm polling」或「Trigger builds remotely」給 webhook token，再在 GitHub 倉庫 **Settings → Webhooks** 填：
   - URL: `https://你的Jenkins/jenkins/github-webhook/` 或 `https://你的Jenkins/generic-webhook-trigger/`
   - 依你用的 trigger 選對應事件（如 push）。

這樣 push 到指定 branch 就會觸發 Jenkins 建 image 並推到 Harbor。
