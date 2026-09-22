"use client";
/* eslint-disable @next/next/no-img-element -- Pre-rendered static CAD previews are intentionally served unchanged. */
import { useState } from "react";
import type { Part } from "@/lib/catalog/schemas";
import type {
  getModel,
  getInstallation,
  compatible,
} from "@/lib/catalog/service";
import type { compare } from "@/lib/catalog/offers";
import { AddToList } from "@/components/parts-list-store";
import Link from "next/link";
type Model = ReturnType<typeof getModel>;
type Offers = ReturnType<typeof compare>;
async function request<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(
    path,
    body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : undefined,
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? "Request failed");
  return data;
}
export function PartWorkspace({
  part,
  initialModel,
  companions,
  installation,
}: {
  part: Part;
  initialModel: Model | null;
  companions: ReturnType<typeof compatible>;
  installation: ReturnType<typeof getInstallation>;
}) {
  const [model, setModel] = useState(initialModel),
    [detail, setDetail] = useState("simplified"),
    [state, setState] = useState(
      part.category === "wire_insert" ? "installed" : "not_applicable",
    ),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState<Offers | null>(null),
    [offerError, setOfferError] = useState(""),
    [offerBusy, setOfferBusy] = useState(false),
    [requirements, setRequirements] = useState(installation),
    [installError, setInstallError] = useState("");
  const id = encodeURIComponent(part.id);
  return (
    <>
      <section className="panel">
        <div className="section-heading">
          <h2>Geometry</h2>
          <AddToList id={part.id} revision={part.revision} />
        </div>
        <form
          className="filters"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setMessage("");
            setModel(null);
            try {
              setModel(
                await request<Model>(
                  `/api/fasteners/${id}/model?revision=${part.revision}&detail=${detail}&state=${state}`,
                ),
              );
            } catch (e) {
              setMessage((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Detail
            <select value={detail} onChange={(e) => setDetail(e.target.value)}>
              <option>simplified</option>
              <option>detailed</option>
            </select>
          </label>
          <label>
            Representation state
            <select value={state} onChange={(e) => setState(e.target.value)}>
              <option value="not_applicable">Not applicable</option>
              <option>installed</option>
              <option>uninstalled</option>
            </select>
          </label>
          <button className="secondary-button" disabled={busy}>
            Load model
          </button>
        </form>
        <p role="status" className="notice" hidden={!message}>
          {message}
        </p>
        {model ? (
          <div className="split spaced">
            <div>
              {/* Local generated preview, no image optimization dependency. */}
              <img
                className="model-preview"
                src={model.model.preview_paths[0]}
                alt={`Two views of ${part.designation}, ${model.model.detail} ${model.model.representation}`}
                width={1080}
                height={540}
              />
              <a className="primary-button" href={model.model.url} download>
                Download STEP
              </a>
              <p className="muted">
                {model.model.detail} · {model.model.units} ·{" "}
                {(model.model.bytes / 1024).toFixed(1)} KB
              </p>
            </div>
            <div>
              <span className="badge">Listed geometry checks passed</span>
              <p>
                Version <code>{model.model.version}</code>
              </p>
              <p>{model.model.representation.replaceAll("_", " ")}</p>
              <h3>Omitted features</h3>
              <ul>
                {model.model.omitted_features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <p className="muted">
                Reference and layout use. Geometry checks do not establish
                manufactured tolerances or suitability for an assembly.
              </p>
              <details>
                <summary>Checksum and validation report</summary>
                <p>
                  <code>{model.model.sha256}</code>
                </p>
                <a href={model.model.report_url}>Open recorded checks</a>
              </details>
              <details>
                <summary>Placement datums</summary>
                <pre>{JSON.stringify(model.model.frame, null, 2)}</pre>
                <a
                  href={`/api/fasteners/${id}/placement?revision=${part.revision}&detail=${model.model.detail}&state=${model.model.state}&geometry_version=${model.model.version}`}
                >
                  Download placement packet
                </a>
              </details>
            </div>
          </div>
        ) : (
          <p className="muted">
            No validated model is selected. Unsupported variants return an
            explicit error.
          </p>
        )}
      </section>
      <section className="panel">
        <h2>Installation information</h2>
        <p>
          Current status:{" "}
          <strong>{requirements.status.replaceAll("_", " ")}</strong>.{" "}
          {requirements.missing_inputs.length
            ? `Required context: ${requirements.missing_inputs.join(", ")}.`
            : ""}
        </p>
        {installation.requirements.some((r) => r.status === "documented") && (
          <form
            className="filters"
            onSubmit={async (e) => {
              e.preventDefault();
              setInstallError("");
              const values = Object.fromEntries(
                new FormData(e.currentTarget),
              ) as Record<string, string>;
              try {
                setRequirements(
                  await request<ReturnType<typeof getInstallation>>(
                    `/api/fasteners/${id}/installation?` +
                      new URLSearchParams(values),
                  ),
                );
              } catch (e) {
                setInstallError((e as Error).message);
              }
            }}
          >
            <label>
              Host material
              <input
                name="host_material"
                required
                placeholder="6061 aluminum"
              />
            </label>
            <label>
              Process
              <input
                name="process"
                required
                placeholder="Drill and cut STI thread"
              />
            </label>
            <label>
              Hole type
              <select name="hole_type">
                <option value="through">Through hole</option>
                <option value="blind">Blind hole</option>
              </select>
            </label>
            <button className="secondary-button">Apply context</button>
          </form>
        )}
        <p role="alert" hidden={!installError}>
          {installError}
        </p>
        {requirements.requirements.map((r) => (
          <div key={r.id}>
            <ul>
              {[...r.conditions, ...r.instructions].map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
            {Object.keys(r.dimensions).length > 0 && (
              <div className="table-wrap">
                <table>
                  <caption>
                    Source reference dimensions; conditions still apply
                  </caption>
                  <thead>
                    <tr>
                      <th>Dimension</th>
                      <th>Value</th>
                      <th>Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(r.dimensions).map(([name, d]) => (
                      <tr key={name}>
                        <td>{name.replaceAll("_", " ")}</td>
                        <td>
                          {d.value} {d.unit}
                        </td>
                        <td>{d.evidence.locator}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
        <p className="muted">{requirements.unresolved.join(" ")}</p>
      </section>
      <section className="panel">
        <h2>Companion parts</h2>
        <p className="muted">{companions.unresolved.join(" ")}</p>
        {companions.candidates.map((c) => (
          <div key={c.part.id} className="offer-row">
            <Link href={"/fasteners/" + c.part.id}>{c.part.designation}</Link>
            <p>{c.status.replaceAll("_", " ")}</p>
            <p className="muted">
              Checked: {c.checked_attributes.join(", ")}.{" "}
              {c.unresolved.join(" ")}
            </p>
            <AddToList id={c.part.id} revision={c.part.revision} />
          </div>
        ))}
        {!companions.candidates.length && (
          <p>
            No checked companion relationship is published for this identity.
          </p>
        )}
      </section>
      <section className="panel">
        <h2>Compare purchase options</h2>
        <p className="muted">
          US / USD is the initial market. Enter the quantity you need; the
          result shows the quantity you can buy. These are dated observations,
          with a default 24-hour freshness policy.
        </p>
        <form
          className="filters"
          onSubmit={async (e) => {
            e.preventDefault();
            setOfferBusy(true);
            setOfferError("");
            setResult(null);
            const values = Object.fromEntries(new FormData(e.currentTarget));
            try {
              setResult(
                await request<Offers>("/api/offers/compare", {
                  id: part.id,
                  revision: part.revision,
                  quantity: Number(values.quantity),
                  destination: values.destination,
                  currency: values.currency,
                  ...(values.postal_code
                    ? { postal_code: values.postal_code }
                    : {}),
                  ...(values.arrival_deadline
                    ? { arrival_deadline: values.arrival_deadline }
                    : {}),
                }),
              );
            } catch (e) {
              setOfferError((e as Error).message);
            } finally {
              setOfferBusy(false);
            }
          }}
        >
          <label>
            Quantity
            <input
              name="quantity"
              type="number"
              min={1}
              max={1000000}
              defaultValue={10}
              required
            />
          </label>
          <label>
            Destination country
            <input
              name="destination"
              defaultValue="US"
              pattern="[A-Z]{2}"
              maxLength={2}
              required
            />
          </label>
          <label>
            Currency
            <select name="currency">
              <option>USD</option>
              <option>EUR</option>
              <option>GBP</option>
              <option>CAD</option>
            </select>
          </label>
          <label>
            Postal code (optional)
            <input name="postal_code" maxLength={20} />
          </label>
          <label>
            Arrival deadline (optional)
            <input name="arrival_deadline" type="date" />
          </label>
          <button className="primary-button" disabled={offerBusy}>
            {offerBusy ? "Comparing…" : "Compare offers"}
          </button>
        </form>
        <p role="alert" hidden={!offerError}>
          {offerError}
        </p>
        {result && (
          <div aria-live="polite">
            <p className="notice">{result.explanation}</p>
            <p className="muted">
              Snapshot {result.offers_snapshot} · Compared at {result.as_of}
            </p>
            {[
              ["Complete delivered totals", result.complete_totals],
              ["Partial costs — merchandise ranking", result.partial_costs],
              ["Purchase links / ineligible for ranking", result.links_only],
            ].map(([title, rows]) => (
              <section key={title as string}>
                <h3>{title as string}</h3>
                {(rows as Offers["partial_costs"]).map((r) => (
                  <article className="offer-row" key={r.product_id}>
                    <a href={r.url} target="_blank" rel="noreferrer">
                      {r.supplier} · {r.sku} ↗
                    </a>
                    <p>
                      <strong>
                        {r.delivered_total
                          ? `${r.currency} ${r.delivered_total} delivered`
                          : r.merchandise_subtotal
                            ? `${r.currency} ${r.merchandise_subtotal} merchandise`
                            : "Price unavailable"}
                      </strong>
                      {r.purchased_quantity !== null
                        ? ` · Buy ${r.purchased_quantity}, ${r.excess_quantity} extra · Pack ${r.pack_size}`
                        : ""}
                    </p>
                    <p className="muted">
                      Price checked {r.price_observed_at ?? "unknown"}. Stock:{" "}
                      {r.stock_status}.{" "}
                      {r.missing.length
                        ? `Unknown: ${r.missing.join(", ")}.`
                        : ""}{" "}
                      {r.reasons.join("; ")}
                    </p>
                    {r.match_status === "exact" && (
                      <AddToList
                        id={part.id}
                        revision={part.revision}
                        supplier_product_id={r.product_id}
                      />
                    )}
                  </article>
                ))}
                {!(rows as unknown[]).length && (
                  <p className="muted">No offers in this group.</p>
                )}
              </section>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
