import { websiteResponse } from "@/server/projects/website-http";
import { readSameOriginJson,assertRequestActor } from "@/server/http/json";
import { publishVisualWebsite } from "@/server/visual-portfolio/publication";
export const dynamic="force-dynamic";
export async function POST(request:Request){return websiteResponse(async owner=>{assertRequestActor(request,owner);return publishVisualWebsite(owner,await readSameOriginJson(request));});}
