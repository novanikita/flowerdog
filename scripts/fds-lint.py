#!/usr/bin/env python3
"""Check that the site stays inside the design system (docs/fds.md).

    python3 scripts/fds-lint.py

Styles (css/fds-*.css, except the third-party normalize):
  - every class is fds-…, or a state is-… / has-…;
  - a modifier (--x) is a word of the agreed vocabulary;
  - no :has(), no selectors by page, client or language (one allowed
    exception: English hyphenation), no !important outside reduced motion;
  - font sizes, weights and radii come from tokens;
  - colours and pixels live only in the tokens and the base size formula;
  - media queries use the agreed borders only.
Pages (*.html, partials) and scripts (js/*.js):
  - every fds- class they use exists in the styles;
  - inline styles only for background-image (content) on site pages.

Exits 1 and lists every problem with its file and line.
"""

from __future__ import annotations

import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
CSS = sorted(p for p in (ROOT / "css").glob("fds-*.css") if p.name != "fds-normalize.css")
TOKENS = {"fds-tokens.css", "fds-settings.css"}

SIZES = {"2xs", "xs", "s", "m", "l", "xl", "2xl", "3xs", "2", "3"}
VOCABULARY = SIZES | {
    "regular", "medium",                    # weight
    "accent", "muted",                      # colour
    "hard", "tight", "soft", "round",       # shape
    "outline", "contain", "zoom",           # picture
    "top", "left", "aside",                 # alignment and placement
    "cta", "anchor",                        # kind of link
    "mobile-s", "mobile-2",                 # only on a phone
} | {f"{k}-{s}" for k in ("gap", "row-gap", "col-gap") for s in SIZES}
MEDIA = {
    "(width <= 768px)", "(width > 768px)", "(width <= 1024px)",
    "(prefers-reduced-motion: reduce)", "(prefers-reduced-motion: no-preference)",
}
VALUE_RULES = {
    "font-size": re.compile(r"^(var\(--fds-(type|size)-[\w-]+\)|var\(--fds-[\w-]+, var\(--fds-(type|size)-[\w-]+\)\)|inherit|1em|0)$"),
    "font-weight": re.compile(r"^(var\(--fds-weight-(regular|medium)\)|inherit)$"),
    "border-radius": re.compile(r"^(var\(--fds-radius-[\w-]+\)|0|inherit)$"),
}
COLOUR = re.compile(r"#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(")
PIXELS = re.compile(r"(?<![\w.-])(\d*\.?\d+)px\b")
HAIRLINES = {"0.5", "1", "2"}

problems: list[str] = []


def report(path: pathlib.Path, line: int, text: str) -> None:
    entry = f"{path.relative_to(ROOT)}:{line}: {text}"
    if entry not in problems:
        problems.append(entry)


def blocks(text: str):
    """Yield (selector context, declarations, line) for every rule, nesting included."""
    stack: list[str] = []
    buf, start = "", 1
    line = 1
    for ch in re.sub(r"/\*.*?\*/", lambda m: re.sub(r"[^\n]", " ", m.group(0)), text, flags=re.S):
        if ch == "\n":
            line += 1
        if ch == "{":
            stack.append(" ".join(buf.split()))
            buf, start = "", line
        elif ch == "}":
            if buf.strip():
                yield list(stack), buf, start
            if stack:
                stack.pop()
            buf, start = "", line
        elif ch == ";":
            yield list(stack), buf + ";", line
            buf = ""
        else:
            buf += ch


css_classes: set[str] = set()


def check_css(path: pathlib.Path) -> None:
    text = path.read_text(encoding="utf-8")
    for cls in re.findall(r"\.(-?[a-zA-Z_][\w-]*)", re.sub(r"url\([^)]*\)|\d\.\d+", "", text)):
        css_classes.add(cls)
    for ctx, decl, line in blocks(text):
        selectors = " ".join(c for c in ctx if not c.startswith("@"))
        medias = [c for c in ctx if c.startswith("@media")]
        in_reduced = any("prefers-reduced-motion: reduce" in m for m in medias)
        for media in medias:
            cond = media[len("@media"):].strip()
            if cond not in MEDIA:
                report(path, line, f"border not in the system: {media}")
        if ":has(" in selectors:
            report(path, line, f"no :has() — use a modifier or markup: {selectors}")
        if re.search(r"data-page|data-client-tag", selectors):
            report(path, line, f"no selectors by page or client: {selectors}")
        for cls in re.findall(r"\.([a-zA-Z][\w-]*)", selectors):
            if not re.match(r"(fds-|is-|has-)", cls):
                report(path, line, f"class outside the system: .{cls}")
            mod = re.match(r"fds-[\w]+(?:__[\w-]+?)?--([\w-]+)$", cls)
            if mod and mod.group(1) not in VOCABULARY:
                report(path, line, f"modifier not in the vocabulary: .{cls}")
        if ":" not in decl or decl.strip().startswith("@"):
            continue
        prop, _, value = decl.strip().rstrip(";").partition(":")
        prop, value = prop.strip(), value.strip()
        if "data-lang" in selectors and prop != "hyphens":
            report(path, line, f"the language may change hyphenation only: {selectors}")
        if "!important" in value and not in_reduced:
            report(path, line, f"no !important: {prop}: {value}")
        value = value.replace("!important", "").strip()
        if path.name in TOKENS or prop.startswith("--"):
            continue
        if any("@font-face" in c for c in ctx):
            continue
        rule = VALUE_RULES.get(prop)
        if rule and not rule.match(value):
            report(path, line, f"{prop} must come from a token: {value}")
        if COLOUR.search(value):
            report(path, line, f"colour must come from a token: {prop}: {value}")
        for px in PIXELS.findall(value):
            if px not in HAIRLINES:
                report(path, line, f"no pixels outside the tokens: {prop}: {value}")


def check_markup(path: pathlib.Path, is_script: bool) -> None:
    text = path.read_text(encoding="utf-8")
    if is_script:
        text = re.sub(r"/\*.*?\*/|(?<![:'\"\\])//[^\n]*", "", text, flags=re.S)
        names = re.findall(r"(?<![\w-])(fds-[a-z][\w-]*)", " ".join(re.findall(r"['\"]([^'\"]*fds-[^'\"]*)['\"]", text)))
        names = [n for n in names if not n.startswith(("fds-header__", "fds-footer__")) or n in css_classes]
    else:
        names = [c for attr in re.findall(r'class="([^"]*)"', text) for c in attr.split() if c.startswith("fds-")]
    for name in sorted(set(names)):
        if name in css_classes or name in ("fds-gallery",) or name.startswith(("fds-reveal", "fds-tune")):
            continue
        line = text[: text.find(name)].count("\n") + 1
        report(path, line, f"class not in the styles: {name}")
    if not is_script and path.name != "design-system.html":
        for m in re.finditer(r'style="([^"]*)"', text):
            if not re.fullmatch(r"\s*background-image:[^;]*;?\s*", m.group(1)):
                report(path, text[: m.start()].count("\n") + 1, f"inline style: {m.group(1)}")


def main() -> int:
    for path in CSS:
        check_css(path)
    pages = sorted(ROOT.glob("*.html")) + sorted((ROOT / "partials").glob("*.html"))
    for path in pages:
        check_markup(path, is_script=False)
    for path in sorted((ROOT / "js").glob("*.js")):
        check_markup(path, is_script=True)
    for p in problems:
        print(p)
    print(f"fds-lint: {len(problems)} problem(s) in {len(CSS)} style files, {len(pages)} pages")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
