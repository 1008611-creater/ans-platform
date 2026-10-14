import { type TripoOptions } from "@/contracts/visual-generation";
import { sha256 } from "./storage";
/** Match old P2 requests without allowing added options to collide with their hash. */
export function modelRequestHashes(bytes:Uint8Array, options:TripoOptions, projectId:string|undefined, points:number) {
 const image=sha256(bytes);
 const hash=(value:object)=>sha256(JSON.stringify({image,options:value,projectId:projectId??null,points}));
 const current=hash(options);
 const legacy=options.model==="P2-20260801"&&options.source==="image"&&options.textureResolution!=="8K"&&!options.quad&&options.geometryQuality==="standard"&&!options.generateParts&&!options.autoFix
  ?hash({model:options.model,texture:options.texture,textureResolution:options.textureResolution,pbr:options.pbr,faceCount:options.faceCount}):null;
 return {current,legacy};
}
