#!/usr/bin/env python3
"""Publish the footer reveal, with its tuning panel, at a secret URL.

The reveal is still in the works: js/footer-include.js runs it on local
copies of the site only, and nothing on flowerdog.studio loads it. This
script adds one page under /preview/<token>/ that is the built home page
plus two script tags of its own — the reveal and its tuning panel — so the
work can be looked at on a phone and in every browser without any of the
site's own files changing.

Run after scripts/build-clean-urls.py, so the copy is the finished page.
When the reveal is switched on for everyone, this script and its call in
scripts/build-production.sh can go.
"""

from __future__ import annotations

import pathlib
import sys

TOKEN = "podval-o849-pmup-t89m"

CHARSET = '<meta charset="utf-8" />'
NOINDEX = '    <meta name="robots" content="noindex,nofollow">\n'
# The home page is the one page the build leaves at the site root, so it
# carries no base tag and its relative asset paths would resolve inside
# this folder. Everything is served from the root, exactly as on the site.
BASE_TAG = '    <base href="/">\n'
SCRIPTS = (
    '    <script src="/js/footer-reveal.js"></script>\n'
    '    <script src="/js/footer-tuning.js"></script>\n'
    '  </body>'
)


def build(source: pathlib.Path) -> str:
    text = source.read_text(encoding="utf-8")
    if CHARSET not in text or "</body>" not in text:
        raise ValueError(f"{source}: expected a charset meta and a body end")
    head = NOINDEX if "<base href" in text else NOINDEX + BASE_TAG
    text = text.replace(CHARSET, CHARSET + "\n" + head, 1)
    return text.replace("  </body>", SCRIPTS, 1)


def main() -> int:
    site_dir = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "_site")
    source = site_dir / "index.html"
    if not source.is_file():
        print(f"Home page not found: {source}", file=sys.stderr)
        return 1
    target = site_dir / "preview" / TOKEN / "index.html"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(build(source), encoding="utf-8")
    print(f"Footer preview: /preview/{TOKEN}/")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
