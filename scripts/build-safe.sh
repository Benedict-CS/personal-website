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

# Next.js 16 defaults to Turbopack for `next build`. Some reverse proxies (e.g. OpenResty with strict
# location/WAF rules) return 500 + text/plain for certain Turbopack chunk names (~, turbopack-*, etc.).
# Webpack output uses safer filenames. Set NEXT_USE_TURBOPACK=1 to prefer Turbopack when you control
# the edge config and want faster CI builds.
build_cmd=(npx next build --webpack)
if [ "${NEXT_USE_TURBOPACK:-}" = "1" ]; then
  build_cmd=(npx next build)
fi

LOG1="$(mktemp)"
if run_build "$LOG1" "${build_cmd[@]}"; then
  exit 0
fi

if rg "ENOENT: no such file or directory, open '.+_buildManifest\\.js\\.tmp" "$LOG1" >/dev/null 2>&1 || \
   rg "ENOENT: no such file or directory, open '/.+_buildManifest\\.js\\.tmp" "$LOG1" >/dev/null 2>&1; then
  echo "Detected transient build-manifest race. Cleaning .next and retrying once..."
  rm -rf "$ROOT/.next"
  LOG2="$(mktemp)"
  if run_build "$LOG2" "${build_cmd[@]}"; then
    exit 0
  fi
fi

# OOM during build: retry with more Node heap (webpack is heavier than Turbopack).
# Match Linux OOM killer ("Killed") and V8 heap limit ("Reached heap limit", "heap out of memory").
if rg "Killed" "$LOG1" >/dev/null 2>&1 || \
   rg "Reached heap limit|JavaScript heap out of memory" "$LOG1" >/dev/null 2>&1; then
  echo "Detected OOM during build. Retrying with more Node memory..."
  export NODE_OPTIONS="${NODE_OPTIONS:-} --max-old-space-size=8192"
  LOG3="$(mktemp)"
  if run_build "$LOG3" "${build_cmd[@]}"; then
    exit 0
  fi
fi

echo "Build failed."
exit 1

