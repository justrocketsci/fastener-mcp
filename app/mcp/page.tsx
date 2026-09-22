import Link from "next/link";
import { inputs } from "@/lib/catalog/schemas";
import { assetOrigin } from "@/lib/catalog/service";
export default function McpGuide() {
  return (
    <main className="site-main">
      <p className="eyebrow">Read-only MCP · Version 2</p>
      <h1>Give your CAD agent checked hardware</h1>
      <p className="lead">
        Connect an MCP client, request a precise part, then let the agent’s CAD
        environment download and import the STEP file.
      </p>
      <section className="panel">
        <h2>Connect</h2>
        <p>Streamable HTTP endpoint:</p>
        <pre>{assetOrigin() + "/api/mcp"}</pre>
        <p>
          No catalog account, Onshape subscription or CAD API key is required.
          Client configuration differs; use the HTTP MCP connection setting in
          your agent.
        </p>
        <p>
          MCP delivers data and files. The consumer must support STEP import and
          apply the supplied local frame. Native Zoo or Adam integration is not
          required or claimed.
        </p>
      </section>
      <section className="panel">
        <h2>Available tools</h2>
        <ul>
          {Object.keys(inputs).map((name) => (
            <li key={name}>
              <code>{name}</code>
            </li>
          ))}
        </ul>
      </section>
      <section className="panel">
        <h2>Try a complete workflow</h2>
        <ol className="list-decimal pl-6 space-y-3">
          <li>Search for a socket screw with exact units and requirements.</li>
          <li>
            Get the selected identity and revision. Check material, dimensions
            and source evidence.
          </li>
          <li>
            Get the model and placement packet for the same revision, detail and
            state.
          </li>
          <li>
            Download the returned URL anonymously, verify bytes and SHA-256, and
            import it in mm.
          </li>
          <li>
            Read installation requirements and companion-part limitations before
            using it in an assembly.
          </li>
          <li>
            Compare supplier observations for your quantity, country and
            currency, then export a parts list.
          </li>
        </ol>
        <pre>
          {JSON.stringify(
            {
              tool: "search_fasteners",
              arguments: {
                category: "socket_screw",
                thread_size: "M6x1",
                length: 20,
                length_unit: "mm",
                material: "A2 stainless steel",
              },
            },
            null,
            2,
          )}
        </pre>
        <pre>
          {JSON.stringify(
            {
              tool: "get_fastener_model",
              arguments: {
                id: "iso4762-m6x20-a2",
                revision: 1,
                detail: "simplified",
              },
            },
            null,
            2,
          )}
        </pre>
        <pre>
          {JSON.stringify(
            {
              tool: "compare_supplier_offers",
              arguments: {
                id: "iso4762-m6x20-a2",
                quantity: 25,
                destination: "US",
                currency: "USD",
              },
            },
            null,
            2,
          )}
        </pre>
        <Link href="/fasteners/iso4762-m6x20-a2">
          Inspect the example part →
        </Link>
      </section>
      <section className="panel">
        <h2>Explicit limits and errors</h2>
        <p>
          Unitless numeric filters fail with <code>AMBIGUOUS_UNITS</code>.
          Missing parts use <code>PART_NOT_FOUND</code>; unsupported detail or
          insert state uses <code>UNSUPPORTED_VARIANT</code>. Withdrawn legacy
          models use <code>MODEL_WITHDRAWN</code>. Empty exact searches and
          comparisons with no winner are successful responses.
        </p>
        <p>
          Search returns compact exact matches, separate opt-in alternatives and
          a release-bound cursor. It defaults to 20 results and accepts at most
          100. Model results contain download metadata, never embedded STEP
          bytes.
        </p>
        <p>
          Every result has a catalog release. Price results also identify the
          offers snapshot and observation dates. Pin part revisions and geometry
          versions when repeatability matters.
        </p>
        <p>
          Detailed socket models add the sourced drive recess; thread helices
          remain omitted. Installed inserts are nominal reference envelopes,
          with no wire-level collision or contact claim. Verified inch-thread
          coverage is not part of this launch.
        </p>
        <a href="/api/catalog/status">Current catalog status</a>
      </section>
    </main>
  );
}
