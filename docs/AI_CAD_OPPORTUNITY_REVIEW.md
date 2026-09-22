# Fastener MCP: AI CAD opportunity review

Research date: September 21, 2026. Repository reviewed: `19382b8`.

**Recommendation: make Fastener MCP a dependable part-selection and CAD-handoff service for agents. Prototype with Zoo through a shared MCP client first; pursue Adam as a sourcing/BOM design partner. Keep Onshape as an optional destination.** The immediate constraint is trust in the part data and delivered geometry, alongside integration access—not merely Onshape quotas.

This is a research and code-review deliverable. Public Fastener endpoints were exercised; Adam/Zoo authenticated workflows were not. No partner was contacted, paid service invoked, or production code changed. Proposed capabilities, commercial models, and schedules below are recommendations, not existing features or commitments.

## 1. What the product already has

The current implementation is further along than its README suggests:

| Area | Observed in the repository |
| --- | --- |
| Catalog | 188 records: 35 ISO, 40 AN, 65 MS, 48 NAS |
| STEP assets | 142 files; 46 catalog entries lack STEP models |
| Recorded generation history | 98 Onshape exports; 44 subsequent CadQuery replacements |
| MCP | A live server with `search_fasteners`, `get_fastener`, `get_fastener_model`, `get_placement_packet` |
| Delivery | Static JSON and existing STEP files; catalog retrieval does not call Onshape |
| Placement | A declared coordinate frame and model URL; no mates or hole detection |
| Purchasing | No structured supplier SKU, live availability, quote, price, or lead-time model in the `Fastener` type |

Evidence: [catalog](../data/fasteners.json), [MCP implementation](../app/api/mcp/route.ts), [types](../lib/types.ts), [placement packet](../lib/placement-packet.ts), [Onshape export history](../public/models/_onshape_step_summary.json), [CadQuery history](../public/models/_cadquery_step_summary.json).

The distinction matters commercially: the product currently provides **specification lookup and model retrieval**. Actual procurement sourcing requires mapping a specification to an orderable supplier item and maintaining that mapping. Calling today's output “sourced” should not imply stock or purchasing verification.

The existing neutral STEP files and placement packets are a useful starting point. No CAD-platform migration is needed to expose them to other agents.

## 2. Onshape: identify the actual limit before pivoting around it

All 44 failures in the checked-in export history say `pending export: Onshape translation quota 429`. The pending file now records that CadQuery filled those gaps. This is historical evidence of export throttling, not proof that the account currently has an exhausted annual allowance.

Onshape documents two different mechanisms:

- **429:** endpoint throttling; inspect `Retry-After` and `X-Rate-Limit-Remaining` and reduce redundant requests.
- **402:** annual API allocation exhausted. Public App Store applications using OAuth are excluded from the documented annual call allocation; that exemption does not establish immunity from endpoint throttling.

