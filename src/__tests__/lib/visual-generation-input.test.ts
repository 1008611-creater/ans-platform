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
  expect(tripoOptionsSchema.safeParse({...DEFAULT_TRIPO_OPTIONS,model:"v3.1-20260211",faceCount:2000000}).success).toBe(true);
  expect(tripoOptionsSchema.safeParse({...DEFAULT_TRIPO_OPTIONS,generateParts:true}).success).toBe(false);
  expect(tripoOptionsSchema.safeParse({...DEFAULT_TRIPO_OPTIONS,source:"text",autoFix:true}).success).toBe(false);
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
  expect(generationPrice(cfg,{...DEFAULT_TRIPO_OPTIONS,source:"text"})).toBeNull();expect(generationPrice(cfg,{...DEFAULT_TRIPO_OPTIONS,quad:true})).toBeNull();expect(generationPrice(cfg,{...DEFAULT_TRIPO_OPTIONS,model:"v3.1-20260211"})).toBeNull();
 });
 it("accepts exact configured quotes and fails closed for a malformed price table",()=>{
  Object.assign(process.env,{ANS_TRIPO_ACCEPTING_JOBS:"true",ANS_VISUAL_STORAGE_MODE:"local",ANS_VISUAL_WORKER_KEY:"w".repeat(32),ANS_VISUAL_SIGNING_SECRET:"s".repeat(32),ANS_TRIPO_PRICE_POINTS:"2"});
  const options={...DEFAULT_TRIPO_OPTIONS,source:"text" as const};process.env.ANS_TRIPO_PRICE_TABLE=JSON.stringify([{options,costPoints:3}]);
  const config=generationConfig();expect(config.available).toBe(true);expect(generationPrice(config,options)).toBe(3);
  process.env.ANS_TRIPO_PRICE_TABLE="invalid";expect(generationConfig().available).toBe(false);
 });
});
