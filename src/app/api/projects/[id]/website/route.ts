import { websiteResponse } from "@/server/projects/website-http";
import { getResumeWebsiteState, saveResumeWebsiteInput } from "@/server/projects/resume-website";
import { readSameOriginJson } from "@/server/http/json";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, { params }: Context) {
  return websiteResponse(async (userId) => getResumeWebsiteState((await params).id, userId));
}
export async function PATCH(request: Request, { params }: Context) {
  return websiteResponse(async (userId) => saveResumeWebsiteInput((await params).id, userId, await readSameOriginJson(request)));
}
