# 清理 Git 歷史中的敏感資訊

## ⚠️ 重要警告

**清理 Git 歷史會重寫所有 commit，這是一個破壞性操作！**

- 所有協作者需要重新 clone repository
- 所有 fork 和 branch 會與新的歷史不一致
- 需要強制推送（force push）到 GitHub

## 📋 清理前準備

### 1. 備份 Repository

```bash
cd ~/personal-website

# 創建完整備份
cd ..
cp -r personal-website personal-website-backup-$(date +%Y%m%d)

# 或創建新的 remote 作為備份
git remote add backup https://github.com/Benedict-CS/personal-website-backup.git
git push backup main
```

### 2. 確認當前狀態

```bash
# 檢查當前 branch
git branch

# 檢查 remote
git remote -v

# 確認所有變更都已 commit
git status
```

---

## 方法 1: 使用 git-filter-repo（推薦）

### 安裝 git-filter-repo

```bash
# Ubuntu/Debian
sudo apt install git-filter-repo

# 或使用 pip
pip install git-filter-repo

# macOS
brew install git-filter-repo
```

### 清理敏感資訊

#### 清理 docker-compose.yml 中的明碼密碼

```bash
cd ~/personal-website

# 創建清理腳本
cat > /tmp/cleanup-docker-compose.sh << 'EOF'
#!/bin/bash
# 還原舊的 docker-compose.yml 內容（移除明碼）
sed -i 's/POSTGRES_PASSWORD=password/POSTGRES_PASSWORD=\${POSTGRES_PASSWORD}/g' docker-compose.yml
sed -i 's/RUSTFS_ROOT_PASSWORD=rustfsadmin/RUSTFS_ROOT_PASSWORD=\${RUSTFS_ROOT_PASSWORD}/g' docker-compose.yml
sed -i 's/DATABASE_URL=postgresql:\/\/ben:password@postgres:5432\/blog/DATABASE_URL=postgresql:\/\/\${POSTGRES_USER:-ben}:\${POSTGRES_PASSWORD}@postgres:5432\/\${POSTGRES_DB:-blog}/g' docker-compose.yml
sed -i 's/ADMIN_PASSWORD=\${ADMIN_PASSWORD:-benedict123}/ADMIN_PASSWORD=\${ADMIN_PASSWORD}/g' docker-compose.yml
sed -i 's/NEXTAUTH_SECRET=\${NEXTAUTH_SECRET:-change-me-in-production}/NEXTAUTH_SECRET=\${NEXTAUTH_SECRET}/g' docker-compose.yml
sed -i 's/S3_ACCESS_KEY=\${S3_ACCESS_KEY:-rustfsadmin}/S3_ACCESS_KEY=\${S3_ACCESS_KEY}/g' docker-compose.yml
sed -i 's/S3_SECRET_KEY=\${S3_SECRET_KEY:-rustfsadmin}/S3_SECRET_KEY=\${S3_SECRET_KEY}/g' docker-compose.yml
EOF

# 使用 git-filter-repo 清理歷史
git filter-repo \
  --path docker-compose.yml \
  --invert-paths \
  --force

# 重新添加清理後的檔案
git checkout HEAD -- docker-compose.yml
git add docker-compose.yml
git commit -m "Remove hardcoded passwords from docker-compose.yml"
```

#### 更簡單的方法：直接替換整個檔案歷史

