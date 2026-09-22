import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { performance } from "node:perf_hooks";
import {
  search,
  getPart,
  getModel,
  getPlacement,
  getInstallation,
  compatible,
  buildBom,
  csvCell,
} from "../lib/catalog/service";
import {
  parts,
  geometries,
  offers,
  products,
  release,
  history,
  partIndex,
} from "../lib/catalog/data";
import { CatalogError } from "../lib/catalog/errors";
import {
  compare,
  orderQuantity,
  fresh,
  moneyString,
  micros,
} from "../lib/catalog/offers";
import {
  offerInput,
  offersSchema,
  type Observation,
} from "../lib/catalog/schemas";
import {
  mergeSnapshot,
  validateObservations,
} from "../scripts/suppliers/refresh";
import { validateCatalog, hashFile } from "../scripts/catalog/validate";
const id = "iso4762-m6x20-a2";
const fixed = Date.parse("2026-09-22T03:00:00Z");
const request = offerInput.parse({
  id,
  quantity: 25,
  destination: "US",
  currency: "USD",
});
const input = (overrides: Partial<typeof request> = {}) => ({
  ...request,
  ...overrides,
});
function failure(fn: () => unknown, code: string) {
  assert.throws(
    fn,
    (e: unknown) => e instanceof CatalogError && e.code === code,
  );
}
function observations(): Observation[] {
  return structuredClone(
    offers.observations.filter((o) =>
      ["bolt-depot-6419", "monster-bolts-36230284492"].includes(o.product_id),
    ),
  );
}
const freshStock = (o: Observation) => {
  o.availability = {
    checked_at: "2026-09-22T02:50:00Z",
    status: "in_stock",
    quantity: 10000,
  };
  return o;
};
const charge = (
  kind: "shipping" | "tax" | "duty",
  amount: string,
  quantity: number,
) => ({
  kind,
  amount,
  currency: "USD",
  destination: "US",
  postal_code: null,
  quantity,
  scope: "public",
  checked_at: "2026-09-22T02:50:00Z",
  valid_until: "2026-09-23T02:50:00Z",
  estimated: false,
});

