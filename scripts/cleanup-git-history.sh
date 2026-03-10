#!/bin/bash
# Remove sensitive data from Git history. Backup the repo before running.

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "⚠️  Warning: this script rewrites Git history!"
echo "📋 Confirm:"
echo "   1. Repository is backed up"
echo "   2. All collaborators are notified"
echo "   3. All exposed secrets have been rotated"
echo ""
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "❌ Cancelled"
  exit 1
fi

# Check for git-filter-repo
if ! command -v git-filter-repo &> /dev/null; then
  echo "❌ git-filter-repo is not installed"
  echo "📦 Install:"
  echo "   Ubuntu/Debian: sudo apt install git-filter-repo"
  echo "   Or: pip install git-filter-repo"
  exit 1
fi

echo ""
echo "🔍 Current status..."
git status

echo ""
echo "🧹 Cleaning docker-compose.yml from history..."

# Create replacement rules file
cat > /tmp/replace-rules.txt << 'EOF'
POSTGRES_PASSWORD=password==>POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
RUSTFS_ROOT_PASSWORD=rustfsadmin==>RUSTFS_ROOT_PASSWORD=${RUSTFS_ROOT_PASSWORD}
ben:password@postgres==>${POSTGRES_USER:-ben}:${POSTGRES_PASSWORD}@postgres
ADMIN_PASSWORD=${ADMIN_PASSWORD:-benedict123}==>ADMIN_PASSWORD=${ADMIN_PASSWORD}
NEXTAUTH_SECRET=${NEXTAUTH_SECRET:-change-me-in-production}==>NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
S3_ACCESS_KEY=${S3_ACCESS_KEY:-rustfsadmin}==>S3_ACCESS_KEY=${S3_ACCESS_KEY}
S3_SECRET_KEY=${S3_SECRET_KEY:-rustfsadmin}==>S3_SECRET_KEY=${S3_SECRET_KEY}
EOF

# Run filter-repo
git filter-repo \
  --path docker-compose.yml \
  --replace-text /tmp/replace-rules.txt \
  --force

echo ""
echo "🧹 Cleaning src/lib/s3.ts from history..."

# s3.ts may need manual review if multiple matches exist
git filter-repo \
  --path src/lib/s3.ts \
  --replace-text <(echo '"rustfsadmin"==>process.env.S3_ACCESS_KEY || process.env.S3_SECRET_KEY') \
  --force || echo "⚠️  s3.ts cleanup may need manual review"

echo ""
echo "✅ Cleanup done."
echo ""
echo "📋 Next steps:"
echo "   1. Verify: git log --all --full-history -p | grep -i password"
echo ""
echo "   2. Force push (⚠️  destructive):"
echo "      git push origin --force --all"
echo "      git push origin --force --tags"
echo ""
echo "   3. Ask all collaborators to re-clone the repository"
