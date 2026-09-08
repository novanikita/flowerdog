#!/usr/bin/env python3
"""Generate social preview JPEGs and inject Open Graph / Twitter meta into HTML pages.

Telegram and most messengers require absolute HTTPS URLs and JPEG/PNG images —
AVIF and MP4 are ignored. Case pages use a still from the first gallery media;
site pages use images/icon/meta.png.
"""

from __future__ import annotations

import html as html_lib
import pathlib
import re
import subprocess
import sys
from html.parser import HTMLParser

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE_ORIGIN = "https://flowerdog.studio"
DEFAULT_IMAGE = "images/icon/meta.png"
DEFAULT_DESCRIPTION = (
    "Круто работаем с едой и коммуникационкой. "
    "У нас сильный корпоративный опыт, мы системные и вовлеченные, с нами кайфово."
)
OG_DIR = ROOT / "images" / "og"

# Pages that always share the site meta image (not case galleries).
SITE_META_PAGES = {
    "index.html",
    "about.html",
    "portfolio.html",
    "how-we-work.html",
    "soon.html",
    "audit.html",
}

# Case pages with a hand-picked og:image (images/og/<stem>.jpg) — never
# overwrite these from the gallery, even on re-runs.
MANUAL_OG_IMAGES = {
    "dodo",
    "kim-chips",
    "lavatop",
    "rangos",
    "sber500",
    "sporos",
    "toolpar",
    "yandex",
}

PAGE_DESCRIPTION_OVERRIDES = {
    "portfolio.html": "Все проекты студии Flowerdog — айдентика, сайты, упаковка и коммуникационный дизайн.",
    "soon.html": "Скоро покажем новый проект Flowerdog.",
    "about.html": (
        "Мы что-то среднее между корпоративным инхаусом и креативной студией: "
        "камерная, небольшая команда, и в этом наше главное отличие и преимущество."
    ),
}

# Remove managed tags one-by-one so re-runs stay idempotent.
# Only consume same-line trailing spaces + one newline — never the next line's indent.
MANAGED_TAG_RE = re.compile(
    r"[ \t]*<"
    r"(?:"
    r'meta\s+name="description"[^>]*>|'
    r'meta\s+property="og:[^"]+"[^>]*>|'
    r'meta\s+name="twitter:[^"]+"[^>]*>|'
    r'link\s+rel="canonical"[^>]*>'
    r")[ \t]*\r?\n?",
    re.I,
)


class FirstMediaParser(HTMLParser):
    """Find the first <img src> or <video>/<source src> in document order after </head>."""

    def __init__(self) -> None:
        super().__init__()
        self.in_head = False
        self.done_head = False
        self.result: tuple[str, str] | None = None  # (kind, src)

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if self.result is not None:
            return
        tag = tag.lower()
        if tag == "head":
            self.in_head = True
            return
        if self.in_head:
            return
        if not self.done_head and tag == "body":
            self.done_head = True

        attr = {k.lower(): (v or "") for k, v in attrs}
        if tag == "img" and attr.get("src"):
            src = attr["src"]
            if not self._skip(src):
                self.result = ("image", src)
        elif tag == "video":
            if attr.get("poster") and not self._skip(attr["poster"]):
                self.result = ("image", attr["poster"])
            elif attr.get("src") and not self._skip(attr["src"]):
                self.result = ("video", attr["src"])
        elif tag == "source" and attr.get("src"):
            src = attr["src"]
            if src.lower().endswith((".mp4", ".webm", ".mov")) and not self._skip(src):
                self.result = ("video", src)
            elif not self._skip(src):
                self.result = ("image", src)

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "head":
            self.in_head = False
            self.done_head = True

    @staticmethod
    def _skip(src: str) -> bool:
        s = src.lower()
        return (
            "portrait/" in s
            or "icon/" in s
            or s.endswith(".svg")
            or s.startswith("data:")
        )


def clean_text(raw: str) -> str:
    text = re.sub(r"<[^>]+>", "", raw)
    text = html_lib.unescape(text)
    text = text.replace("\xa0", " ").replace("&nbsp;", " ")
    return re.sub(r"\s+", " ", text).strip()


def truncate(text: str, limit: int = 200) -> str:
    if len(text) <= limit:
        return text
    cut = text[: limit - 1].rsplit(" ", 1)[0]
    return cut.rstrip(".,;:") + "…"


