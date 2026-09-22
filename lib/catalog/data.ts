import partsJson from "@/data/catalog/parts.json";
import sourcesJson from "@/data/catalog/sources.json";
import geometryJson from "@/data/geometry/manifest.json";
import installationsJson from "@/data/catalog/installations.json";
import compatibilityJson from "@/data/catalog/compatibility.json";
import suppliersJson from "@/data/catalog/suppliers.json";
import productsJson from "@/data/catalog/supplier-products.json";
import offersJson from "@/data/offers/current.json";
import historyJson from "@/data/catalog/history/revisions.json";
import releaseJson from "@/data/catalog/release.json";
import * as s from "./schemas";
export const parts = s.documentSchema(s.partSchema).parse(partsJson).items;
export const history = s.documentSchema(s.partSchema).parse(historyJson).items;
export const sources = s
  .documentSchema(s.sourceSchema)
  .parse(sourcesJson).items;
export const geometries = s
  .documentSchema(s.geometrySchema)
  .parse(geometryJson).items;
export const installations = s
  .documentSchema(s.installationSchema)
  .parse(installationsJson).items;
export const relationships = s
  .documentSchema(s.compatibilitySchema)
  .parse(compatibilityJson).items;
export const suppliers = s
  .documentSchema(s.supplierSchema)
  .parse(suppliersJson).items;
export const products = s
  .documentSchema(s.productSchema)
  .parse(productsJson).items;
export const offers = s.offersSchema.parse(offersJson);
export const release = s.releasePointerSchema.parse(releaseJson).id;
export const partIndex = new Map(parts.map((p) => [p.id, p]));
export const sourceIndex = new Map(sources.map((p) => [p.id, p]));
export const supplierIndex = new Map(suppliers.map((p) => [p.id, p]));