Sources: [Onshape response codes](https://onshape-public.github.io/docs/api-adv/errors/), [API limits](https://onshape-public.github.io/docs/auth/limits/).

Recommended architecture: generate and validate models offline, serve versioned assets from your own storage, and use Onshape only when a user chooses an Onshape import workflow. Your catalog already mostly follows this separation. Do not switch to Zoo's engine simply to generate every standard screw on demand; that would introduce another runtime dependency and usage bill.

If Onshape users show demand, investigate an App Store listing and developer support. Onshape publishes a partner route at `onshape-developer-relations@ptc.com`. This is an option to evaluate, not a reason to delay agent experiments. [Onshape integration FAQ](https://www.onshape.com/en/app-integrations/faq)

## 3. Integration options and priority

**Two MCP servers do not automatically call one another.** A shared client can orchestrate Fastener MCP and a CAD provider's MCP server. Embedding Fastener directly inside that provider's own agent is a separate capability that needs verification.

| Path | Evidence and limitations | Recommendation |
| --- | --- | --- |
| Shared MCP client + Fastener + Zoo | Zoo publishes its MCP package and source; external clients can use Zoo CAD tools. STEP import exists, with limitations below. | First technical prototype; no native partner integration required to attempt it. |
| Shared MCP client + Fastener + Adam | Adam publishes hosted MCP and a REST API for asynchronous engineering tasks and files. | Second prototype, especially for BOM handoff. |
| Fastener tools inside Zookeeper | No documented self-service external-MCP registration found in the reviewed material. | Ask Zoo about supported extension/partner mechanisms. |
| Fastener tools inside Adam | Reviewed integrations docs and OpenAPI do not establish arbitrary third-party MCP registration. | Ask Adam about supplier-catalog and custom-tool integration. |
| Existing Onshape panel/import | Catalog panel is already available; import route consumes Onshape requests. | Maintain as a destination, defer major additional work. |

These ranks are judgments about the next experiment, not measured market demand.

### Zoo: first geometry-handoff experiment

Zoo documents `uvx zoo-mcp` with `ZOO_API_TOKEN`, and publishes its server at [KittyCAD/mcp](https://github.com/KittyCAD/mcp). Its tools expose CAD execution, import, snapshots, and geometry inspection. This makes an externally orchestrated prototype plausible. [Zoo MCP documentation](https://zoo.dev/docs/developer-tools/mcp)

Proposed workflow:

1. A shared MCP client searches Fastener MCP for an explicitly specified part.
2. It retrieves a verified STEP asset and manifest into a local project.
3. Zoo tools import the asset into a KCL project and place copies at supplied transforms.
4. The workflow checks dimensions and produces a snapshot and BOM manifest.
5. The user opens the project in Zoo Design Studio for review.

Use an exact, verified SKU for the first demo, such as `iso-4017-m6-30`, rather than asking the agent to make a structural fastener selection.

Zoo labels STEP import experimental and read-only: do not promise editable fastener feature history. Its import guide says STEP numeric values are interpreted in the current scene/KCL units rather than rescaled from STEP metadata. Set the project units explicitly and verify dimensions after import. [Zoo import guide](https://zoo.dev/docs/zoo-design-studio/features/data-management/import)

Zoo also states that a full assembly constraint solver and mating are not yet supported. The first demo should promise placement at explicit transforms, not constrained assembly mating. Zoo-hosted API usage is billable under its applicable plan; MCP is not a route to unlimited engine use. [Zoo FAQ](https://zoo.dev/docs/faq)

Partner question: “Can Zookeeper consume an external parts tool or approved dataset directly, and what manifest/coordinate contract should a catalog provider supply?” Start through Zoo's published [community/support channels](https://github.com/KittyCAD).

### Adam: strong sourcing/BOM fit, validate the extension mechanism

Adam's current positioning explicitly includes BOM cleanup, supplier comparison, component alternatives, and connected CAD workflows. That overlaps with Fastener's proposed value, but also means Adam may build similar sourcing capabilities itself. Offer authoritative, structured part evidence and a reliable handoff rather than a generic sourcing chatbot. [Adam product page](https://adam.new/)

Adam exposes a hosted MCP endpoint at `https://adam.new/mcp`. Its tools start and inspect asynchronous engineering tasks and work with files. This allows a shared client to find parts using Fastener, then hand the results to Adam. Both MCP and REST are labeled beta. [Adam MCP overview](https://docs.adam.new/mcp/overview)

For an application integration, the documented REST base is `https://api.adam.new/v1`. File uploads can be attached to tasks; task creation requires an idempotency key. Tasks can pause for input, and API rate limits still apply. Prefer REST multipart upload for binary files over passing large STEP files through model-visible base64. [Adam API overview](https://docs.adam.new/api-reference/introduction)

Proposed pilot: Fastener returns selected IDs, checked dimensions, source links, STEP files, and a BOM manifest; Adam consumes that package in a connected CAD or BOM task. Whether Adam can import/place those particular files successfully remains an authenticated acceptance test. Adam running an Onshape task does not by itself eliminate Onshape's limits.

The public [integration guide](https://docs.adam.new/guides/integrations) describes supported connection cards; the reviewed [OpenAPI specification](https://api.adam.new/openapi.json) exposes integration inspection, but no endpoint to register an arbitrary MCP server. This is an unverified extension path, not proof that a private partner interface does not exist.

Do not confuse Adam's commercial agent with [CADAM](https://github.com/Adam-CAD/CADAM), its open-source OpenSCAD-based application. A CADAM contribution is another possible experiment, but would not establish a native commercial Adam integration.

Partner question: “Can a supplier catalog register tools inside Adam, or should we deliver part bundles through task/project files? Which BOM and part-selection failures are most expensive for your customers?” Adam publishes `hello@adam.new` in its docs and a founder contact on its [YC profile](https://www.ycombinator.com/companies/adam).

## 4. Where Fastener could earn its place

Recommended positioning: **“Give CAD agents a traceable fastener identity, usable geometry, and a purchasing handoff.”** Deliver the same part consistently across search, CAD, and BOM workflows.

| Opportunity | Customer value | Priority |
| --- | --- | --- |
| Exact identity and unit-aware selection | Avoid fabricated part numbers, wrong thread variants, and ambiguous sizes | First |
| Validated model and placement manifest | Reduce broken downloads, scale mistakes, and manual repositioning | First |
| Bolt/nut/washer bundles | Return compatible components and quantities together | Next; requires catalog coverage and compatibility rules |
| Supplier SKU mapping and alternates | Turn engineering intent into orderable items; flag differences | Pilot with one authorized supplier/feed |
| Company-approved catalog and BOM normalization | Reuse approved items and reduce duplicate internal part numbers | Commercial hypothesis to test with teams |
| Structural selection/torque advice | Potentially useful, but unsupported by today's models and recommendation logic | Defer |

A large downloadable catalog alone is difficult to differentiate. [CADENAS 3Dfindit](https://www.3dfindit.com/en/corporate/ecatalog/) already offers configured part numbers, CAD delivery, and product data; [TraceParts](https://info.traceparts.com/) offers extensive catalogs and data-syndication services. They may be future data partners as well as alternatives.

The defensible work would be maintained mappings, field-level provenance, tested geometry contracts, and evidence that agents complete real workflows more reliably. MCP itself is a distribution interface, not a durable advantage.

Start with a narrow, thoroughly checked metric assembly catalog. Many nuts and washers currently have no STEP assets, which limits complete joint demos. Preserve aerospace references as a separate research dataset until their revision, extraction, and usage rights are established; a record labeled `exact` is not itself evidence of certification.

Commercial hypotheses to test:

- An agent vendor pays for an embedded parts API with stable schemas, usage reporting, and maintained data.
- A hardware team pays for an approved catalog, internal part-number mapping, and repeatable BOM exports.
- A supplier pays to publish accurate, orderable catalog data to agent workflows.

Keep a small public tier to make experiments easy. Test paid pilots before inventing usage pricing. Ask who owns the budget, what task repeats weekly, and what measurable failure the service removes. Paid supplier placement must not silently change technical compatibility rankings.

## 5. Fix these before presenting a partner demo

These are review findings, not changes made in this research task.

| Priority | Finding | Required outcome |
| --- | --- | --- |
| P0 | Live `get_fastener_model` returned a deployment-specific Vercel URL that redirected to a login page; the public domain served STEP successfully | Use a canonical public asset origin; verify returned content is STEP after redirects |
| P0 | Search compares raw diameters with a `< 0.5` tolerance and no unit argument. A live `diameter: 0.25` query returned 153 records spanning 0.02–0.625 | Require units, normalize dimensions, distinguish nominal size from actual dimensions, filter exact thread/length requirements |
| P0 | 140/188 records lack explicit `diameter_unit`; model tool infers units from `diameter > 1` | Store units explicitly; never infer from magnitude |
| P0 | Checked-in CadQuery generator defaults to diameter 4 mm and length 20 mm and does not use catalog dimensions in generation | Rebuild a reproducible generator from verified dimensions; don't assume existing binaries match this script |
| P0 | Packet claims bearing-face origin and +Z toward tip, but generator builds shank from Z=0 to length and puts the head above it; packet also says head side +Z | Define one frame, transform assets into it, verify actual STEP bounds/datums |
| P0 | `grip_length_mm` is assigned overall catalog length | Represent actual unthreaded grip separately; return unknown when unavailable |
| P1 | REST recommendation heuristics mix raw diameters with mm-based strength calculations and treat constraints as ranking bonuses | Keep out of engineering-approval workflows; replace with explicit compatibility filters and defensible calculations if needed |
| P1 | No model hash/version/validation state; metadata confidence and geometry accuracy are conflated | Add independent provenance and validation fields |
| P1 | Model responses say CadQuery even for recorded Onshape exports; README says ~40 parts and older docs say no STEP assets | Align documentation and per-asset provenance with actual delivery |

Code references: [search and model tools](../app/api/mcp/route.ts), [fallback generator](../scripts/generate-cadquery-step.py), [placement](../lib/placement-packet.ts), [recommendations](../app/api/recommend/route.ts).

Additional adapter finding: the [Onshape insert route](../app/api/adapters/onshape/insert/route.ts) imports a STEP through the translation API; it does not accept a placement transform or create assembly mates. It uses server-owned credentials and default document IDs without caller authorization in the route. If enabled for external users, replace that with an authorized per-user destination and preserve upstream quota/error details. Do not market this route as automatic assembly placement.

## 6. Proposed portable contract

Keep the existing four tools initially. Before adding more tool surface, agree on a versioned result manifest containing:

- Stable part ID, normalized designation, nominal thread system/size/pitch, material and finish, and explicitly unit-tagged dimensions.
- Field-level source, document revision, extraction date, and verification status. Unknown values stay unknown.
- Canonical STEP URL, content hash, geometry version, generation source, bounding box, geometry units, and simplifications.
- Verified origin and axes, length convention, and optional supplied placement transform; separate placement from mate constraints.
- BOM quantity and, when genuinely available, supplier name, SKU, source link, retrieval time, and stock/price freshness.

Cache immutable geometry by hash; refresh commercial availability separately. After the first pilot, consider `resolve_fastener` for exact identification, `get_fastener_bundle` for related hardware, and `find_supplier_offers` for procurement. These names describe proposed additions; none is currently exposed.

## 7. A 30-day validation plan

Assumes one engineer, access to vendor accounts, and timely pilot feedback. It is an effort outline, not a delivery promise.

| Period | Work | Exit evidence |
| --- | --- | --- |
| Days 1–5 | Fix public asset URLs, unit schema, search constraints; choose 10–20 checked metric parts including matching nuts/washers | Every selected ID resolves to intended metadata and downloadable geometry; no unknown unit guessing |
| Days 6–10 | Validate dimensions/frames and assemble a Zoo handoff demo through a shared MCP client | Correct scale and placement in a real Zoo project, snapshot, BOM, and replayable transcript |
| Days 11–15 | Run the equivalent Adam file/task handoff; obtain answers about native extension support | Authenticated task outcome and a documented supported integration path, or a clear no-go |
| Days 16–23 | Test with 3–5 hardware designers or agent builders on their own repeated tasks | Baseline versus assisted task time, correction count, retrieval failures, and missing catalog cases |
| Days 24–30 | Ask for one paid pilot tied to approved parts, catalog maintenance, or supplier mapping | Named buyer and success criteria; otherwise narrow/reconsider the value proposition |

Suggested benchmark: 20 exact-part lookup/handoff cases and 10 incompatible, ambiguous, or absent-part cases. Require no silent substitution or unit errors in this suite and working asset retrieval for every supported test item. Measure selection correctness, import success, placement error against fixture transforms, manual corrections, wall time, tool calls, and provider costs. Choose dimensional tolerances per fixture rather than making an unsupported universal accuracy promise.

Separate two experiments: exact-ID retrieval tests delivery; natural-language selection tests whether Fastener improves on the agent's existing search tools. Compare both with and without Fastener. A nice screenshot alone is insufficient evidence of value.

## 8. Outreach drafts — not sent

**Zoo:** “I'm building Fastener MCP, a parts service for AI CAD workflows. It currently exposes catalog lookup, STEP downloads, and placement metadata. We're preparing a small verified metric catalog and a demo that supplies explicit parts to a Zoo project. Would a fastener lookup/geometry bundle address a recurring gap for Zookeeper users? What is your supported path for external parts tools or datasets, and could we evaluate it against a few real assembly tasks?”

**Adam:** “I'm building Fastener MCP to connect fastener specifications, CAD geometry, and BOM identities. Your sourcing and BOM workflows look like a potential fit. We're validating a small catalog and would like to test whether structured part bundles reduce corrections in Adam tasks. Do you support custom catalog tools inside Adam, or is file/task handoff the preferred starting point? Could we review a few recurring fastener selection or BOM cleanup failures?”

Lead with a checked demonstration and a measured failure the service fixes. Do not pitch catalog scale, certified engineering selection, live inventory, or native integrations that have not been demonstrated.

## 9. Verification record and limits

Public checks on September 21, 2026:

- Catalog REST request, example placement request, and canonical example STEP download returned HTTP 200.
- MCP initialization negotiated `2025-03-26`; `tools/list` returned the four tools named above.
- Live search reproduced the overly broad diameter results.
- Live model lookup returned a deployment URL whose redirected response was Vercel login HTML, not STEP.
- Local JSON/filesystem counts and export-failure summaries were inspected directly.
- Adam's public OpenAPI and official MCP/API documentation were reviewed; Zoo's official documentation and public MCP source were reviewed.

No authenticated Adam/Zoo execution, CAD-kernel validation of the 142 assets, supplier inventory verification, licensing audit, or customer-demand validation was performed. In particular, the fixed-dimension generator finding establishes a reproducibility problem; it does not establish that every checked-in CadQuery STEP file has the same dimensions. The research supports trying the integration paths, not claiming they already work end to end.
