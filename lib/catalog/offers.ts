import { offers, products, supplierIndex } from "./data";
import type { Observation, Part } from "./schemas";
import { offerInput } from "./schemas";
import type { z } from "zod";
import { fingerprint } from "./fingerprint";
export type OfferRequest = z.infer<typeof offerInput>;
// Integer micro-units retain supplier fractional-cent unit prices. Round the line total once, half up.
export function micros(s: string): bigint {
  const [a, b = ""] = s.split(".");
  return BigInt(a) * BigInt(1000000) + BigInt(b.padEnd(6, "0"));
}
export function moneyString(n: bigint): string {
  const cents = (n + BigInt(5000)) / BigInt(10000);
  return `${cents / BigInt(100)}.${String(cents % BigInt(100)).padStart(2, "0")}`;
}
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
export function orderQuantity(
  request: number,
  minimum: number,
  pack: number,
  increment: number,
) {
  const step = (pack / gcd(pack, increment)) * increment;
  return Math.ceil(Math.max(request, minimum) / step) * step;
}
export function fresh(
  time: string,
  now: number,
  hours: number,
  until?: string | null,
) {
  const t = Date.parse(time);
  return (
    Number.isFinite(t) &&
    t <= now &&
    now - t <= hours * 3600000 &&
    (!until || now < Date.parse(until))
  );
}
export function compare(
  part: Part,
  input: OfferRequest,
  now = Date.now(),
  observations: Observation[] = offers.observations,
) {
  const matches = products.filter(
    (p) =>
      p.part.id === part.id &&
      p.part.revision === part.revision &&
      (!input.supplier_ids || input.supplier_ids.includes(p.supplier_id)),
  );
  const rows = matches.map((product) => {
    const supplier = supplierIndex.get(product.supplier_id)!;
    const obs = observations.find((o) => o.product_id === product.id);
    const price = obs?.price;
    const reasons: string[] = [];
    if (product.match_status !== "exact")
      reasons.push("Mapping is not an exact checked match");
    if (product.part_fingerprint !== fingerprint(part))
      reasons.push("Part changed since supplier verification");
    if (!supplier.markets.includes(input.destination))
      reasons.push("Destination is not supported by this maintained mapping");
    if (!price) reasons.push("Price is unknown");
    else {
      if (
        !fresh(
          price.observed_at,
          now,
          supplier.price_max_age_hours,
          price.valid_until,
        )
      )
        reasons.push("Price is stale, future-dated or expired");
      if (price.currency !== input.currency)
        reasons.push("Currency does not match");
      if (price.scope !== input.price_scope)
        reasons.push("Pricing scope does not match");
    }
    const stock = obs?.availability;
    const stockFresh =
      stock && fresh(stock.checked_at, now, supplier.stock_max_age_hours);
    if (stockFresh && stock.status === "out_of_stock")
      reasons.push("Out of stock");
    const purchased = price
      ? orderQuantity(
          input.quantity,
          price.minimum_quantity,
          product.pack_size,
          price.order_increment,
        )
      : null;
    if (
      stockFresh &&
      stock.quantity !== null &&
      purchased !== null &&
      stock.quantity < purchased
    )
      reasons.push("Insufficient stock");
    if (input.arrival_deadline) {
      const delivery = obs?.delivery;
      if (
        !delivery ||
        !fresh(
          delivery.checked_at,
          now,
          supplier.stock_max_age_hours,
          delivery.valid_until,
        ) ||
        delivery.destination !== input.destination ||
        (delivery.postal_code !== null &&
          delivery.postal_code !== input.postal_code) ||
        delivery.arrival_date > input.arrival_deadline
      )
        reasons.push("Arrival deadline cannot be established");
    }
    const tierCount =
      price?.tier_basis === "packs"
        ? (purchased ?? 0) / product.pack_size
        : (purchased ?? 0);
    const tier = price?.tiers
      .filter((t) => t.minimum <= tierCount)
      .sort((a, b) => b.minimum - a.minimum)[0];
    if (price && !tier) reasons.push("No applicable price tier");
    // An excluded currency/scope must not be relabeled as the requested currency,
    // or combined with charges quoted in that requested scope.
    const comparablePrice =
      price?.currency === input.currency && price.scope === input.price_scope;
    const subtotal =
      tier && price && comparablePrice && purchased !== null
        ? micros(tier.amount) *
          BigInt(
            price.basis === "pack" ? purchased / product.pack_size : purchased,
          )
        : null;
    const missing: string[] = [];
    const estimates: string[] = [];
    const charges: Record<string, string | null> = {
      shipping: null,
      tax: null,
      duty: null,
    };
    let total = subtotal;
    for (const kind of ["shipping", "tax", "duty"] as const) {
      const charge = obs?.charges
        .filter(
          (c) =>
            c.kind === kind &&
            c.currency === input.currency &&
            c.destination === input.destination &&
            c.quantity === purchased &&
            c.scope === input.price_scope &&
            (c.postal_code === null || c.postal_code === input.postal_code) &&
            fresh(
              c.checked_at,
              now,
              supplier.price_max_age_hours,
              c.valid_until,
            ),
        )
        .sort((a, b) => b.checked_at.localeCompare(a.checked_at))[0];
      if (charge) {
        charges[kind] = charge.amount;
        if (charge.estimated) estimates.push(kind);
        if (total !== null) total += micros(charge.amount);
      } else missing.push(kind);
    }
    if (!stockFresh || stock?.status === "unknown") missing.push("stock");
    const group = reasons.length
      ? "links_only"
      : missing.length || estimates.length
        ? "partial"
        : "complete";
    return {
      product_id: product.id,
      supplier: supplier.name,
      supplier_id: supplier.id,
      sku: product.sku,
      url: product.url,
      match_status: product.match_status,
      group,
      reasons,
      requested_quantity: input.quantity,
      purchased_quantity: purchased,
      excess_quantity: purchased === null ? null : purchased - input.quantity,
      pack_size: product.pack_size,
      currency: input.currency,
      price_scope: input.price_scope,
      merchandise_subtotal: subtotal === null ? null : moneyString(subtotal),
      known_cost: total === null ? null : moneyString(total),
      delivered_total:
        group === "complete" && total !== null ? moneyString(total) : null,
      charges,
      missing,
      estimated_components: estimates,
      price_observed_at: price?.observed_at ?? null,
      stock_checked_at: stock?.checked_at ?? null,
      delivery_checked_at: obs?.delivery?.checked_at ?? null,
      stock_status: stockFresh ? stock!.status : "unknown",
      refresh_error: obs?.refresh_error ?? null,
      ranking_basis:
        group === "complete"
          ? "delivered_total"
          : group === "partial"
            ? "merchandise_subtotal"
            : null,
      limitations: product.unresolved,
    };
  });
  const sorter =
    (field: "merchandise_subtotal" | "delivered_total") =>
    (a: (typeof rows)[number], b: (typeof rows)[number]) => {
      const x = micros(a[field] ?? "0"),
        y = micros(b[field] ?? "0");
      return x < y ? -1 : x > y ? 1 : a.product_id.localeCompare(b.product_id);
    };
  const complete = rows
    .filter((r) => r.group === "complete")
    .sort(sorter("delivered_total"));
  const partial = rows
    .filter((r) => r.group === "partial")
    .sort(sorter("merchandise_subtotal"));
  const links = rows.filter((r) => r.group === "links_only");
  // A cheaper delivered total among complete observations does not prove a winner over unknown totals.
  return {
    offers_snapshot: offers.snapshot,
    as_of: new Date(now).toISOString(),
    part: { id: part.id, revision: part.revision },
    request: input,
    complete_totals: complete,
    partial_costs: partial,
    links_only: links,
    alternatives: input.include_alternatives
      ? rows.filter((r) => r.match_status === "conditional_alternative")
      : [],
    lowest_complete_offer: complete[0]?.product_id ?? null,
    winner:
      complete.length && partial.length === 0 ? complete[0].product_id : null,
    comparison_scope: matches
      .map((m) => m.supplier_id)
      .filter((v, i, a) => a.indexOf(v) === i),
    explanation: complete.length
      ? "Complete totals rank only among fresh comparable observations. Any partial costs remain separate."
      : "No complete delivered-cost winner. Partial offers rank merchandise only; missing charges and stock remain unknown.",
  };
}
