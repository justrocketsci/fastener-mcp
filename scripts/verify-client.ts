/** A real MCP SDK client, REST parity, anonymous downloads, and independent CAD import. */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import os from "node:os";
const origin = process.env.TEST_ORIGIN ?? "http://localhost:3100";
async function main() {
  const transcript: object[] = [];
  const started = performance.now();
  const client = new Client({
    name: "fastener-independent-acceptance-client",
    version: "1.0.0",
  });
  await client.connect(
    new StreamableHTTPClientTransport(new URL(origin + "/api/mcp")),
  );
  try {
    const listed = await client.listTools();
    assert.equal(listed.tools.length, 8);
    assert(listed.tools.every((t) => t.annotations?.readOnlyHint));
    const tool = async (name: string, args: Record<string, unknown>) => {
      const start = performance.now();
      const r = await client.callTool({ name, arguments: args });
      assert(!r.isError, JSON.stringify(r));
      const response =
        r.structuredContent ??
        JSON.parse((r.content as { text: string }[])[0].text);
      transcript.push({
        name,
        arguments: args,
        response,
        duration_ms: performance.now() - start,
      });
      return response;
    };
    const id = "iso4762-m6x20-a2";
    const search = await tool("search_fasteners", {
      category: "socket_screw",
      diameter: 6,
      diameter_unit: "mm",
      length: 20,
      length_unit: "mm",
    });
    const rest = await (
      await fetch(
        origin +
          "/api/fasteners?category=socket_screw&diameter=6&diameter_unit=mm&length=20&length_unit=mm",
      )
    ).json();
    assert.deepEqual(search, rest);
    assert.equal(search.exact_matches[0].id, id);
    for (const [name, route] of [
      ["get_fastener", ""],
      ["get_fastener_model", "/model"],
      ["get_placement_packet", "/placement"],
      ["get_installation_requirements", "/installation"],
    ]) {
      const m = await tool(name, { id, revision: 1 });
      const r = await (
        await fetch(`${origin}/api/fasteners/${id}${route}?revision=1`)
      ).json();
      assert.deepEqual(m, r);
    }
    for (const [name, route, args] of [
      ["get_compatible_parts", "/api/compatibility", { id }],
      [
        "build_parts_list",
        "/api/bom",
        {
          lines: [
            { id, revision: 1, quantity: 2 },
            { id: "din934-m6-a2", quantity: 2 },
          ],
        },
      ],
      [
        "compare_supplier_offers",
        "/api/offers/compare",
        { id, quantity: 11, destination: "US", currency: "USD" },
      ],
    ] as const) {
      const m = await tool(name, args);
      const r = await (
        await fetch(origin + route, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(args),
        })
      ).json();
      if (name === "compare_supplier_offers") {
        delete m.as_of;
        delete r.as_of;
      }
      assert.deepEqual(m, r);
    }
    const model = await tool("get_fastener_model", { id, revision: 1 });
    const download = await fetch(model.model.url);
    assert(download.ok);
    assert(!download.headers.get("content-type")?.includes("html"));
    const bytes = Buffer.from(await download.arrayBuffer());
    assert.equal(bytes.length, model.model.bytes);
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      model.model.sha256,
    );
    fs.mkdirSync(".cache/client", { recursive: true });
    fs.writeFileSync(".cache/client/import.step", bytes);
    const python = process.env.CAD_PYTHON ?? ".venv-cadquery/bin/python";
    const cad = spawnSync(
      python,
      [
        "-c",
        `import cadquery as cq\ns=cq.importers.importStep('.cache/client/import.step').val()\nassert s.isValid() and len(s.Solids())==1 and s.Volume()>0\nb=s.BoundingBox()\nassert abs(b.xlen-10)<0.01 and abs(b.ylen-10)<0.01\nassert abs(b.zmin+6)<0.01 and abs(b.zmax-20)<0.01\nprint('Independent STEP consumer: M6 x 20, 10 mm head, correct frame')`,
      ],
      { encoding: "utf8" },
    );
    assert.equal(cad.status, 0, cad.stderr);
    console.info(cad.stdout.trim());
    const ambiguity = await client.callTool({
      name: "search_fasteners",
      arguments: { diameter: 6 },
    });
    assert(ambiguity.isError);
    const error =
      ambiguity.structuredContent ??
      JSON.parse((ambiguity.content as { text: string }[])[0].text);
    assert.equal(error.error.code, "AMBIGUOUS_UNITS");
    for (const [route, method, status] of [
      ["/api/fasteners?diameter=6", "GET", 400],
      ["/api/fasteners?diameter=no&diameter_unit=mm", "GET", 400],
      ["/api/fasteners?unrecognized=6", "GET", 400],
      ["/api/fasteners/missing", "GET", 404],
      ["/api/fasteners/" + id + "/model?detail=detailed", "GET", 422],
      ["/models/an3-10a.step", "GET", 410],
      ["/api/recommend", "POST", 410],
      ["/api/adapters/onshape/insert", "POST", 410],
    ] as const) {
      const r = await fetch(origin + route, { method });
      assert.equal(r.status, status, route);
      assert((await r.json()).error.code);
    }
    const measurements = [];
    for (let i = 0; i < 20; i++) {
      const begin = performance.now();
      const response = await fetch(
        origin +
          "/api/fasteners?category=socket_screw&diameter=6&diameter_unit=mm",
      );
      assert(response.ok);
      const body = await response.text();
      measurements.push({
        duration_ms: performance.now() - begin,
        bytes: Buffer.byteLength(body),
      });
    }
    const summary = {
      result: "passed",
      checks: [
        "8 read-only SDK tools",
        "REST/MCP parity",
        "anonymous model URL",
        "SHA-256 and byte size",
        "independent STEP import",
        "errors and retired routes",
      ],
      catalog_release: model.catalog_release,
      geometry_version: model.model.version,
      model_url: model.model.url,
      model_sha256: model.model.sha256,
      model_bytes: model.model.bytes,
      measured_cad: {
        solid_count: 1,
        head_diameter_mm: 10,
        z_min_mm: -6,
        z_max_mm: 20,
        tolerance_mm: 0.01,
      },
      origin,
      checked_at: new Date().toISOString(),
      environment: {
        node: process.version,
        os: os.platform(),
        architecture: os.arch(),
      },
      http_search: {
        samples: measurements.length,
        p95_ms: measurements
          .map((m) => m.duration_ms)
          .sort((a, b) => a - b)[18],
        response_bytes: measurements[0].bytes,
        scope:
          "Warm HTTP, includes network; not the in-process performance target",
      },
      total_client_duration_ms: performance.now() - started,
    };
    fs.writeFileSync(
      ".cache/client/transcript.json",
      JSON.stringify({ summary, calls: transcript }, null, 2) + "\n",
    );
    console.info(JSON.stringify(summary, null, 2));
  } finally {
    await client.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
