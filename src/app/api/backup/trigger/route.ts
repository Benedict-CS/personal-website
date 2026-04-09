import { NextResponse } from "next/server";
import { spawn } from "child_process";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/backup/trigger — runs scripts/backup-data.sh when ALLOW_SERVER_BACKUP=true (auth required).
 * Remote targets: values from Site settings (dashboard → Content → Site) override env when set;
 * otherwise BACKUP_RSYNC_TARGET / BACKUP_POST_HOOK_URL from the process environment are used.
 */
export async function POST() {
  const auth = await requireSession();
  if ("unauthorized" in auth) return auth.unauthorized;

  if (process.env.ALLOW_SERVER_BACKUP !== "true") {
    return NextResponse.json({
      ok: true,
      ran: false,
      message:
        "Server backup from API is disabled. Set ALLOW_SERVER_BACKUP=true on the host to enable, or run ./scripts/backup-data.sh via SSH/cron.",
    });
  }

  try {
    const row = await prisma.siteConfig.findUnique({
      where: { id: 1 },
      select: { backupRsyncTarget: true, backupPostHookUrl: true },
    });
    const rsyncFromDb = row?.backupRsyncTarget?.trim();
    const hookFromDb = row?.backupPostHookUrl?.trim();
    const childEnv = { ...process.env };
    const rsync = rsyncFromDb || process.env.BACKUP_RSYNC_TARGET;
    const hook = hookFromDb || process.env.BACKUP_POST_HOOK_URL;
    if (rsync) childEnv.BACKUP_RSYNC_TARGET = rsync;
    if (hook) childEnv.BACKUP_POST_HOOK_URL = hook;

    const code = await new Promise<number>((resolve, reject) => {
      const child = spawn("bash", ["./scripts/backup-data.sh"], {
        cwd: process.cwd(),
        env: childEnv,
        stdio: "pipe",
      });
      let stderr = "";
      child.stderr?.on("data", (d) => {
        stderr += String(d);
      });
      child.on("close", (c) => {
        if (c === 0) resolve(0);
        else reject(new Error(stderr || `backup-data.sh exited ${c}`));
      });
    });
    return NextResponse.json({ ok: true, ran: true, exitCode: code });
  } catch (e) {
    console.error("[backup/trigger]", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Backup failed" },
      { status: 500 }
    );
  }
}
