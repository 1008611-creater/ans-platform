import { agriIssuesQuerySchema } from "@/contracts/agri-issues";
import { agriSubmissionResponse } from "@/server/competitions/agrihackathon/submissions-http";
import { readAgriIssues } from "@/server/competitions/agrihackathon/issues";
export const dynamic="force-dynamic";
export async function GET(request:Request,context:{params:Promise<{submissionId:string}>}){return agriSubmissionResponse(request,async actorId=>{const {submissionId}=await context.params;const query=agriIssuesQuerySchema.parse(Object.fromEntries(new URL(request.url).searchParams));return readAgriIssues(actorId,submissionId,query);});}