def page_title(html: str) -> str:
    m = re.search(r"<title[^>]*>(.*?)</title>", html, re.S | re.I)
    if not m:
        return "Flowerdog"
    return clean_text(m.group(1)) or "Flowerdog"


def page_description(path: pathlib.Path, html: str) -> str:
    override = PAGE_DESCRIPTION_OVERRIDES.get(path.name)
    if override:
        return truncate(override)

    if path.name == "index.html":
        return DEFAULT_DESCRIPTION

    h1_p = re.search(r"<h1[^>]*>.*?</h1>\s*<p[^>]*>(.*?)</p>", html, re.S | re.I)
    if h1_p:
        desc = clean_text(h1_p.group(1))
        if len(desc) >= 40:
            return truncate(desc)

    for m in re.finditer(r"<p[^>]*>(.*?)</p>", html, re.S | re.I):
        desc = clean_text(m.group(1))
        if len(desc) >= 40:
            return truncate(desc)

    return DEFAULT_DESCRIPTION


def first_gallery_media(html: str) -> tuple[str, str] | None:
    parser = FirstMediaParser()
    parser.feed(html)
    return parser.result


def resolve_local(src: str) -> pathlib.Path:
    src = src.split("?", 1)[0].split("#", 1)[0]
    if src.startswith("/"):
        return ROOT / src.lstrip("/")
    return ROOT / src


def video_preview_seek(path: pathlib.Path) -> float:
    """Pick a seek time past the opening fade (≈25% of duration, capped)."""
    probe = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=nw=1:nk=1",
            str(path),
        ],
        capture_output=True,
        text=True,
    )
    try:
        duration = float((probe.stdout or "").strip())
    except ValueError:
        duration = 0.0
    if duration <= 0:
        return 0.5
    return min(max(duration * 0.25, 0.5), 2.5)


