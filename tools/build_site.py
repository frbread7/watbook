#!/usr/bin/env python3
"""Build WATBook's bilingual static site from its checked-in content and manifest."""
from __future__ import annotations

import html
import json
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
MANIFEST = ROOT / "library-manifest.json"
CHAPTER_ID = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")

UI = {
    "en": {
        "skip": "Skip to content", "home": "Book home", "chapters": "Chapters", "lab": "Interactive lab",
        "sources": "References", "language": "한국어", "theme": "Dark theme", "nav_label": "Primary navigation", "prev": "Previous chapter",
        "next": "Next chapter", "contents": "In this chapter", "brand_subtitle": "Wafer Acceptance Test & Parametric Engineering",
        "license": "License & attribution", "table_label": "Scrollable data table",
        "footer_brand": "Independent technical textbook · CC BY 4.0 text · MIT code",
        "footer": "Synthetic teaching examples are labeled.",
    },
    "ko": {
        "skip": "본문으로 건너뛰기", "home": "책 홈", "chapters": "목차", "lab": "인터랙티브 실험실",
        "sources": "참고문헌", "language": "English", "theme": "어두운 테마", "nav_label": "주요 내비게이션", "prev": "이전 장",
        "next": "다음 장", "contents": "이 장의 구성", "brand_subtitle": "웨이퍼 전기적 특성 평가와 파라미터 엔지니어링",
        "license": "라이선스 및 저작자 표시", "table_label": "가로로 스크롤하는 표",
        "footer_brand": "독립 기술 교재 · CC BY 4.0 콘텐츠 · MIT 코드",
        "footer": "교육용 예제 데이터는 합성 데이터로 표시합니다.",
    },
}


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def chapter_intro(path: Path) -> str:
    source = path.read_text(encoding="utf-8")
    match = re.search(r'<p\s+class=["\']chapter-intro["\']\s*>(.*?)</p\s*>', source, flags=re.IGNORECASE | re.DOTALL)
    if not match:
        raise ValueError(f"chapter is missing a localized chapter-intro paragraph: {path.relative_to(ROOT)}")
    text = re.sub(r"<[^>]*>", " ", match.group(1))
    summary = " ".join(html.unescape(text).split())
    if not summary:
        raise ValueError(f"chapter-intro paragraph must not be empty: {path.relative_to(ROOT)}")
    return summary


def href(base: str, target: str) -> str:
    return f"{base}/{target}" if base != "." else f"./{target}"


def shell(*, lang: str, title: str, description: str, canonical: str, base: str,
          page_kind: str, content: str, manifest: dict, active_id: str | None = None) -> str:
    ui = UI[lang]
    title_full = f"{html.escape(title)} · WATBook"
    page_nav_base = "../" if page_kind.endswith("-chapter") else "./"
    home_href = page_nav_base + "index.html"
    lab_href = page_nav_base + "lab.html"
    refs_href = page_nav_base + "references.html"
    license_href = page_nav_base + "license.html"
    alternate = f"{base}/../" if base != "." else "./ko/"
    if page_kind == "ko-home":
        alternate = "../index.html"
    elif page_kind == "en-chapter":
        alternate = f"../ko/chapters/{active_id}.html"
    elif page_kind == "ko-chapter":
        alternate = f"../../chapters/{active_id}.html"
    elif page_kind == "en-lab":
        alternate = "./ko/lab.html"
    elif page_kind == "ko-lab":
        alternate = "../lab.html"
    elif page_kind == "en-references":
        alternate = "./ko/references.html"
    elif page_kind == "ko-references":
        alternate = "../references.html"
    elif page_kind == "en-license":
        alternate = "./ko/license.html"
    elif page_kind == "ko-license":
        alternate = "../license.html"
    css = href(base, "assets/css/site.css")
    script = href(base, "assets/js/site.js")
    language_link = f'<a class="language-switch" href="{html.escape(alternate)}" lang="{"ko" if lang == "en" else "en"}">{ui["language"]}</a>'
    nav = (
        f'<a href="{home_href}">{ui["home"]}</a>'
        f'<a href="{home_href}#chapter-list">{ui["chapters"]}</a>'
        f'<a href="{lab_href}">{ui["lab"]}</a>'
        f'<a href="{refs_href}">{ui["sources"]}</a>'
    )
    og_image = manifest["productionUrl"].rstrip("/") + "/assets/covers/watbook.svg"
    return f'''<!doctype html>
<html lang="{lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="{html.escape(description, quote=True)}">
  <meta name="color-scheme" content="light dark">
  <meta property="og:type" content="website">
  <meta property="og:title" content="{html.escape(title_full, quote=True)}">
  <meta property="og:description" content="{html.escape(description, quote=True)}">
  <meta property="og:url" content="{html.escape(canonical, quote=True)}">
  <meta property="og:image" content="{html.escape(og_image, quote=True)}">
  <link rel="canonical" href="{html.escape(canonical, quote=True)}">
  <link rel="stylesheet" href="{css}">
  <link rel="icon" href="{href(base, 'assets/mark.svg')}" type="image/svg+xml">
  <title>{title_full}</title>
</head>
<body data-page="{page_kind}">
  <a class="skip-link" href="#main">{ui["skip"]}</a>
  <header class="site-header">
    <a class="brand" href="{home_href}" aria-label="WATBook — {ui["home"]}"><span class="brand-mark" aria-hidden="true">W</span><span><strong>WATBook</strong><small>{ui["brand_subtitle"]}</small></span></a>
    <nav class="top-nav" aria-label="{ui["nav_label"]}">{nav}</nav>
    <div class="header-tools">{language_link}<button type="button" class="theme-toggle" id="theme-toggle" aria-label="{ui["theme"]}" aria-pressed="false"><span aria-hidden="true">◐</span></button></div>
  </header>
  {content}
  <footer class="site-footer"><span>{ui["footer_brand"]}</span><span>{ui["footer"]}</span><a href="{license_href}">{ui["license"]}</a></footer>
  <script src="{script}" defer></script>
</body>
</html>
'''


