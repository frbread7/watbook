# Review and release procedure

WATBook follows the My Library Book Factory contract. The repository's `library-manifest.json` is the validated registration input and stays `in-progress`; My Library's catalog copy is the authoritative publication status and evidence record. The catalog copy becomes `published` only when the release and production evidence below are real and complete. Keep the release version separate from the exact Pages deployment SHA. A scaffold, passing syntax check, or reviewer-agent summary alone is not a release.

## Required release gates

1. **Content:** all indexed English and Korean chapters exist, are linked, cited, and technically reviewed; synthetic data and known limits are explicit.
2. **Models:** formulas, units, numerical ranges, boundary behavior, and claims have documented checks in [`MODELS_AND_VALIDATION.md`](MODELS_AND_VALIDATION.md). Internal checks are not silicon validation.
3. **Build and browser:** `npm ci`, `npm test`, and `npm run build` pass. Browser journeys run through `/watbook/` and include desktop, tablet, and mobile configurations.
4. **Licensing and security:** original material and code licenses match the manifest; no unapproved upstream prose/assets, secrets, analytics, or external runtime service is present.
5. **Versioned release:** create a GitHub release only after review and CI succeed. The release tag/version is distinct from the deployed source revision.
6. **Pages deployment:** a successful GitHub Pages deployment exists for the release candidate. Record its full 40-character source commit SHA from the deployment metadata, separately from the release tag.
7. **Live chapter and experiment checks:** check every published language route, every chapter route, and all six exact experiment anchors. Record UTC/date, exact URL, HTTP status, fragment presence, response hash, and deployment source SHA. Use My Library's `verify_experiments.py` for the experiment evidence; do not fabricate or handwave evidence.
8. **Portal registration:** copy the final manifest and cover into My Library, set `status` to `published` only with the evidence contract satisfied, remove WATBook from the unstarted roadmap in the same catalog change, regenerate indexes, validate, deploy, and smoke-test the portal.

## Local checks

```sh
npm ci
npm test
npm run build
```

The production generator publishes `dist/`. GitHub Pages must use the GitHub Actions source and the workflow artifact; do not publish the repository root or the scaffold page.

## Release evidence from GitHub

After a deployment has completed, inspect its deployment record and status. Use the SHA from that same `github-pages` deployment record. Stop if the newest deployment is missing, has no status, is not successful, or has no full lowercase 40-character commit SHA; do not substitute the stable release tag or an older deployment without explicitly confirming it is the deployment being verified.

```sh
deployment_id=$(gh api repos/frbread7/watbook/deployments --jq '[.[] | select(.environment == "github-pages")][0].id // empty')
test -n "$deployment_id"
deployment_state=$(gh api "repos/frbread7/watbook/deployments/$deployment_id/statuses" --jq '.[0].state // empty')
test "$deployment_state" = success
production_sha=$(gh api "repos/frbread7/watbook/deployments/$deployment_id" --jq '.sha // empty')
printf '%s\n' "$production_sha" | rg '^[0-9a-f]{40}$'
```

Run release commands only after the applicable review gates; version/tag semantics and the exact deployment SHA must remain separate in both manifests.
