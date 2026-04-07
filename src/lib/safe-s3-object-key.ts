/**
 * Reject path traversal and odd keys for S3/RustFS object GET by filename.
 */

const SAFE_KEY = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,510}$/;

export function isSafeS3ObjectKey(key: string): boolean {
  if (!key || key.length > 512) return false;
  if (key.includes("..") || key.includes("/") || key.includes("\\")) return false;
  return SAFE_KEY.test(key);
}