def ensure_og_jpeg(page_stem: str, kind: str, src: str) -> str | None:
    """Return site-relative path to a JPEG suitable for og:image."""
    local = resolve_local(src)
    if not local.is_file():
        print(f"  ! missing media: {src}", file=sys.stderr)
        return None

    OG_DIR.mkdir(parents=True, exist_ok=True)
    out = OG_DIR / f"{page_stem}.jpg"
    suffix = local.suffix.lower()

    if suffix in {".jpg", ".jpeg", ".png"} and kind == "image":
        # Re-encode to a consistent, messenger-friendly JPEG under ~1200px.
        cmd = [
            "ffmpeg",
            "-y",
            "-i",
            str(local),
            "-vf",
            "scale='min(1200,iw)':-2",
            "-q:v",
            "3",
            "-update",
            "1",
            str(out),
        ]
    elif kind == "video" or suffix in {".mp4", ".webm", ".mov"}:
        # Skip opening fades — first frames are often nearly empty.
        seek = video_preview_seek(local)
        cmd = [
            "ffmpeg",
            "-y",
            "-ss",
            f"{seek:.2f}",
            "-i",
            str(local),
            "-frames:v",
            "1",
            "-vf",
            "scale='min(1200,iw)':-2",
            "-q:v",
            "3",
            "-update",
            "1",
            str(out),
        ]
    else:
        # AVIF and others via ffmpeg
        cmd = [
            "ffmpeg",
            "-y",
            "-i",
            str(local),
            "-frames:v",
            "1",
            "-vf",
            "scale='min(1200,iw)':-2",
            "-q:v",
            "3",
            "-update",
            "1",
            str(out),
        ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0 or not out.is_file():
        print(f"  ! ffmpeg failed for {src}: {result.stderr[-400:]}", file=sys.stderr)
        return None

    return f"images/og/{page_stem}.jpg"


def absolute_url(path: str) -> str:
    path = path.lstrip("/")
    return f"{SITE_ORIGIN}/{path}"


def page_canonical(path: pathlib.Path) -> str:
    if path.name == "index.html":
        return f"{SITE_ORIGIN}/"
    return f"{SITE_ORIGIN}/{path.stem}"


def attr_escape(value: str) -> str:
    return (
        value.replace("&", "&amp;")
        .replace('"', "&quot;")
        .replace("<", "&lt;")
    )


def build_meta_block(
    *,
    title: str,
    description: str,
    canonical: str,
    image_url: str,
    image_type: str,
    image_alt: str,
) -> str:
    lines = [
        f'    <meta name="description" content="{attr_escape(description)}" />',
        '    <meta property="og:type" content="website" />',
        f'    <meta property="og:title" content="{attr_escape(title)}" />',
        f'    <meta property="og:description" content="{attr_escape(description)}" />',
        f'    <link rel="canonical" href="{attr_escape(canonical)}" />',
        f'    <meta property="og:url" content="{attr_escape(canonical)}" />',
        f'    <meta property="og:image" content="{attr_escape(image_url)}" />',
        f'    <meta property="og:image:secure_url" content="{attr_escape(image_url)}" />',
        f'    <meta property="og:image:type" content="{attr_escape(image_type)}" />',
        '    <meta property="og:site_name" content="Flowerdog" />',
        '    <meta property="og:locale" content="ru_RU" />',
        f'    <meta property="og:image:alt" content="{attr_escape(image_alt)}" />',
        '    <meta name="twitter:card" content="summary_large_image" />',
        f'    <meta name="twitter:title" content="{attr_escape(title)}" />',
        f'    <meta name="twitter:description" content="{attr_escape(description)}" />',
        f'    <meta name="twitter:image" content="{attr_escape(image_url)}" />',
        f'    <meta name="twitter:image:alt" content="{attr_escape(image_alt)}" />',
        f'    <meta name="twitter:url" content="{attr_escape(canonical)}" />',
    ]
    return "\n".join(lines) + "\n"


def inject_meta(html: str, block: str) -> str:
    # Drop previously managed tags so the script is idempotent.
    cleaned = MANAGED_TAG_RE.sub("", html)

    # Insert right after </title>, preserving indentation of the following line.
    title_re = re.compile(r"(<title[^>]*>.*?</title>)(\r?\n)?", re.S | re.I)
    m = title_re.search(cleaned)
    if m:
        insert_at = m.end(1)
        newline = m.group(2) or "\n"
        return cleaned[:insert_at] + newline + block + cleaned[m.end() :]

    charset = '<meta charset="utf-8" />'
    if charset in cleaned:
        return cleaned.replace(charset, charset + "\n" + block, 1)

    raise ValueError("Could not find <title> or charset to inject meta")

def process_page(path: pathlib.Path) -> None:
    html = path.read_text(encoding="utf-8")
    title = page_title(html)
    description = page_description(path, html)
    canonical = page_canonical(path)

    image_rel = DEFAULT_IMAGE
    image_type = "image/png"

    if path.stem in MANUAL_OG_IMAGES:
        manual = OG_DIR / f"{path.stem}.jpg"
        if manual.is_file():
            image_rel = f"images/og/{path.stem}.jpg"
            image_type = "image/jpeg"
            print(f"  manual og:image → {image_rel}")
        else:
            print(f"  ! manual og:image missing on disk: {manual}", file=sys.stderr)
    elif path.name not in SITE_META_PAGES:
        media = first_gallery_media(html)
        if media:
            kind, src = media
            print(f"  first media ({kind}): {src}")
            generated = ensure_og_jpeg(path.stem, kind, src)
            if generated:
                image_rel = generated
                image_type = "image/jpeg"
            else:
                print("  falling back to meta.png", file=sys.stderr)
        else:
            print("  no gallery media, using meta.png")

    image_url = absolute_url(image_rel)
    block = build_meta_block(
        title=title,
        description=description,
        canonical=canonical,
        image_url=image_url,
        image_type=image_type,
        image_alt=title,
    )
    updated = inject_meta(html, block)
    path.write_text(updated, encoding="utf-8")
    print(f"  og:image → {image_url}")


def main() -> int:
    pages = sorted(ROOT.glob("*.html"))
    if not pages:
        print("No HTML pages found", file=sys.stderr)
        return 1

    print(f"Syncing Open Graph meta for {len(pages)} pages → {SITE_ORIGIN}")
    for path in pages:
        print(f"\n{path.name}")
        try:
            process_page(path)
        except Exception as exc:  # noqa: BLE001
            print(f"  ERROR: {exc}", file=sys.stderr)
            return 1

    print("\nDone. Re-run scripts/sync-preview-pages.py if preview copies need updating.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
