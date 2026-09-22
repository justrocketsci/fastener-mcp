import { CatalogError } from "@/lib/catalog/errors";
import { respond } from "@/lib/catalog/http";
const retired = () =>
  respond(() => {
    throw new CatalogError(
      "ENDPOINT_RETIRED",
      "Use exact search, model downloads and compatibility at /api/mcp. This endpoint is retired.",
      410,
    );
  });
export { retired as GET, retired as POST };
