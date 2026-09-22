import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { release, offers } from "../lib/catalog/data";

test("A21 isolated rollback restores catalog, manifest, prices and actual service responses together", () => {
  const root = process.cwd();
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "fastener-rollback-"));
  try {
    for (const folder of ["lib", "data", "scripts"])
      fs.cpSync(path.join(root, folder), path.join(temp, folder), {
        recursive: true,
      });
    for (const file of ["tsconfig.json", "package.json"])
      fs.copyFileSync(path.join(root, file), path.join(temp, file));
    for (const folder of ["node_modules", "public"])
      fs.symlinkSync(path.join(root, folder), path.join(temp, folder), "dir");
    const priceBackup = fs.readFileSync(
      path.join(temp, "data/offers/current.json"),
    );
    const probe = () => {
      const child = spawnSync(
        process.execPath,
        [
          path.join(root, "node_modules/tsx/dist/cli.mjs"),
          "-e",
          `
        import { getModel, getPart } from './lib/catalog/service';
        import { compare } from './lib/catalog/offers';
        import { offerInput } from './lib/catalog/schemas';
        import { validateCatalog } from './scripts/catalog/validate';
        const model = getModel({id: 'iso4762-m6x20-a2', revision: 1});
        const prices = compare(getPart('iso4762-m6x20-a2'), offerInput.parse({id:'iso4762-m6x20-a2',quantity:25,destination:'US',currency:'USD'}), Date.parse('2026-09-22T03:00:00Z'));
        console.log(JSON.stringify({validation:validateCatalog(), model, prices}));
      `,
        ],
        {
          cwd: temp,
          encoding: "utf8",
          env: { ...process.env, NODE_ENV: "test" },
        },
      );
      assert.equal(child.status, 0, child.stderr);
      return JSON.parse(child.stdout);
    };
    const original = probe();
    const nextPointer = {
      schema_version: "fastener-mcp.v2",
      id: "catalog-rollback-rehearsal",
    };
    fs.writeFileSync(
      path.join(temp, "data/catalog/release.json"),
      JSON.stringify(nextPointer),
    );
    const nextOffers = JSON.parse(priceBackup.toString());
    nextOffers.snapshot = "offers-rollback-rehearsal";
    nextOffers.observations.find(
      (o: { product_id: string }) => o.product_id === "bolt-depot-6419",
    ).price.tiers[0].amount = "5.00";
    fs.writeFileSync(
      path.join(temp, "data/offers/current.json"),
      JSON.stringify(nextOffers),
    );
    const newer = probe();
    assert.equal(newer.model.catalog_release, nextPointer.id);
    assert.notDeepEqual(newer.prices, original.prices);
    const manifest = JSON.parse(
      fs.readFileSync(
        path.join(root, `data/catalog/releases/${release}.json`),
        "utf8",
      ),
    );
    for (const document of manifest.documents)
      fs.copyFileSync(
        path.join(root, document.snapshot_path),
        path.join(temp, document.path),
      );
    fs.writeFileSync(path.join(temp, "data/offers/current.json"), priceBackup);
    const restored = probe();
    assert.deepEqual(restored, original);
    assert.equal(restored.model.catalog_release, release);
    assert.equal(restored.prices.offers_snapshot, offers.snapshot);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
