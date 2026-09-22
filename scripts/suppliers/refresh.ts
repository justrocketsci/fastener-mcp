import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { offersSchema, type Observation } from "../../lib/catalog/schemas";
import { products, suppliers, partIndex } from "../../lib/catalog/data";
import { fingerprint } from "../../lib/catalog/fingerprint";
export function validateObservations(
  observations: Observation[],
  now = Date.now(),
) {
  const seen = new Set<string>();
  for (const obs of observations) {
    if (seen.has(obs.product_id))
      throw new Error("Duplicate observation: " + obs.product_id);
    seen.add(obs.product_id);
    const product = products.find((p) => p.id === obs.product_id);
    if (!product) throw new Error("Unmapped product: " + obs.product_id);
    const part = partIndex.get(product.part.id);
    if (
      !part ||
      part.revision !== product.part.revision ||
      fingerprint(part) !== product.part_fingerprint
    )
      throw new Error(
        "Supplier mapping needs re-verification: " + obs.product_id,
      );
    const dates = [
      obs.price?.observed_at,
      obs.availability?.checked_at,
      obs.delivery?.checked_at,
      ...obs.charges.map((c) => c.checked_at),
    ];
    if (dates.some((t) => t && Date.parse(t) > now))
      throw new Error("Future-dated observation: " + obs.product_id);
    if (obs.price) {
      const minima = obs.price.tiers.map((t) => t.minimum);
      if (
        new Set(minima).size !== minima.length ||
        minima.some((v, i) => i > 0 && v <= minima[i - 1])
      )
        throw new Error("Tiers must have distinct ascending thresholds");
      if (
        obs.price.valid_until &&
        Date.parse(obs.price.valid_until) < Date.parse(obs.price.observed_at)
      )
        throw new Error("Price expiry precedes observation");
    }
  }
}
export function mergeSnapshot(
  previous: unknown,
  incoming: unknown,
  supplierIds: string[],
  now = Date.now(),
) {
  const old = offersSchema.parse(previous),
    candidate = offersSchema.parse(incoming);
  if (
    !supplierIds.length ||
    supplierIds.some((id) => !suppliers.some((s) => s.id === id))
  )
    throw new Error("Select known supplier IDs");
  if (Date.parse(candidate.published_at) > now)
    throw new Error("Snapshot publication time is in the future");
  if (candidate.snapshot === old.snapshot)
    throw new Error("A new snapshot ID is required");
  validateObservations(candidate.observations, now);
  const map = new Map(old.observations.map((o) => [o.product_id, o]));
  for (const row of candidate.observations) {
    const product = products.find((p) => p.id === row.product_id)!;
    if (!supplierIds.includes(product.supplier_id))
      throw new Error("Candidate contains an unselected supplier");
    const prior = map.get(row.product_id);
    if (row.refresh_error && prior)
      map.set(row.product_id, { ...prior, refresh_error: row.refresh_error });
    else
      map.set(row.product_id, {
        ...row,
        price: row.price ?? prior?.price ?? null,
        availability: row.availability ?? prior?.availability ?? null,
        delivery: row.delivery ?? prior?.delivery ?? null,
        charges: row.charges.length ? row.charges : (prior?.charges ?? []),
        refresh_error:
          row.refresh_error ??
          (!row.price
            ? "No new price supplied; retained original observation."
            : null),
      });
  }
  // Selected products omitted from a failed/partial import keep their observations, including their original ages.
  for (const [id, row] of map) {
    const product = products.find((p) => p.id === id);
    if (
      product &&
      supplierIds.includes(product.supplier_id) &&
      !candidate.observations.some((o) => o.product_id === id)
    )
      map.set(id, {
        ...row,
        refresh_error:
          "Not refreshed in this import; original observation retained.",
      });
  }
  const result = offersSchema.parse({
    ...candidate,
    observations: [...map.values()],
  });
  validateObservations(result.observations, now);
  return result;
}
function main() {
  const args = process.argv.slice(2);
  const value = (flag: string) => args[args.indexOf(flag) + 1];
  if (!args.includes("--input") || !args.includes("--suppliers"))
    throw new Error(
      "Usage: npm run offers:refresh -- --input candidate.json --suppliers bolt-depot,monster-bolts [--publish]",
    );
  const file = "data/offers/current.json";
  const old = JSON.parse(fs.readFileSync(file, "utf8"));
  const incoming = JSON.parse(fs.readFileSync(value("--input"), "utf8"));
  const merged = mergeSnapshot(old, incoming, value("--suppliers").split(","));
  fs.mkdirSync(".cache", { recursive: true });
  const candidate = ".cache/offers-candidate.json";
  fs.writeFileSync(candidate, JSON.stringify(merged, null, 2) + "\n");
  console.info("Validated complete candidate:", candidate, merged.snapshot);
  if (args.includes("--publish")) {
    const lock = "data/offers/.publish.lock";
    const handle = fs.openSync(lock, "wx");
    try {
      const current = JSON.parse(fs.readFileSync(file, "utf8"));
      if (fingerprint(current) !== fingerprint(old))
        throw new Error(
          "Snapshot changed while preparing import; retry against current data",
        );
      fs.mkdirSync("data/offers/history", { recursive: true });
      const history = `data/offers/history/${old.snapshot}.json`;
      if (fs.existsSync(`data/offers/history/${merged.snapshot}.json`))
        throw new Error(
          "Snapshot IDs cannot reuse a published historical version",
        );
      if (
        fs.existsSync(history) &&
        fingerprint(JSON.parse(fs.readFileSync(history, "utf8"))) !==
          fingerprint(old)
      )
        throw new Error(
          "Historical snapshot content changed under the same ID",
        );
      if (!fs.existsSync(history))
        fs.writeFileSync(history, JSON.stringify(old, null, 2) + "\n");
      const temp = file + ".candidate";
      // Publish this validated in-memory candidate, never another process's preview file.
      fs.writeFileSync(temp, JSON.stringify(merged, null, 2) + "\n");
      fs.renameSync(temp, file);
      console.info("Published", merged.snapshot);
    } finally {
      fs.closeSync(handle);
      fs.unlinkSync(lock);
    }
  }
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main();
