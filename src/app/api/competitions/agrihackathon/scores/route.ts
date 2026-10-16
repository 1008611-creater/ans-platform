import { agriJudgeScoreCommandSchema } from "@/contracts/agri-rankings";
import { agriSubmissionResponse } from "@/server/competitions/agrihackathon/submissions-http";
import { executeAgriJudgeScoreCommand } from "@/server/competitions/agrihackathon/reviews";
import { readSameOriginJson } from "@/server/http/json";
import { RateLimiter } from "@/lib/rate-limit";
import { AgriWorkspaceError } from "@/contracts/agri-workspace";
export const dynamic="force-dynamic";const limiter=new RateLimiter({max:30,windowSeconds:60});
export async function POST(request:Request){return agriSubmissionResponse(request,async actorId=>{if(!limiter.check(actorId).allowed)throw new AgriWorkspaceError("RATE_LIMITED",429);return executeAgriJudgeScoreCommand(actorId,agriJudgeScoreCommandSchema.parse(await readSameOriginJson(request)));});}
