import Link from "next/link";
import { search } from "@/lib/catalog/service";
import { query } from "@/lib/catalog/http";
import { errorPayload } from "@/lib/catalog/errors";
import { categorySchema } from "@/lib/catalog/schemas";
export default async function Search({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params))
    for (const x of Array.isArray(v) ? v : v ? [v] : [])
      if (x !== "") qs.append(k, x);
  let result: ReturnType<typeof search> | undefined, error: string | undefined;
  try {
    result = search(query(new Request("http://catalog.local/?" + qs)));
  } catch (e) {
    error = errorPayload(e).error.message;
  }
  const value = (key: string) =>
    typeof params[key] === "string" ? (params[key] as string) : "";
  const field = (name: string, label: string, type = "text") => (
    <label key={name}>
      {label}
      <input
        name={name}
        type={type}
        step={type === "number" ? "any" : undefined}
        min={type === "number" ? "0" : undefined}
        defaultValue={value(name)}
      />
    </label>
  );
  return (
    <main className="site-main">
      <p className="eyebrow">Checked catalog</p>
      <h1>Find hardware</h1>
      <p className="lead">
        Every filter is a requirement. Material-independent references cannot
        satisfy a specific material or grade.
      </p>
      <form className="panel filters" action="/search">
        <label className="wide">
          Search by ID, standard, or designation
          <input
            name="q"
            defaultValue={value("q")}
            placeholder="M6x1 or ISO 4762"
          />
        </label>
        <label>
          Category
          <select name="category" defaultValue={value("category")}>
            <option value="">All categories</option>
            {categorySchema.options
              .filter((c) => c !== "legacy")
              .map((c) => (
                <option key={c} value={c}>
                  {c.replaceAll("_", " ")}
                </option>
              ))}
          </select>
        </label>
        {field("standard", "Standard")}
        {field("thread_size", "Thread designation")}
        {field("diameter", "Nominal diameter", "number")}
        <label>
          Diameter unit
          <select
            name="diameter_unit"
            defaultValue={value("diameter_unit") || "mm"}
          >
            <option>mm</option>
            <option>in</option>
          </select>
        </label>
        {field("length", "Length", "number")}
        <label>
          Length unit
          <select
            name="length_unit"
            defaultValue={value("length_unit") || "mm"}
          >
            <option>mm</option>
            <option>in</option>
          </select>
        </label>
        <label>
          Material
          <select name="material" defaultValue={value("material")}>
            <option value="">Any / unspecified</option>
            <option>A2 stainless steel</option>
          </select>
        </label>
        {field("grade", "Property grade")}
        {field("finish", "Finish")}
        <label>
          Thread system
          <select name="thread_system" defaultValue={value("thread_system")}>
            <option value="">Any</option>
            <option value="metric">Metric</option>
            <option value="unified">
              Unified (no verified launch coverage)
            </option>
            <option value="none">Unthreaded</option>
          </select>
        </label>
        <label>
          Geometry detail
          <select
            name="geometry_detail"
            defaultValue={value("geometry_detail")}
          >
            <option value="">Any published detail</option>
            <option>simplified</option>
            <option>detailed</option>
          </select>
        </label>
        <details className="wide">
          <summary>More constraints</summary>
          <div className="filters">
            {field("pitch_mm", "Thread pitch (mm)", "number")}
            {field("head_type", "Head type")}
            {field("drive_type", "Drive type")}
            {field("diameter_min", "Minimum diameter", "number")}
            {field("diameter_max", "Maximum diameter", "number")}
            {field("length_min", "Minimum length", "number")}
            {field("length_max", "Maximum length", "number")}
            <label>
              Handedness
              <select name="handedness" defaultValue={value("handedness")}>
                <option value="">Any</option>
                <option>right</option>
                <option>left</option>
              </select>
            </label>
            <label>
              Source status
              <select
                name="source_status"
                defaultValue={value("source_status") || "active"}
              >
                <option>active</option>
                <option>legacy_unverified</option>
                <option>deprecated</option>
              </select>
            </label>
          </div>
        </details>
        <label className="check">
          <input
            name="include_alternatives"
            type="checkbox"
            value="true"
            defaultChecked={value("include_alternatives") === "true"}
          />{" "}
          Show alternatives separately
        </label>
        <button type="submit" className="primary-button">
          Search
        </button>
        <Link href="/search">Clear filters</Link>
      </form>
      {error && (
        <p role="alert" className="notice">
          {error}
        </p>
      )}
      {result && (
        <>
          <div className="section-heading">
            <h2>{result.total} exact matches</h2>
            <span className="muted">{result.catalog_release}</span>
          </div>
          {!result.total && (
            <p className="panel">
              No checked part satisfies all of these constraints. Adjust the
              filters or enable alternatives.
            </p>
          )}
          <div className="result-grid">
            {result.exact_matches.map((p) => (
              <Link
                className="panel result"
                key={p.id}
                href={"/fasteners/" + p.id}
              >
                <span className="badge">{p.category.replaceAll("_", " ")}</span>
                <h3>{p.designation}</h3>
                <p>
                  {p.material ?? "Material unspecified"} ·{" "}
                  {p.status.replaceAll("_", " ")}
                </p>
                <p className="muted">
                  {p.geometry_detail.length
                    ? p.geometry_detail.join(" / ") + " STEP"
                    : "Geometry unavailable"}{" "}
                  · revision {p.revision}
                </p>
              </Link>
            ))}
          </div>
          {result.next_cursor && (
            <Link
              className="secondary-button"
              href={
                "/search?" +
                new URLSearchParams({
                  ...Object.fromEntries(qs),
                  cursor: result.next_cursor,
                })
              }
            >
              Next page →
            </Link>
          )}
          {result.alternatives.length > 0 && (
            <section className="panel">
              <h2>Alternatives — requirements differ</h2>
              {result.alternatives.map((p) => (
                <p key={p.id}>
                  <Link href={"/fasteners/" + p.id}>{p.designation}</Link>
                  <br />
                  <span className="muted">
                    Does not match: {p.differences.join(", ")}
                  </span>
                </p>
              ))}
            </section>
          )}
        </>
      )}
    </main>
  );
}