```bash
cd ~/personal-website

# 1. 確保當前 docker-compose.yml 是正確的（沒有明碼）
git status

# 2. 使用 git-filter-repo 替換所有歷史中的 docker-compose.yml
git filter-repo \
  --path docker-compose.yml \
  --replace-text <(echo "POSTGRES_PASSWORD=password==>POSTGRES_PASSWORD=\${POSTGRES_PASSWORD}") \
  --replace-text <(echo "RUSTFS_ROOT_PASSWORD=rustfsadmin==>RUSTFS_ROOT_PASSWORD=\${RUSTFS_ROOT_PASSWORD}") \
  --replace-text <(echo "ben:password@postgres==>\${POSTGRES_USER:-ben}:\${POSTGRES_PASSWORD}@postgres") \
  --replace-text <(echo "ADMIN_PASSWORD=\${ADMIN_PASSWORD:-benedict123}==>ADMIN_PASSWORD=\${ADMIN_PASSWORD}") \
  --replace-text <(echo "NEXTAUTH_SECRET=\${NEXTAUTH_SECRET:-change-me-in-production}==>NEXTAUTH_SECRET=\${NEXTAUTH_SECRET}") \
  --replace-text <(echo "S3_ACCESS_KEY=\${S3_ACCESS_KEY:-rustfsadmin}==>S3_ACCESS_KEY=\${S3_ACCESS_KEY}") \
  --replace-text <(echo "S3_SECRET_KEY=\${S3_SECRET_KEY:-rustfsadmin}==>S3_SECRET_KEY=\${S3_SECRET_KEY}") \
  --force
```

#### 清理 src/lib/s3.ts 中的硬編碼值

```bash
git filter-repo \
  --path src/lib/s3.ts \
  --replace-text <(echo '"rustfsadmin"==>process.env.S3_ACCESS_KEY') \
  --replace-text <(echo '"rustfsadmin"==>process.env.S3_SECRET_KEY') \
  --force
```

---

## 方法 2: 使用 git filter-branch（舊方法，不推薦）

```bash
cd ~/personal-website

# 清理 docker-compose.yml
git filter-branch --force --index-filter \
  "git checkout HEAD -- docker-compose.yml && \
   sed -i 's/POSTGRES_PASSWORD=password/POSTGRES_PASSWORD=\${POSTGRES_PASSWORD}/g' docker-compose.yml && \
   sed -i 's/RUSTFS_ROOT_PASSWORD=rustfsadmin/RUSTFS_ROOT_PASSWORD=\${RUSTFS_ROOT_PASSWORD}/g' docker-compose.yml && \
   git add docker-compose.yml" \
  --prune-empty --tag-name-filter cat -- --all

# 清理 refs（重要！）
git for-each-ref --format="delete %(refname)" refs/original | git update-ref --stdin
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

---

## 🚀 推送清理後的歷史

### ⚠️ 強制推送（危險操作）

```bash
# 1. 確認清理結果
git log --oneline --all | head -10
git show HEAD:docker-compose.yml | grep -i password

# 2. 強制推送到 GitHub
git push origin --force --all
git push origin --force --tags

# 3. 通知所有協作者重新 clone
```

---

## ✅ 驗證清理結果

```bash
# 檢查歷史中是否還有明碼
git log --all --full-history -p | grep -i "password\|secret\|key" | grep -v "\${"

# 檢查特定檔案
git log --all --full-history -- docker-compose.yml | grep -i password

# 檢查特定 commit
git show <commit-hash>:docker-compose.yml | grep -i password
```

---

## 🔄 協作者需要做的事

所有協作者需要：

```bash
# 刪除舊的 repository
cd ..
rm -rf personal-website

# 重新 clone
git clone https://github.com/Benedict-CS/personal-website.git
cd personal-website

# 重新設置 remote（如果需要）
git remote set-url origin https://github.com/Benedict-CS/personal-website.git
```

---

## 📝 替代方案：只清理最近的 commit

如果不想重寫整個歷史，可以：

1. **創建新的 commit 覆蓋敏感資訊**（推薦）
   ```bash
   # 直接修改並 commit
   # 舊的歷史仍然存在，但最新的版本是安全的
   ```

2. **使用 `git rebase -i` 編輯最近的 commit**
   ```bash
   git rebase -i HEAD~5  # 編輯最近 5 個 commit
   ```

---

## 🎯 最佳實踐

1. **立即修改所有密碼**（即使清理了歷史，舊密碼仍可能被洩露）
2. **使用環境變數**（已完成 ✓）
3. **定期檢查敏感資訊**：
   ```bash
   git secrets --scan-history
   ```
4. **使用 GitHub Secret Scanning**（GitHub 會自動掃描）

---

## 📚 參考資源

- [git-filter-repo 文檔](https://github.com/newren/git-filter-repo)
- [GitHub: Removing sensitive data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)（另一個工具）
