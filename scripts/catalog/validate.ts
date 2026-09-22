import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  parts,
  history,
  sources,
  geometries,
  installations,
  relationships,
  products,
  suppliers,
  offers,
  release,
} from "../../lib/catalog/data";
import { fingerprint } from "../../lib/catalog/fingerprint";
import { validateObservations } from "../suppliers/refresh";
export const hashFile = (p: string) =>
  createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const unique = (values: string[], label: string) =>
  assert.equal(new Set(values).size, values.length, "Duplicate " + label);
export function validateCatalog() {
  unique(
    parts.map((p) => p.id),
    "part ID",
  );
  unique(
    sources.map((s) => s.id),
    "source ID",
  );
  unique(
    products.map((p) => p.id),
    "product ID",
  );
  unique(
    suppliers.map((s) => s.id),
    "supplier ID",
  );
  unique(
    installations.map((i) => i.id),
    "installation ID",
  );
  unique(
    geometries.map((g) => g.id + "@" + g.version),
    "geometry version",
  );
  unique(
    [...parts, ...history].map((p) => p.id + "@" + p.revision),
    "part revision",
  );
  const active = parts.filter((p) => p.status === "active");
  assert(active.length <= 1000, "Active catalog cap exceeded");
  const byRef = new Map(
    [...parts, ...history].map((p) => [p.id + "@" + p.revision, p]),
  );
  const get = (r: { id: string; revision: number }) => {
    const p = byRef.get(r.id + "@" + r.revision);
    assert(p, "Missing part revision " + r.id);
    return p;
  };
  const sourceIds = new Set(sources.map((s) => s.id));
  for (const p of [...parts, ...history]) {
    for (const e of [
      ...p.evidence,
      ...Object.values(p.dimensions).map((d) => d.evidence),
    ])
      assert(sourceIds.has(e.source_id), "Unknown evidence source");
    for (const d of Object.values(p.dimensions)) {
      if (d.limits)
        assert(
          d.limits[0] <= d.value && d.value <= d.limits[1],
          "Nominal outside source limits",
        );
      if (d.unit !== "deg")
        assert(
          Math.abs(d.normalized_mm! - d.value * (d.unit === "in" ? 25.4 : 1)) <
            1e-8,
          "Bad unit conversion",
        );
    }
    if (p.status === "active") {
      assert(
        p.verified_at &&
          p.evidence.length &&
          p.evidence.every((e) => e.verification === "checked"),
      );
      assert(p.nominal_size_mm);
      assert(
        geometries.some(
          (g) =>
            g.parts.some((r) => r.id === p.id && r.revision === p.revision) &&
            g.detail === "simplified" &&
            g.validation.status === "passed" &&
            g.validation.visual_review === "passed",
        ),
        "Missing passing simplified model " + p.id,
      );
    }
    for (const id of p.installation_ids)
      assert(
        installations.some(
          (i) =>
            i.id === id &&
            i.parts.some((r) => r.id === p.id && r.revision === p.revision),
        ),
        "Bad installation reference",
      );
    for (const id of p.geometry_ids)
      assert(
        geometries.some(
          (g) =>
            g.id === id &&
            g.parts.some((r) => r.id === p.id && r.revision === p.revision),
        ),
        "Bad geometry reference",
      );
  }
  const reviews = JSON.parse(
    fs.readFileSync("data/geometry/visual-review.json", "utf8"),
  ).items as { id: string; preview_sha256: string; status: string }[];
  for (const g of geometries) {
    for (const r of g.parts) get(r);
    const step = path.resolve("public", "." + g.asset_path);
    assert(step.startsWith(path.resolve("public/models") + path.sep));
    if (g.validation.status === "withdrawn") {
      assert(!fs.existsSync(step), "Withdrawn asset is still publicly served");
      continue;
    }
    assert.equal(g.validation.status, "passed");
    assert.equal(g.validation.visual_review, "passed");
    assert.equal(fs.statSync(step).size, g.bytes);
    assert.equal(hashFile(step), g.sha256);
    for (const preview of g.preview_paths) {
      const file = path.join("public", preview);
      assert(fs.existsSync(file));
      assert(
        reviews.some(
          (r) =>
            r.id === g.id &&
            r.status === "passed" &&
            r.preview_sha256 === hashFile(file),
        ),
        "Preview requires visual review",
      );
    }
    const report = JSON.parse(
      fs.readFileSync(path.join("public", g.validation.report_path), "utf8"),
    );
    assert.equal(report.visual_review, "passed");
    assert.equal(report.revision, g.parts[0].revision);
  }
  for (const i of installations) {
    for (const r of i.parts) get(r);
    for (const e of [
      ...i.evidence,
      ...Object.values(i.dimensions).map((d) => d.evidence),
    ])
      assert(sourceIds.has(e.source_id));
  }
  for (const r of relationships) {
    assert.equal(
      r.anchor_fingerprint,
      fingerprint(get(r.anchor)),
      "Compatibility anchor requires re-verification",
    );
    assert.equal(
      r.companion_fingerprint,
      fingerprint(get(r.companion)),
      "Compatibility companion requires re-verification",
    );
  }
  for (const p of products) {
    assert(suppliers.some((s) => s.id === p.supplier_id));
    assert.equal(
      p.part_fingerprint,
      fingerprint(get(p.part)),
      "Supplier mapping requires re-verification",
    );
    assert(p.evidence.length);
    for (const e of p.evidence) assert(sourceIds.has(e.source_id));
  }
  validateObservations(offers.observations);
  assert(
    !fs.readdirSync("public/models").some((f) => f.endsWith(".step")),
    "Flat legacy models may not bypass withdrawal handler",
  );
  return {
    release,
    active_parts: active.length,
    legacy_parts: parts.length - active.length,
    geometries: geometries.length,
    product_links: products.length,
    total_asset_bytes: geometries.reduce((n, g) => n + g.bytes, 0),
  };
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  console.info(JSON.stringify(validateCatalog(), null, 2));
