import { createMcpHandler } from "mcp-handler";
import { inputs, type ToolName } from "@/lib/catalog/schemas";
import { execute } from "@/lib/catalog/service";
import { errorPayload } from "@/lib/catalog/errors";
const descriptions: Record<ToolName, string> = {
  search_fasteners:
    "Find checked hardware with explicit units and hard constraints. Exact matches and opt-in alternatives are separate.",
  get_fastener:
    "Read a part revision, sourced dimensions, omissions and supplier mappings.",
  get_fastener_model:
    "Get immutable STEP URL, SHA-256, bytes, units, frame and checked feature list. No runtime CAD generation.",
  get_placement_packet:
    "Read local placement datums for the exact model version. Does not create CAD mates.",
  get_installation_requirements:
    "Read sourced installation requirements and required missing host/process context.",
  get_compatible_parts:
    "Find checked nominal companion interfaces and unresolved assembly requirements.",
  compare_supplier_offers:
    "Compare exact supplier variants for quantity, destination and currency. Partial costs never imply a delivered-cost winner.",
  build_parts_list:
    "Aggregate explicit part revisions and quantities into JSON and escaped CSV. No purchasing.",
};
const handler = createMcpHandler(
  (server) => {
    for (const name of Object.keys(inputs) as ToolName[]) {
      server.registerTool(
        name,
        {
          title: name.replaceAll("_", " "),
          description: descriptions[name],
          inputSchema: inputs[name],
          annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: false,
          },
        },
        async (args: unknown) => {
          try {
            const result = execute(name, args);
            return {
              structuredContent: result,
              content: [
                { type: "text" as const, text: JSON.stringify(result) },
                {
                  type: "text" as const,
                  text: `${name} completed for catalog ${result.catalog_release}. The structured result includes exact revisions and any unresolved requirements.`,
                },
              ],
            };
          } catch (e) {
            const result = errorPayload(e);
            return {
              isError: true,
              structuredContent: result,
              content: [
                { type: "text" as const, text: JSON.stringify(result) },
              ],
            };
          }
        },
      );
    }
  },
  { serverInfo: { name: "fastener-mcp", version: "2.0.0" } },
);
export { handler as GET, handler as POST, handler as DELETE };
