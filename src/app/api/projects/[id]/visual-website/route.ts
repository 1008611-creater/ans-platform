import { assertRequestActor } from "@/server/http/json";
import { websiteResponse } from "@/server/projects/website-http";
import { getVisualWebsite } from "@/server/projects/visual-website";
export const dynamic = "force-dynamic";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
 return websiteResponse(async userId => { assertRequestActor(request, userId); return getVisualWebsite((await params).id, userId); });
}
