import { IMAGE_LIMIT, REQUEST_IMAGE_LIMIT, INPUT_LIMIT, type TripoOptions } from "@/contracts/visual-generation";
import { validateInputImage } from "./media";
import { VisualPortfolioError } from "./errors";
/** Durable private input envelope; original image bytes are never transformed. */
export async function prepareGenerationInput(options:TripoOptions, images:Uint8Array|Array<Uint8Array|null>, prompt:string) {
 const views = images instanceof Uint8Array ? [images] : images;
 if(options.source === "text") {
  if(views.some(Boolean) || !prompt.trim())throw new VisualPortfolioError("INVALID_INPUT",400);
  return {bytes:Buffer.from(JSON.stringify({format:"ans-tripo-input-v1",prompt})),mime:"application/json",extension:"json"};
 }
 if(views.length>4 || views.reduce((total,bytes)=>total+(bytes?.byteLength??0),0)>REQUEST_IMAGE_LIMIT)
  throw new VisualPortfolioError("IMAGE_TOO_LARGE",413);
 if(options.source === "image") {
  if(views.length!==1||!views[0])throw new VisualPortfolioError("INVALID_INPUT",400);
  const type=await validateInputImage(views[0]);return {bytes:views[0],...type};
 }
 if(!views[0]||views.filter(Boolean).length<2)throw new VisualPortfolioError("MULTIVIEW_REQUIRED",400);
 const encoded=await Promise.all(views.map(async bytes=>{
  if(!bytes)return null;
  if(bytes.byteLength>IMAGE_LIMIT)throw new VisualPortfolioError("IMAGE_TOO_LARGE",413);
  const {mime}=await validateInputImage(bytes);return {mime,data:Buffer.from(bytes).toString("base64")};
 }));
 const bytes=Buffer.from(JSON.stringify({format:"ans-tripo-input-v1",views:encoded}));
 if(bytes.byteLength>INPUT_LIMIT)throw new VisualPortfolioError("IMAGE_TOO_LARGE",413);
 return {bytes,mime:"application/json",extension:"json"};
}
