#!/bin/bash

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

run_build() {
  local log_file="$1"
  shift
  if "$@" 2>&1 | tee "$log_file"; then
    return 0
  fi
  return 1
}

LOG1="$(mktemp)"
if run_build "$LOG1" npx next build; then
  exit 0
fi

if rg "ENOENT: no such file or directory, open '.+_buildManifest\\.js\\.tmp" "$LOG1" >/dev/null 2>&1 || \
   rg "ENOENT: no such file or directory, open '/.+_buildManifest\\.js\\.tmp" "$LOG1" >/dev/null 2>&1; then
  echo "Detected transient build-manifest race. Cleaning .next and retrying once..."
  rm -rf "$ROOT/.next"
  LOG2="$(mktemp)"
  if run_build "$LOG2" npx next build; then
    exit 0
  fi
fi

# If Turbopack build is OOM-killed, retry with webpack and more Node memory.
if rg "Killed" "$LOG1" >/dev/null 2>&1; then
  echo "Detected OOM kill during build. Retrying with webpack fallback..."
  export NODE_OPTIONS="${NODE_OPTIONS:-} --max-old-space-size=4096"
  LOG3="$(mktemp)"
  if run_build "$LOG3" npx next build --webpack; then
    exit 0
  fi
fi

echo "Build failed."
exit 1

