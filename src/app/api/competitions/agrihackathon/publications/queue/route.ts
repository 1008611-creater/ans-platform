import { agriPublicationsListQuerySchema } from "@/contracts/agri-publications";
import { agriSubmissionResponse } from "@/server/competitions/agrihackathon/submissions-http";
import { publicationQuery } from "@/server/competitions/agrihackathon/publications-http";
import { readAgriPublicationQueue } from "@/server/competitions/agrihackathon/publications";
export const dynamic="force-dynamic";
export async function GET(request:Request){return agriSubmissionResponse(request,actorId=>readAgriPublicationQueue(actorId,agriPublicationsListQuerySchema.parse(publicationQuery(request))));}
