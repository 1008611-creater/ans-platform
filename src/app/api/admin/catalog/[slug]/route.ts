import { catalogResponse, catalogUser } from "@/server/catalog/http";
import { changeCatalogPublication } from "@/server/catalog/service";
import { readSameOriginJson } from "@/server/http/json";
export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  return catalogResponse(async () => { const user = await catalogUser(); return { entry: await changeCatalogPublication(user, (await context.params).slug, await readSameOriginJson(request)) }; });
}