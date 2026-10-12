# Contributing to WATBook

WATBook's scope is measurement-to-decision: monitor purpose, the measurement contract, parameter extraction, uncertainty, wafer/lot context, bounded hypotheses, and the limits of downstream electrical die sort (EDS) inference. Link to the upstream books for general device physics, test/prober methods, process modules, spatial statistics, SPC, and failure analysis instead of repeating them.

## Edit a chapter

1. Edit matching English and Korean source files under `content/en/` and `content/ko/`.
2. Keep chapter IDs, numbers, URLs, and localized titles/summaries synchronized with `library-manifest.json`.
3. Link to references near technical claims and keep bibliographic details in `docs/REFERENCES.md`.
4. Label every locally generated example dataset as synthetic. State model assumptions, units, limits, and what was checked.
5. Use semantic HTML, meaningful heading order, keyboard controls, and no inline script or untrusted HTML insertion.

## Edit an interactive model

Keep pure deterministic calculations in `assets/js/models.mjs`; keep DOM wiring and localized presentation in `assets/js/lab.js`. Add a model test for analytical reference cases and invalid/extreme inputs in `tests/models.test.mjs`. Never characterize code execution tests as validation against silicon.

## Validate before review

```sh
npm ci
npm test
npm run build
```

The Python route checks verify both language editions, local paths/fragments, page metadata, and accessibility-shell hooks. Playwright exercises the published project prefix and desktop/tablet/mobile viewports. Generated output belongs in `dist/` and is not hand-edited.

## Scope and reuse

Update [`SCOPE_AND_OVERLAP.md`](docs/SCOPE_AND_OVERLAP.md) when the boundary with a linked book changes. Do not copy upstream prose, figures, or code without checking the current license and preserving attribution. Read [`LICENSE-AND-ATTRIBUTION.md`](LICENSE-AND-ATTRIBUTION.md) and [`MODELS_AND_VALIDATION.md`](docs/MODELS_AND_VALIDATION.md) before making licensing or quantitative claims.
