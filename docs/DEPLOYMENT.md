# 部署指南 (Deployment Guide)

## 架構概覽

```
Internet
   ↓
Nginx Proxy Manager (主機: 80/443)
   ↓
Next.js App (Docker: localhost:3000)
   ↓
PostgreSQL + RustFS (Docker)
```

## 步驟 1: 安裝 Nginx Proxy Manager

### 方法 A: 使用 Docker Compose（推薦）

在主機上創建一個獨立的 `nginx-proxy-manager` 目錄：

```bash
mkdir -p ~/nginx-proxy-manager
cd ~/nginx-proxy-manager
```

創建 `docker-compose.yml`：

```yaml
version: '3.8'
services:
  nginx-proxy-manager:
    image: 'jc21/nginx-proxy-manager:latest'
    restart: unless-stopped
    ports:
      - '80:80'      # HTTP
      - '443:443'    # HTTPS
      - '81:81'      # Admin UI
    volumes:
      - ./data:/data
      - ./letsencrypt:/etc/letsencrypt
```

啟動 Nginx Proxy Manager：

```bash
docker compose up -d
```

### 方法 B: 使用 Docker 指令

```bash
docker run -d \
  --name nginx-proxy-manager \
  --restart unless-stopped \
  -p 80:80 \
  -p 443:443 \
  -p 81:81 \
  -v ~/nginx-proxy-manager/data:/data \
  -v ~/nginx-proxy-manager/letsencrypt:/etc/letsencrypt \
  jc21/nginx-proxy-manager:latest
```

## 步驟 2: 初始設定 Nginx Proxy Manager

1. **訪問管理介面**：
   - 打開瀏覽器：`http://你的VM-IP:81`
   - 或使用 Cloudflare Tunnel：`https://你的網域:81`

2. **預設登入資訊**：
   - Email: `admin@example.com`
   - Password: `changeme`
   - **首次登入後會要求修改密碼**

## 步驟 3: 配置反向代理

在 Nginx Proxy Manager 管理介面中：

1. 點擊 **"Proxy Hosts"** → **"Add Proxy Host"**

2. **Details 標籤**：
   - **Domain Names**: 輸入你的網域（例如：`benedicttiong.com`）
   - **Scheme**: `http`
   - **Forward Hostname / IP**: `localhost` 或 `127.0.0.1`
   - **Forward Port**: `3000`
   - ✅ **Block Common Exploits**
   - ✅ **Websockets Support**（如果需要）

3. **SSL 標籤**：
   - ✅ **SSL Certificate**: 選擇 **"Request a new SSL Certificate"**
   - ✅ **Force SSL**
   - ✅ **HTTP/2 Support**
   - ✅ **HSTS Enabled**
   - ✅ **HSTS Subdomains**
   - **Email Address for Let's Encrypt**: 輸入你的 Email

4. 點擊 **"Save"**

5. **等待 SSL 憑證申請**（通常需要 1-2 分鐘）

## 步驟 4: 確認 Next.js App 配置

確保 `docker-compose.yml` 中的 app 服務正確映射端口：

```yaml
app:
  ports:
    - "3000:3000"  # 只映射到 localhost，不暴露到外網
```

確保環境變數正確：

```yaml
environment:
  - NEXTAUTH_URL=https://benedicttiong.com  # 使用 HTTPS 網域
  - NEXT_PUBLIC_SITE_URL=https://benedicttiong.com
```

## 步驟 5: 啟動應用程式

```bash
cd ~/personal-website
docker compose up -d --build
```

## 步驟 6: 驗證部署

1. **檢查服務狀態**：
   ```bash
   docker compose ps
   ```

2. **檢查日誌**：
   ```bash
   docker compose logs app
   ```

3. **訪問網站**：
   - 打開瀏覽器訪問：`https://benedicttiong.com`
   - 應該能看到你的網站，並且有 SSL 憑證（綠色鎖頭）

## 進階配置

### 多個子網域

如果需要多個子網域（例如 `blog.benedicttiong.com`），在 Nginx Proxy Manager 中：

1. 創建新的 Proxy Host
2. 設定不同的 Domain Names
3. 都指向 `localhost:3000`（或不同的端口）

### 靜態資源快取

在 Nginx Proxy Manager 的 **Advanced** 標籤中，可以添加自定義 Nginx 配置：

```nginx
# 快取靜態資源
location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 限制後台訪問

如果你只想讓 `/dashboard` 路由只能從特定 IP 訪問，可以在 **Advanced** 標籤中添加：

```nginx
location /dashboard {
    allow 你的IP;
    deny all;
    proxy_pass http://localhost:3000;
}
```

## 故障排除

### 502 Bad Gateway

- 檢查 Next.js app 是否正常運行：`docker compose ps`
- 檢查 app 日誌：`docker compose logs app`
- 確認端口映射正確：`netstat -tlnp | grep 3000`

### SSL 憑證申請失敗

- 確認網域的 DNS 已正確指向你的 VM IP
- 確認 80 端口可以從外網訪問（Let's Encrypt 需要）
- 檢查防火牆設定

### 無法訪問管理介面 (81 端口)

- 確認防火牆允許 81 端口
- 或使用 Cloudflare Tunnel 訪問

## 安全建議

1. **修改 Nginx Proxy Manager 預設密碼**
2. **定期更新 Docker 映像**：
   ```bash
   docker compose pull
   docker compose up -d
   ```
3. **備份配置**：定期備份 `~/nginx-proxy-manager/data` 目錄
4. **監控日誌**：定期檢查 Nginx Proxy Manager 和應用程式的日誌
