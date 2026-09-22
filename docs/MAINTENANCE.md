# Maintenance, publication and rollback

The application reads checked JSON once per process. It never writes catalog data, executes a CAD kernel, fetches arbitrary URLs, or purchases hardware in a request. Runtime logs contain operation, duration, result code and catalog release; no customer design payload is logged.

## Part changes

1. Add a source record with publisher, URL, retrieval date, known revision/license and extraction notes. Transcribe only required factual attributes. Unknown is null, not a guessed default.
2. Create a new identity when thread, size, material, required grade/finish or manufacturer identity changes. For a metadata correction to the same identity, copy the previously published record to `data/catalog/history/revisions.json`, increment revision, and preserve prior geometry metadata/assets.
3. Add sourced dimensions with original units, derived mm values, locators and limits. For a new family, implement an explicit recipe; unsupported families must fail. Do not rerun the baseline bootstrap against a maintained catalog.
4. Recheck compatibility and supplier mappings against the corrected part. Their stored canonical SHA-256 fingerprints deliberately fail validation when a referenced part changes. Update a fingerprint only after reviewing its evidence; never mass-reset failed fingerprints.
5. Supply sourced installation records or explicitly mark them unavailable. Check insert host material/process/hole context; an ordinary metric tap does not replace an STI receiving-thread tap.

## Generate and publish geometry

```sh
uv venv --python 3.12.13 .venv-cadquery
uv pip install --python .venv-cadquery/bin/python -r scripts/geometry/requirements-lock.txt
npm run geometry:build -- --ids iso4762-m6x20-a2
```

Builds stage in `.cache/geometry-staging`. They validate source status and parameters, use a key containing recipe source, normalized dimensions, revision and Python/CadQuery/OCP versions, and reuse passing assets only when the saved checksum agrees. No network or Onshape environment variable is used. Each new STEP is reopened, measured, sectioned and previewed in two views. Failed builds produce a report and do not change the published manifest.

Inspect every new preview, including bore/recess views. Record the geometry ID, preview SHA-256, review status and reviewer/time in `data/geometry/visual-review.json`. Retain prior review entries when adding variants. Then run:

```sh
.venv-cadquery/bin/python scripts/geometry/publish.py
npm run geometry:verify
npm run catalog:validate
```

The publisher requires matching reviewed preview hashes and refuses to replace existing versioned STEP bytes. Recipe changes invalidate cache keys. STEP serialization is not promised to be byte-identical across independent builds, so published bytes are retained. Never overwrite a versioned folder to repair an artifact; create a new variant/version and withdraw the bad version if necessary.

For a withdrawn model, preserve its manifest entry and withdrawal reason, remove its `.step` from public serving, and update active part references to a passing replacement or mark the part unavailable/deprecated. `catalog:validate` refuses a publicly present withdrawn STEP. The download handler returns 410 for known withdrawn paths. Keep prior metadata; do not silently serve a replacement under an old checksum or URL.

Optional CAD Explorer review uses the local CAD skill's explicit STEP import/artifact workflow. Its hidden GLB/topology sidecars are ignored by Git; only STEP, checked preview and check report are release deliverables.

## Daily price observations

Default cadence is a daily maintainer-run refresh. No scheduled job, supplier credentials or live scraping is configured. Inspect the exact supplier variant in its public market/currency context, or use a permitted feed. Preserve the original price, stock and delivery observation times separately; checking a link does not refresh a price. Unknown charges/stock remain null. Record pricing scope, pack/MOQ/increments and the actual tier basis.

Prepare a JSON candidate using `offersSchema` in `lib/catalog/schemas.ts`: `schema_version`, a new `snapshot`, `published_at` and `observations`. The checked-in `data/offers/current.json` is the format example. Include only selected suppliers. For a failed refresh, supply the product ID with `refresh_error` and null observations; the importer retains the last good values and original timestamps.

```sh
npm run offers:refresh -- --input /path/to/checked-observations.json --suppliers bolt-depot,monster-bolts
# Review .cache/offers-candidate.json, then publish the same input:
npm run offers:refresh -- --input /path/to/checked-observations.json --suppliers bolt-depot,monster-bolts --publish
npm run catalog:validate
npm test
```

Validation rejects unmapped/revised products, malformed money, duplicate/unsorted tiers and future-dated observations. A missing row or source failure does not erase old data. Publication uses an exclusive lock, detects concurrent changes and renames a complete candidate atomically. Prior snapshots are archived in `data/offers/history` and Git. Default price/stock TTL is 24 hours; shorter validity/charge expiry takes precedence. Shipping, tax and duty require matching destination, postal scope, quantity, currency and pricing scope. Public/account prices and currencies are never mixed. A deadline requires applicable dated arrival evidence.

Comparisons rank complete delivered totals separately from partial merchandise subtotals. Unknown stock makes the cost group partial; known unavailable/insufficient stock prevents ranking. Stale/unknown prices, unsupported destinations and unresolved deadlines appear as links only. Supplier SKU coverage is explicitly limited to maintained variants; this is not a universal market-price claim or basket optimization.

## Release and rollback

Set a new ID in `data/catalog/release.json` when publishing catalog/geometry changes. Run `npm run catalog:release` after publication checks; this also reruns the offline STEP checks. It saves immutable copies of the catalog documents and their hashes under `history/releases/<id>/` and a manifest under `releases/<id>.json`. Existing release manifests cannot be rewritten by the release tool. Price snapshots can change independently after mapping validation.

Run `./verify.sh`, then start the production server with the intended canonical public asset origin and run `npm run test:client`. The client verifies all tools, REST parity, actual downloads and CAD import. Review the website's search, detail, installation, purchasing and parts-list flow. Deploy the full commit, including JSON and immutable assets, together. CI repeats deterministic validation and the actual client path.

Rollback uses the previous complete release commit/deployment, or restores **all** documents from that release's `snapshot_path` entries in one commit. Restore the matching release pointer; retain every referenced immutable asset and validate its hash. Restore a compatible offers snapshot (or links-only observations) if supplier mappings changed. Run all checks before redeploying. Do not restore one JSON file independently of its dependent manifests. Baseline `19382b8` is retained for audit; it is not a recommended rollback target because its models were not validated.

The launch's STEP payload is about 0.55 MB; previews bring the published model directory to about 6.5 MB. Monitor repository and deployment size as detail grows. The 1,000-active-identity limit does not cap historical/geometry byte size. Move immutable blobs to an object store via the asset-origin/path contract when necessary; no database is needed for this catalog size.
