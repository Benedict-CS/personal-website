# 修復 About 配置問題

## 問題
1. `/api/about/config` 返回 500 錯誤
2. 圖片無法顯示（400 Bad Request）

## 解決方案

### 1. 執行資料庫遷移

創建 `AboutConfig` 表：

```bash
./create-about-config-table.sh
```

或手動執行：

```bash
sudo docker compose exec -T postgres psql -U ben -d blog < prisma/migrations/20260125000000_add_about_config/migration.sql
```

### 2. 重新建置應用

```bash
./quick-build.sh
```

### 3. 檢查

1. 訪問 `/dashboard/about` 應該可以正常載入
2. 上傳圖片應該可以正常工作
3. 訪問 `/about` 應該可以正常顯示圖片

## 已修復的問題

1. ✅ 將 Next.js `Image` 組件改為 `<img>` 標籤，避免圖片優化問題
2. ✅ 改進錯誤處理，提供更詳細的錯誤訊息
3. ✅ 創建 migration 腳本方便執行
