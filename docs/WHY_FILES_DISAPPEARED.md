# 為什麼檔案會突然不見？

專案裡曾發生：`package.json`、`scripts/`、`.env`、部分 `src/` 等「消失」或需要還原。以下列出**可能原因**與**預防方式**，供你對照環境與操作習慣。

---

## 可能原因（無法從對話紀錄還原「是誰做的」）

1. **Git 操作**
   - 執行過 `git checkout -- .`、`git reset --hard`、或還原到某個舊 commit，會讓工作目錄變成該狀態，**未 commit 的變更或未追蹤的檔案**會不見。
   - 在不同 branch 切換時，若該 branch 沒有某些檔案（例如從沒 commit 過），也會「看不到」。

2. **在不同環境操作**
   - 在 **A 電腦 / Cursor** 改的檔案，在 **B 電腦 / 伺服器** 上沒 pull 或沒同步，就會覺得「在這台機器上不見了」。
   - Cursor 開到**別的資料夾**（例如 `~/personal-website` vs `/home/ben/personal-website`），看到的檔案也會不一樣。

3. **.env 本來就不在 Git**
   - `.env` 通常被 `.gitignore` 排除，**從來不會被 commit**。換機器、重 clone、或還原 repo 時，.env 要自己用 `.env.example` 再建一份。

4. **刪除或覆寫**
   - 手動刪除、腳本/工具誤刪、或某個指令覆寫了目錄（例如 `cp`、`rsync` 用錯參數）。

5. **同步 / 雲端**
   - 若專案在 Dropbox、iCloud、OneDrive 等底下，同步衝突或還原可能讓某個版本的檔案被蓋掉或消失。

6. **Docker / 腳本**
   - 若曾有腳本或 Docker 掛載/複製時清空或覆寫了專案目錄，也可能造成檔案不見（較少見，但有可能）。

---

## 預防與日後還原

| 做法 | 說明 |
|------|------|
| **重要變更都要 commit + push** | 至少 `main` 有備份在 GitHub，本機出事還可 `git clone` 或 `git restore`。 |
| **.env 單獨備份** | 把 `.env` 複製到安全處（例如加密壓縮、密碼管理員），不要只依賴 Git。 |
| **執行破壞性指令前先確認** | `git reset --hard`、`rm -rf`、大範圍 `git checkout` 前先 `git status` 或備份。 |
| **定期備份整個專案或資料** | 用你現有的 `scripts/backup.sh` 備份 DB + 檔案，或整機備份。 |
| **確認當前目錄與分支** | `pwd`、`git branch`，避免在錯的目錄或 branch 上以為檔案不見。 |

---

## 若再次發生「檔案不見」

1. **先看 Git**：`git status`、`git log -5`，必要時 `git restore .` 從最後一次 commit 還原。
2. **.env**：從 `.env.example` 複製成 `.env` 再填值（無法從 GitHub 還原）。
3. **scripts / 設定**：若曾 push 過，`git pull` 或 `git checkout origin/main -- scripts/` 可還原；若從未 commit，只能從備份或手動重建。
