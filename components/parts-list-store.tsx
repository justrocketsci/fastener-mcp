"use client";
import { useState, useSyncExternalStore } from "react";
import { bomInput } from "@/lib/catalog/schemas";
const KEY = "fastener-mcp.parts-list.v2";
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("parts-list", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("parts-list", callback);
  };
}
function snapshot() {
  try {
    return localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
}
export function usePartsList() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => "[]");
  try {
    return bomInput.shape.lines.parse(JSON.parse(raw));
  } catch {
    return [];
  }
}
export function savePartsList(lines: unknown[]) {
  const checked = lines.length ? bomInput.shape.lines.parse(lines) : [];
  localStorage.setItem(KEY, JSON.stringify(checked));
  window.dispatchEvent(new Event("parts-list"));
}
export function AddToList({
  id,
  revision,
  supplier_product_id,
}: {
  id: string;
  revision: number;
  supplier_product_id?: string;
}) {
  const [message, setMessage] = useState("");
  return (
    <div>
      <button
        className="secondary-button"
        onClick={() => {
          try {
            const parsed = JSON.parse(snapshot());
            const lines = bomInput.shape.lines.parse(
              parsed.length
                ? parsed
                : [{ id, revision, quantity: 1, supplier_product_id }],
            );
            if (parsed.length) {
              const existing = lines.find(
                (l) =>
                  l.id === id &&
                  l.revision === revision &&
                  l.supplier_product_id === supplier_product_id,
              );
              if (existing) existing.quantity++;
              else
                lines.push({ id, revision, quantity: 1, supplier_product_id });
            }
            savePartsList(lines);
            setMessage("Added to your local parts list.");
          } catch {
            setMessage(
              "Browser storage is unavailable. Export a BOM through /api/bom instead.",
            );
          }
        }}
      >
        {supplier_product_id
          ? "Add this supplier to parts list"
          : "Add to parts list"}
      </button>
      <span role="status" className="muted">
        {" "}
        {message}
      </span>
    </div>
  );
}
