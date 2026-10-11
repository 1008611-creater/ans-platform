import { RateLimiter } from "@/lib/rate-limit";
import { readSameOriginJson } from "@/server/http/json";
import { AgriWorkspaceError } from "@/contracts/agri-workspace";
import { agriIssueCommandSchema } from "@/contracts/agri-issues";
import { agriSubmissionResponse } from "@/server/competitions/agrihackathon/submissions-http";
import { executeAgriIssueCommand } from "@/server/competitions/agrihackathon/issues";
export const dynamic="force-dynamic";
const writes=new RateLimiter({max:30,windowSeconds:60});
export async function POST(request:Request){return agriSubmissionResponse(request,async actorId=>{const command=agriIssueCommandSchema.parse(await readSameOriginJson(request));if(!writes.check(actorId).allowed)throw new AgriWorkspaceError("RATE_LIMITED",429);return executeAgriIssueCommand(actorId,command);});}
