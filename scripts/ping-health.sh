#!/usr/bin/env bash
set -euo pipefail

url="${1:-http://localhost:3000/api/health}"
max_attempts="${2:-20}"
sleep_seconds="${3:-1}"

attempt=1
while [ "$attempt" -le "$max_attempts" ]; do
  status_code="$(curl -sS -o /tmp/health-response.json -w "%{http_code}" "$url" || true)"
  if [ "$status_code" = "200" ]; then
    echo "Health check passed (HTTP 200)."
    cat /tmp/health-response.json
    exit 0
  fi
  echo "Attempt $attempt/$max_attempts failed with HTTP $status_code. Retrying in ${sleep_seconds}s..."
  sleep "$sleep_seconds"
  attempt=$((attempt + 1))
done

echo "Health check failed after $max_attempts attempts."
if [ -f /tmp/health-response.json ]; then
  cat /tmp/health-response.json
fi
exit 1
