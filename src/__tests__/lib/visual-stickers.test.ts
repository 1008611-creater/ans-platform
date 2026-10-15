import { describe, expect, it, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import fluent from "@/../public/visual-portfolio/stickers/fluent-sources.json";
import sources from "@/../public/visual-portfolio/stickers/sources.json";
import { PRESET_STICKERS, presetSticker, stickerTexturePaths, stickerImageMime, createPresetStickerId, cloneStickerId, presetForSticker } from "@/contracts/visual-stickers";
import { visualTourSchema, visualWebsiteSchema, visualWebsiteSaveSchema, DEFAULT_APPEARANCE } from "@/contracts/visual-website";
import { createVisualTour } from "@/lib/projects/visual-tour";
import { renderVisualWebsite } from "@/lib/projects/visual-website";
import { exportVisualWebsite } from "@/lib/projects/visual-website-assets";
import { RESUME_WEBSITE_EXAMPLE } from "@/domain/projects/resume-website";
vi.mock("@/lib/db",()=>({db:{}}));
afterEach(()=>vi.unstubAllGlobals());
const imageCatalogId="doodle-mbti-intj";
const imageSticker={id:createPresetStickerId(imageCatalogId,"11111111-1111-4111-8111-111111111111"),text:"Architect",color:"#cafa2a",position:[0,0,1],normal:[0,0,1],size:.16,rotation:0,visible:true};
describe("reference image stickers",()=>{
 it("has both complete source collections and unmodified local WEBP assets",()=>{
  expect(PRESET_STICKERS.filter(item=>item.style!=="fluent")).toHaveLength(280);
  expect(new Set(PRESET_STICKERS.map(item=>item.id)).size).toBe(304);
  for(const style of ["doodle","retro"])expect(PRESET_STICKERS.filter(item=>item.style===style)).toHaveLength(140);
  for(const asset of sources.assets){
   const bytes=readFileSync("public"+asset.path);
   expect(bytes.length).toBe(asset.bytes);expect(bytes.subarray(0,4).toString()).toBe("RIFF");expect(bytes.subarray(8,12).toString()).toBe("WEBP");
   expect(createHash("sha256").update(bytes).digest("hex")).toBe(asset.sha256);
  }
 });
 it("preserves legacy text and rejects unknown persisted fields",()=>{
  const tour=createVisualTour(RESUME_WEBSITE_EXAMPLE);
  expect(visualTourSchema.parse({...tour,stickers:[imageSticker]}).stickers[0]).toEqual(imageSticker);
  for(const extra of [{preset:imageCatalogId},{image:"https://evil.invalid"}])
   expect(visualTourSchema.safeParse({...tour,stickers:[{...imageSticker,...extra}]}).success).toBe(false);
 });
 it("live previews resolve only selected allowlisted images",()=>{
  expect(stickerTexturePaths([imageSticker,{id:"../../secret"}])).toEqual({[imageSticker.id]:presetSticker(imageCatalogId)!.path});
  const tour=visualTourSchema.parse({...createVisualTour(RESUME_WEBSITE_EXAMPLE),stickers:[imageSticker]});
  const dom=new DOMParser().parseFromString(renderVisualWebsite(RESUME_WEBSITE_EXAMPLE,{...DEFAULT_APPEARANCE,tour}),"text/html");
  const config=JSON.parse(dom.getElementById("site-config")!.textContent!);expect(config.stickerTextures[imageSticker.id]).toBe(presetSticker(imageCatalogId)!.path);
 });
 it("embeds the same allowlisted image when the server renders a publication",async()=>{
  const {renderStoredWebsite}=await import("@/server/visual-portfolio/publication");
  const tour=visualTourSchema.parse({...createVisualTour(RESUME_WEBSITE_EXAMPLE),stickers:[imageSticker]});
  const bytes=await renderStoredWebsite("isolated-test-owner",{format:"ans-visual-website",version:1,profile:RESUME_WEBSITE_EXAMPLE,appearance:{...DEFAULT_APPEARANCE,tour}});
  const dom=new DOMParser().parseFromString(bytes.toString(),"text/html"),config=JSON.parse(dom.getElementById("site-config")!.textContent!);
  const embedded=Buffer.from(config.stickerTextures[imageSticker.id].split(",",2)[1],"base64");
  expect(embedded).toEqual(readFileSync("public"+presetSticker(imageCatalogId)!.path));
 });
 it("exports selected images inside the HTML without remote sticker requests",async()=>{
  const fetcher=vi.fn(async(url:string)=>{const path=url.split("?")[0];return new Response(readFileSync("public"+path));});vi.stubGlobal("fetch",fetcher);
  const tour=visualTourSchema.parse({...createVisualTour(RESUME_WEBSITE_EXAMPLE),stickers:[imageSticker]});
  const html=await exportVisualWebsite({format:"ans-visual-website",version:1,profile:RESUME_WEBSITE_EXAMPLE,appearance:{...DEFAULT_APPEARANCE,tour}});
  const dom=new DOMParser().parseFromString(html,"text/html"),config=JSON.parse(dom.getElementById("site-config")!.textContent!);
  expect(config.stickerTextures[imageSticker.id]).toMatch(/^data:image\/webp;base64,/);
  expect(html).not.toContain("assets.intro3d.com");expect(Object.keys(config.stickerTextures)).toEqual([imageSticker.id]);
  expect(fetcher.mock.calls.filter(([url])=>url.includes("/stickers/"))).toHaveLength(1);
 });
});


describe("Fluent sticker integration", () => {
 it("keeps 24 original PNGs bound to one upstream commit and MIT notice", () => {
  expect(PRESET_STICKERS.filter(item => item.style === "fluent")).toHaveLength(24);
  expect(fluent.commit).toBe("1ffb34c752ecf5d402f04cfb4b392c77f57c54bc");
  for (const asset of fluent.assets) {
   const bytes = readFileSync("public" + asset.path);
   expect(bytes.length).toBe(asset.bytes);
   expect(createHash("sha256").update(bytes).digest("hex")).toBe(asset.sha256);
   expect(stickerImageMime(bytes)).toBe("image/png");
   expect(presetSticker(asset.id)?.path).toBe(asset.path);
  }
  const license = readFileSync("public" + fluent.licensePath);
  expect(createHash("sha256").update(license).digest("hex")).toBe(fluent.licenseSha256);
  expect(license.toString()).toContain("Microsoft Corporation");
 });
 it("rejects SVG, incorrect PNG signatures and oversized sticker bytes", () => {
  expect(stickerImageMime(new TextEncoder().encode("<svg onload='alert(1)'></svg>"))).toBeNull();
  expect(stickerImageMime(new Uint8Array(100001))).toBeNull();
  expect(stickerImageMime(new Uint8Array([137,80,78,71,13,10,26,10]))).toBeNull();
 });
 it("exports only selected PNG/WEBP bytes and keeps the complete Fluent MIT notice", async () => {
  const fetcher = vi.fn(async (url: string) => new Response(readFileSync("public" + url.split("?")[0])));
  vi.stubGlobal("fetch", fetcher);
  const pngId=createPresetStickerId(fluent.assets[0].id);
  const stickers = [imageSticker, { ...imageSticker, id: pngId }];
  const tour = visualTourSchema.parse({ ...createVisualTour(RESUME_WEBSITE_EXAMPLE), stickers });
  const html = await exportVisualWebsite({ format: "ans-visual-website", version: 1, profile: RESUME_WEBSITE_EXAMPLE, appearance: { ...DEFAULT_APPEARANCE, tour } });
  const dom = new DOMParser().parseFromString(html, "text/html");
  const config = JSON.parse(dom.getElementById("site-config")!.textContent!);
  expect(Object.keys(config.stickerTextures)).toHaveLength(2);
  expect(config.stickerTextures[imageSticker.id]).toMatch(/^data:image\/webp;base64,/);
  expect(config.stickerTextures[pngId]).toMatch(/^data:image\/png;base64,/);
  expect(Buffer.from(config.stickerTextures[pngId].split(",")[1], "base64")).toEqual(readFileSync("public" + fluent.assets[0].path));
  expect(html).toContain(readFileSync("public" + fluent.licensePath, "utf8"));
  expect(html).not.toContain("assets.intro3d.com");
  expect(fetcher.mock.calls.filter(([url]) => url.includes("/stickers/"))).toHaveLength(2);
 });
 it("publishes selected PNGs with their actual MIME and copyright notice", async () => {
  const { renderStoredWebsite } = await import("@/server/visual-portfolio/publication");
  const pngId=createPresetStickerId(fluent.assets[0].id);
  const tour = visualTourSchema.parse({ ...createVisualTour(RESUME_WEBSITE_EXAMPLE), stickers: [{ ...imageSticker, id: pngId }] });
  const html = (await renderStoredWebsite("isolated-test-owner", { format: "ans-visual-website", version: 1, profile: RESUME_WEBSITE_EXAMPLE, appearance: { ...DEFAULT_APPEARANCE, tour } })).toString();
  const config = JSON.parse(new DOMParser().parseFromString(html, "text/html").getElementById("site-config")!.textContent!);
  expect(config.stickerTextures[pngId]).toMatch(/^data:image\/png;base64,/);
  expect(html).toContain("Copyright (c) Microsoft Corporation.");
 });
});

// The schema imported above is the real R25 implementation, kept byte-for-byte.
describe("R25 sticker id compatibility",()=>{
 it("keeps all catalog codes stable and collision free",()=>{
  expect(new Set(PRESET_STICKERS.map(item=>item.code)).size).toBe(304);
  for(const item of PRESET_STICKERS){
   expect(item.code).toBe(createHash("sha256").update(item.id).digest("hex").slice(0,12));
   const id=createPresetStickerId(item.id);
   expect(id).toHaveLength(49);expect(presetForSticker(id)).toBe(item);
  }
 });
 it("roundtrips the new document through the actual unchanged R25 schema",()=>{
  const document={format:"ans-visual-website",version:1,profile:RESUME_WEBSITE_EXAMPLE,appearance:{...DEFAULT_APPEARANCE,tour:{...createVisualTour(RESUME_WEBSITE_EXAMPLE),stickers:[imageSticker]}}};
  const oldReader=visualWebsiteSchema.parse(JSON.parse(JSON.stringify(document)));
  const saved=visualWebsiteSaveSchema.parse({projectId:"442be0b3-ddea-4bf7-a340-94490b67fb35",expectedVersion:0,document:oldReader});
  const restored=visualWebsiteSchema.parse(JSON.parse(JSON.stringify(saved.document)));
  const sticker=restored.appearance.tour!.stickers[0];
  expect(sticker.id).toBe(imageSticker.id);expect(sticker).not.toHaveProperty("preset");
  expect(presetForSticker(sticker.id)?.id).toBe(imageCatalogId);
 });
 it("degrades malformed or unknown ids to text without losing the document",()=>{
  for(const id of ["legacy","st2_0123456789ab_"+"1".repeat(32),"st1_000000000000_"+"1".repeat(32),"st1_../../secret_"+"1".repeat(32),imageSticker.id.slice(0,-1)]){
   const tour=visualTourSchema.parse({...createVisualTour(RESUME_WEBSITE_EXAMPLE),stickers:[{...imageSticker,id}]});
   expect(presetForSticker(id)).toBeUndefined();expect(stickerTexturePaths(tour.stickers)).toEqual({});
   expect(tour.stickers[0].text).toBe(imageSticker.text);
  }
  expect(()=>createPresetStickerId("../../secret")).toThrow("INVALID_STICKER_ID");
 });
 it("clones with unique nonces and preserves imagery while old R25 clones degrade only the copy",()=>{
  const ids=Array.from({length:8},()=>cloneStickerId(imageSticker.id));
  expect(new Set([imageSticker.id,...ids]).size).toBe(9);
  for(const id of ids)expect(presetForSticker(id)?.id).toBe(imageCatalogId);
  const oldClone={...imageSticker,id:crypto.randomUUID()};
  const stickers=visualTourSchema.parse({...createVisualTour(RESUME_WEBSITE_EXAMPLE),stickers:[imageSticker,oldClone]}).stickers;
  expect(stickerTexturePaths(stickers)).toEqual({[imageSticker.id]:presetSticker(imageCatalogId)!.path});
  expect(oldClone.text).toBe(imageSticker.text);
 });
});
