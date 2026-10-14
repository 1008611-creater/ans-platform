// @vitest-environment node
import { readFile } from "node:fs/promises";
import { afterEach,describe,expect,it } from "vitest";
import { validateGeneratedModel,readLimitedBody,validateInputImage } from "@/server/visual-portfolio/media";
import { canAdvanceStage,safeToRetry,canRefund } from "@/domain/projects/model-job";
import { signAsset,verifyAssetToken } from "@/server/visual-portfolio/storage";
import { generationConfig,assertWorker } from "@/server/visual-portfolio/jobs";
import { visualTourSchema } from "@/contracts/visual-website";
import { createVisualTour } from "@/lib/projects/visual-tour";
import { RESUME_WEBSITE_EXAMPLE } from "@/domain/projects/resume-website";
import { renderVisualWebsite } from "@/lib/projects/visual-website";
const original={...process.env};afterEach(()=>{process.env={...original};});
describe("3D generation boundaries",()=>{
 it("identifies generated account models correctly in exported pages",()=>{const tour=createVisualTour(RESUME_WEBSITE_EXAMPLE);tour.modelAsset={id:"12345678-1234-4234-8234-123456789abc",sha256:"a".repeat(64),size:10};const html=renderVisualWebsite(RESUME_WEBSITE_EXAMPLE,{avatar:"reference",palette:"lime",background:"dark",motion:true,stops:[{angle:0,zoom:1},{angle:0,zoom:1},{angle:0,zoom:1},{angle:0,zoom:1}],tour});expect(html).toContain("<footer>Made with ANS · 自有模型</footer>");});
 it("only advances one stage and never retries across submission",()=>{expect(canAdvanceStage("upload","persist")).toBe(false);expect(canAdvanceStage("upload","submit")).toBe(true);expect(safeToRetry("submit",null)).toBe(false);expect(canRefund("wait","task")).toBe(false);});
 it("checks configured secret length before enabling paid requests",()=>{Object.assign(process.env,{ANS_TRIPO_ACCEPTING_JOBS:"true",ANS_VISUAL_STORAGE_MODE:"local",ANS_TRIPO_PRICE_POINTS:"1",ANS_VISUAL_WORKER_KEY:"short",ANS_VISUAL_SIGNING_SECRET:"short"});expect(generationConfig().available).toBe(false);});
 it("rejects unauthenticated workers",()=>{process.env.ANS_VISUAL_WORKER_KEY="w".repeat(32);expect(()=>assertWorker(new Request("http://localhost"))).toThrow("UNAUTHORIZED");});
 it("signed access is bound to an asset and expires",()=>{process.env.ANS_VISUAL_SIGNING_SECRET="s".repeat(32);const token=signAsset("asset","owner");expect(verifyAssetToken(token,"asset")?.ownerId).toBe("owner");expect(verifyAssetToken(token,"other")).toBeNull();expect(verifyAssetToken(signAsset("asset","owner",Date.now()-1),"asset")).toBeNull();expect(verifyAssetToken(token+"x","asset")).toBeNull();});
 it("rejects oversized streaming uploads without trusting Content-Length",async()=>{const response=new Response(new ReadableStream({start(controller){controller.enqueue(new Uint8Array(6));controller.enqueue(new Uint8Array(6));controller.close();}}));await expect(readLimitedBody(response,10)).rejects.toThrow("REQUEST_TOO_LARGE");});
 it("validates an actual self-contained reference GLB",async()=>{const bytes=await readFile("public/visual-portfolio/reference/banner.glb");expect(validateGeneratedModel(bytes).size).toBe(bytes.length);const invalid=Buffer.from(bytes);invalid.writeUInt32LE(1,8);expect(()=>validateGeneratedModel(invalid)).toThrow("INVALID_MODEL");});
 it("does not accept image bytes as a 3D result",()=>{expect(()=>validateGeneratedModel(new Uint8Array(60))).toThrow("INVALID_MODEL");});
 it("detects input image type instead of trusting its filename",async()=>{const bytes=await readFile("public/visual-portfolio/reference/home/labelman.webp");expect((await validateInputImage(bytes)).mime).toBe("image/webp");await expect(validateInputImage(new Uint8Array(20))).rejects.toThrow("INVALID_IMAGE");});
 it("disallows two competing model sources in one tour",()=>{const tour=createVisualTour(RESUME_WEBSITE_EXAMPLE);tour.modelAsset={id:"12345678-1234-4234-8234-123456789abc",sha256:"a".repeat(64),size:10};expect(visualTourSchema.safeParse(tour).success).toBe(true);expect(visualTourSchema.safeParse({...tour,model:"data:model/gltf-binary;base64,AA=="}).success).toBe(false);});
});
