import { readAgriPublicRankings } from "@/server/competitions/agrihackathon/publications";
import { agriPublicPublicationResponse,publicationQuery } from "@/server/competitions/agrihackathon/publications-http";
import { z } from "zod";
export const dynamic="force-dynamic";
export async function GET(request:Request){return agriPublicPublicationResponse(async()=>{z.object({}).strict().parse(publicationQuery(request));return readAgriPublicRankings();});}
