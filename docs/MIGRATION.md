# Migrating to Fastener MCP v2

The eight tools share the same catalog service as REST and the website. The four existing tool names remain; response semantics are versioned and breaking, so the MCP server now advertises 2.0.0. Success/error envelopes carry `schema_version` and `catalog_release`. Offer results also carry `offers_snapshot`.

- Use numeric `diameter` with `diameter_unit`, and numeric `length` with `length_unit`. Unknown fields, duplicate fields, malformed values and conflicting requirements fail rather than broadening search. `family` and `source_kind` v1 filters are replaced by `category`, `thread_system`, `standard` and `source_status`. Search defaults to 20 and caps at 100.
- Results contain `exact_matches`, separate opt-in `alternatives` and a cursor. A cursor belongs to one filter set and catalog release.
- Get details in `part`, and model metadata in `model`. Pin `revision` and `geometry_version` for repeatable retrieval. Canonical public asset origin is configured independently of preview deployments.
- Placement is `fastener-mcp.placement.v1`: non-countersunk head bearing face Z=0, shank +Z, head -Z; countersunk flush top Z=0; nut/washer lower seat Z=0; insert insertion reference plane Z=0. Geometry uses mm. Grip is separately unknown, never copied from total length.
- Historical IDs retain their original raw records in `legacy_record`. Units not present in that record are unknown. Historical `confidence`, licenses and strength claims are unverified data, not product guarantees. Legacy records are excluded from normal search but remain inspectable by ID or `source_status=legacy_unverified`.
- All 142 old flat STEP URLs are withdrawn (410). Their paths and hashes remain in `data/catalog/history/legacy-audit.json`, and their bytes remain in baseline Git commit `19382b8`. No old file was relabeled as validated. No legacy ID was reassigned to a different identity.
- `/api/recommend` and `/api/adapters/onshape/insert` return 410. `/onshape/panel` explains the portable replacement. Onshape credentials and default-document code are removed from the active implementation.
- The old editable `data/fasteners.json` and its generators/importers have been retired after all active consumers moved to `lib/catalog`. Its exact raw snapshot is retained in `data/catalog/history/baseline-19382b8.json`. There is one editable current catalog.

REST uses 400 for malformed input, 404 for missing identities/revisions, 410 for withdrawal/retirement and 422 for unsupported or unavailable models. Empty search/offer results are successful. MCP uses `isError` with the equivalent structured error payload for business failures; SDK schema errors use the protocol's standard validation mechanism.
