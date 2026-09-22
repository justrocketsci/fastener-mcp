import { catalogStatus } from "@/lib/catalog/service";
import { respond } from "@/lib/catalog/http";
export const GET = () => respond(catalogStatus);
