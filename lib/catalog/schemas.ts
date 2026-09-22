import { z } from "zod";

export const VERSION = "fastener-mcp.v2" as const;
export const idSchema = z.string().regex(/^[a-z0-9][a-z0-9._-]{0,119}$/);
const positive = z.number().finite().positive();
const timestamp = z.iso.datetime();
export const categorySchema = z.enum([
  "hex_bolt",
  "socket_screw",
  "countersunk_screw",
  "hex_nut",
  "flat_washer",
  "wire_insert",
  "legacy",
]);
const evidence = z
  .object({
    source_id: idSchema,
    locator: z.string().min(1),
    verification: z.enum(["checked", "unverified"]),
  })
  .strict();
export const dimensionSchema = z
  .object({
    value: z.number().finite(),
    unit: z.enum(["mm", "in", "deg"]),
    normalized_mm: z.number().finite().nullable(),
    derivation: z.string(),
    limits: z.tuple([z.number(), z.number()]).nullable(),
    evidence,
  })
  .strict();
export const partSchema = z
  .object({
    id: idSchema,
    revision: z.number().int().positive(),
    designation: z.string().min(1),
    category: categorySchema,
    status: z.enum(["draft", "active", "legacy_unverified", "deprecated"]),
    verified_at: timestamp.nullable(),
    standards: z.array(z.string()),
    aliases: z.array(z.string()),
    manufacturer: z.string().nullable(),
    manufacturer_part_number: z.string().nullable(),
    superseded_by: idSchema.nullable(),
    thread: z
      .object({
        system: z.enum(["metric", "unified", "none", "unknown"]),
        designation: z.string().nullable(),
        nominal_diameter_mm: positive.nullable(),
        pitch_mm: positive.nullable(),
        original_tpi: positive.nullable(),
        handedness: z.enum(["right", "left"]).nullable(),
        class: z.string().nullable(),
        role: z.enum(["external", "internal", "none", "unknown"]),
      })
      .strict(),
    nominal_size_mm: positive.nullable(),
    dimensions: z.record(z.string(), dimensionSchema),
    length_meaning: z.enum([
      "under_head",
      "overall",
      "thickness",
      "installed_insert_length",
      "unknown",
    ]),
    grip_length_mm: z.number().nonnegative().nullable(),
    attributes: z
      .object({
        material: z.string().nullable(),
        grade: z.string().nullable(),
        finish: z.string().nullable(),
        head_type: z.string().nullable(),
        drive_type: z.string().nullable(),
        insert_type: z.string().nullable(),
      })
      .strict(),
    evidence: z.array(evidence),
    installation_ids: z.array(idSchema),
    geometry_ids: z.array(idSchema),
    notes: z.array(z.string()),
    legacy_record: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();
export type Part = z.infer<typeof partSchema>;
export const sourceSchema = z
  .object({
    id: idSchema,
    title: z.string(),
    publisher: z.string(),
    url: z.url(),
    revision: z.string().nullable(),
    retrieved_at: timestamp,
    kind: z.enum(["vendor", "manufacturer", "open_library", "legacy"]),
    usage: z.string(),
    authority: z.string(),
    extraction: z.string(),
  })
  .strict();
const partRef = z
  .object({ id: idSchema, revision: z.number().int().positive() })
  .strict();
export const frameSchema = z
  .object({
    origin: z.tuple([z.number(), z.number(), z.number()]),
    axis: z.tuple([z.number(), z.number(), z.number()]),
    origin_datum: z.string(),
    positive_z: z.string(),
    x_reference: z.string(),
    datums: z.record(z.string(), z.number()),
    handedness: z.literal("right"),
  })
  .strict();
export const geometrySchema = z
  .object({
    id: idSchema,
    version: idSchema,
    parts: z.array(partRef).min(1),
    recipe_id: z.string(),
    recipe_version: z.string(),
    parameter_hash: z.string().length(64),
    build_key: z.string().length(64),
    toolchain: z.record(z.string(), z.string()),
    detail: z.enum(["simplified", "detailed"]),
    state: z.enum(["installed", "uninstalled", "not_applicable"]),
    format: z.literal("step"),
    units: z.literal("mm"),
    asset_path: z.string().regex(/^\/models\/[a-z0-9._/-]+\.step$/),
    bytes: z.number().int().positive(),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    preview_paths: z
      .array(z.string().regex(/^\/models\/[a-z0-9._/-]+\.png$/))
      .min(1),
    bounds_mm: z
      .object({
        min: z.array(z.number()).length(3),
        max: z.array(z.number()).length(3),
      })
      .strict(),
    frame: frameSchema,
    validation: z
      .object({
        status: z.enum(["pending", "passed", "failed", "withdrawn"]),
        checked_at: timestamp,
        tolerance_mm: positive,
        report_path: z.string(),
        checks: z.array(z.string()),
        visual_review: z.enum(["pending", "passed"]),
        withdrawal_reason: z.string().nullable(),
      })
      .strict(),
    represented_features: z.array(z.string()),
    omitted_features: z.array(z.string()),
    intended_uses: z.array(z.string()),
    representation: z.string(),
  })
  .strict();
export type Geometry = z.infer<typeof geometrySchema>;
export const installationSchema = z
  .object({
    id: idSchema,
    parts: z.array(partRef),
    type: z.string(),
    status: z.enum(["documented", "unavailable"]),
    required_context: z.array(
      z.enum(["host_material", "process", "hole_type"]),
    ),
    conditions: z.array(z.string()),
    dimensions: z.record(z.string(), dimensionSchema),
    instructions: z.array(z.string()),
    evidence: z.array(evidence),
    unresolved: z.array(z.string()),
  })
  .strict();
export const compatibilitySchema = z
  .object({
    id: idSchema,
    anchor: partRef,
    companion: partRef,
    relationship: z.string(),
    checked_attributes: z.array(z.string()),
    conditions: z.array(z.string()),
    unresolved: z.array(z.string()),
    rule_version: z.string(),
    anchor_fingerprint: z.string(),
    companion_fingerprint: z.string(),
  })
  .strict();
export const supplierSchema = z
  .object({
    id: idSchema,
    name: z.string(),
    markets: z.array(z.string().regex(/^[A-Z]{2}$/)),
    import_method: z.literal("maintainer_import"),
    price_max_age_hours: positive,
    stock_max_age_hours: positive,
    source_urls: z.array(z.url()),
  })
  .strict();
export const productSchema = z
  .object({
    id: idSchema,
    supplier_id: idSchema,
    sku: z.string(),
    part: partRef,
    url: z.url(),
    manufacturer: z.string().nullable(),
    pack_size: z.number().int().positive(),
    match_status: z.enum([
      "exact",
      "conditional_alternative",
      "unverified",
      "rejected",
    ]),
    checked_attributes: z.record(z.string(), z.string()),
    unresolved: z.array(z.string()),
    verified_at: timestamp,
    part_fingerprint: z.string(),
    model_representation: z.literal("standard_nominal"),
    evidence: z.array(evidence),
  })
  .strict();
export type SupplierProduct = z.infer<typeof productSchema>;
// Up to six decimals for unit prices (bag prices divided by quantities). Totals round once to currency minor units.
export const money = z.string().regex(/^(0|[1-9]\d{0,8})(\.\d{1,6})?$/);
export const observationSchema = z
  .object({
    product_id: idSchema,
    price: z
      .object({
        observed_at: timestamp,
        currency: z.enum(["USD", "EUR", "GBP", "CAD"]),
        basis: z.enum(["each", "pack"]),
        tier_basis: z.enum(["items", "packs"]),
        tiers: z
          .array(
            z
              .object({ minimum: z.number().int().positive(), amount: money })
              .strict(),
          )
          .min(1),
        minimum_quantity: z.number().int().positive(),
        order_increment: z.number().int().positive(),
        scope: z.string(),
        valid_until: timestamp.nullable(),
      })
      .strict()
      .nullable(),
    availability: z
      .object({
        checked_at: timestamp,
        status: z.enum(["in_stock", "out_of_stock", "unknown"]),
        quantity: z.number().int().nonnegative().nullable(),
      })
      .strict()
      .nullable(),
    delivery: z
      .object({
        checked_at: timestamp,
        destination: z.string(),
        postal_code: z.string().nullable(),
        arrival_date: z.iso.date(),
        valid_until: timestamp,
      })
      .strict()
      .nullable(),
    charges: z.array(
      z
        .object({
          kind: z.enum(["shipping", "tax", "duty"]),
          amount: money,
          currency: z.string(),
          destination: z.string(),
          postal_code: z.string().nullable(),
          quantity: z.number().int().positive(),
          scope: z.string(),
          checked_at: timestamp,
          valid_until: timestamp,
          estimated: z.boolean(),
        })
        .strict(),
    ),
    refresh_error: z.string().nullable(),
    evidence_url: z.url(),
  })
  .strict();
export type Observation = z.infer<typeof observationSchema>;
export const documentSchema = <T extends z.ZodType>(item: T) =>
  z
    .object({ schema_version: z.literal(VERSION), items: z.array(item) })
    .strict();
export const offersSchema = z
  .object({
    schema_version: z.literal(VERSION),
    snapshot: idSchema,
    published_at: timestamp,
    observations: z.array(observationSchema),
  })
  .strict();

const revision = z.number().int().positive().optional();
export const getInput = z.object({ id: idSchema, revision }).strict();
export const modelInput = getInput.extend({
  detail: z.enum(["simplified", "detailed"]).default("simplified"),
  state: z.enum(["installed", "uninstalled", "not_applicable"]).optional(),
  geometry_version: idSchema.optional(),
});
export const searchInput = z
  .object({
    q: z.string().max(200).optional(),
    category: categorySchema.optional(),
    standard: z.string().max(80).optional(),
    thread_system: z.enum(["metric", "unified", "none"]).optional(),
    thread_size: z.string().max(30).optional(),
    pitch_mm: positive.optional(),
    handedness: z.enum(["right", "left"]).optional(),
    head_type: z.string().max(60).optional(),
    drive_type: z.string().max(60).optional(),
    material: z.string().max(80).optional(),
    grade: z.string().max(60).optional(),
    finish: z.string().max(60).optional(),
    diameter: positive.optional(),
    diameter_min: positive.optional(),
    diameter_max: positive.optional(),
    diameter_unit: z.enum(["mm", "in"]).optional(),
    length: positive.optional(),
    length_min: positive.optional(),
    length_max: positive.optional(),
    length_unit: z.enum(["mm", "in"]).optional(),
    source_status: z
      .enum(["active", "legacy_unverified", "deprecated", "draft"])
      .default("active"),
    geometry_detail: z.enum(["simplified", "detailed"]).optional(),
    include_alternatives: z.boolean().default(false),
    limit: z.number().int().min(1).max(100).default(20),
    cursor: z.string().max(1200).optional(),
  })
  .strict();
export const installationInput = getInput.extend({
  installation_type: z.string().max(80).optional(),
  host_material: z.string().min(1).max(80).optional(),
  process: z.string().min(1).max(80).optional(),
  hole_type: z.enum(["blind", "through"]).optional(),
});
export const compatibilityInput = getInput.extend({
  companion_categories: z
    .array(categorySchema)
    .min(1)
    .max(6)
    .default(["hex_nut", "flat_washer", "wire_insert"]),
  quantity: z.number().int().min(1).max(100000).default(1),
  constraints: z
    .object({
      stack_thickness_mm: positive.optional(),
      minimum_engagement_mm: positive.optional(),
      thread_class: z.string().max(40).optional(),
      host_material: z.string().max(80).optional(),
    })
    .strict()
    .optional(),
});
export const offerInput = getInput.extend({
  quantity: z.number().int().min(1).max(1000000),
  destination: z.string().regex(/^[A-Z]{2}$/),
  currency: z.enum(["USD", "EUR", "GBP", "CAD"]),
  postal_code: z.string().max(20).optional(),
  arrival_deadline: z.iso.date().optional(),
  supplier_ids: z.array(idSchema).max(30).optional(),
  include_alternatives: z.boolean().default(false),
  price_scope: z.string().min(1).max(80).default("public"),
});
export const bomInput = z
  .object({
    lines: z
      .array(
        getInput.extend({
          quantity: z.number().int().min(1).max(1000000),
          supplier_product_id: idSchema.optional(),
        }),
      )
      .min(1)
      .max(1000),
  })
  .strict();
export const inputs = {
  search_fasteners: searchInput,
  get_fastener: getInput,
  get_fastener_model: modelInput,
  get_placement_packet: modelInput,
  get_installation_requirements: installationInput,
  get_compatible_parts: compatibilityInput,
  compare_supplier_offers: offerInput,
  build_parts_list: bomInput,
};
export type ToolName = keyof typeof inputs;

export const releasePointerSchema = z
  .object({ schema_version: z.literal(VERSION), id: idSchema })
  .strict();
