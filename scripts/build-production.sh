#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SITE_DIR="${1:-$ROOT/_site}"

mkdir -p "$SITE_DIR"

rsync -a \
  --exclude '.git' \
  --exclude '.github' \
  --exclude 'deploy' \
  --exclude 'scripts' \
  --exclude '_site' \
  --exclude 'robots.production.txt' \
  --exclude 'robots.preview.txt' \
  --exclude '.cursor' \
  --exclude '/how-we-work.html' \
  --exclude '/audit.html' \
  --exclude '/bandlink.html' \
  --exclude '/vi.html' \
  --exclude '/yandex-music.html' \
  "$ROOT/" "$SITE_DIR/"

cp "$ROOT/robots.production.txt" "$SITE_DIR/robots.txt"
cp "$ROOT/deploy/beget/.htaccess" "$SITE_DIR/.htaccess"

echo "Building clean URLs (/slug/ + .html redirects)…"
python3 "$ROOT/scripts/build-clean-urls.py" "$SITE_DIR"

echo "Production build ready in: $SITE_DIR"
echo "Draft pages are served only under /preview/<token>/ (excluded from site root)."
