# Fastener MCP

Versioned STEP geometry, source evidence, installation context and purchasing comparisons for AI CAD agents. Built with Next.js, read-only HTTP MCP, versioned JSON and offline CadQuery. **No database or Onshape account is required.**

The launch catalog contains 27 checked metric part identities across hex bolts, socket screws, countersunk screws, hex nuts, flat washers and HELICOIL Plus free-running inserts. It includes 31 STEP variants, 13 parts with checked purchase links and five sizes with observations from both Bolt Depot and Monster Bolts. The 188 historical IDs remain inspectable as `legacy_unverified`; their unvalidated models are withdrawn.

Models are nominal reference geometry with explicit features and omissions. Four detailed socket variants include the drive recess; all omit thread helices. Inserts are installed annular reference envelopes based on the manufacturer's receiving-thread dimensions, not actual coils or maximum clearance envelopes. Material-independent references do not satisfy a specified material/grade. Verified inch-thread coverage is not claimed.

## Run locally

```sh
npm ci
PUBLIC_ASSET_ORIGIN=http://localhost:3000 npm run dev
```

Set `PUBLIC_ASSET_ORIGIN` to the canonical anonymously accessible production origin when deploying. Protected Vercel preview hostnames are never used implicitly. Static models are deployed with the app; requests never execute the CAD kernel or scrape suppliers.

## Interfaces

MCP Streamable HTTP: `https://fastener-mcp.vercel.app/api/mcp`

| Tool | Purpose |
| --- | --- |
| `search_fasteners` | Exact requirements, explicit units, separate alternatives, release-bound pagination |
| `get_fastener` | Part revision, dimensions and evidence |
| `get_fastener_model` | Immutable STEP URL, bytes, checksum, datums, omissions and recorded checks |
| `get_placement_packet` | `fastener-mcp.placement.v1` local frame; no automatic mates |
| `get_installation_requirements` | Sourced instructions or explicit unavailable/missing-context results |
| `get_compatible_parts` | Nominal companion interfaces and unresolved assembly checks |
| `compare_supplier_offers` | Quantity/pack/tier/freshness/scope-aware comparisons |
| `build_parts_list` | Aggregated JSON and formula-safe CSV |

REST exposes `/api/fasteners`, `/api/fasteners/:id` and `/model`, `/placement`, `/installation` subroutes, plus POST `/api/compatibility`, `/api/offers/compare`, `/api/bom` and GET `/api/catalog/status`. All operations are read-only. See the website's `/mcp` guide and [migration notes](docs/MIGRATION.md).

Example search:

```json
{"category":"socket_screw","thread_size":"M6x1","length":20,"length_unit":"mm","material":"A2 stainless steel"}
```

Model example: `{"id":"iso4762-m6x20-a2","revision":1}`. A consumer downloads the returned `model.url`, checks SHA-256 and bytes, imports STEP in mm and applies the local frame. Native Adam/Zoo integration is not required; a compatible MCP client and STEP-capable CAD environment are required.

## Checks and maintenance

```sh
uv venv --python 3.12.13 .venv-cadquery
uv pip install --python .venv-cadquery/bin/python -r scripts/geometry/requirements-lock.txt
./verify.sh
PUBLIC_ASSET_ORIGIN=http://localhost:3100 npm start -- -p 3100
# In another terminal:
npm run test:client
```

The real-client test calls all eight tools, compares REST results, downloads a file anonymously, verifies its checksum and imports it with an independent CadQuery consumer. CI repeats the offline geometry checks and client workflow.

Price and stock observations have separate timestamps and a default 24-hour freshness policy. The launch snapshot contains checked public prices; stock, shipping, tax and duty are unknown. Results therefore compare merchandise subtotals and do not claim a delivered-cost winner. Refresh is a **daily maintainer-run import**, with no scheduled job or runtime scraping. See [maintenance and rollback](docs/MAINTENANCE.md), [source audit](docs/CATALOG_AUDIT.md), [release evidence](docs/RELEASE_READINESS.md) and [third-party notices](THIRD_PARTY_NOTICES.md).
