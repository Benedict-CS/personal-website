#!/bin/bash
# On website-backup VM: clean everything and start fresh so the app runs with
# the image from Harbor (migrate on startup works). Run from the directory
# that has docker-compose.yml and .env.
set -e

echo "=== 1. Stop and remove containers (keep volumes if you want fresh DB) ==="
sudo docker compose -f docker-compose.yml down

echo "=== 2. Remove app images (so we use only the next loaded one) ==="
sudo docker rmi -f harbor.ben.winlab.tw/personal-website/personal-website:latest 2>/dev/null || true
sudo docker rmi -f personal-website-app:latest 2>/dev/null || true
# Remove any dangling image that was the old app
sudo docker image prune -f

echo "=== 3. Load image from Harbor (skopeo; replace USER:PASS) ==="
rm -f personal-website.tar
skopeo copy --src-creds "${HARBOR_CREDS:-admin:Harbor12345}" \
  docker://harbor.ben.winlab.tw/personal-website/personal-website:latest \
  docker-archive:personal-website.tar
LOAD_OUT=$(sudo docker load -i personal-website.tar 2>&1)
echo "$LOAD_OUT"
rm -f personal-website.tar

echo "=== 4. Tag the JUST loaded image ==="
# Parse "Loaded image ID: sha256:XXXXXXXX..." from docker load output (full sha or short id both work)
NEW_ID=$(echo "$LOAD_OUT" | sed -n 's/.*Loaded image ID: \(sha256:[a-f0-9]*\).*/\1/p' | tail -1)
if [ -z "$NEW_ID" ]; then
  # Fallback: dangling image (untagged) from the load
  NEW_ID=$(sudo docker images -q --filter "dangling=true" | head -1)
fi
if [ -z "$NEW_ID" ]; then
  echo "Could not auto-detect loaded image. If it already has the correct tag, continuing."
  echo "Otherwise run: sudo docker tag <IMAGE_ID> harbor.ben.winlab.tw/personal-website/personal-website:latest"
else
  sudo docker tag "$NEW_ID" harbor.ben.winlab.tw/personal-website/personal-website:latest
  echo "Tagged $NEW_ID as harbor.ben.winlab.tw/personal-website/personal-website:latest"
fi

echo "=== 5. Start stack ==="
sudo docker compose -f docker-compose.yml up -d

echo "=== Done. Check: sudo docker ps && sudo docker logs personal-website-backup-app --tail 20 ==="
