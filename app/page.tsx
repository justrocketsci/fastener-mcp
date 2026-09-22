import Link from "next/link";
import { catalogStatus } from "@/lib/catalog/service";
export default function Home() {
  const status = catalogStatus();
  return (
    <main className="site-main">
      <section className="hero">
        <p className="eyebrow">Hardware for AI CAD agents</p>
        <h1>
          Find the part.
          <br />
          Get the geometry.
        </h1>
        <p className="lead">
          Checked fastener dimensions, versioned STEP files, and matching
          purchase links. One read-only MCP server for your CAD workflow.
        </p>
        <div className="actions">
          <Link className="primary-button" href="/search">
            Browse the catalog →
          </Link>
          <Link className="secondary-button" href="/mcp">
            Connect an agent
          </Link>
        </div>
      </section>
      <div className="stat-grid">
        <div>
          <strong>{status.counts.active}</strong>
          <span>Checked part identities</span>
        </div>
        <div>
          <strong>{status.counts.validated_models}</strong>
          <span>Validated STEP variants</span>
        </div>
        <div>
          <strong>6</strong>
          <span>Hardware families</span>
        </div>
        <div>
          <strong>2</strong>
          <span>Suppliers checked</span>
        </div>
      </div>
      <section className="card-grid">
        <article className="panel">
          <h2>Geometry you can inspect</h2>
          <p>
            Download files with explicit units, placement datums, checksums, and
            a list of modeled and omitted features.
          </p>
        </article>
        <article className="panel">
          <h2>Useful companion parts</h2>
          <p>
            Find nuts, washers and HELICOIL inserts that match the stated
            nominal interface. See the assembly checks that remain.
          </p>
        </article>
        <article className="panel">
          <h2>Clear purchasing comparisons</h2>
          <p>
            Compare exact variants for your quantity. Pack sizes and observation
            dates are visible, and unknown shipping stays unknown.
          </p>
        </article>
      </section>
      <section className="panel">
        <h2>Start with a complete example</h2>
        <p>
          <Link href="/fasteners/iso4762-m6x20-a2">
            M6 × 20 mm socket screw
          </Link>{" "}
          · <Link href="/fasteners/din934-m6-a2">M6 nut</Link> ·{" "}
          <Link href="/fasteners/din125-m6-a2">M6 washer</Link> ·{" "}
          <Link href="/fasteners/helicoil-plus-m6-1.5d-4130">
            M6 HELICOIL insert
          </Link>
        </p>
        <p className="muted">
          Metric launch coverage. Models are nominal layout references with
          declared simplifications. Your CAD environment handles import and
          placement.
        </p>
      </section>
    </main>
  );
}
