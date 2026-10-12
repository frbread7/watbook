#!/usr/bin/env python3
"""Serve the generated artifact under its real GitHub Pages project prefix."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
BASE = "/watbook"


class ProjectSiteHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIST), **kwargs)

    def do_GET(self):
        path = urlsplit(self.path).path
        if path == BASE:
            self.send_response(301)
            self.send_header("Location", BASE + "/")
            self.end_headers()
            return
        super().do_GET()

    def translate_path(self, path):
        clean_path = urlsplit(path).path
        if not clean_path.startswith(BASE + "/"):
            return str(DIST / "__outside_project_base__")
        rewritten = clean_path[len(BASE):]
        return super().translate_path(rewritten)


if __name__ == "__main__":
    if not DIST.is_dir():
        raise SystemExit("Build the static site before starting the test server.")
    server = ThreadingHTTPServer(("127.0.0.1", 4174), ProjectSiteHandler)
    print("Serving WATBook under http://127.0.0.1:4174/watbook/")
    server.serve_forever()