test("A01 exact unit normalization keeps metric and unified threads distinct", () => {
  const mm = search({ diameter: 6, diameter_unit: "mm" });
  const inch = search({ diameter: 6 / 25.4, diameter_unit: "in" });
  assert.deepEqual(mm.exact_matches, inch.exact_matches);
  assert(mm.total > 0);
  assert.equal(
    search({ diameter: 0.25, diameter_unit: "in", thread_system: "unified" })
      .total,
    0,
  );
  assert.equal(search({ diameter: 0.25, diameter_unit: "mm" }).total, 0);
});
test("A02 hard constraints, ambiguity and conflicting requirements", () => {
  failure(() => search({ diameter: 6 }), "AMBIGUOUS_UNITS");
  failure(
    () => search({ length: 20, length_unit: "mm", length_max: 12 }),
    "INVALID_INPUT",
  );
  failure(
    () => search({ thread_size: "M6x1", diameter: 4, diameter_unit: "mm" }),
    "INVALID_INPUT",
  );
  failure(
    () => search({ thread_size: "M6x1", pitch_mm: 0.75 }),
    "INVALID_INPUT",
  );
  assert.equal(search({ grade: "A2-70" }).total, 0);
  assert.equal(search({ material: "invented" }).total, 0);
  assert.equal(
    search({
      diameter: 6,
      diameter_unit: "mm",
      length: 20,
      length_unit: "mm",
      category: "socket_screw",
    }).exact_matches[0].id,
    id,
  );
});
test("A03 unsupported models fail explicitly, no generic fallback", () => {
  failure(() => getModel({ id, detail: "detailed" }), "UNSUPPORTED_VARIANT");
  failure(
    () => getModel({ id: "din934-m6-a2", state: "uninstalled" }),
    "UNSUPPORTED_VARIANT",
  );
  failure(() => getModel({ id: "missing" }), "PART_NOT_FOUND");
  failure(() => getModel({ id: "an3-10a" }), "MODEL_WITHDRAWN");
});
test("A04 every active part has checked exported model assets and previews", () => {
  const summary = validateCatalog();
  assert(summary.active_parts >= 24);
  assert(summary.geometries >= 26);
  for (const category of [
    "hex_bolt",
    "socket_screw",
    "countersunk_screw",
    "hex_nut",
    "flat_washer",
    "wire_insert",
  ])
    assert(
      parts.filter((p) => p.status === "active" && p.category === category)
        .length >= 3,
    );
  assert(new Set(products.map((p) => p.part.id)).size >= 10);
});
test("A05 frame semantics and insert state are explicit", () => {
  const bolt = getPlacement({ id });
  assert.equal(bolt.frame.origin_datum, "head_bearing_face");
  assert.equal(bolt.frame.datums.minimum_z, -6);
  assert.equal(bolt.frame.datums.maximum_z, 20);
  assert.equal(bolt.grip_length_mm, null);
  assert.equal(
    getPlacement({ id: "din7991-m6x20-reference" }).frame.origin_datum,
    "flush_top_plane",
  );
  assert.equal(
    getPlacement({ id: "din934-m6-a2" }).frame.origin_datum,
    "lower_seating_face",
  );
  assert.equal(
    getModel({ id: "helicoil-plus-m6-1.5d-4130" }).model.state,
    "installed",
  );
});
test("A06 pinned revisions and model versions resolve exact immutable bytes", () => {
  const m = getModel({ id, revision: 1 });
  assert.deepEqual(
    getModel({ id, revision: 1, geometry_version: m.model.version }),
    m,
  );
  failure(() => getModel({ id, revision: 100 }), "REVISION_NOT_FOUND");
  failure(
    () => getModel({ id, geometry_version: "v1-invented" }),
    "MODEL_UNAVAILABLE",
  );
  assert.equal(hashFile("public" + m.model.asset_path), m.model.sha256);
});
test("A06 a newer selection preserves the old revision and explicitly withdraws bad models", () => {
  const previous = getPart(id);
  const published = getModel({ id, revision: 1 });
  const oldModel = geometries.find(
    (g) => g.id === published.model.id && g.version === published.model.version,
  )!;
  const newerPart = { ...previous, revision: 2 };
  const newerModel = {
    ...structuredClone(oldModel),
    version: "v2-rehearsal",
    parts: [{ id, revision: 2 }],
  };
  history.push(previous);
  partIndex.set(id, newerPart);
  geometries.push(newerModel);
  try {
    assert.equal(getModel({ id }).model.version, "v2-rehearsal");
    assert.deepEqual(
      getModel({ id, revision: 1, geometry_version: oldModel.version }),
      published,
    );
    assert.equal(
      hashFile("public" + published.model.asset_path),
      published.model.sha256,
    );
    oldModel.validation.status = "withdrawn";
    oldModel.validation.withdrawal_reason = "Synthetic withdrawal rehearsal";
    failure(
      () => getModel({ id, revision: 1, geometry_version: oldModel.version }),
      "MODEL_WITHDRAWN",
    );
  } finally {
    oldModel.validation.status = "passed";
    oldModel.validation.withdrawal_reason = null;
    geometries.pop();
    history.pop();
    partIndex.set(id, previous);
  }
});
test("canonical asset origin ignores protected preview URLs", () => {
  const old = process.env.PUBLIC_ASSET_ORIGIN;
  process.env.VERCEL_URL = "protected.example";
  process.env.PUBLIC_ASSET_ORIGIN = "https://public.example";
  assert(getModel({ id }).model.url.startsWith("https://public.example/"));
  if (old) process.env.PUBLIC_ASSET_ORIGIN = old;
  else delete process.env.PUBLIC_ASSET_ORIGIN;
});
test("pagination cursors bind filters and release; empty searches are success", () => {
  const first = search({ limit: 2 });
  assert(first.next_cursor);
  const second = search({ limit: 2, cursor: first.next_cursor });
  assert(
    !first.exact_matches.some((p) =>
      second.exact_matches.some((q) => q.id === p.id),
    ),
  );
  failure(
    () => search({ limit: 3, cursor: first.next_cursor! }),
    "INVALID_INPUT",
  );
  const cursor = JSON.parse(
    Buffer.from(first.next_cursor, "base64url").toString(),
  );
  cursor.release = "old";
  failure(
    () =>
      search({
        limit: 2,
        cursor: Buffer.from(JSON.stringify(cursor)).toString("base64url"),
      }),
    "CURSOR_EXPIRED",
  );
  assert.equal(search({ q: "no-such-part" }).total, 0);
  const alt = search({
    category: "socket_screw",
    grade: "12.9",
    include_alternatives: true,
  });
  assert.equal(alt.exact_matches.length, 0);
  assert(alt.alternatives.every((a) => a.differences.includes("grade")));
});
test("A09 companion matches and engagement constraints remain conditional", () => {
  const c = compatible({ id });
  assert(c.candidates.some((c) => c.part.id === "din934-m6-a2"));
  assert(c.candidates.some((c) => c.part.id === "din125-m6-a2"));
  assert(c.candidates.some((c) => c.part.id === "helicoil-plus-m6-1.5d-4130"));
  assert(c.candidates.every((c) => c.unresolved.length));
  assert(
    compatible({
      id,
      constraints: { stack_thickness_mm: 18, minimum_engagement_mm: 5 },
    }).candidates.every((c) => c.status === "incompatible"),
  );
  assert(
    compatible({ id, constraints: { thread_class: "6H" } }).candidates.every(
      (c) => c.status === "insufficient_information",
    ),
  );
});
test("A10 insertion instructions require host context and preserve sourced quantities", () => {
  const r = getInstallation({ id: "helicoil-plus-m6-1.5d-4130" });
  assert.equal(r.status, "insufficient_information");
  assert.deepEqual(r.missing_inputs, ["host_material", "process", "hole_type"]);
  assert.equal(r.requirements[0].dimensions.suggested_drill.value, 6.3);
  assert.equal(
    r.requirements[0].dimensions.minimum_blind_tap_depth.value,
    14.1,
  );
  assert.equal(getInstallation({ id }).status, "unavailable");
});
test("A11 pack rounding, MOQ/increments, fractional-cent tiers", () => {
  assert.equal(orderQuantity(11, 1, 10, 1), 20);
  assert.equal(orderQuantity(5, 25, 10, 6), 30);
  assert.equal(orderQuantity(35, 1, 10, 6), 60);
  assert.equal(moneyString(micros("0.1694") * BigInt(100)), "16.94");
  const r = compare(getPart(id), input(), fixed);
  const m = r.partial_costs.find((p) => p.supplier_id === "monster-bolts")!;
  assert.equal(m.purchased_quantity, 30);
  assert.equal(m.excess_quantity, 5);
  assert.equal(m.merchandise_subtotal, "7.56");
  const hundred = compare(getPart(id), input({ quantity: 100 }), fixed);
  assert.equal(
    hundred.partial_costs.find((p) => p.supplier_id === "bolt-depot")
      ?.merchandise_subtotal,
    "16.94",
  );
});
test("A11 exact specification fixture: MOQ 100 at $0.10 loses to pack 10 at $0.40", () => {
  const obs = observations().map(freshStock);
  for (const o of obs) {
    const a = o.product_id.startsWith("bolt-depot");
    Object.assign(o.price!, {
      basis: "each",
      tier_basis: "items",
      minimum_quantity: a ? 100 : 1,
      order_increment: 1,
      tiers: [{ minimum: 1, amount: a ? "0.10" : "0.40" }],
    });
  }
  const r = compare(getPart(id), input({ quantity: 10 }), fixed, obs);
  assert.equal(r.partial_costs[0].product_id, "monster-bolts-36230284492");
  assert.deepEqual(
    r.partial_costs.map((o) => [o.purchased_quantity, o.merchandise_subtotal]),
    [
      [10, "4.00"],
      [100, "10.00"],
    ],
  );
  assert.equal(
    r.winner,
    null,
    "Merchandise ranking is not a delivered-cost winner",
  );
});
test("A12/A13 exact specification fixture: $5+$10 loses to $8+$2; missing shipping stays partial", () => {
  const obs = observations().map(freshStock);
  for (const o of obs) {
    const a = o.product_id.startsWith("bolt-depot");
    Object.assign(o.price!, {
      basis: "each",
      tier_basis: "items",
      minimum_quantity: 1,
      order_increment: 1,
      tiers: [{ minimum: 1, amount: a ? "0.50" : "0.80" }],
    });
    o.charges = [
      charge("shipping", a ? "10.00" : "2.00", 10),
      charge("tax", "0.00", 10),
      charge("duty", "0.00", 10),
    ];
  }
  const r = compare(getPart(id), input({ quantity: 10 }), fixed, obs);
  assert.equal(r.winner, "monster-bolts-36230284492");
  assert.deepEqual(
    r.complete_totals.map((o) => o.delivered_total),
    ["10.00", "15.00"],
  );
  obs[0].charges = obs[0].charges.filter((c) => c.kind !== "shipping");
  const partial = compare(getPart(id), input({ quantity: 10 }), fixed, obs);
  assert.equal(partial.complete_totals.length, 1);
  assert.equal(partial.partial_costs[0].charges.shipping, null);
  assert.equal(partial.partial_costs[0].delivered_total, null);
  assert.equal(partial.winner, null);
});
test("A12 shipping can reverse unit-price winner", () => {
  const obs = observations().map(freshStock);
  for (const o of obs) {
    const qty = o.product_id.startsWith("bolt-depot") ? 25 : 30;
    o.charges = [
      charge("shipping", qty === 25 ? "10.00" : "1.00", qty),
      charge("tax", "0.00", qty),
      charge("duty", "0.00", qty),
    ];
  }
  const r = compare(getPart(id), input(), fixed, obs);
  assert.equal(r.winner, "monster-bolts-36230284492");
  assert.equal(r.complete_totals[0].delivered_total, "8.56");
});
test("A13 unknown shipping is never zero or a delivered winner", () => {
  const r = compare(
    getPart(id),
    input(),
    fixed,
    observations().map(freshStock),
  );
  assert.equal(r.winner, null);
  assert.equal(r.complete_totals.length, 0);
  assert(
    r.partial_costs.every(
      (o) => o.charges.shipping === null && o.delivered_total === null,
    ),
  );
});
test("A14 stale prices, different currencies/scopes, missing deadlines are not ranked", () => {
  let obs = observations();
  obs[0].price!.currency = "EUR";
  obs[1].price!.scope = "account:secret";
  assert.equal(compare(getPart(id), input(), fixed, obs).links_only.length, 2);
  obs = observations();
  assert.equal(
    compare(getPart(id), input(), fixed + 25 * 3600000, obs).links_only.length,
    2,
  );
  assert.equal(
    compare(getPart(id), input({ arrival_deadline: "2026-09-23" }), fixed, obs)
      .links_only.length,
    2,
  );
  assert(!fresh("2026-09-23T00:00:00Z", fixed, 24));
  const expired = observations();
  for (const o of expired) o.price!.valid_until = "2026-09-22T02:59:00Z";
  assert.equal(
    compare(getPart(id), input(), fixed, expired).links_only.length,
    2,
  );
});
test("stock and charge scope/expiry are checked independently", () => {
  const obs = observations().map(freshStock);
  obs[0].availability!.status = "out_of_stock";
  obs[1].availability!.checked_at = "2026-09-20T00:00:00Z";
  obs[1].charges = [{ ...charge("shipping", "0", 30), postal_code: "99999" }];
  const r = compare(getPart(id), input({ postal_code: "90210" }), fixed, obs);
  assert.equal(r.links_only.length, 1);
  assert(r.partial_costs[0].missing.includes("stock"));
  assert(r.partial_costs[0].missing.includes("shipping"));
});
test("A15 failed refresh retains last good values and original timestamps", () => {
  const old = structuredClone(offers);
  const incoming = {
    ...old,
    snapshot: "offers-test-2",
    published_at: "2026-09-22T03:00:00Z",
    observations: observations().map((o) => ({
      ...o,
      price: null,
      availability: null,
      refresh_error: "Supplier unavailable",
    })),
  };
  const next = mergeSnapshot(
    old,
    incoming,
    ["bolt-depot", "monster-bolts"],
    fixed,
  );
  assert.deepEqual(
    next.observations.find((o) => o.product_id === "bolt-depot-6419")?.price,
    old.observations.find((o) => o.product_id === "bolt-depot-6419")?.price,
  );
  assert.equal(next.observations.length, old.observations.length);
  const future = observations();
  future[0].price!.observed_at = "2027-01-01T00:00:00Z";
  assert.throws(() => validateObservations(future, fixed));
  assert.throws(() =>
    offersSchema.parse({
      ...old,
      observations: [
        {
          ...old.observations[0],
          price: {
            ...old.observations[0].price,
            tiers: [{ minimum: 1, amount: "NaN" }],
          },
        },
      ],
    }),
  );
});
test("A16 changed part specification invalidates supplier verification", () => {
  const part = structuredClone(getPart(id));
  part.dimensions.length.value = 21;
  const r = compare(part, input(), fixed);
  assert(
    r.links_only.every((o) =>
      o.reasons.includes("Part changed since supplier verification"),
    ),
  );
  const original = partIndex.get(id)!;
  partIndex.set(id, part);
  try {
    assert(
      compatible({ id }).candidates.every(
        (c) =>
          c.status === "insufficient_information" &&
          c.unresolved.some((reason) => reason.includes("invalidated")),
      ),
    );
  } finally {
    partIndex.set(id, original);
  }
});
test("A17 BOM aggregates versions, validates selected SKUs and escapes CSV formulas", () => {
  const b = buildBom({
    lines: [
      { id, quantity: 2 },
      { id, revision: 1, quantity: 3 },
      { id: "din125-m6-a2", quantity: 5 },
    ],
  });
  assert.equal(b.lines.length, 2);
  assert.equal(b.total_quantity, 10);
  assert.equal(b.lines[0].quantity, 5);
  assert(b.lines[0].geometry?.sha256);
  assert(b.csv.includes("geometry_version"));
  assert.equal(csvCell('=HYPERLINK("bad")'), '"\'=HYPERLINK(""bad"")"');
  assert.equal(csvCell("safe, comma"), '"safe, comma"');
  failure(
    () =>
      buildBom({
        lines: [{ id, quantity: 1, supplier_product_id: "bolt-depot-4776" }],
      }),
    "INVALID_INPUT",
  );
});
test("A19 ID/path and input bounds fail closed", () => {
  assert.throws(() => getModel({ id: "../../etc/passwd" }));
  assert.throws(() => search({ limit: 101 }));
  assert.throws(() => search({ diameter: NaN, diameter_unit: "mm" }));
  assert.throws(() => search({ unknown: "silent" } as never));
  assert.throws(() => offerInput.parse({ ...request, quantity: 0 }));
  assert.throws(() => offerInput.parse({ ...request, quantity: 1000001 }));
  assert.throws(() =>
    offerInput.parse({ ...request, url: "https://example.com/private" }),
  );
});
test("A21 release snapshot restores consistent catalog and asset revisions", () => {
  const file = `data/catalog/releases/${release}.json`;
  assert(
    fs.existsSync(file),
    "Construct the release before final acceptance tests",
  );
  const r = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const d of r.documents) {
    assert.equal(hashFile(d.path), d.sha256);
    assert.equal(hashFile(d.snapshot_path), d.sha256);
  }
  for (const a of r.assets) assert.equal(hashFile("public" + a.path), a.sha256);
});
test("1000-record warm search p95 stays below 100ms for 200 queries", () => {
  const seed = parts.filter((p) => p.status === "active");
  const catalog = Array.from({ length: 1000 }, (_, i) => ({
    ...seed[i % seed.length],
    id: "perf-" + i,
  }));
  for (let i = 0; i < 10; i++)
    search({ diameter: 6, diameter_unit: "mm" }, catalog);
  const times = [];
  for (let i = 0; i < 200; i++) {
    const start = performance.now();
    search(
      { diameter: i % 2 ? 6 : 4, diameter_unit: "mm", limit: 20 },
      catalog,
    );
    times.push(performance.now() - start);
  }
  times.sort((a, b) => a - b);
  const p95 = times[189];
  console.info("Warm 1000-record search p95_ms", p95.toFixed(3));
  assert(p95 < 100);
});
test("at least five exact identities have two fresh checked supplier price observations", () => {
  const ids = new Set(products.map((p) => p.part.id));
  let count = 0;
  for (const partId of ids) {
    const rows = compare(
      getPart(partId),
      input({ id: partId }),
      fixed,
    ).partial_costs;
    if (new Set(rows.map((r) => r.supplier_id)).size >= 2) count++;
  }
  assert(count >= 5);
  assert(geometries.filter((g) => g.detail === "detailed").length >= 2);
});
