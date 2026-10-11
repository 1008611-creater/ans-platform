import { catalogResponse, catalogUser } from "@/server/catalog/http";
import { listCatalogAdmin, saveCatalogDraft } from "@/server/catalog/service";
import { readSameOriginJson } from "@/server/http/json";
export const dynamic = "force-dynamic";
export async function GET() { return catalogResponse(async () => ({ entries: await listCatalogAdmin(await catalogUser()) })); }
export async function POST(request: Request) { return catalogResponse(async () => { const user = await catalogUser(); return { entry: await saveCatalogDraft(user, await readSameOriginJson(request)) }; }); }