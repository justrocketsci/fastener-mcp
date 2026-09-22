import { z } from "zod";
import {
  parts,
  history,
  partIndex,
  geometries,
  sources,
  sourceIndex,
  installations,
  relationships,
  products,
  offers,
  release,
} from "./data";
import {
  inputs,
  VERSION,
  searchInput,
  modelInput,
  getInput,
  installationInput,
  compatibilityInput,
  bomInput,
  offerInput,
  type Part,
  type ToolName,
} from "./schemas";
import { CatalogError, errorPayload } from "./errors";
import { fingerprint } from "./fingerprint";
import { compare } from "./offers";
const same = (a: unknown, b: unknown) =>
  typeof a === "string" && typeof b === "string"
    ? a.toLowerCase() === b.toLowerCase()
    : a === b;
export const envelope = <T extends object>(data: T) => ({
  schema_version: VERSION,
  catalog_release: release,
  ...data,
});
export function getPart(id: string, revision?: number): Part {
  const current = partIndex.get(id);
  if (!current)
    throw new CatalogError(
      "PART_NOT_FOUND",
      "No catalog identity matches this ID.",
      404,
      { id },
    );
  if (revision === undefined || current.revision === revision) return current;
  const old = history.find((p) => p.id === id && p.revision === revision);
  if (old) return old;
  throw new CatalogError(
    "REVISION_NOT_FOUND",
    "This part revision is not published.",
    404,
    { id, revision },
  );
}
const compact = (p: Part, differences: string[] = []) => ({
  id: p.id,
  revision: p.revision,
  designation: p.designation,
  category: p.category,
  status: p.status,
  thread: p.thread,
  material: p.attributes.material,
  grade: p.attributes.grade,
  geometry_detail: geometries
    .filter(
      (g) =>
        g.parts.some((x) => x.id === p.id && x.revision === p.revision) &&
        g.validation.status === "passed",
    )
    .map((g) => g.detail)
    .filter((x, i, a) => a.indexOf(x) === i),
  match_classification: differences.length ? "alternative" : "exact",
  differences,
});
// Catalogs are immutable per process. Index common filters once, including test/benchmark catalogs.
const searchIndexes = new WeakMap<Part[], Map<string, Part[]>>();
function indexedCandidates(
  catalog: Part[],
  input: z.infer<typeof searchInput>,
) {
  let index = searchIndexes.get(catalog);
  if (!index) {
    index = new Map();
    for (const p of catalog) {
      const fields = {
        source_status: [p.status],
        category: [p.category],
        material: [p.attributes.material],
        thread_system: [p.thread.system],
        standard: p.standards,
      };
      for (const [key, values] of Object.entries(fields)) {
        for (const value of values) {
          if (value === null) continue;
          const name = key + ":" + value.toLowerCase();
          const bucket = index.get(name) ?? [];
          bucket.push(p);
          index.set(name, bucket);
        }
      }
    }
    searchIndexes.set(catalog, index);
  }
  let candidates = index.get("source_status:" + input.source_status) ?? [];
  if (!input.include_alternatives) {
    for (const key of [
      "category",
      "material",
      "thread_system",
      "standard",
    ] as const) {
      if (input[key] === undefined) continue;
      const bucket = index.get(key + ":" + input[key].toLowerCase()) ?? [];
      if (bucket.length < candidates.length) candidates = bucket;
    }
  }
  return candidates;
}
export function search(
  raw: z.input<typeof searchInput>,
  catalog: Part[] = parts,
) {
  const input = searchInput.parse(raw);
  for (const name of ["diameter", "length"] as const) {
    const values = [input[name], input[`${name}_min`], input[`${name}_max`]];
    if (values.some((v) => v !== undefined) && !input[`${name}_unit`])
      throw new CatalogError(
        "AMBIGUOUS_UNITS",
        `Supply ${name}_unit: mm or in.`,
        400,
      );
    const min = input[`${name}_min`],
      max = input[`${name}_max`],
      exact = input[name];
    if (
      (min !== undefined && max !== undefined && min > max) ||
      (exact !== undefined &&
        ((min !== undefined && exact < min) ||
          (max !== undefined && exact > max)))
    )
      throw new CatalogError(
        "INVALID_INPUT",
        `Conflicting ${name} bounds.`,
        400,
      );
  }
  const q = input.q?.trim().toLowerCase();
  const designation = (
    input.thread_size ?? (q && /^m\d/.test(q) ? q : undefined)
  )?.match(/^m(\d+(?:\.\d+)?)(?:\s*[x×]\s*(\d+(?:\.\d+)?))?$/i);
  if (input.thread_size && !designation)
    throw new CatalogError(
      "INVALID_INPUT",
      "Supported thread designations are M6 or M6x1. Verified inch thread coverage is not yet published.",
      400,
    );
  if (designation && input.thread_system && input.thread_system !== "metric")
    throw new CatalogError(
      "INVALID_INPUT",
      "Thread designation conflicts with thread_system.",
      400,
    );
  if (
    designation &&
    input.diameter !== undefined &&
    Math.abs(
      Number(designation[1]) -
        input.diameter * (input.diameter_unit === "in" ? 25.4 : 1),
    ) > 1e-8
  )
    throw new CatalogError(
      "INVALID_INPUT",
      "Thread size conflicts with diameter.",
      400,
    );
  if (
    designation?.[2] &&
    input.pitch_mm !== undefined &&
    Number(designation[2]) !== input.pitch_mm
  )
    throw new CatalogError(
      "INVALID_INPUT",
      "Thread size conflicts with pitch.",
      400,
    );
  function differences(p: Part) {
    const failures: string[] = [];
    const eq = (label: string, a: unknown, b: unknown) => {
      if (b !== undefined && !same(a, b)) failures.push(label);
    };
    eq("category", p.category, input.category);
    if (input.standard && !p.standards.some((s) => same(s, input.standard)))
      failures.push("standard");
    eq(
      "thread_system",
      p.thread.system,
      input.thread_system ?? (designation ? "metric" : undefined),
    );
    eq(
      "thread_size",
      p.thread.nominal_diameter_mm,
      designation ? Number(designation[1]) : undefined,
    );
    eq(
      "pitch_mm",
      p.thread.pitch_mm,
      input.pitch_mm ?? (designation?.[2] ? Number(designation[2]) : undefined),
    );
    eq("handedness", p.thread.handedness, input.handedness);
    for (const a of [
      "material",
      "grade",
      "finish",
      "head_type",
      "drive_type",
    ] as const)
      eq(a, p.attributes[a], input[a]);
    for (const name of ["diameter", "length"] as const) {
      const value =
        name === "diameter"
          ? p.nominal_size_mm
          : p.dimensions.length?.normalized_mm;
      const factor = input[`${name}_unit`] === "in" ? 25.4 : 1;
      const exact = input[name],
        min = input[`${name}_min`],
        max = input[`${name}_max`];
      if (
        (exact !== undefined &&
          (value == null || Math.abs(value - exact * factor) > 1e-8)) ||
        (min !== undefined && (value == null || value < min * factor - 1e-8)) ||
        (max !== undefined && (value == null || value > max * factor + 1e-8))
      )
        failures.push(name);
    }
    if (
      q &&
      !designation &&
      !`${p.id} ${p.designation} ${p.aliases.join(" ")} ${p.standards.join(" ")}`
        .toLowerCase()
        .includes(q)
    )
      failures.push("query");
    if (
      input.geometry_detail &&
      !geometries.some(
        (g) =>
          g.detail === input.geometry_detail &&
          g.validation.status === "passed" &&
          g.parts.some((r) => r.id === p.id && r.revision === p.revision),
      )
    )
      failures.push("geometry_detail");
    return failures;
  }
  const queryHash = fingerprint({ ...input, cursor: undefined });
  let offset = 0;
  if (input.cursor) {
    let cursor;
    try {
      cursor = JSON.parse(Buffer.from(input.cursor, "base64url").toString());
    } catch {
      throw new CatalogError("INVALID_INPUT", "Malformed cursor.", 400);
    }
    if (cursor.release !== release)
      throw new CatalogError(
        "CURSOR_EXPIRED",
        "Catalog changed. Start this search again.",
        400,
      );
    if (
      cursor.query !== queryHash ||
      !Number.isSafeInteger(cursor.offset) ||
      cursor.offset < 0 ||
      cursor.offset > catalog.length
    )
      throw new CatalogError(
        "INVALID_INPUT",
        "Cursor does not match this search.",
        400,
      );
    offset = cursor.offset;
  }
  const candidates = indexedCandidates(catalog, input)
    .filter((p) => p.status === input.source_status)
    .map((p) => ({ p, d: differences(p) }))
    .sort((a, b) => a.p.id.localeCompare(b.p.id));
  const exact = candidates.filter((r) => r.d.length === 0);
  const next =
    offset + input.limit < exact.length
      ? Buffer.from(
          JSON.stringify({
            release,
            query: queryHash,
            offset: offset + input.limit,
          }),
        ).toString("base64url")
      : null;
  return envelope({
    total: exact.length,
    exact_matches: exact
      .slice(offset, offset + input.limit)
      .map(({ p }) => compact(p)),
    alternatives: input.include_alternatives
      ? candidates
          .filter((r) => r.d.length > 0 && r.d.length <= 2)
          .sort((a, b) => a.d.length - b.d.length)
          .slice(0, input.limit)
          .map(({ p, d }) => compact(p, d))
      : [],
    next_cursor: next,
    matched_requirements: Object.fromEntries(
      Object.entries(input).filter(
        ([k, v]) =>
          v !== undefined &&
          !["cursor", "limit", "include_alternatives"].includes(k),
      ),
    ),
    missing_requirements:
      exact.length === 0
        ? ["No checked part satisfies every supplied constraint."]
        : [],
  });
}
export function getFastener(raw: z.input<typeof getInput>) {
  const i = getInput.parse(raw),
    part = getPart(i.id, i.revision);
  return envelope({
    part,
    sources: [
      ...new Set([
        ...part.evidence.map((e) => e.source_id),
        ...Object.values(part.dimensions).map((d) => d.evidence.source_id),
      ]),
    ].map((id) => sourceIndex.get(id)),
    supplier_products: products.filter(
      (p) => p.part.id === part.id && p.part.revision === part.revision,
    ),
  });
}
export function assetOrigin() {
  const origin =
    process.env.PUBLIC_ASSET_ORIGIN ?? "https://fastener-mcp.vercel.app";
  const url = new URL(origin);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new Error("PUBLIC_ASSET_ORIGIN must be an HTTP(S) origin");
  return url.origin;
}
export function getModel(raw: z.input<typeof modelInput>) {
  const i = modelInput.parse(raw),
    p = getPart(i.id, i.revision),
    state =
      i.state ??
      (p.category === "wire_insert" ? "installed" : "not_applicable");
  if (p.status === "legacy_unverified" || p.status === "deprecated")
    throw new CatalogError(
      "MODEL_WITHDRAWN",
      "Historical model is withdrawn pending dimension and frame checks.",
      410,
      { id: p.id },
    );
  const family = geometries.filter((g) =>
    g.parts.some((r) => r.id === p.id && r.revision === p.revision),
  );
  const variants = family.filter(
    (g) => g.detail === i.detail && g.state === state,
  );
  if (!variants.length)
    throw new CatalogError(
      family.length ? "UNSUPPORTED_VARIANT" : "MODEL_UNAVAILABLE",
      "No published model supports this exact revision/detail/state.",
      422,
      {
        available: family.map((g) => ({
          detail: g.detail,
          state: g.state,
          version: g.version,
        })),
      },
    );
  const g = i.geometry_version
    ? variants.find((g) => g.version === i.geometry_version)
    : variants.at(-1);
  if (!g)
    throw new CatalogError(
      "MODEL_UNAVAILABLE",
      "The requested geometry version is not published.",
      422,
    );
  if (g.validation.status === "withdrawn")
    throw new CatalogError(
      "MODEL_WITHDRAWN",
      g.validation.withdrawal_reason ?? "This model was withdrawn.",
      410,
    );
  if (
    g.validation.status !== "passed" ||
    g.validation.visual_review !== "passed"
  )
    throw new CatalogError(
      "MODEL_UNAVAILABLE",
      "Model has not passed every publication check.",
      422,
    );
  return envelope({
    part: { id: p.id, revision: p.revision },
    model: {
      ...g,
      url: assetOrigin() + g.asset_path,
      preview_urls: g.preview_paths.map((p) => assetOrigin() + p),
      report_url: assetOrigin() + g.validation.report_path,
    },
  });
}
export function getPlacement(raw: z.input<typeof modelInput>) {
  const result = getModel(raw);
  return envelope({
    placement_schema: "fastener-mcp.placement.v1",
    part: result.part,
    geometry: {
      id: result.model.id,
      version: result.model.version,
      sha256: result.model.sha256,
      url: result.model.url,
      units: result.model.units,
      detail: result.model.detail,
      state: result.model.state,
    },
    frame: result.model.frame,
    grip_length_mm: getPart(result.part.id, result.part.revision)
      .grip_length_mm,
    capability: "local frame reference; no automatic mates or hole detection",
  });
}
export function getInstallation(raw: z.input<typeof installationInput>) {
  const i = installationInput.parse(raw),
    p = getPart(i.id, i.revision);
  const records = installations.filter(
    (r) =>
      r.parts.some((x) => x.id === p.id && x.revision === p.revision) &&
      (!i.installation_type || i.installation_type === r.type),
  );
  const missing = [
    ...new Set(records.flatMap((r) => r.required_context.filter((k) => !i[k]))),
  ];
  const documented =
    records.length > 0 && records.every((r) => r.status === "documented");
  return envelope({
    part: { id: p.id, revision: p.revision },
    status: !documented
      ? "unavailable"
      : missing.length
        ? "insufficient_information"
        : "documented_with_conditions",
    missing_inputs: missing,
    context: i,
    requirements: records,
    unresolved: records.length
      ? records.flatMap((r) => r.unresolved)
      : [
          "No sourced installation instructions for this identity/revision/type.",
        ],
    application_approval: false,
  });
}
export function compatible(raw: z.input<typeof compatibilityInput>) {
  const i = compatibilityInput.parse(raw),
    anchor = getPart(i.id, i.revision);
  const refs = relationships.filter(
    (r) => r.anchor.id === anchor.id && r.anchor.revision === anchor.revision,
  );
  const candidates = refs
    .map((r) => ({ r, p: getPart(r.companion.id, r.companion.revision) }))
    .filter(({ p }) => i.companion_categories.includes(p.category))
    .map(({ r, p }) => {
      const unresolved = [...r.unresolved],
        conflicts: string[] = [];
      const c = i.constraints;
      if (
        r.anchor_fingerprint !== fingerprint(anchor) ||
        r.companion_fingerprint !== fingerprint(p)
      )
        unresolved.push("Verification invalidated by a part change");
      const knownClass =
        !c?.thread_class ||
        (anchor.thread.class === c.thread_class &&
          p.thread.class === c.thread_class);
      if (!knownClass)
        unresolved.push("Requested thread class is not established");
      if (
        c?.stack_thickness_mm !== undefined &&
        c.minimum_engagement_mm !== undefined
      ) {
        const length = anchor.dimensions.length?.normalized_mm;
        if (length == null || anchor.length_meaning !== "under_head")
          unresolved.push(
            "Usable engagement length cannot be determined for this length convention",
          );
        else if (length - c.stack_thickness_mm < c.minimum_engagement_mm)
          conflicts.push(
            "Length remaining after stack is below requested engagement",
          );
        else
          unresolved.push(
            "Requested numeric length budget is met; engagement suitability still requires an applicable source rule.",
          );
      }
      const stale = unresolved.some((x) => x.includes("invalidated"));
      return {
        part: compact(p),
        quantity: i.quantity,
        relationship: r.relationship,
        status: conflicts.length
          ? "incompatible"
          : !knownClass || stale
            ? "insufficient_information"
            : "compatible_for_stated_constraints",
        checked_attributes: r.checked_attributes,
        conditions: r.conditions,
        conflicts,
        unresolved,
      };
    });
  return envelope({
    anchor: { id: anchor.id, revision: anchor.revision },
    candidates,
    unresolved: [
      "Companions are a shortlist. Assembly strength, grip, thread engagement, installation and load suitability require separate verification.",
    ],
    status: candidates.length ? "shortlist" : "insufficient_information",
  });
}
export const csvCell = (v: unknown) => {
  let s = String(v ?? "");
  if (/^[\s]*[=+@\-\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
};
export function buildBom(raw: z.input<typeof bomInput>) {
  const i = bomInput.parse(raw);
  const grouped = new Map<
    string,
    { part: Part; quantity: number; supplier_product_id: string | null }
  >();
  for (const line of i.lines) {
    const p = getPart(line.id, line.revision);
    if (line.supplier_product_id) {
      const sp = products.find((x) => x.id === line.supplier_product_id);
      if (
        !sp ||
        sp.part.id !== p.id ||
        sp.part.revision !== p.revision ||
        sp.match_status !== "exact" ||
        sp.part_fingerprint !== fingerprint(p)
      )
        throw new CatalogError(
          "INVALID_INPUT",
          "Selected supplier SKU does not exactly match the BOM revision.",
          400,
        );
    }
    const key = `${p.id}@${p.revision}:${line.supplier_product_id ?? ""}`;
    const row = grouped.get(key) ?? {
      part: p,
      quantity: 0,
      supplier_product_id: line.supplier_product_id ?? null,
    };
    row.quantity += line.quantity;
    if (row.quantity > 1000000)
      throw new CatalogError(
        "INVALID_INPUT",
        "Aggregated quantity exceeds 1,000,000.",
        400,
      );
    grouped.set(key, row);
  }
  const lines = [...grouped.values()].map(
    ({ part: p, quantity, supplier_product_id }) => {
      let geometry = null;
      try {
        const g = getModel({ id: p.id, revision: p.revision }).model;
        geometry = {
          id: g.id,
          version: g.version,
          sha256: g.sha256,
          url: g.url,
        };
      } catch (e) {
        if (!(e instanceof CatalogError)) throw e;
      }
      return {
        id: p.id,
        revision: p.revision,
        designation: p.designation,
        quantity,
        supplier_product_id,
        geometry,
        unresolved: [
          ...(!geometry ? ["Validated geometry unavailable"] : []),
          ...(!supplier_product_id ? ["Supplier not selected"] : []),
          "Installation and assembly suitability require verification",
        ],
      };
    },
  );
  const columns = [
    "id",
    "revision",
    "designation",
    "quantity",
    "supplier_product_id",
    "geometry_version",
    "geometry_sha256",
    "unresolved",
  ];
  const csv =
    [
      columns.map(csvCell).join(","),
      ...lines.map((l) =>
        [
          l.id,
          l.revision,
          l.designation,
          l.quantity,
          l.supplier_product_id,
          l.geometry?.version,
          l.geometry?.sha256,
          l.unresolved.join("; "),
        ]
          .map(csvCell)
          .join(","),
      ),
    ].join("\r\n") + "\r\n";
  return envelope({
    lines,
    total_quantity: lines.reduce((n, l) => n + l.quantity, 0),
    csv,
    notes: ["No basket shipping optimization or automatic order."],
  });
}
export function catalogStatus() {
  return envelope({
    counts: {
      active: parts.filter((p) => p.status === "active").length,
      legacy_unverified: parts.filter((p) => p.status === "legacy_unverified")
        .length,
      validated_models: geometries.filter(
        (g) => g.validation.status === "passed",
      ).length,
      supplier_products: products.length,
    },
    coverage: {
      categories: [
        ...new Set(
          parts.filter((p) => p.status === "active").map((p) => p.category),
        ),
      ],
      standards: [
        ...new Set(
          parts
            .filter((p) => p.status === "active")
            .flatMap((p) => p.standards),
        ),
      ],
      thread_systems: ["metric"],
      geometry_details: [...new Set(geometries.map((g) => g.detail))],
      installation: installations.reduce(
        (a, r) => ({ ...a, [r.status]: (a[r.status] ?? 0) + 1 }),
        {} as Record<string, number>,
      ),
    },
    offers_snapshot: offers.snapshot,
    offers_published_at: offers.published_at,
    offers_age_seconds: Math.max(
      0,
      Math.floor((Date.now() - Date.parse(offers.published_at)) / 1000),
    ),
    source_count: sources.length,
    limits: { active_parts: 1000, price_freshness_default_hours: 24 },
    geometry_engine: "Offline CadQuery / OpenCascade",
    database: null,
  });
}
export function execute(name: ToolName, raw: unknown): Record<string, unknown> {
  const start = performance.now();
  let code = "ok";
  try {
    switch (name) {
      case "search_fasteners":
        return search(inputs[name].parse(raw));
      case "get_fastener":
        return getFastener(inputs[name].parse(raw));
      case "get_fastener_model":
        return getModel(inputs[name].parse(raw));
      case "get_placement_packet":
        return getPlacement(inputs[name].parse(raw));
      case "get_installation_requirements":
        return getInstallation(inputs[name].parse(raw));
      case "get_compatible_parts":
        return compatible(inputs[name].parse(raw));
      case "compare_supplier_offers": {
        const i = offerInput.parse(raw);
        return envelope(compare(getPart(i.id, i.revision), i));
      }
      case "build_parts_list":
        return buildBom(inputs[name].parse(raw));
      default:
        throw new CatalogError("INVALID_INPUT", "Unknown tool.", 400);
    }
  } catch (e) {
    code = errorPayload(e).error.code;
    throw e;
  } finally {
    if (process.env.NODE_ENV !== "test")
      console.info(
        JSON.stringify({
          tool: name,
          duration_ms: Math.round(performance.now() - start),
          status: code,
          catalog_release: release,
        }),
      );
  }
}
