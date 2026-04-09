#!/usr/bin/env bash
# Smoke-check liveness and readiness endpoints (local or remote base URL). Requires curl; Python 3 validates JSON.
set -euo pipefail
BASE="${1:-http://127.0.0.1:3000}"
echo "Checking GET ${BASE}/api/live ..."
curl -fsS "${BASE}/api/live"
echo ""
echo "Checking HEAD ${BASE}/api/live ..."
curl -fsS -o /dev/null -w "HTTP %{http_code}\n" -X HEAD "${BASE}/api/live"
echo "Checking GET ${BASE}/api/health ..."
HEALTH_BODY="$(curl -fsS "${BASE}/api/health")"
printf '%s\n' "${HEALTH_BODY}"
printf '%s' "${HEALTH_BODY}" | python3 -c "
import json, sys
d = json.load(sys.stdin)
if d.get('ok') is not True:
    sys.stderr.write('health: expected ok=true\n')
    sys.exit(1)
node = d.get('node')
if not isinstance(node, str) or not node.startswith('v'):
    sys.stderr.write('health: expected node to be a Node.js version string\n')
    sys.exit(1)
"
echo "Checking HEAD ${BASE}/api/health ..."
curl -fsS -o /dev/null -w "HTTP %{http_code}\n" -X HEAD "${BASE}/api/health"
echo "OK: live and health endpoints returned successfully; GET /api/health JSON validated."