def build():
    manifest = read_json(MANIFEST)
    chapters = sorted(manifest["chapters"], key=lambda row: row["number"])
    if manifest["chapterCount"] != len(chapters) or not chapters:
        raise ValueError("manifest chapterCount must match a non-empty chapter index")
    if DIST.exists() and (DIST.is_symlink() or DIST.resolve().parent != ROOT):
        raise ValueError("refusing to replace an unexpected dist path")
    for row in chapters:
        if not isinstance(row, dict):
            raise ValueError("chapter records must be objects")
        chapter_id = row.get("id")
        if not isinstance(chapter_id, str) or not CHAPTER_ID.fullmatch(chapter_id):
            raise ValueError(f"unsafe chapter ID: {chapter_id!r}")
    if len({row["id"] for row in chapters}) != len(chapters):
        raise ValueError("chapter IDs must be unique")
    if set(manifest["languages"]) != {"en", "ko"}:
        raise ValueError("languages must contain exactly en and ko")
    sources_by_language = {}
    content_root = (ROOT / "content").resolve()
    if content_root.parent != ROOT.resolve():
        raise ValueError("content source directory escapes repository root")
    for language in manifest["languages"]:
        language_root = (content_root / language).resolve()
        if language_root.parent != content_root:
            raise ValueError(f"{language} source directory escapes content root")
        chapter_base = (language_root / "chapters").resolve()
        if chapter_base.parent != language_root:
            raise ValueError(f"{language} chapter source directory escapes its language root")
        expected = [chapter_base / f"{row['id']}.html" for row in chapters]
        if any(path.resolve().parent != chapter_base for path in expected):
            raise ValueError(f"chapter source path escapes {chapter_base}")
        pages = [ROOT / "content" / language / page for page in ("index.html", "lab.html", "references.html", "license.html")]
        missing = [path.relative_to(ROOT).as_posix() for path in expected + pages if not path.is_file()]
        if missing:
            raise ValueError(f"missing {language} source pages: {', '.join(missing)}")
        sources_by_language[language] = {
            "home": pages[0], "lab": pages[1], "references": pages[2], "license": pages[3],
            "chapters": expected, "summaries": [chapter_intro(path) for path in expected],
        }

    # Resolve every chapter destination before replacing an existing build. A
    # valid slug prevents lexical traversal; this check also rejects a nested
    # symlink in an existing dist tree that would redirect writes elsewhere.
    chapter_outputs = {}
    resolved_dist = DIST.resolve()
    for language in manifest["languages"]:
        output_root = DIST / ("ko" if language == "ko" else "") / "chapters"
        outputs = []
        for row in chapters:
            output_path = output_root / f"{row['id']}.html"
            resolved_output = output_path.resolve()
            if resolved_output == resolved_dist or resolved_dist not in resolved_output.parents:
                raise ValueError(f"chapter output path escapes dist: {output_path}")
            outputs.append(output_path)
        chapter_outputs[language] = outputs

    if DIST.exists():
        if DIST.is_symlink() or DIST.resolve().parent != ROOT:
            raise ValueError("refusing to replace an unexpected dist path")
        shutil.rmtree(DIST)
    DIST.mkdir()
    shutil.copytree(ROOT / "assets", DIST / "assets")
    (DIST / ".nojekyll").write_text("", encoding="utf-8")
    for notice in ("LICENSE.md", "LICENSE-AND-ATTRIBUTION.md", "LICENSE-CC-BY-4.0", "LICENSE-MIT"):
        shutil.copyfile(ROOT / notice, DIST / notice)

    for language in manifest["languages"]:
        is_ko = language == "ko"
        sources = sources_by_language[language]
        home_src, lab_src, refs_src = sources["home"], sources["lab"], sources["references"]
        target_root = DIST / "ko" if is_ko else DIST
        target_root.mkdir(parents=True, exist_ok=True)
        base = ".." if is_ko else "."
        home_body = home_src.read_text(encoding="utf-8").replace("{{ASSET_BASE}}", href(base, "assets"))
        chapter_list = []
        for row in chapters:
            chapter_url = ("chapters/" if not is_ko else "chapters/") + row["id"] + ".html"
            chapter_title = row["title"][language]
            summary = sources["summaries"][len(chapter_list)]
            chapter_list.append(f'<li><a class="chapter-card" href="{chapter_url}"><span class="chapter-number">{row["number"]:02d}</span><span><strong>{html.escape(chapter_title)}</strong><small>{html.escape(summary)}</small></span><span aria-hidden="true">↗</span></a></li>')
        home_body = home_body.replace("{{CHAPTER_LIST}}", "\n".join(chapter_list))
        home_description = manifest["description"][language]
        home_url = manifest["languageUrls"][language]
        home_html = shell(lang=language, title=manifest["title"][language], description=home_description,
                          canonical=home_url, base=base, page_kind="ko-home" if is_ko else "en-home",
                          content=home_body, manifest=manifest)
        (target_root / "index.html").write_text(home_html, encoding="utf-8")
        for source, name, page_kind, page_title in (
            (lab_src, "lab.html", "ko-lab" if is_ko else "en-lab", "인터랙티브 WAT 실험실" if is_ko else "Interactive WAT laboratory"),
            (refs_src, "references.html", "ko-references" if is_ko else "en-references", "참고문헌과 용어" if is_ko else "References and glossary"),
            (sources["license"], "license.html", "ko-license" if is_ko else "en-license", "라이선스 및 저작자 표시" if is_ko else "License and attribution"),
        ):
            page_body = source.read_text(encoding="utf-8").replace("{{ASSET_BASE}}", href(base, "assets"))
            canonical = manifest["languageUrls"][language].rstrip("/") + "/" + name
            page_html = shell(lang=language, title=page_title, description=home_description,
                              canonical=canonical, base=base, page_kind=page_kind, content=page_body, manifest=manifest)
            (target_root / name).write_text(page_html, encoding="utf-8")

        chapter_root = target_root / "chapters"
        chapter_root.mkdir(exist_ok=True)
        for index, row in enumerate(chapters):
            source = sources["chapters"][index]
            body = source.read_text(encoding="utf-8")
            table_label = UI[language]["table_label"]
            body = re.sub(r"<table(\s|>)", rf'<div class="table-scroll" role="region" aria-label="{table_label}" tabindex="0"><table\1', body, flags=re.IGNORECASE)
            body = re.sub(r"<th>", '<th scope="col">', body, flags=re.IGNORECASE)
            body = re.sub(r"</table\s*>", "</table></div>", body, flags=re.IGNORECASE)
            title = row["title"][language]
            summary = sources["summaries"][index]
            sibling_links = []
            if index:
                previous = chapters[index - 1]
                sibling_links.append(f'<a rel="prev" href="{previous["id"]}.html"><small>{UI[language]["prev"]}</small><strong>{html.escape(previous["title"][language])}</strong></a>')
            if index + 1 < len(chapters):
                following = chapters[index + 1]
                sibling_links.append(f'<a rel="next" href="{following["id"]}.html"><small>{UI[language]["next"]}</small><strong>{html.escape(following["title"][language])}</strong></a>')
            chapter_shell = f'''<main id="main" class="chapter-layout">
  <aside class="chapter-rail"><a class="back-link" href="../index.html">← {UI[language]["home"]}</a><p class="eyebrow">{row["number"]:02d} / {len(chapters):02d}</p><h2>{UI[language]["contents"]}</h2><ol>{''.join(f'<li><a href="{chapter["id"]}.html"{(" aria-current=page" if chapter["id"] == row["id"] else "")}>{html.escape(chapter["title"][language])}</a></li>' for chapter in chapters)}</ol></aside>
  <article class="chapter-content"><p class="eyebrow">WATBOOK · {row["number"]:02d}</p><h1>{html.escape(title)}</h1>{body}<nav class="chapter-pager" aria-label="{UI[language]["chapters"]}">{''.join(sibling_links)}</nav></article>
</main>'''
            relative_base = ".." if not is_ko else "../.."
            canonical = manifest["productionUrl"].rstrip("/") + ("/" if is_ko else "/") + ("ko/" if is_ko else "") + f"chapters/{row['id']}.html"
            chapter_html = shell(lang=language, title=title, description=summary, canonical=canonical,
                                 base=relative_base, page_kind="ko-chapter" if is_ko else "en-chapter",
                                 content=chapter_shell, manifest=manifest, active_id=row["id"])
            output_path = chapter_outputs[language][index]
            output_path.write_text(chapter_html, encoding="utf-8")
    print(f"Built {manifest['chapterCount']} chapters in {', '.join(manifest['languages'])} at {DIST}")


if __name__ == "__main__":
    try:
        build()
    except (OSError, ValueError, KeyError, json.JSONDecodeError) as exc:
        print(f"build_site: error: {exc}", file=sys.stderr)
        raise SystemExit(1)
