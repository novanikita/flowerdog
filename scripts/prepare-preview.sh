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
  --exclude 'CNAME' \
  --exclude '.cursor' \
  --exclude 'docs' \
  "$ROOT/" "$SITE_DIR/"

cp "$ROOT/robots.preview.txt" "$SITE_DIR/robots.txt"

python3 - "$SITE_DIR" <<'PY'
import pathlib
import sys

site_dir = pathlib.Path(sys.argv[1])
needle = '<meta charset="utf-8" />'
meta = '    <meta name="robots" content="noindex,nofollow">\n'

for path in site_dir.glob('*.html'):
    text = path.read_text(encoding='utf-8')
    if 'name="robots"' in text:
        continue
    if needle not in text:
        continue
    path.write_text(text.replace(needle, needle + '\n' + meta, 1), encoding='utf-8')
PY

echo "Preview build ready in: $SITE_DIR"
