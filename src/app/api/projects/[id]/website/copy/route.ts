import { websiteResponse } from "@/server/projects/website-http";
import { saveResumeWebsiteCopy } from "@/server/projects/resume-website";
import { readSameOriginJson } from "@/server/http/json";
export const dynamic = "force-dynamic";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return websiteResponse(async (userId) => saveResumeWebsiteCopy((await params).id, userId, await readSameOriginJson(request)));
}
