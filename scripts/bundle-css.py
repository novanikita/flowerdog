#!/usr/bin/env python3
"""Ship the design system as one stylesheet.

In the repository css/fds.css only declares the cascade layers and
@imports one file per component, which is easy to edit. In the built site
it becomes a single file: every imported file is inlined inside its
@layer block, in the same order, so the cascade is unchanged and the
browser makes one request instead of sixteen. Every page then links it as
css/fds.css?v=<hash of its content>, so a new version is never shadowed
by an old cached one.

Run from scripts/build-production.sh with the build directory.
"""

from __future__ import annotations

import hashlib
import pathlib
import re
import sys

IMPORT = re.compile(r'@import\s+url\("([^"]+)"\)\s+layer\((\w+)\);')
LINK = re.compile(r'(href="/?css/fds\.css)(")')


def bundle(css_dir: pathlib.Path) -> str:
    entry = (css_dir / "fds.css").read_text(encoding="utf-8")
    parts = []
    for line in entry.splitlines():
        m = IMPORT.match(line.strip())
        if m:
            name, layer = m.groups()
            body = (css_dir / name).read_text(encoding="utf-8").strip()
            parts.append(f"/* {name} */\n@layer {layer} {{\n{body}\n}}")
        elif line.strip():
            parts.append(line.strip())
    return "\n\n".join(parts) + "\n"


def main() -> None:
    site = pathlib.Path(sys.argv[1]).resolve()
    css_dir = site / "css"
    text = bundle(css_dir)
    (css_dir / "fds.css").write_text(text, encoding="utf-8")
    for line in IMPORT.finditer((css_dir / "fds.css").read_text(encoding="utf-8")):
        raise SystemExit(f"bundle-css: an @import is left: {line.group(0)}")
    stamp = hashlib.sha256(text.encode("utf-8")).hexdigest()[:10]
    pages = 0
    for page in site.rglob("*.html"):
        html = page.read_text(encoding="utf-8")
        new = LINK.sub(rf"\1?v={stamp}\2", html)
        if new != html:
            page.write_text(new, encoding="utf-8")
            pages += 1
    print(f"CSS bundled into css/fds.css ({len(text) // 1024} KB, v={stamp}, {pages} pages)")


if __name__ == "__main__":
    main()
