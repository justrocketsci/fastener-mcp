import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getFastener,
  getModel,
  getInstallation,
  compatible,
} from "@/lib/catalog/service";
import { CatalogError } from "@/lib/catalog/errors";
import { PartWorkspace } from "./part-workspace";
export default async function PartPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ revision?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const revision = query.revision ? Number(query.revision) : undefined;
  let data;
  try {
    data = getFastener({ id, revision });
  } catch (e) {
    if (e instanceof CatalogError && e.status === 404) notFound();
    throw e;
  }
  const p = data.part;
  let model = null;
  try {
    model = getModel({ id, revision });
  } catch (e) {
    if (!(e instanceof CatalogError)) throw e;
  }
  return (
    <main className="site-main">
      <Link href="/search">← Catalog</Link>
      <p className="eyebrow">
        {p.category.replaceAll("_", " ")} · Revision {p.revision}
      </p>
      <h1>{p.designation}</h1>
      <p className="lead">
        {p.attributes.material ?? "Material independent reference"} ·{" "}
        {p.status.replaceAll("_", " ")}
      </p>
      {p.status !== "active" && (
        <p className="notice">
          Historical record retained for ID lookup. Its dimensions and model
          have not been verified for the new catalog.
        </p>
      )}
      <section className="panel">
        <h2>Specification and sources</h2>
        <p>
          Length convention: {p.length_meaning.replaceAll("_", " ")}. Grip
          length: {p.grip_length_mm ?? "unknown"}. Property grade:{" "}
          {p.attributes.grade ?? "unspecified"}. Finish:{" "}
          {p.attributes.finish ?? "unspecified"}.
        </p>
        {p.manufacturer && (
          <p>
            {p.manufacturer} · {p.manufacturer_part_number}
          </p>
        )}
        <div
          className="table-wrap"
          role="region"
          aria-label="Part dimensions, scroll for all columns"
          tabIndex={0}
        >
          <table>
            <thead>
              <tr>
                <th>Dimension</th>
                <th>Nominal value</th>
                <th>Source limits</th>
                <th>Basis</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(p.dimensions).map(([key, d]) => (
                <tr key={key}>
                  <td>{key.replaceAll("_", " ")}</td>
                  <td>
                    {d.value} {d.unit}
                  </td>
                  <td>{d.limits?.join(" – ") ?? "Not recorded"}</td>
                  <td>
                    {d.derivation}
                    <br />
                    <span className="muted">{d.evidence.locator}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul>
          {p.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
        <h3>Source evidence</h3>
        {data.sources.map(
          (s) =>
            s && (
              <p key={s.id}>
                <a href={s.url}>
                  {s.publisher}: {s.title}
                </a>
                <br />
                <span className="muted">
                  {s.kind} · retrieved {s.retrieved_at.slice(0, 10)} · revision{" "}
                  {s.revision ?? "unknown"}
                </span>
              </p>
            ),
        )}
        <details>
          <summary>Full machine-readable specification</summary>
          <pre>{JSON.stringify(p, null, 2)}</pre>
          <a
            href={`/api/fasteners/${encodeURIComponent(p.id)}?revision=${p.revision}`}
          >
            Open JSON
          </a>
        </details>
      </section>
      <PartWorkspace
        part={p}
        initialModel={model}
        companions={compatible({ id, revision })}
        installation={getInstallation({ id, revision })}
      />
    </main>
  );
}
