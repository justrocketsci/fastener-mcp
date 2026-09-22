import { ZodError } from "zod";
import { CatalogError, errorPayload } from "./errors";
import { execute } from "./service";
import type { ToolName } from "./schemas";
const numeric = new Set([
  "revision",
  "diameter",
  "diameter_min",
  "diameter_max",
  "length",
  "length_min",
  "length_max",
  "pitch_mm",
  "limit",
]);
export function query(request: Request) {
  const out: Record<string, unknown> = {};
  for (const [key, value] of new URL(request.url).searchParams) {
    if (key in out)
      throw new CatalogError("INVALID_INPUT", "Duplicate query field.", 400, {
        key,
      });
    if (numeric.has(key)) {
      if (!/^\d+(\.\d+)?$/.test(value))
        throw new CatalogError(
          "INVALID_INPUT",
          "Expected a finite numeric query value.",
          400,
          { key },
        );
      out[key] = Number(value);
    } else if (key === "include_alternatives") {
      if (!["true", "false"].includes(value))
        throw new CatalogError(
          "INVALID_INPUT",
          "Boolean values must be true or false.",
          400,
        );
      out[key] = value === "true";
    } else out[key] = value;
  }
  return out;
}
export async function respond(work: () => unknown | Promise<unknown>) {
  try {
    return Response.json(await work(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return Response.json(errorPayload(e), {
      status:
        e instanceof CatalogError
          ? e.status
          : e instanceof ZodError || e instanceof SyntaxError
            ? 400
            : 500,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
export const getRoute = (name: ToolName) => (request: Request) =>
  respond(() => execute(name, query(request)));
export const postRoute = (name: ToolName) => (request: Request) =>
  respond(async () => {
    const text = await request.text();
    if (text.length > 250000)
      throw new CatalogError(
        "INVALID_INPUT",
        "Request body is too large.",
        400,
      );
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new CatalogError(
        "INVALID_INPUT",
        "Expected a JSON request body.",
        400,
      );
    }
    return execute(name, data);
  });
export const partRoute =
  (name: ToolName) =>
  (request: Request, context: { params: Promise<{ id: string }> }) =>
    respond(async () =>
      execute(name, { ...query(request), id: (await context.params).id }),
    );
