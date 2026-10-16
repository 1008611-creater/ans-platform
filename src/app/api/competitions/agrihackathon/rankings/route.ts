import { publicationQuery } from "@/server/competitions/agrihackathon/publications-http";
import { agriRankingCommandSchema,agriRankingQuerySchema } from "@/contracts/agri-rankings";
import { agriSubmissionResponse } from "@/server/competitions/agrihackathon/submissions-http";
import { readAgriRankingManagement,executeAgriRankingCommand } from "@/server/competitions/agrihackathon/rankings";
import { readSameOriginJson } from "@/server/http/json";
import { RateLimiter } from "@/lib/rate-limit";
import { AgriWorkspaceError } from "@/contracts/agri-workspace";
export const dynamic="force-dynamic";
const limiter=new RateLimiter({max:20,windowSeconds:60});
export async function GET(request:Request){return agriSubmissionResponse(request,actorId=>readAgriRankingManagement(actorId,agriRankingQuerySchema.parse(publicationQuery(request)).stage));}
export async function POST(request:Request){return agriSubmissionResponse(request,async actorId=>{if(!limiter.check(actorId).allowed)throw new AgriWorkspaceError("RATE_LIMITED",429);return executeAgriRankingCommand(actorId,agriRankingCommandSchema.parse(await readSameOriginJson(request)));});}
