#!/usr/bin/env python3
"""Publish the footer reveal, with its tuning panel, at a secret URL.

The reveal is still in the works: js/footer-include.js runs it on local
copies of the site only, and nothing on flowerdog.studio loads it. This
script adds one page under /preview/<token>/ that is the built home page
plus two script tags of its own — the reveal and its tuning panel — so the
work can be looked at on a phone and in every browser without any of the
site's own files changing.

Every style and script the page asks for carries a version stamp built
from the contents of the site's css/ and js/. It changes when they change
and only then, so "is this the new one or a cached old one?" is never a
question on that page — which it was, because a new page URL does nothing
for scripts requested under their usual names.

Run after scripts/build-clean-urls.py, so the copy is the finished page.
When the reveal is switched on for everyone, this script and its call in
scripts/build-production.sh can go.
"""

from __future__ import annotations

import hashlib
import pathlib
import re
import sys

TOKEN = "podval-3fuc-pv7h-ctu6"

CHARSET = '<meta charset="utf-8" />'
NOINDEX = '    <meta name="robots" content="noindex,nofollow">\n'
# The home page is the one page the build leaves at the site root, so it
# carries no base tag and its relative asset paths would resolve inside
# this folder. Everything is served from the root, exactly as on the site.
BASE_TAG = '    <base href="/">\n'
SCRIPTS = (
    '    <script src="/js/footer-reveal.js?v={stamp}"></script>\n'
    '    <script src="/js/footer-tuning.js?v={stamp}"></script>\n'
    '  </body>'
)
ASSET = re.compile(r'(?P<attr>href|src)="(?P<path>/?(?:css|js)/[^"?#]+\.(?:css|js))"')


def stamp_of(site_dir: pathlib.Path) -> str:
    digest = hashlib.sha256()
    for path in sorted(list((site_dir / "css").rglob("*.css")) + list((site_dir / "js").rglob("*.js"))):
        digest.update(path.name.encode("utf-8"))
        digest.update(path.read_bytes())
    return digest.hexdigest()[:10]


def build(source: pathlib.Path, stamp: str) -> str:
    text = source.read_text(encoding="utf-8")
    if CHARSET not in text or "</body>" not in text:
        raise ValueError(f"{source}: expected a charset meta and a body end")
    head = NOINDEX if "<base href" in text else NOINDEX + BASE_TAG
    text = text.replace(CHARSET, CHARSET + "\n" + head, 1)
    text = ASSET.sub(lambda m: f'{m.group("attr")}="/{m.group("path").lstrip("/")}?v={stamp}"', text)
    return text.replace("  </body>", SCRIPTS.format(stamp=stamp), 1)


def main() -> int:
    site_dir = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "_site")
    source = site_dir / "index.html"
    if not source.is_file():
        print(f"Home page not found: {source}", file=sys.stderr)
        return 1
    stamp = stamp_of(site_dir)
    target = site_dir / "preview" / TOKEN / "index.html"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(build(source, stamp), encoding="utf-8")
    print(f"Footer preview: /preview/{TOKEN}/  (assets stamped {stamp})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
