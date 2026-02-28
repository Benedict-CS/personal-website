import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";

/**
 * POST /api/backup/trigger — optional backup trigger (auth required).
 * By default returns instructions; you can replace this with actual backup execution
 * (e.g. spawn scripts/backup-data.sh) if your deployment allows it.
 */
export async function POST() {
  const auth = await requireSession();
  if ("unauthorized" in auth) return auth.unauthorized;

  // Option: run backup script (uncomment and adjust path if desired)
  // const { spawn } = await import("child_process");
  // const child = spawn("bash", ["./scripts/backup-data.sh"], { cwd: process.cwd() });
  // await new Promise((res, rej) => { child.on("close", (c) => (c === 0 ? res(undefined) : rej(new Error("Backup failed")))); });
  return NextResponse.json({
    ok: true,
    message:
      "Backup not run from API. To back up, run on the server: ./scripts/backup-data.sh (or use cron). See docs/MAINTENANCE.md.",
  });
}
