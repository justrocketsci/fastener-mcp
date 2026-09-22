# Portable catalog release evidence

Release `catalog-20260922-1`, application 2.0.0. Checked September 21, 2026 Pacific / September 22 UTC, from baseline `19382b8`. The user authorized implementation of the entire specification and the GitHub main merge.

Local acceptance passes. The [validation workflow](../.github/workflows/validate.yml) repeats the checks on Linux for the pull request and main. GitHub checks remain the authoritative record of each commit's CI outcome; a hosted smoke run is separate from the local measurements below.

## Delivered scope

| Capability | Implementation and coverage |
| --- | --- |
| Maintained catalog | Versioned JSON and strict Zod contracts; 27 active identities, 188 inspectable historical IDs, 1,000-active-identity cap. No database. |
| Exact search | Required units, standard/thread/material/grade filters, common-filter indexes, compact paginated results. |
| Alternatives | Opt-in separate candidates with named differences; hard constraints never become scoring bonuses. |
| Geometry generation | Offline pinned CadQuery/OpenCascade recipes for all six launch families. |
| Geometry validation | 31 reopened STEP files, topology, sections, nominal dimensions, datums, positive volume, checksum and visual checks. |
| Detail and state | 27 simplified variants, four detailed socket variants; installed insert reference envelopes. Unsupported variants fail explicitly. |
| MCP delivery | Eight read-only tools, REST parity, canonical anonymous URLs and immutable versioned assets. |
| Placement | Explicit mm frames, category-specific origins, rotational references, distinct grip/overall lengths. |
| Installation | Four manufacturer-sourced HELICOIL receiving-thread/installation records; required context and unavailable data explicit. |
| Companions and BOM | Checked screw/nut/washer/insert nominal relationships, unresolved assembly conditions, JSON/CSV export. |
| Supplier mappings | 18 checked variants covering 13 parts, with exact product URLs and specification fingerprints. |
| Cost comparison | MOQ/pack/increment/tier calculations, integer money, destination/currency/scope/deadline checks, separate comparison groups. |
| Freshness | Independent price/stock/delivery timestamps, 24-hour defaults, manual candidate import, atomic publication and retained prior observations. |
| Traceability | Field-level evidence, immutable catalog snapshots, historical revisions, withdrawal responses and rollback procedure. |
| Website | Search, source dimensions, model preview/download, installation, companions, purchasing, browser-local parts list and MCP guide. Onshape and old recommendation endpoints return 410. |

Coverage: seven socket screws and four identities in each of the other five families. Four socket variants contain the recessed drive. Material-independent references cannot satisfy a specific material or property-grade requirement.

## Acceptance evidence

The deterministic suite has **26 passing tests**, plus the Python cache-invalidation test. [Catalog behavior tests](../tests/catalog.test.ts), [rollback rehearsal](../tests/rollback.test.ts), [cache checks](../tests/geometry_cache.py) and the [real SDK client](../scripts/verify-client.ts) are executable evidence, not live supplier scraping.

| Spec checks | Passing evidence |
| --- | --- |
| A01–A02 | Explicit inch/mm normalization, distinct thread systems, missing-unit errors, missing-grade exclusion and conflicting constraints. |
| A03 | Unsupported detail/state, unknown IDs and withdrawn legacy models return explicit errors. |
| A04–A05 | All 31 published STEP files pass `geometry:verify`; reports beside each model record the checks and 0.01 mm numerical tolerance. Bores are sectioned at three planes; head/shank continuity, socket recesses and countersink angle are inspected. |
| A06 | New-revision fixture selects the new version while the old revision/version returns the original bytes. An explicit withdrawal blocks retrieval. Published files are never overwritten. |
| A07–A08 | Actual HTTP SDK requests and REST responses agree for all eight tools. Anonymous STEP download passes content, byte-count and SHA-256 checks. |
| A09–A10 | Companion shortlist, insufficient thread-class/engagement information, known engagement conflict and missing insert host/process inputs tested. M6 insert source expectations include 6.3 mm suggested drill and 14.1 mm minimum blind tapping depth with documented conditions. |
| A11 | Exact synthetic fixture: ten requested pieces produce $10 for A's 100-piece MOQ versus $4 for B's ten-pack. B ranks first on merchandise. |
| A12–A13 | Exact synthetic fixture: $5+$10 versus $8+$2 ranks B at $10 versus $15. Removing A's shipping moves A to partial costs and suppresses a definitive delivered winner. |
| A14 | Stale/future prices, quote validity, mixed currency, account scope, unknown stock, postal charge scope and unsupported delivery deadlines are checked. |
| A15 | Failed/partial imports retain original values and timestamps. Malformed/future observations fail; the publisher validates and atomically replaces a complete combined snapshot under an exclusive lock. |
| A16 | Part fingerprint changes invalidate supplier/compatibility verification. Recipe version, source, parameters, toolchain, revision and detail changes invalidate geometry cache keys without changing old artifacts. |
| A17 | BOM aggregation preserves part revisions and selected supplier variants; CSV quotes commas/quotes and escapes formula prefixes. Browser selection and export also checked. |
| A18 | All 31 variants regenerated into local staging using the final recipes with Onshape credentials unset. No network/CAD account calls occur in the builder. Existing reviewed published bytes remain unchanged. |
| A19 | Path traversal IDs, unknown properties, unbounded limits, invalid quantities and arbitrary-URL-shaped inputs fail validation; there is no fetch proxy or public writer. |
| A20 | Saved [SDK transcript](validation/client-local.json) includes requests, selected versions, checksums, byte sizes and timings. A separate CadQuery process imports the downloaded M6 × 20 model and measures a 10 mm head with Z bounds −6 to +20 mm. Actual detailed M6 × 10 STEP was also opened in CAD Explorer and the socket inspected from the head side. |
| A21 | An isolated temporary checkout serves a synthetic newer release/price snapshot through the real service, restores every catalog/manifest snapshot document and the saved prices, validates all references/hashes, and reproduces the original service responses. This is a local rehearsal, not a claim of a production rollback. |

