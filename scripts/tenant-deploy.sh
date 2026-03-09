#!/bin/bash

set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <siteId> <provider: docker|kubernetes> [imageTag]"
  exit 1
fi

SITE_ID="$1"
PROVIDER="$2"
IMAGE_TAG="${3:-tenant-${SITE_ID}:latest}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "Triggering tenant deployment..."
echo "Site ID: ${SITE_ID}"
echo "Provider: ${PROVIDER}"
echo "Image tag: ${IMAGE_TAG}"

curl -sS -X POST "http://localhost:3000/api/saas/sites/${SITE_ID}/infra/deploy" \
  -H "Content-Type: application/json" \
  -d "{\"provider\":\"${PROVIDER}\",\"imageTag\":\"${IMAGE_TAG}\"}" | jq .

