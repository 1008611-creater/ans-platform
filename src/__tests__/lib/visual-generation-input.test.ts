// @vitest-environment node
import { readFile } from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_TRIPO_OPTIONS, tripoOptionsSchema, generationPrice } from "@/contracts/visual-generation";
import { prepareGenerationInput } from "@/server/visual-portfolio/generation-input";
import { generationConfig } from "@/server/visual-portfolio/jobs";
const env={...process.env};afterEach(()=>{process.env={...env};});
describe("expanded generation inputs and quoted costs",()=>{
 it("validates model-specific polygon bounds and incompatible parts",()=>{
  expect(tripoOptionsSchema.safeParse({...DEFAULT_TRIPO_OPTIONS,model:"P1-20260311",faceCount:50}).success).toBe(true);
  expect(tripoOptionsSchema.safeParse({...DEFAULT_TRIPO_OPTIONS,model:"P1-20260311",quad:true}).success).toBe(false);
  expect(tripoOptionsSchema.safeParse({...DEFAULT_TRIPO_OPTIONS,model:"v3.1-20260211",geometryQuality:"detailed",faceCount:2000000}).success).toBe(true);
  expect(tripoOptionsSchema.safeParse({...DEFAULT_TRIPO_OPTIONS,generateParts:true}).success).toBe(false);
  expect(tripoOptionsSchema.safeParse({...DEFAULT_TRIPO_OPTIONS,source:"text",autoFix:true}).success).toBe(false);
 });
 it.each([
  ["v2.5-20250123", "standard", 500000], ["v3.0-20250812", "standard", 1000000],
  ["v3.1-20260211", "standard", 1500000], ["v3.0-20250812", "detailed", 2000000],
  ["v3.1-20260211", "detailed", 2000000]
 ] as const)("enforces %s %s geometry bounds",(model,geometryQuality,max)=>{
  expect(tripoOptionsSchema.safeParse({...DEFAULT_TRIPO_OPTIONS,model,geometryQuality,faceCount:max}).success).toBe(true);
  expect(tripoOptionsSchema.safeParse({...DEFAULT_TRIPO_OPTIONS,model,geometryQuality,faceCount:max+1}).success).toBe(false);
 });
 it("rejects ignored v2.5 settings and mutually exclusive parts/quad",()=>{
  for(const added of [{quad:true},{generateParts:true,texture:false,pbr:false},{geometryQuality:"detailed"},{textureResolution:"4K"}])
   expect(tripoOptionsSchema.safeParse({...DEFAULT_TRIPO_OPTIONS,model:"v2.5-20250123",...added}).success).toBe(false);
  expect(tripoOptionsSchema.safeParse({...DEFAULT_TRIPO_OPTIONS,model:"v3.1-20260211",generateParts:true,texture:false,pbr:false,quad:true}).success).toBe(false);
  expect(tripoOptionsSchema.safeParse({...DEFAULT_TRIPO_OPTIONS,model:"v3.1-20260211",generateParts:true,texture:false,pbr:false}).success).toBe(true);
 });
 it("never quotes undeliverable quad jobs even with an exact price",()=>{
  const options={...DEFAULT_TRIPO_OPTIONS,quad:true};
  expect(generationPrice({available:true,costPoints:2,quotes:[{options,costPoints:5}]},options)).toBeNull();
 });
 it("8K requires a quote matching every option",()=>{
  const options={...DEFAULT_TRIPO_OPTIONS,textureResolution:"8K" as const};
  const config={available:true,costPoints:2,quotes:[{options,costPoints:5}]};
  expect(generationPrice(config,options)).toBe(5);
  expect(generationPrice(config,{...options,faceCount:6000})).toBeNull();
 });
 it("stores original single-image bytes and a validated private multiview envelope",async()=>{
  const image=await readFile("public/visual-portfolio/reference/home/labelman.webp");
  expect((await prepareGenerationInput(DEFAULT_TRIPO_OPTIONS,image,"")).bytes).toBe(image);
  const input=await prepareGenerationInput({...DEFAULT_TRIPO_OPTIONS,source:"multiview"},[image,null,image,null],"");
  const decoded=JSON.parse(Buffer.from(input.bytes).toString());expect(input.extension).toBe("json");expect(decoded.views[1]).toBeNull();expect(Buffer.from(decoded.views[2].data,"base64")).toEqual(image);
  await expect(prepareGenerationInput({...DEFAULT_TRIPO_OPTIONS,source:"multiview"},[null,image,image],"")).rejects.toThrow("MULTIVIEW_REQUIRED");
 });
 it("text cannot contain unexpected image files",async()=>{
  const options={...DEFAULT_TRIPO_OPTIONS,source:"text" as const};const result=await prepareGenerationInput(options,[],"a toy robot");expect(JSON.parse(Buffer.from(result.bytes).toString()).prompt).toBe("a toy robot");
  await expect(prepareGenerationInput(options,[new Uint8Array([1])],"robot")).rejects.toThrow("INVALID_INPUT");
 });
 it("new models and advanced P2 options never inherit a basic P2 price",()=>{
  const cfg={available:true,costPoints:2};expect(generationPrice(cfg,DEFAULT_TRIPO_OPTIONS)).toBe(2);
  expect(generationPrice(cfg,{...DEFAULT_TRIPO_OPTIONS,textureResolution:"4K"})).toBeNull();expect(generationPrice(cfg,{...DEFAULT_TRIPO_OPTIONS,textureResolution:"8K"})).toBeNull();expect(generationPrice(cfg,{...DEFAULT_TRIPO_OPTIONS,geometryQuality:"detailed"})).toBeNull();expect(generationPrice(cfg,{...DEFAULT_TRIPO_OPTIONS,generateParts:true})).toBeNull();
  expect(generationPrice(cfg,{...DEFAULT_TRIPO_OPTIONS,source:"text"})).toBeNull();expect(generationPrice(cfg,{...DEFAULT_TRIPO_OPTIONS,quad:true})).toBeNull();expect(generationPrice(cfg,{...DEFAULT_TRIPO_OPTIONS,model:"v3.1-20260211"})).toBeNull();
 });
 it("applies the confirmed 10-point default over legacy quotes and rejects a malformed table",()=>{
  Object.assign(process.env,{ANS_TRIPO_ACCEPTING_JOBS:"true",ANS_VISUAL_STORAGE_MODE:"local",ANS_VISUAL_WORKER_KEY:"w".repeat(32),ANS_VISUAL_SIGNING_SECRET:"s".repeat(32),ANS_TRIPO_PRICE_POINTS:"2"});
  const options={...DEFAULT_TRIPO_OPTIONS,source:"text" as const};process.env.ANS_TRIPO_PRICE_TABLE=JSON.stringify([{options,costPoints:3}]);
  delete process.env.ANS_TRIPO_FLAT_PRICE_POINTS;const config=generationConfig();expect(config.available).toBe(true);expect(generationPrice(config,options)).toBe(20);
  process.env.ANS_TRIPO_PRICE_TABLE="invalid";expect(generationConfig().available).toBe(false);
 });
 it("uses the explicit uniform price for image, text and multiview without inheriting legacy quotes",()=>{
  const config={available:true,costPoints:2,flatCostPoints:10,quotes:[{options:DEFAULT_TRIPO_OPTIONS,costPoints:3}]};
  for(const source of ["image","text","multiview"] as const)
   expect(generationPrice(config,{...DEFAULT_TRIPO_OPTIONS,source,model:"v3.1-20260211",faceCount:50000})).toBe(10);
  expect(generationPrice({...config,flatCostPoints:-1},DEFAULT_TRIPO_OPTIONS)).toBeNull();
 });
 it("an invalid uniform price disables submissions instead of silently using the legacy price",()=>{
  Object.assign(process.env,{ANS_TRIPO_ACCEPTING_JOBS:"true",ANS_VISUAL_STORAGE_MODE:"local",ANS_VISUAL_WORKER_KEY:"w".repeat(32),ANS_VISUAL_SIGNING_SECRET:"s".repeat(32),ANS_TRIPO_PRICE_POINTS:"2",ANS_TRIPO_FLAT_PRICE_POINTS:"10"});
  const config=generationConfig();expect(config.available).toBe(true);expect(generationPrice(config,{...DEFAULT_TRIPO_OPTIONS,source:"multiview"})).toBe(10);
  process.env.ANS_TRIPO_FLAT_PRICE_POINTS="ten";expect(generationConfig().available).toBe(false);
 });

});
