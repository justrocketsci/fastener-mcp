import audit from "@/data/catalog/history/legacy-audit.json";
import { geometries } from "@/lib/catalog/data";
import { respond } from "@/lib/catalog/http";
import { CatalogError } from "@/lib/catalog/errors";
export const GET = (
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) =>
  respond(async () => {
    const { path } = await params;
    const url = "/models/" + path.join("/");
    if (
      audit.items.some((x) => x.old_model_path === url) ||
      geometries.some(
        (g) => g.asset_path === url && g.validation.status === "withdrawn",
      )
    )
      throw new CatalogError(
        "MODEL_WITHDRAWN",
        "This legacy or withdrawn file is no longer served. Request a validated model via /api/fasteners/:id/model.",
        410,
      );
    throw new CatalogError(
      "MODEL_UNAVAILABLE",
      "No published asset exists at this path.",
      404,
    );
  });
