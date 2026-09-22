#!/usr/bin/env python3
"""Copy the home page into preview/<token>/ with the footer reveal switched on.

The reveal ships switched off for visitors (js/footer-include.js); this copy is
the one place on the live site where it runs, so it can be looked at — on a
phone, in every browser — without turning it on for everyone. The page is built
from the real index.html on every production build, so it never drifts, and it
lives under /preview/, which robots.production.txt keeps out of search.

Once the reveal is switched on for everyone, this script and its call in
scripts/build-production.sh can go.
"""

from __future__ import annotations

import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
TOKEN = "podval-zr77-6djm-3f6o"

NEEDLE = '<meta charset="utf-8" />'
NOINDEX = '    <meta name="robots" content="noindex,nofollow">\n'
# Assets and links resolve from the site root, so the copy walks the real site.
BASE_TAG = '    <base href="../../">\n'
FOOTER_INCLUDE = '<script src="js/footer-include.js"></script>'
# Also remembered for the tab (js/footer-include.js), so the reveal stays on
# while walking from here into the ordinary pages.
FORCE_TAG = '<script>window.FOOTER_REVEAL_FORCE = true;</script>\n    ' + FOOTER_INCLUDE


def build(source: pathlib.Path) -> str:
    text = source.read_text(encoding="utf-8")
    if NEEDLE not in text or FOOTER_INCLUDE not in text:
        raise ValueError(f"{source}: expected charset meta and the footer include")
    text = text.replace(NEEDLE, NEEDLE + "\n" + NOINDEX + BASE_TAG, 1)
    return text.replace(FOOTER_INCLUDE, FORCE_TAG, 1)


def main() -> int:
    site_dir = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ROOT / "_site")
    target = site_dir / "preview" / TOKEN / "index.html"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(build(ROOT / "index.html"), encoding="utf-8")
    print(f"Footer preview: /preview/{TOKEN}/")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
