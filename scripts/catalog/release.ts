import fs from "node:fs";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import path from "node:path";
import { validateCatalog, hashFile } from "./validate";
import { release, geometries, parts } from "../../lib/catalog/data";
import { VERSION } from "../../lib/catalog/schemas";
validateCatalog();
const geometryCheck = spawnSync(
  process.env.CAD_PYTHON ?? ".venv-cadquery/bin/python",
  ["scripts/geometry/build.py", "--verify"],
  { encoding: "utf8" },
);
assert.equal(
  geometryCheck.status,
  0,
  geometryCheck.stderr ||
    "Run the pinned offline geometry environment before publishing a release",
);
const names = [
  "data/catalog/parts.json",
  "data/catalog/sources.json",
  "data/catalog/installations.json",
  "data/catalog/compatibility.json",
  "data/catalog/suppliers.json",
  "data/catalog/supplier-products.json",
  "data/catalog/history/revisions.json",
  "data/geometry/manifest.json",
  "data/geometry/visual-review.json",
  "data/catalog/release.json",
];
const target = `data/catalog/releases/${release}.json`;
const folder = `data/catalog/history/releases/${release}`;
if (fs.existsSync(target)) {
  const existing = JSON.parse(fs.readFileSync(target, "utf8"));
  for (const f of existing.documents)
    if (hashFile(f.path) !== f.sha256)
      throw new Error(
        "Immutable release has changed; increment release ID before publication",
      );
  console.info("Existing release verified:", release);
} else {
  fs.mkdirSync(folder, { recursive: true });
  const documents = names.map((file, index) => {
    const saved = `${folder}/${index}-${path.basename(file)}`;
    fs.copyFileSync(file, saved);
    return { path: file, snapshot_path: saved, sha256: hashFile(file) };
  });
  const manifest = {
    schema_version: VERSION,
    id: release,
    created_at: new Date().toISOString(),
    documents,
    parts: parts.map((p) => ({ id: p.id, revision: p.revision })),
    assets: geometries.map((g) => ({
      id: g.id,
      version: g.version,
      path: g.asset_path,
      sha256: g.sha256,
      bytes: g.bytes,
    })),
    rollback:
      "Restore all documents from this snapshot in one commit/deployment, retain all referenced immutable assets, then run catalog:validate and geometry:verify. Price snapshots are independently versioned and must still pass mapping checks.",
  };
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(manifest, null, 2) + "\n");
  console.info("Published release manifest:", target);
}
