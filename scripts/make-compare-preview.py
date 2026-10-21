#!/usr/bin/env python3
"""Publish a before/after copy of the site at a secret URL.

/preview/<token>/was/ is the site as it was on 13 October 2026, before the
design system (a snapshot of commit 20817d0 kept in scripts/compare-was/);
/preview/<token>/now/ is the site as it is in this build. Every page in
both copies gets a switch at the top that opens the same page in the other
copy at the same scroll position, so the two can be compared page by page.

Pictures and fonts are not copied: both copies load them from the site
root. Pages, styles, scripts and partials are copied, so each copy looks
exactly like its own version.

Run from scripts/build-production.sh with the build directory.
"""

from __future__ import annotations

import pathlib
import re
import shutil
import sys

TOKEN = "sravni-a2b0-3fca-6957"
ROOT = pathlib.Path(__file__).resolve().parent.parent
WAS = ROOT / "scripts" / "compare-was"
PAGES = [
    "index.html", "portfolio.html", "about.html", "dodo.html", "kim-chips.html",
    "lavatop.html", "rangos.html", "sporos.html", "toolpar.html", "yandex.html",
    "vacancies.html", "vacancy-motion-designer.html", "soon.html",
]
CHARSET = '<meta charset="utf-8" />'
NOINDEX = '    <meta name="robots" content="noindex,nofollow">\n'
ASSET = re.compile(r'(?<=["\'(\s,|])(?:\.\./)?(images|fonts)/')

SWITCH = """
    <div id="cmp-switch" style="position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:2147483647;display:flex;gap:2px;padding:3px;border-radius:999px;background:#0056d3;box-shadow:0 4px 16px rgba(0,0,0,.18);font:600 14px/1 -apple-system,BlinkMacSystemFont,sans-serif">
      <a href="../was/{page}" data-cmp style="padding:9px 16px;border-radius:999px;text-decoration:none;{was}">Было</a>
      <a href="../now/{page}" data-cmp style="padding:9px 16px;border-radius:999px;text-decoration:none;{now}">Стало</a>
    </div>
    <script>
      (function () {{
        // Keep the reading position when switching between the two copies.
        var key = 'cmp-scroll:{page}';
        try {{
          var y = sessionStorage.getItem(key);
          if (y !== null) {{
            sessionStorage.removeItem(key);
            var ratio = parseFloat(y);
            var go = function () {{ window.scrollTo(0, ratio * (document.documentElement.scrollHeight - innerHeight)); }};
            window.addEventListener('load', function () {{ go(); setTimeout(go, 400); }});
          }}
        }} catch (e) {{}}
        document.querySelectorAll('#cmp-switch [data-cmp]').forEach(function (a) {{
          a.addEventListener('click', function () {{
            try {{
              var max = document.documentElement.scrollHeight - innerHeight;
              sessionStorage.setItem(key, String(max > 0 ? scrollY / max : 0));
            }} catch (e) {{}}
          }});
        }});
      }})();
    </script>
  </body>"""
ON = "background:#fff;color:#0056d3"
OFF = "color:#fff"


def copy_tree(src: pathlib.Path, dst: pathlib.Path) -> None:
    for sub in ("css", "js", "partials"):
        shutil.copytree(src / sub, dst / sub, dirs_exist_ok=True)
    for page in PAGES:
        shutil.copy2(src / page, dst / page)


def rewrite(dst: pathlib.Path, side: str) -> None:
    for path in list(dst.rglob("*.css")) + list(dst.rglob("*.js")) + list(dst.rglob("*.html")):
        text = path.read_text(encoding="utf-8")
        text = ASSET.sub(r"/\1/", text)
        text = text.replace('href="/"', 'href="index.html"')
        if path.parent == dst and path.name in PAGES:
            if 'name="robots"' not in text and CHARSET in text:
                text = text.replace(CHARSET, CHARSET + "\n" + NOINDEX, 1)
            switch = SWITCH.format(page=path.name, was=ON if side == "was" else OFF, now=ON if side == "now" else OFF)
            text = text.replace("  </body>", switch, 1) if "  </body>" in text else text.replace("</body>", switch, 1)
        path.write_text(text, encoding="utf-8")


def main() -> None:
    site_dir = pathlib.Path(sys.argv[1]).resolve()
    out = site_dir / "preview" / TOKEN
    if out.exists():
        shutil.rmtree(out)
    for side, src in (("was", WAS), ("now", ROOT)):
        dst = out / side
        dst.mkdir(parents=True)
        copy_tree(src, dst)
        rewrite(dst, side)
    (out / "index.html").write_text(
        '<!DOCTYPE html><meta charset="utf-8"><meta name="robots" content="noindex,nofollow">'
        '<meta http-equiv="refresh" content="0; url=was/index.html"><a href="was/index.html">Было / стало</a>\n',
        encoding="utf-8",
    )
    print(f"Compare preview: /preview/{TOKEN}/  (was = 13 October, now = this build)")


if __name__ == "__main__":
    main()
