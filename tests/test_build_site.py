import json
import subprocess
import sys
import tempfile
import unittest
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
sys.path.insert(0, str(ROOT / "tools"))
import build_site


class PageParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids = set()
        self.id_values = []
        self.references = []
        self.lang = None
        self.title_depth = 0
        self.title = ""

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if tag == "html":
            self.lang = values.get("lang")
        if values.get("id"):
            self.ids.add(values["id"])
            self.id_values.append(values["id"])
        for attr in ("href", "src"):
            if values.get(attr):
                self.references.append((tag, attr, values[attr]))
        if tag == "title":
            self.title_depth += 1

    def handle_endtag(self, tag):
        if tag == "title" and self.title_depth:
            self.title_depth -= 1

    def handle_data(self, data):
        if self.title_depth:
            self.title += data


class BuildSiteTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        subprocess.run([sys.executable, "tools/build_site.py"], cwd=ROOT, check=True, capture_output=True, text=True)
        cls.manifest = json.loads((ROOT / "library-manifest.json").read_text(encoding="utf-8"))
        cls.pages = sorted(DIST.rglob("*.html"))

    def parse(self, path):
        parser = PageParser()
        parser.feed(path.read_text(encoding="utf-8"))
        parser.close()
        return parser

    def test_all_manifest_chapters_have_bilingual_routes(self):
        self.assertEqual(self.manifest["chapterCount"], len(self.manifest["chapters"]))
        self.assertEqual(set(self.manifest["languages"]), {"en", "ko"})
        for language in self.manifest["languages"]:
            prefix = DIST / ("ko/" if language == "ko" else "")
            self.assertTrue((prefix / "index.html").is_file())
            for chapter in self.manifest["chapters"]:
                route = prefix / "chapters" / (chapter["id"] + ".html")
                self.assertTrue(route.is_file(), route)
                parser = self.parse(route)
                self.assertEqual(parser.lang, language)
                self.assertIn(chapter["title"][language], route.read_text(encoding="utf-8"))

    def test_every_local_route_and_fragment_resolves(self):
        parsed = {page: self.parse(page) for page in self.pages}
        for page, parser in parsed.items():
            for tag, attr, reference in parser.references:
                parts = urlsplit(reference)
                if parts.scheme or parts.netloc or reference.startswith("data:"):
                    continue
                target = (page.parent / unquote(parts.path)).resolve() if parts.path else page
                self.assertTrue(target == DIST or DIST in target.parents, f"path escapes dist: {page}: {reference}")
                if target.is_dir():
                    target = target / "index.html"
                self.assertTrue(target.is_file(), f"broken {tag} {attr}: {page.relative_to(DIST)} -> {reference}")
                if parts.fragment:
                    target_parser = parsed.get(target)
                    if target_parser is None:
                        target_parser = self.parse(target)
                        parsed[target] = target_parser
                    self.assertIn(unquote(parts.fragment), target_parser.ids, f"missing fragment: {page} -> {reference}")

    def test_project_base_path_metadata_and_assets(self):
        for page in self.pages:
            parser = self.parse(page)
            self.assertIn(parser.lang, {"en", "ko"}, page)
            source = page.read_text(encoding="utf-8")
            self.assertNotIn("{{", source, page)
            self.assertNotIn("books.euiyun.com", source, page)
            self.assertNotIn("cloudflare", source.lower(), page)
            self.assertIn('<link rel="canonical" href="https://frbread7.github.io/watbook/', source, page)
            self.assertIn('<meta property="og:image" content="https://frbread7.github.io/watbook/assets/covers/watbook.svg"', source, page)
            self.assertIn("/watbook/", source, page)

    def test_language_controls_and_lab_ids_exist(self):
        for route, language in ((DIST / "lab.html", "en"), (DIST / "ko/lab.html", "ko")):
            source = route.read_text(encoding="utf-8")
            parser = self.parse(route)
            self.assertEqual(parser.lang, language)
            for experiment in self.manifest["experiments"]:
                fragment = urlsplit(experiment["url"]).fragment
                self.assertTrue(fragment, f"experiment URL has no anchor: {experiment['id']}")
                self.assertIn(fragment, parser.ids, f"missing experiment anchor in {language}: {experiment['id']}")
            self.assertIn("assets/js/lab.js", source)
        self.assertEqual(len(self.manifest["experiments"]), 6)

    def test_generated_pages_include_accessible_navigation_landmarks(self):
        for page in self.pages:
            source = page.read_text(encoding="utf-8")
            parser = self.parse(page)
            self.assertIn("id=\"main\"", source)
            self.assertIn("class=\"skip-link\"", source)
            self.assertIn("class=\"top-nav\" aria-label=", source)
            self.assertEqual(len(parser.id_values), len(parser.ids), f"duplicate HTML id in {page.relative_to(DIST)}")

    def test_chapter_path_traversal_is_rejected_before_dist_changes(self):
        manifest = json.loads((ROOT / "library-manifest.json").read_text(encoding="utf-8"))
        manifest["chapters"][0]["id"] = "../outside"
        with tempfile.TemporaryDirectory() as temporary:
            temp = Path(temporary)
            manifest_path = temp / "manifest.json"
            manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
            project_root = temp / "project"
            project_root.mkdir()
            dist = project_root / "dist"
            dist.mkdir()
            sentinel = dist / "preserve.txt"
            sentinel.write_text("existing output remains", encoding="utf-8")
            with patch.object(build_site, "ROOT", project_root), patch.object(build_site, "MANIFEST", manifest_path), patch.object(build_site, "DIST", dist):
                with self.assertRaisesRegex(ValueError, "unsafe chapter ID"):
                    build_site.build()
            self.assertEqual(sentinel.read_text(encoding="utf-8"), "existing output remains")

    def test_chapter_output_symlink_is_rejected_before_dist_changes(self):
        with tempfile.TemporaryDirectory() as temporary:
            temp = Path(temporary)
            project_root = temp / "project"
            for language, title in (("en", "Introduction"), ("ko", "소개")):
                chapter_dir = project_root / "content" / language / "chapters"
                chapter_dir.mkdir(parents=True)
                (chapter_dir / "intro.html").write_text("<p>Example</p>", encoding="utf-8")
                for page in ("index.html", "lab.html", "references.html", "license.html"):
                    (chapter_dir.parent / page).write_text("<main></main>", encoding="utf-8")
            manifest = {
                "chapterCount": 1,
                "chapters": [{"id": "intro", "number": 1,
                              "title": {"en": "Introduction", "ko": "소개"},
                              "summary": {"en": "Overview", "ko": "개요"}}],
                "languages": ["en", "ko"],
                "title": {"en": "WATBook", "ko": "WATBook"},
                "description": {"en": "Teaching example", "ko": "교육 예제"},
                "productionUrl": "https://example.invalid/watbook",
                "languageUrls": {"en": "https://example.invalid/watbook/",
                                 "ko": "https://example.invalid/watbook/ko/"},
            }
            manifest_path = temp / "manifest.json"
            manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
            dist = project_root / "dist"
            dist.mkdir(parents=True)
            sentinel = dist / "preserve.txt"
            sentinel.write_text("existing output remains", encoding="utf-8")
            outside = temp / "outside"
            outside.mkdir()
            (dist / "chapters").symlink_to(outside, target_is_directory=True)

            with patch.object(build_site, "ROOT", project_root), patch.object(build_site, "MANIFEST", manifest_path), patch.object(build_site, "DIST", dist):
                with self.assertRaisesRegex(ValueError, "chapter output path escapes dist"):
                    build_site.build()
            self.assertEqual(sentinel.read_text(encoding="utf-8"), "existing output remains")
            self.assertEqual(list(outside.iterdir()), [])

    def test_bilingual_license_routes_and_complete_notices_are_deployed(self):
        self.assertTrue((DIST / "license.html").is_file())
        self.assertTrue((DIST / "ko/license.html").is_file())
        for notice in ("LICENSE.md", "LICENSE-AND-ATTRIBUTION.md", "LICENSE-CC-BY-4.0", "LICENSE-MIT"):
            self.assertTrue((DIST / notice).is_file(), notice)
        english = (DIST / "license.html").read_text(encoding="utf-8")
        korean = (DIST / "ko/license.html").read_text(encoding="utf-8")
        self.assertIn('href="LICENSE-MIT"', english)
        self.assertIn('href="../LICENSE-MIT"', korean)

    def test_no_external_runtime_or_template_shell_dependencies(self):
        source = (DIST / "assets/css/site.css").read_text(encoding="utf-8")
        self.assertNotIn("@import", source)
        lab = (DIST / "assets/js/lab.js").read_text(encoding="utf-8")
        self.assertNotIn("fetch(", lab)
        self.assertTrue((DIST / ".nojekyll").is_file())


if __name__ == "__main__":
    unittest.main()
