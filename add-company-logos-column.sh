#!/bin/bash
# 手動添加 companyLogos 欄位的腳本

echo "📋 添加 companyLogos 欄位到 AboutConfig 表..."

sudo docker compose exec -T postgres psql -U ben -d blog <<EOF
-- Add companyLogos column to AboutConfig table
ALTER TABLE "AboutConfig" ADD COLUMN IF NOT EXISTS "companyLogos" TEXT NOT NULL DEFAULT '[]';
EOF

if [ $? -eq 0 ]; then
    echo "✅ companyLogos 欄位添加成功！"
else
    echo "❌ 添加失敗，請檢查錯誤訊息"
    exit 1
fi
