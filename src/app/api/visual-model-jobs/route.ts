import { assertRequestActor, assertSameOrigin } from "@/server/http/json";
import { websiteResponse } from "@/server/projects/website-http";
import { createModelJob, listModelJobs } from "@/server/visual-portfolio/jobs";
import { readLimitedBody } from "@/server/visual-portfolio/media";
import { VisualPortfolioError } from "@/server/visual-portfolio/errors";
import { IMAGE_LIMIT, REQUEST_IMAGE_LIMIT, createModelJobSchema } from "@/contracts/visual-generation";
export const dynamic="force-dynamic";
export async function GET(request:Request){return websiteResponse(async userId=>{assertRequestActor(request,userId);return listModelJobs(userId);});}
export async function POST(request:Request){return websiteResponse(async userId=>{
 assertRequestActor(request,userId);assertSameOrigin(request);
 if(!request.headers.get("content-type")?.startsWith("multipart/form-data;"))throw new VisualPortfolioError("INVALID_INPUT",415);
 const bytes=await readLimitedBody(request,REQUEST_IMAGE_LIMIT+100000);
 let data:FormData;try{data=await new Response(bytes,{headers:{"content-type":request.headers.get("content-type")!}}).formData();}catch{throw new VisualPortfolioError("INVALID_INPUT",400);}
 const manifest=data.get("manifest");
 if(typeof manifest!=="string"||manifest.length>10000)throw new VisualPortfolioError("INVALID_INPUT",400);
 let raw:unknown;try{raw=JSON.parse(manifest);}catch{throw new VisualPortfolioError("INVALID_INPUT",400);}
 const input=createModelJobSchema.parse(raw);
 const keys=input.options.source==="multiview"?["image0","image1","image2","image3"]:input.options.source==="image"?["image"]:[];
 for(const [key,value] of data.entries())if(key!=="manifest"&&(!keys.includes(key)||!(value instanceof File)||data.getAll(key).length!==1))throw new VisualPortfolioError("INVALID_INPUT",400);
 if(data.getAll("manifest").length!==1)throw new VisualPortfolioError("INVALID_INPUT",400);
 const images=await Promise.all(keys.map(async key=>{const image=data.get(key);if(image===null)return null;if(!(image instanceof File)||image.size>IMAGE_LIMIT)throw new VisualPortfolioError("INVALID_INPUT",400);return new Uint8Array(await image.arrayBuffer());}));
 return createModelJob(userId,input,images);
 },202);}
