#!/bin/bash

# RustFS 初始化腳本
# 設置目錄權限並啟動服務

set -e

echo "🚀 初始化 RustFS..."
echo ""

# 1. 創建數據和日誌目錄
echo "1️⃣ 創建數據和日誌目錄..."
mkdir -p ./rustfs-data ./rustfs-logs
echo "✅ 目錄已創建"
echo ""

# 2. 設置目錄權限（RustFS 使用 UID 10001）
echo "2️⃣ 設置目錄權限（UID 10001）..."
sudo chown -R 10001:10001 ./rustfs-data ./rustfs-logs 2>/dev/null || {
    echo "⚠️  無法設置權限（可能需要 sudo）"
    echo "   請手動執行：sudo chown -R 10001:10001 ./rustfs-data ./rustfs-logs"
}
echo ""

# 3. 啟動服務
echo "3️⃣ 啟動 RustFS 服務..."
sudo docker compose up -d rustfs
echo ""

# 4. 等待服務就緒
echo "4️⃣ 等待 RustFS 服務就緒..."
sleep 10

# 5. 檢查服務狀態
echo "5️⃣ 檢查服務狀態..."
if docker ps | grep -q "personal-website-rustfs"; then
    echo "✅ RustFS 服務正在運行"
    echo ""
    echo "📝 訪問資訊："
    echo "   - Console: http://localhost:9001"
    echo "   - 預設帳號: rustfsadmin"
    echo "   - 預設密碼: rustfsadmin"
    echo "   - S3 API: http://localhost:9000"
    echo ""
    echo "💡 下一步："
    echo "   1. 訪問 Console 建立 'uploads' bucket"
    echo "   2. 或等待應用程式自動建立（第一次上傳時）"
else
    echo "❌ RustFS 服務未運行"
    echo "   請檢查日誌：sudo docker compose logs rustfs"
fi
