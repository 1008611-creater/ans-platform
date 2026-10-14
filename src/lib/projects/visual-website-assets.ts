import { stickerTexturePaths } from "@/contracts/visual-stickers";
import type { VisualWebsite } from "@/contracts/visual-website";
import { renderVisualWebsite } from "./visual-website";
import type { ModelAssetRef } from "@/contracts/visual-generation";
export interface VisualRuntimeAssets { core: string; module: string; utility: string; loader: string; scene: string; model: string; stickerTextures?: Record<string, string>; }
let bundle: Promise<VisualRuntimeAssets> | null = null;
function base64(bytes: Uint8Array) { let value=""; for(let offset=0;offset<bytes.length;offset+=32768)value+=String.fromCharCode(...bytes.subarray(offset,offset+32768)); return btoa(value); }
export function loadVisualRuntimeAssets(): Promise<VisualRuntimeAssets> {
 if(bundle)return bundle;
 const files={core:"/mascot/3d/vendor/three.core.js",module:"/mascot/3d/vendor/three.module.js",utility:"/mascot/3d/vendor/BufferGeometryUtils.js",loader:"/mascot/3d/vendor/GLTFLoader.js",scene:"/visual-portfolio/scene.mjs?v=9",model:"/visual-portfolio/reference/banner.glb"};
 bundle=Promise.all(Object.entries(files).map(async([key,url])=>{const response=await fetch(url,{cache:key==="scene"?"no-cache":"force-cache"});if(!response.ok)throw new Error("EXPORT_ASSET_UNAVAILABLE");return [key,key==="model"?base64(new Uint8Array(await response.arrayBuffer())):await response.text()] as const;})).then(entries=>Object.fromEntries(entries) as unknown as VisualRuntimeAssets).catch(error=>{bundle=null;throw error;});
 return bundle;
}
export async function exportVisualWebsite(document: VisualWebsite, resolveModel?: (asset: ModelAssetRef) => Promise<Uint8Array>) {
 const runtime=document.appearance.avatar==="reference"?await loadVisualRuntimeAssets():undefined;
 const textures=runtime?await Promise.all(Object.entries(stickerTexturePaths(document.appearance.tour?.stickers ?? [])).map(async([id,path])=>{
  const response=await fetch(path,{cache:"force-cache"});if(!response.ok)throw new Error("EXPORT_STICKER_UNAVAILABLE");
  const bytes=new Uint8Array(await response.arrayBuffer());if(bytes.byteLength>100000||bytes.byteLength<12||new TextDecoder().decode(bytes.slice(0,4))!=="RIFF"||new TextDecoder().decode(bytes.slice(8,12))!=="WEBP")throw new Error("EXPORT_STICKER_INVALID");
  return [id,"data:image/webp;base64,"+base64(bytes)] as const;
 })):[];
 const assets=runtime?{...runtime,stickerTextures:Object.fromEntries(textures)}:undefined;
 if(document.appearance.tour?.modelAsset){
  if(!resolveModel || !assets)throw new Error("MODEL_ASSET_UNAVAILABLE");
  const bytes=await resolveModel(document.appearance.tour.modelAsset);
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes as Uint8Array<ArrayBuffer>)),x=>x.toString(16).padStart(2,"0")).join("");
  if(bytes.byteLength!==document.appearance.tour.modelAsset.size||hash!==document.appearance.tour.modelAsset.sha256)throw new Error("MODEL_ASSET_UNAVAILABLE");
  return renderVisualWebsite(document.profile,document.appearance,0,{...assets,model:base64(bytes)});
 }
 return renderVisualWebsite(document.profile,document.appearance,0,assets);
}
