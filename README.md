# WATBook

**Wafer Acceptance Test & Parametric Engineering** · **웨이퍼 전기적 특성 평가와 파라미터 엔지니어링**

WATBook is an independent, bilingual engineering textbook about the decisions behind wafer-level parametric measurements. It connects monitor intent and measurement conditions to uncertainty, wafer/lot context, bounded process hypotheses, and downstream product evidence. It deliberately links to existing device, process, test, yield, and failure-analysis books instead of rewriting their general foundations.

**Intended production URL:** <https://frbread7.github.io/watbook/> · **Repository:** <https://github.com/frbread7/watbook>

## Read the book

- [English edition](index.html)
- [한국어판](ko/index.html)
- [Interactive WAT laboratory](lab.html) · [한국어 실험실](ko/lab.html)
- [Scope and overlap audit](docs/SCOPE_AND_OVERLAP.md)
- [Models and validation status](docs/MODELS_AND_VALIDATION.md)
- [Technical sources](docs/REFERENCES.md)
- [License and attribution](LICENSE.md)

The textbook uses publicly available sources and fictional/synthetic datasets. It does not contain confidential foundry data, process recipes, product limits, or an industry certification. Model validation labels state precisely what checks were performed; synthetic analytical checks are not silicon validation.

## Local development

Requires Python 3.12+ and Node.js 24+. No build framework or runtime server is used.

```sh
npm ci
npx playwright install chromium
npm test
```

To view the generated site locally:

```sh
python3 tools/build_site.py
python3 -m http.server 8000 --directory dist
```

Open <http://localhost:8000/>. Content lives under `content/en/` and `content/ko/`; the chapter index and My Library registration contract live in `library-manifest.json`. `tools/build_site.py` produces the static Pages artifact in `dist/`. See [CONTRIBUTING.md](CONTRIBUTING.md) for how to edit chapters and models safely.

## Independent publication

WATBook is a separate repository and deployment, using the My Library Book Factory. My Library's catalog entry is metadata only. The manifest remains `in-progress` until reviewed release, Pages deployment, chapter checks, and live checks for all six experiment anchors have been recorded. See [the release workflow](docs/RELEASE.md).

## License

Original prose, figures, quizzes, and synthetic teaching data are CC BY 4.0; original source code is MIT. This project was written independently. Upstream textbooks are linked for comparison, not copied. Third-party sources retain their own copyrights and terms; see [docs/REFERENCES.md](docs/REFERENCES.md) and [docs/SCOPE_AND_OVERLAP.md](docs/SCOPE_AND_OVERLAP.md).
