import { ZodError } from "zod";
import { VERSION } from "./schemas";
import { release } from "./data";
export class CatalogError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 422,
    public details: unknown = null,
  ) {
    super(message);
  }
}
export function errorPayload(e: unknown) {
  const error =
    e instanceof CatalogError
      ? {
          code: e.code,
          message: e.message,
          details: e.details,
          retryable: false,
        }
      : e instanceof ZodError
        ? {
            code: "INVALID_INPUT",
            message: "Invalid request fields.",
            details: e.issues.map((i) => ({
              path: i.path,
              message: i.message,
            })),
            retryable: false,
          }
        : {
            code: "INTERNAL_ERROR",
            message: "The catalog request could not be completed.",
            details: null,
            retryable: true,
          };
  return { schema_version: VERSION, catalog_release: release, error };
}
