#!/bin/bash
# 手動創建 PostVersion 表的腳本

echo "正在創建 PostVersion 表..."

# 讀取 migration SQL 文件並執行
sudo docker compose exec -T postgres psql -U ben blog < prisma/migrations/20260124000000_add_post_versions/migration.sql

echo ""
echo "檢查表是否創建成功..."
sudo docker compose exec postgres psql -U ben blog -c '\dt "PostVersion"'

echo ""
echo "✅ 完成！"
