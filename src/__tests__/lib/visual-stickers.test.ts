import { describe, expect, it, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import sources from "@/../public/visual-portfolio/stickers/sources.json";
import { PRESET_STICKERS, presetSticker, stickerTexturePaths } from "@/contracts/visual-stickers";
import { visualTourSchema, DEFAULT_APPEARANCE } from "@/contracts/visual-website";
import { createVisualTour } from "@/lib/projects/visual-tour";
import { renderVisualWebsite } from "@/lib/projects/visual-website";
import { exportVisualWebsite } from "@/lib/projects/visual-website-assets";
import { RESUME_WEBSITE_EXAMPLE } from "@/domain/projects/resume-website";
vi.mock("@/lib/db",()=>({db:{}}));
afterEach(()=>vi.unstubAllGlobals());
const imageSticker={id:"preset-one",text:"Architect",preset:"doodle-mbti-intj",color:"#cafa2a",position:[0,0,1],normal:[0,0,1],size:.16,rotation:0,visible:true};
describe("reference image stickers",()=>{
 it("has both complete source collections and unmodified local WEBP assets",()=>{
  expect(PRESET_STICKERS).toHaveLength(280);
  expect(new Set(PRESET_STICKERS.map(item=>item.id)).size).toBe(280);
  for(const style of ["doodle","retro"])expect(PRESET_STICKERS.filter(item=>item.style===style)).toHaveLength(140);
  for(const asset of sources.assets){
   const bytes=readFileSync("public"+asset.path);
   expect(bytes.length).toBe(asset.bytes);expect(bytes.subarray(0,4).toString()).toBe("RIFF");expect(bytes.subarray(8,12).toString()).toBe("WEBP");
   expect(createHash("sha256").update(bytes).digest("hex")).toBe(asset.sha256);
  }
 });
 it("accepts known presets, preserves legacy text and rejects remote or unknown sources",()=>{
  const tour=createVisualTour(RESUME_WEBSITE_EXAMPLE);
  const parsed=visualTourSchema.parse({...tour,stickers:[imageSticker]});expect(parsed.stickers[0].preset).toBe(imageSticker.preset);
  expect(visualTourSchema.safeParse({...tour,stickers:[{...imageSticker,preset:undefined}]}).success).toBe(true);
  for(const preset of ["https://evil.invalid/secret.webp","../../secret","missing"])
   expect(visualTourSchema.safeParse({...tour,stickers:[{...imageSticker,preset}]}).success).toBe(false);
  expect(visualTourSchema.safeParse({...tour,stickers:[{...imageSticker,image:"https://evil.invalid"}]}).success).toBe(false);
 });
 it("live previews resolve only selected allowlisted images",()=>{
  expect(stickerTexturePaths([{preset:imageSticker.preset},{preset:"../../secret"}])).toEqual({[imageSticker.preset]:presetSticker(imageSticker.preset)!.path});
  const tour=visualTourSchema.parse({...createVisualTour(RESUME_WEBSITE_EXAMPLE),stickers:[imageSticker]});
  const dom=new DOMParser().parseFromString(renderVisualWebsite(RESUME_WEBSITE_EXAMPLE,{...DEFAULT_APPEARANCE,tour}),"text/html");
  const config=JSON.parse(dom.getElementById("site-config")!.textContent!);expect(config.stickerTextures[imageSticker.preset]).toBe(presetSticker(imageSticker.preset)!.path);
 });
 it("embeds the same allowlisted image when the server renders a publication",async()=>{
  const {renderStoredWebsite}=await import("@/server/visual-portfolio/publication");
  const tour=visualTourSchema.parse({...createVisualTour(RESUME_WEBSITE_EXAMPLE),stickers:[imageSticker]});
  const bytes=await renderStoredWebsite("isolated-test-owner",{format:"ans-visual-website",version:1,profile:RESUME_WEBSITE_EXAMPLE,appearance:{...DEFAULT_APPEARANCE,tour}});
  const dom=new DOMParser().parseFromString(bytes.toString(),"text/html"),config=JSON.parse(dom.getElementById("site-config")!.textContent!);
  const embedded=Buffer.from(config.stickerTextures[imageSticker.preset].split(",",2)[1],"base64");
  expect(embedded).toEqual(readFileSync("public"+presetSticker(imageSticker.preset)!.path));
 });
 it("exports selected images inside the HTML without remote sticker requests",async()=>{
  const fetcher=vi.fn(async(url:string)=>{const path=url.split("?")[0];return new Response(readFileSync("public"+path));});vi.stubGlobal("fetch",fetcher);
  const tour=visualTourSchema.parse({...createVisualTour(RESUME_WEBSITE_EXAMPLE),stickers:[imageSticker]});
  const html=await exportVisualWebsite({format:"ans-visual-website",version:1,profile:RESUME_WEBSITE_EXAMPLE,appearance:{...DEFAULT_APPEARANCE,tour}});
  const dom=new DOMParser().parseFromString(html,"text/html"),config=JSON.parse(dom.getElementById("site-config")!.textContent!);
  expect(config.stickerTextures[imageSticker.preset]).toMatch(/^data:image\/webp;base64,/);
  expect(html).not.toContain("assets.intro3d.com");expect(Object.keys(config.stickerTextures)).toEqual([imageSticker.preset]);
  expect(fetcher.mock.calls.filter(([url])=>url.includes("/stickers/"))).toHaveLength(1);
 });
});
