import { agriPublicationsListQuerySchema } from "@/contracts/agri-publications";
import { publicationQuery,agriPublicPublicationResponse } from "@/server/competitions/agrihackathon/publications-http";
import { readAgriPublications } from "@/server/competitions/agrihackathon/publications";
export const dynamic="force-dynamic";
export async function GET(request:Request){return agriPublicPublicationResponse(()=>readAgriPublications(agriPublicationsListQuerySchema.parse(publicationQuery(request))));}
