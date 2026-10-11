import { z } from "zod";
import { websiteResponse } from "@/server/projects/website-http";
import { enqueueResumeWebsite, cancelResumeWebsiteRun } from "@/server/projects/resume-website";
import { RateLimiter } from "@/lib/rate-limit";
import { ResumeWebsiteError } from "@/server/projects/resume-website";
import { readSameOriginJson } from "@/server/http/json";
export const dynamic = "force-dynamic";
const generationLimiter = new RateLimiter({ max: 6, windowSeconds: 60 });
type Context = { params: Promise<{ id: string }> };
export async function POST(request: Request, { params }: Context) {
  return websiteResponse(async (userId) => {
    const body = await readSameOriginJson(request);
    if (!generationLimiter.check(userId).allowed) throw new ResumeWebsiteError("RATE_LIMITED", 429);
    return enqueueResumeWebsite((await params).id, userId, body);
  }, 202);
}
export async function DELETE(request: Request, { params }: Context) {
  return websiteResponse(async (userId) => {
    const { runId } = z.object({ runId: z.string().min(1).max(100) }).strict().parse(await readSameOriginJson(request));
    return cancelResumeWebsiteRun((await params).id, userId, runId);
  });
}
