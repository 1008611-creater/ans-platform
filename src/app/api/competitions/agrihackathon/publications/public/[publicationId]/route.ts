import { agriPublicPublicationResponse,publicationQuery } from "@/server/competitions/agrihackathon/publications-http";
import { readAgriPublicPublication } from "@/server/competitions/agrihackathon/publications";
import { agriPublicationsListQuerySchema } from "@/contracts/agri-publications";
export const dynamic="force-dynamic";
export async function GET(request:Request,ctx:{params:Promise<{publicationId:string}>}){return agriPublicPublicationResponse(async()=>{agriPublicationsListQuerySchema.omit({cursor:true}).parse(publicationQuery(request));return readAgriPublicPublication((await ctx.params).publicationId);});}
