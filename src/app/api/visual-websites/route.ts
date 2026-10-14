import { readSameOriginJson, assertRequestActor } from "@/server/http/json";
import { websiteResponse } from "@/server/projects/website-http";
import { saveVisualWebsite } from "@/server/projects/visual-website";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
 return websiteResponse(async userId => { assertRequestActor(request, userId); return saveVisualWebsite(userId, await readSameOriginJson(request)); });
}
