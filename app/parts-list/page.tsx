"use client";
import { useState } from "react";
import Link from "next/link";
import { usePartsList, savePartsList } from "@/components/parts-list-store";
import type { buildBom } from "@/lib/catalog/service";
export default function PartsList() {
  const lines = usePartsList(),
    [bom, setBom] = useState<ReturnType<typeof buildBom> | null>(null),
    [error, setError] = useState("");
  const change = (next: typeof lines) => {
    try {
      savePartsList(next);
      setBom(null);
      setError("");
    } catch {
      setError("Browser storage is unavailable.");
    }
  };
  const download = (kind: "json" | "csv") => {
    if (!bom) return;
    const blob = new Blob(
      [
        kind === "csv"
          ? bom.csv
          : JSON.stringify({ ...bom, csv: undefined }, null, 2),
      ],
      { type: kind === "csv" ? "text/csv;charset=utf-8" : "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fastener-parts-list." + kind;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <main className="site-main">
      <p className="eyebrow">Saved in this browser</p>
      <h1>Your parts list</h1>
      <p className="lead">
        Choose parts from the catalog, set quantities, then export a versioned
        BOM. No account is needed.
      </p>
      {!lines.length ? (
        <div className="panel">
          <p>Your list is empty.</p>
          <Link className="primary-button" href="/search">
            Browse parts
          </Link>
        </div>
      ) : (
        <section className="panel">
          <div
            className="table-wrap"
            role="region"
            aria-label="Parts list, scroll for all columns"
            tabIndex={0}
          >
            <table>
              <thead>
                <tr>
                  <th>Part and revision</th>
                  <th>Quantity</th>
                  <th>Optional supplier product ID</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, index) => (
                  <tr key={`${l.id}-${l.revision}-${index}`}>
                    <td>
                      <Link
                        href={`/fasteners/${l.id}?revision=${l.revision ?? 1}`}
                      >
                        {l.id}
                      </Link>
                      <br />
                      Revision {l.revision ?? "current"}
                    </td>
                    <td>
                      <input
                        aria-label={`Quantity for ${l.id}`}
                        type="number"
                        min={1}
                        max={1000000}
                        value={l.quantity}
                        onChange={(e) => {
                          const n = Number(e.target.value);
                          if (Number.isInteger(n) && n > 0)
                            change(
                              lines.map((row, i) =>
                                i === index ? { ...row, quantity: n } : row,
                              ),
                            );
                        }}
                      />
                    </td>
                    <td>
                      <input
                        aria-label={`Supplier product for ${l.id}`}
                        value={l.supplier_product_id ?? ""}
                        placeholder="Optional checked mapping ID"
                        onChange={(e) =>
                          change(
                            lines.map((row, i) =>
                              i === index
                                ? {
                                    ...row,
                                    supplier_product_id:
                                      e.target.value || undefined,
                                  }
                                : row,
                            ),
                          )
                        }
                      />
                    </td>
                    <td>
                      <button
                        className="secondary-button"
                        onClick={() =>
                          change(lines.filter((_, i) => i !== index))
                        }
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            className="primary-button spaced"
            onClick={async () => {
              setError("");
              try {
                const r = await fetch("/api/bom", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ lines }),
                });
                const data = await r.json();
                if (!r.ok) throw new Error(data.error.message);
                setBom(data);
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Build export
          </button>
        </section>
      )}
      <p role="alert" hidden={!error}>
        {error}
      </p>
      {bom && (
        <section className="panel" aria-live="polite">
          <h2>
            {bom.lines.length} lines · {bom.total_quantity} pieces
          </h2>
          <div className="actions">
            <button className="primary-button" onClick={() => download("csv")}>
              Download CSV
            </button>
            <button
              className="secondary-button"
              onClick={() => download("json")}
            >
              Download JSON
            </button>
          </div>
          {bom.lines.map((l) => (
            <p key={`${l.id}-${l.supplier_product_id}`}>
              {l.designation}: {l.quantity}
              <br />
              <span className="muted">{l.unresolved.join(". ")}.</span>
            </p>
          ))}
        </section>
      )}
    </main>
  );
}
