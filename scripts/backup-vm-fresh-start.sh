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
sudo docker load -i personal-website.tar
rm -f personal-website.tar

echo "=== 4. Tag the JUST loaded image ==="
# After load, Docker prints: Loaded image ID: sha256:55d8af32...
# That image may have no tag. Find it (dangling = untagged).
NEW_ID=$(sudo docker images -q --filter "dangling=true" | head -1)
if [ -z "$NEW_ID" ]; then
  echo "No dangling image; the loaded image may already have a tag. Check: sudo docker images"
  echo "If harbor.ben.../personal-website:latest exists, skip to step 5. Else run:"
  echo "  sudo docker tag <IMAGE_ID> harbor.ben.winlab.tw/personal-website/personal-website:latest"
  read -p "Enter the image ID to tag (from 'Loaded image ID' above, e.g. 55d8af322663): " NEW_ID
fi
if [ -n "$NEW_ID" ]; then
  sudo docker tag "$NEW_ID" harbor.ben.winlab.tw/personal-website/personal-website:latest
  echo "Tagged $NEW_ID as harbor.ben.winlab.tw/personal-website/personal-website:latest"
fi

echo "=== 5. Start stack ==="
sudo docker compose -f docker-compose.yml up -d

echo "=== Done. Check: sudo docker ps && sudo docker logs personal-website-backup-app --tail 20 ==="
