import { agriPublicationCommandSchema,agriPublicationQuerySchema } from "@/contracts/agri-publications";
import { RateLimiter } from "@/lib/rate-limit";
import { AgriWorkspaceError } from "@/contracts/agri-workspace";
import { readSameOriginJson } from "@/server/http/json";
import { agriSubmissionResponse } from "@/server/competitions/agrihackathon/submissions-http";
import { publicationQuery } from "@/server/competitions/agrihackathon/publications-http";
import { executeAgriPublicationCommand,readAgriPublicationManagement } from "@/server/competitions/agrihackathon/publications";
export const dynamic="force-dynamic";
const writes=new RateLimiter({max:30,windowSeconds:60});
export async function GET(request:Request){return agriSubmissionResponse(request,actorId=>readAgriPublicationManagement(actorId,agriPublicationQuerySchema.parse(publicationQuery(request))));}
export async function POST(request:Request){return agriSubmissionResponse(request,async actorId=>{if(!writes.check(actorId).allowed)throw new AgriWorkspaceError("RATE_LIMITED",429);return executeAgriPublicationCommand(actorId,agriPublicationCommandSchema.parse(await readSameOriginJson(request)));});}
