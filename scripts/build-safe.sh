#!/bin/bash

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Webpack `next build` often exceeds the default V8 heap (~2–4GB). Set a sane default so the
# first attempt does not OOM. Skip if NODE_OPTIONS already includes max-old-space-size (e.g. CI).
if [[ " ${NODE_OPTIONS:-} " != *"max-old-space-size"* ]]; then
  export NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--max-old-space-size=8192"
fi

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

# OOM during build: retry with a larger heap (webpack is heavier than Turbopack).
# Match Linux OOM killer ("Killed") and V8 heap limit ("Reached heap limit", "heap out of memory").
if rg "Killed" "$LOG1" >/dev/null 2>&1 || \
   rg "Reached heap limit|JavaScript heap out of memory" "$LOG1" >/dev/null 2>&1; then
  echo "Detected OOM during build. Retrying with a larger Node heap..."
  _heap_stripped="$(printf '%s' "${NODE_OPTIONS:-}" | sed -E 's/[[:space:]]*--max-old-space-size=[0-9]+//g' | sed -E 's/^[[:space:]]+//;s/[[:space:]]+$//')"
  export NODE_OPTIONS="${_heap_stripped:+"${_heap_stripped} "}--max-old-space-size=16384"
  LOG3="$(mktemp)"
  if run_build "$LOG3" "${build_cmd[@]}"; then
    exit 0
  fi
fi

echo "Build failed."
exit 1

