import { websiteResponse } from "@/server/projects/website-http";
import { assertRequestActor,assertSameOrigin } from "@/server/http/json";
import { createFourViewJob,listFourViewJobs } from "@/server/visual-portfolio/four-view-jobs";
import { readLimitedBody } from "@/server/visual-portfolio/media";
import { IMAGE_LIMIT } from "@/contracts/visual-generation";
import { VisualPortfolioError } from "@/server/visual-portfolio/errors";
export const dynamic="force-dynamic";
export async function GET(request:Request){return websiteResponse(async owner=>{assertRequestActor(request,owner);return listFourViewJobs(owner);});}
export async function POST(request:Request){return websiteResponse(async owner=>{
 assertRequestActor(request,owner);assertSameOrigin(request);
 const type=request.headers.get("content-type")??"";if(!type.startsWith("multipart/form-data;"))throw new VisualPortfolioError("INVALID_INPUT",415);
 const bytes=await readLimitedBody(request,IMAGE_LIMIT+10000);
 let form:FormData;try{form=await new Response(bytes,{headers:{"content-type":type}}).formData();}catch{throw new VisualPortfolioError("INVALID_INPUT",400);}
 if([...form.keys()].length!==2||form.getAll("image").length!==1||form.getAll("manifest").length!==1)throw new VisualPortfolioError("INVALID_INPUT",400);
 const image=form.get("image"),manifest=form.get("manifest");if(!(image instanceof File)||typeof manifest!=="string"||manifest.length>5000)throw new VisualPortfolioError("INVALID_INPUT",400);
 let raw:unknown;try{raw=JSON.parse(manifest);}catch{throw new VisualPortfolioError("INVALID_INPUT",400);}
 return createFourViewJob(owner,raw,new Uint8Array(await image.arrayBuffer()));
 },202);}
