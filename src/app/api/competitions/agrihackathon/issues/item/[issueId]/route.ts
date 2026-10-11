import { agriIssuesQuerySchema } from "@/contracts/agri-issues";
import { agriSubmissionResponse } from "@/server/competitions/agrihackathon/submissions-http";
import { readAgriIssue } from "@/server/competitions/agrihackathon/issues";
export const dynamic="force-dynamic";
export async function GET(request:Request,context:{params:Promise<{issueId:string}>}){return agriSubmissionResponse(request,async actorId=>{const {issueId}=await context.params;const query=agriIssuesQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));return readAgriIssue(actorId,issueId,query);});}