Visual evidence is indexed by geometry ID and preview SHA-256 in [visual-review.json](../data/geometry/visual-review.json). Every published variant was reviewed from two rendered angles. Full STEP verification passes again after regeneration and release-manifest validation.

## UI and performance

Browser checks covered exact search, detail/state selection, source data, download links, missing-context installation, quantity 25 procurement ($6.00 for 25 Bolt Depot items versus $7.56 for 30 Monster Bolts items), supplier selection, local persistence, keyboard submission, JSON/CSV export controls and visible focus.

The browser viewport override did not apply, so mobile review used a temporary local HTML harness with real **390 × 844 px iframe viewports**. Search, detail and parts-list documents each measured 390 px client width and 390 px document scroll width. Tables retain readable columns within a keyboard-scrollable region (312 px viewport, 600 px content, ArrowRight changed scroll position to 40 px). The harness was removed before publication. Desktop pages were reviewed at 1280 px. This is responsive browser review, not physical-device testing.

Recorded environment: macOS arm64, Node 22.22.3; Python 3.12.13, CadQuery 2.6.1 and OCP 7.8.1.1. Full Python package pins are in [requirements-lock.txt](../scripts/geometry/requirements-lock.txt).

| Measurement | Result |
| --- | --- |
| 1,000 realistic records, 200 warm in-process searches | p95 0.659 ms, below the 100 ms target |
| Cold shared-service module import, fresh tsx process | 67.33 ms after process start; not an internet/serverless cold-start claim |
| Local Next production startup | 56 ms reported ready; excludes build and initial application request |
| 20 warm local HTTP searches | p95 0.861 ms; 2,413-byte compact response |
| STEP payload across 31 variants | 549,461 bytes; about 6.5 MB including previews/reports |

Hosted latency is recorded separately when running `TEST_ORIGIN=https://fastener-mcp.vercel.app npm run test:client`. It must not be substituted for the in-process benchmark or treated as a latency guarantee.

## Commercial evidence and operating limits

Public US/USD variant pages were inspected at Bolt Depot and Monster Bolts. The seed observation time is `2026-09-22T02:50:00Z`; product mappings, exact URLs, pack quantities and price tiers are in [supplier-products.json](../data/catalog/supplier-products.json) and [current.json](../data/offers/current.json). The five dual-supplier parts are M6 × 10, 12, 16, 20 and 25 mm socket screws. The nut/washer links provide the remaining checked part coverage. Subsequent freshness is computed from the stored timestamps; this document does not refresh them.

Stock, delivery, shipping, taxes and duty are not established by these observations. The production snapshot therefore supports merchandise comparisons and purchase links, with no delivered-cost winner. Daily refresh is a maintainer-run import; no recurring job was requested or created. Manual import is the supported initial adapter permitted by the specification.

Verified inch-thread pairs, full modeled thread helices, wire coils, uninstalled inserts, automatic CAD mating and native Adam/Zoo integrations are outside this release's declared coverage. Unsupported detail/state requests fail explicitly. Insert envelopes use nominal receiving-thread dimensions and do not establish real coil contact or maximum clearance. Geometry verification establishes the listed nominal checks, not manufactured fit, strength or certification.

## Publication and recovery

Publish the complete commit: code, JSON, 31 immutable model directories, previews, check reports and release snapshots. There is no required database, Onshape key or native CAD dependency in the Next.js runtime. Configure `PUBLIC_ASSET_ORIGIN` only to an anonymously accessible canonical host.

The release tool verifies immutable snapshot hashes and reruns the offline STEP checks. `./verify.sh` exits nonzero on any failure. The CI workflow performs schema/reference validation, type checking, lint, deterministic tests, Python cache checks, exported-file verification, production build and the real HTTP SDK/CAD-consumer workflow.

For future releases, retain passing historical files and restore all catalog documents, model manifests and compatible price observations together. Follow [maintenance and rollback](MAINTENANCE.md); the unverified baseline is preserved for audit, not recommended as the operational rollback target. See [migration](MIGRATION.md), [catalog audit](CATALOG_AUDIT.md) and [third-party notices](../THIRD_PARTY_NOTICES.md).
