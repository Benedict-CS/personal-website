# Cron 設定說明

每日備份 + Git push 可由 cron 執行。

## 1. 安裝 cron（若尚未安裝）

```bash
sudo apt install -y cron
sudo systemctl enable cron
sudo systemctl start cron
```

## 2. 確保目前使用者在 docker 群組（備份需執行 docker compose）

```bash
sudo usermod -aG docker $USER
# 登出再登入後生效；可用 groups 確認
```

## 3. Git push 免密

- 使用 SSH key：`ssh -T git@github.com` 測試
- 或設定 credential helper

## 4. 建立 log 目錄

```bash
mkdir -p /home/ben/personal-website/logs
```

## 5. 編輯 crontab

```bash
crontab -e
```

貼上（請依實際路徑調整 `PROJECT_DIR`）：

```
PROJECT_DIR=/home/ben/personal-website

# 每日 0:00 執行備份 + git add/commit/push（不需 sudo，以目前使用者執行）
0 0 * * * cd "$PROJECT_DIR" && ./scripts/run-cron-jobs.sh --no-clean >> "$PROJECT_DIR/logs/cron.log" 2>&1

# 每週日 0:00 乾淨建置（可選）
# 0 0 * * 0 cd "$PROJECT_DIR" && ./scripts/clean-build.sh >> "$PROJECT_DIR/logs/clean-build.log" 2>&1
```

## 6. 手動測試

```bash
cd /home/ben/personal-website
./scripts/run-cron-jobs.sh --no-clean
```

查看日誌：`tail -f logs/cron.log`
