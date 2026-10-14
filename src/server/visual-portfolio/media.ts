import sharp from "sharp";
import { z } from "zod";
import { IMAGE_LIMIT, MODEL_LIMIT } from "@/contracts/visual-generation";
import { VisualPortfolioError } from "./errors";
export async function validateInputImage(bytes:Uint8Array) { if(!bytes.byteLength || bytes.byteLength>IMAGE_LIMIT)throw new VisualPortfolioError("IMAGE_TOO_LARGE",413);try{const meta=await sharp(bytes,{limitInputPixels:40_000_000}).metadata();if(!meta.width||!meta.height||!meta.format||!["jpeg","png","webp"].includes(meta.format)||(meta.pages??1)>1)throw new Error();return {mime:meta.format==="jpeg"?"image/jpeg":`image/${meta.format}`,extension:meta.format==="jpeg"?"jpg":meta.format};}catch{throw new VisualPortfolioError("INVALID_IMAGE",400);} }
const index=z.number().int().nonnegative(),integer=z.number().int().positive();
const gltfSchema=z.object({
 asset:z.object({version:z.literal("2.0")}).passthrough(),
 buffers:z.array(z.object({byteLength:integer,uri:z.string().optional()}).passthrough()).length(1),
 bufferViews:z.array(z.object({buffer:index,byteOffset:index.optional(),byteLength:integer,byteStride:integer.optional()}).passthrough()).min(1),
 accessors:z.array(z.object({bufferView:index.optional(),byteOffset:index.optional(),componentType:integer,count:integer,type:z.enum(["SCALAR","VEC2","VEC3","VEC4","MAT2","MAT3","MAT4"]),sparse:z.unknown().optional()}).passthrough()).min(1),
 meshes:z.array(z.object({primitives:z.array(z.object({attributes:z.record(z.string(),index),indices:index.optional(),mode:index.optional()}).passthrough()).min(1)}).passthrough()).min(1),
 nodes:z.array(z.object({mesh:index.optional(),children:z.array(index).optional()}).passthrough()).min(1).max(5000),
 scenes:z.array(z.object({nodes:z.array(index)}).passthrough()).min(1),scene:index.optional(),
 images:z.array(z.object({uri:z.string().optional(),bufferView:index.optional(),mimeType:z.string().optional()}).passthrough()).optional(),
 extensionsRequired:z.array(z.string()).optional(),extensionsUsed:z.array(z.string()).optional()
}).passthrough();
/** Inspect originals; do not rewrite user pixels or silently change the mesh. */
export function validateGeneratedModel(bytes:Uint8Array) {
 try{
  if(bytes.byteLength<28||bytes.byteLength>MODEL_LIMIT)throw new Error();const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  if(view.getUint32(0,true)!==0x46546c67||view.getUint32(4,true)!==2||view.getUint32(8,true)!==bytes.byteLength||view.getUint32(16,true)!==0x4e4f534a)throw new Error();
  const length=view.getUint32(12,true);if(length%4||length>bytes.byteLength-28)throw new Error();
  const metadata=gltfSchema.parse(JSON.parse(new TextDecoder("utf8",{fatal:true}).decode(bytes.subarray(20,20+length))));
  const offset=20+length;
  if(view.getUint32(offset+4,true)!==0x004e4942||view.getUint32(offset,true)%4||offset+8+view.getUint32(offset,true)!==bytes.byteLength)throw new Error();
  const binaryLength=view.getUint32(offset,true);if(metadata.buffers[0].uri||metadata.buffers[0].byteLength>binaryLength||binaryLength-metadata.buffers[0].byteLength>3||metadata.images?.some(i=>i.uri))throw new Error();
  const supported=new Set(["EXT_texture_webp","KHR_materials_unlit","KHR_texture_transform"]);
  if([...(metadata.extensionsRequired??[]),...(metadata.extensionsUsed??[])].some(e=>!supported.has(e)))throw new VisualPortfolioError("MODEL_UNSUPPORTED",422);
  for(const buffer of metadata.bufferViews)if(buffer.buffer!==0||(buffer.byteOffset??0)+buffer.byteLength>metadata.buffers[0].byteLength)throw new Error();
  const sizes:Record<number,number>={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4},components={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16};
  for(const accessor of metadata.accessors){
   if(accessor.sparse)throw new VisualPortfolioError("MODEL_UNSUPPORTED",422);
   const buffer=accessor.bufferView===undefined?undefined:metadata.bufferViews[accessor.bufferView],size=sizes[accessor.componentType];if(!buffer||!size)throw new Error();
   const itemSize=size*components[accessor.type],stride=buffer.byteStride??itemSize;
   if(stride<itemSize||stride>252||(accessor.byteOffset??0)+(accessor.count-1)*stride+itemSize>buffer.byteLength)throw new Error();
  }
  for(const mesh of metadata.meshes)for(const primitive of mesh.primitives){
   if(primitive.attributes.POSITION===undefined||metadata.accessors[primitive.attributes.POSITION]?.type!=="VEC3"||Object.values(primitive.attributes).some(i=>i>=metadata.accessors.length)||(primitive.indices!==undefined&&metadata.accessors[primitive.indices]?.type!=="SCALAR"))throw new Error();
  }
  for(const image of metadata.images??[])if(image.bufferView===undefined||!metadata.bufferViews[image.bufferView]||!["image/jpeg","image/png","image/webp"].includes(image.mimeType??""))throw new Error();
  const visiting=new Set<number>(),visited=new Set<number>();let hasMesh=false;
  function visit(i:number){if(visiting.has(i)||!metadata.nodes[i])throw new Error();if(visited.has(i))return;visiting.add(i);const node=metadata.nodes[i];if(node.mesh!==undefined){if(!metadata.meshes[node.mesh])throw new Error();hasMesh=true;}for(const child of node.children??[])visit(child);visiting.delete(i);visited.add(i);}
  const scene=metadata.scenes[metadata.scene??0];if(!scene)throw new Error();for(const node of scene.nodes)visit(node);if(!hasMesh)throw new Error();
  return {size:bytes.byteLength};
 }catch(error){if(error instanceof VisualPortfolioError)throw error;throw new VisualPortfolioError("INVALID_MODEL",422);}
}
export async function readLimitedBody(request:Request|Response,limit:number) { if(Number(request.headers.get("content-length"))>limit)throw new VisualPortfolioError("REQUEST_TOO_LARGE",413);const reader=request.body?.getReader();if(!reader)throw new VisualPortfolioError("EMPTY_BODY",400);let size=0;const chunks:Uint8Array[]=[];try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw new VisualPortfolioError("REQUEST_TOO_LARGE",413);}chunks.push(value);}}finally{reader.releaseLock();}const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return bytes; }
