#!/bin/bash
# 手動創建 AboutConfig 表的腳本

echo "📋 創建 AboutConfig 表..."

sudo docker compose exec -T postgres psql -U ben -d blog <<EOF
-- CreateTable
CREATE TABLE IF NOT EXISTS "AboutConfig" (
    "id" TEXT NOT NULL,
    "profileImage" TEXT,
    "schoolLogos" TEXT NOT NULL DEFAULT '[]',
    "projectImages" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AboutConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AboutConfig_id_key" ON "AboutConfig"("id");
EOF

if [ $? -eq 0 ]; then
    echo "✅ AboutConfig 表創建成功！"
else
    echo "❌ 創建失敗，請檢查錯誤訊息"
    exit 1
fi
