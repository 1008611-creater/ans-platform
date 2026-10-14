import { websiteResponse } from "@/server/projects/website-http";
import { assertRequestActor,assertSameOrigin } from "@/server/http/json";
import { discardFourViewJob } from "@/server/visual-portfolio/four-view-jobs";
import { uuid } from "@/server/visual-portfolio/http";
export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){return websiteResponse(async owner=>{assertRequestActor(request,owner);assertSameOrigin(request);return discardFourViewJob(owner,uuid((await params).id));});}
