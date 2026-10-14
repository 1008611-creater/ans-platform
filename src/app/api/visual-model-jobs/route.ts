import { assertRequestActor, assertSameOrigin } from "@/server/http/json";
import { websiteResponse } from "@/server/projects/website-http";
import { createModelJob, listModelJobs } from "@/server/visual-portfolio/jobs";
import { readLimitedBody } from "@/server/visual-portfolio/media";
import { VisualPortfolioError } from "@/server/visual-portfolio/errors";
import { IMAGE_LIMIT } from "@/contracts/visual-generation";
export const dynamic="force-dynamic";
export async function GET(request:Request){return websiteResponse(async userId=>{assertRequestActor(request,userId);return listModelJobs(userId);});}
export async function POST(request:Request){return websiteResponse(async userId=>{
 assertRequestActor(request,userId);assertSameOrigin(request);
 if(!request.headers.get("content-type")?.startsWith("multipart/form-data;"))throw new VisualPortfolioError("INVALID_INPUT",415);
 const bytes=await readLimitedBody(request,IMAGE_LIMIT+100000);
 let data:FormData;try{data=await new Response(bytes,{headers:{"content-type":request.headers.get("content-type")!}}).formData();}catch{throw new VisualPortfolioError("INVALID_INPUT",400);}
 const image=data.get("image"),manifest=data.get("manifest");
 if(!(image instanceof File)||typeof manifest!=="string"||manifest.length>10000||image.size>IMAGE_LIMIT)throw new VisualPortfolioError("INVALID_INPUT",400);
 let input:unknown;try{input=JSON.parse(manifest);}catch{throw new VisualPortfolioError("INVALID_INPUT",400);}
 return createModelJob(userId,input,new Uint8Array(await image.arrayBuffer()));
 },202);}
