# 建置指南 (Build Guide)

## 建置方式選擇

### 🚀 快速建置 (Quick Build) - 用於小修改

**適用情況**：
- 修改前端樣式、文字
- 修改組件邏輯
- 修改 API 路由邏輯
- 其他不需要重新安裝依賴的小修改

**執行方式**：
```bash
./scripts/quick-build.sh
```

**優點**：
- ⚡ 速度快（使用快取）
- 🔄 只重啟 app 容器，其他服務繼續運行
- 💾 保留資料庫和 RustFS 資料

**時間**：約 1-3 分鐘

---

### 🧹 乾淨建置 (Clean Build) - 用於重大變更

**適用情況**：
- 修改 `package.json`（新增/移除依賴）
- 修改 `Dockerfile`
- 修改 `docker-compose.yml`
- 修改 Prisma schema
- 遇到奇怪的建置錯誤
- 第一次部署

**執行方式**：
```bash
./scripts/clean-build.sh
```

**優點**：
- 🎯 完全乾淨，無快取
- ✅ 確保所有變更都生效
- 🔍 排除快取導致的問題

**時間**：約 5-10 分鐘

---

## 常見問題

### Q: 修改後看不到變化？

**A**: 可能是快取問題，嘗試：
1. 先執行快速建置：`./scripts/quick-build.sh`
2. 如果還是不行，執行乾淨建置：`./scripts/clean-build.sh`
3. 清除瀏覽器快取（Ctrl+Shift+R 或 Cmd+Shift+R）

### Q: CV 上傳失敗，顯示權限錯誤？

**A**: 
1. 檢查 `./public` 目錄權限：`ls -la ./public`
2. 確保目錄可寫入：`chmod 777 ./public`
3. 重新建置：`./scripts/quick-build.sh`
4. 檢查容器日誌：`sudo docker compose logs app | grep -i cv`

### Q: 登入頁面還是 dark mode？

**A**: 
1. 確認已修改 `src/app/auth/signin/page.tsx` 和 `src/app/auth/layout.tsx`
2. 執行快速建置：`./scripts/quick-build.sh`
3. 清除瀏覽器快取

### Q: 資料庫連線錯誤？

**A**: 
1. 檢查 PostgreSQL 容器是否運行：`sudo docker compose ps`
2. 檢查資料庫是否初始化：`sudo docker compose exec app npx prisma migrate status`
3. 如果未初始化，執行：`sudo docker compose exec app npx prisma migrate deploy`

---

## 快速參考

```bash
# 快速建置（小修改）
./scripts/quick-build.sh

# 乾淨建置（重大變更）
./scripts/clean-build.sh

# 查看日誌
sudo docker compose logs -f app

# 檢查狀態
sudo docker compose ps

# 重啟單一服務
sudo docker compose restart app
```
