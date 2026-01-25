# 文件目錄 (Documentation)

本目錄包含專案的完整文件。

## 📚 文件列表

### 🚀 [SETUP.md](./SETUP.md) - 完整部署指南
**從零開始的完整部署流程**

- 前置需求
- 克隆專案
- 環境變數設定
- 啟動服務
- 初始化資料庫
- 驗證部署
- 故障排除

**適合**：第一次部署、新伺服器設定

---

### 🌐 [DEPLOYMENT.md](./DEPLOYMENT.md) - 生產環境部署
**Nginx Proxy Manager 設定與 SSL 配置**

- 安裝 Nginx Proxy Manager
- 設定反向代理
- 申請 SSL 憑證
- 進階配置

**適合**：需要網域和 HTTPS 的生產環境

---

### 💾 [DATA_MANAGEMENT.md](./DATA_MANAGEMENT.md) - 資料管理與搬家
**資料備份、還原、遷移完整指南**

- 資料儲存位置
- 備份方法
- 遷移到其他伺服器
- PostgreSQL 單獨搬家
- RustFS 單獨搬家
- 驗證搬家成功

**適合**：資料備份、伺服器遷移、災難恢復

---

### 🛠️ [DEV_NOTES.md](./DEV_NOTES.md) - 開發筆記
**技術決策與開發注意事項**

- Prisma 版本鎖定
- Next.js 15 重要變更
- 登入系統實作
- 常見問題

**適合**：開發者、維護者

---

### 🔄 [MINIO_ALTERNATIVES.md](./MINIO_ALTERNATIVES.md) - 物件儲存方案
**物件儲存方案比較與遷移指南**

- MinIO 維護模式說明
- 替代方案評估（RustFS、Alarik、Garage、SeaweedFS 等）
- 遷移步驟與經驗
- 最終選擇 RustFS 的原因

**適合**：需要了解物件儲存選項和遷移過程的開發者

---

## 📖 根目錄文件

### [../README.md](../README.md) - 專案總覽
專案簡介、技術架構、快速開始

### [../BUILD_GUIDE.md](../BUILD_GUIDE.md) - 建置指南
建置方式選擇、故障排除

---

## 🎯 快速導航

**我想...**

- **第一次部署** → [SETUP.md](./SETUP.md)
- **設定網域和 SSL** → [DEPLOYMENT.md](./DEPLOYMENT.md)
- **備份或搬家資料** → [DATA_MANAGEMENT.md](./DATA_MANAGEMENT.md)
- **了解技術細節** → [DEV_NOTES.md](./DEV_NOTES.md)
- **物件儲存方案** → [MINIO_ALTERNATIVES.md](./MINIO_ALTERNATIVES.md)
- **快速建置** → [../BUILD_GUIDE.md](../BUILD_GUIDE.md)
