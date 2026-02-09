import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FRONT = ROOT / "Frontend"


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return ""


def rel(path: Path) -> str:
    return str(path.relative_to(ROOT)).replace("\\", "/")


def main() -> None:
    html_files = sorted(FRONT.rglob("*.html"))
    css_files = sorted(FRONT.rglob("*.css"))
    js_files = sorted(FRONT.rglob("*.js"))

    sources = [(p, read_text(p)) for p in (html_files + css_files + js_files)]

    # Orphan HTML (filename not referenced by other HTML/JS)
    html_js_sources = [(p, txt) for (p, txt) in sources if p.suffix.lower() in (".html", ".js")]
    orphans: list[Path] = []
    for page in html_files:
        name = page.name
        referenced = any(
            (sp != page and re.search(re.escape(name), txt, re.IGNORECASE))
            for sp, txt in html_js_sources
        )
        if not referenced and page.name.lower() != "index.html":
            orphans.append(page)

    # Linked CSS/JS from HTML
    css_link_re = re.compile(
        r"<link[^>]+href\s*=\s*['\"]([^'\"]+\.css)(?:\?[^'\"]*)?(?:#[^'\"]*)?['\"]",
        re.I,
    )
    js_src_re = re.compile(
        r"<script[^>]+src\s*=\s*['\"]([^'\"]+\.js)(?:\?[^'\"]*)?(?:#[^'\"]*)?['\"]",
        re.I,
    )

    linked_css: set[str] = set()
    linked_js: set[str] = set()
    for p, txt in sources:
        if p.suffix.lower() != ".html":
            continue
        linked_css.update(Path(href).name.lower() for href in css_link_re.findall(txt))
        linked_js.update(Path(src).name.lower() for src in js_src_re.findall(txt))

    unlinked_css = [p for p in css_files if p.name.lower() not in linked_css]
    unlinked_js = [p for p in js_files if p.name.lower() not in linked_js]

    # Unused images (filename not mentioned anywhere in HTML/CSS/JS)
    images_dir = FRONT / "images"
    img_exts = {".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".avif", ".ico"}
    image_files = sorted([p for p in images_dir.rglob("*") if p.is_file() and p.suffix.lower() in img_exts])

    corpus = "\n".join(txt for _, txt in sources).lower()
    unused_images = [img for img in image_files if img.name.lower() not in corpus]

    print(
        "FRONTEND_COUNTS",
        {"html": len(html_files), "css": len(css_files), "js": len(js_files), "images": len(image_files)},
    )
    print("\nORPHAN_HTML", len(orphans))
    for p in orphans:
        print(" -", rel(p))

    print("\nUNLINKED_CSS", len(unlinked_css))
    for p in unlinked_css:
        print(" -", rel(p))

    print("\nUNLINKED_JS", len(unlinked_js))
    for p in unlinked_js:
        print(" -", rel(p))

    print("\nUNUSED_IMAGES", len(unused_images))
    for p in unused_images:
        print(" -", rel(p))


if __name__ == "__main__":
    main()
