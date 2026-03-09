/**
 * Simple structured logger for API and server.
 * Outputs JSON lines for easy parsing (e.g. in Docker logs).
 */

type LogLevel = "info" | "warn" | "error";

function formatMessage(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
  const entry = {
    time: new Date().toISOString(),
    level,
    msg: message,
    ...meta,
  };
  return JSON.stringify(entry);
}

export function logInfo(message: string, meta?: Record<string, unknown>): void {
   
  console.log(formatMessage("info", message, meta));
}

export function logWarn(message: string, meta?: Record<string, unknown>): void {
   
  console.warn(formatMessage("warn", message, meta));
}

export function logError(message: string, meta?: Record<string, unknown>): void {
   
  console.error(formatMessage("error", message, meta));
}

/** Log HTTP request (use at start of API route or in middleware). */
export function logRequest(
  method: string,
  path: string,
  meta?: { status?: number; durationMs?: number; ip?: string }
): void {
  logInfo("request", { method, path, ...meta });
}
