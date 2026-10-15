// @vitest-environment node
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { beforeEach,describe,expect,it,vi } from "vitest";
import { DEFAULT_TRIPO_OPTIONS,createModelJobSchema } from "@/contracts/visual-generation";
import { modelRequestHashes } from "@/server/visual-portfolio/request-hash";
import { createModelJob } from "@/server/visual-portfolio/jobs";
const mocks=vi.hoisted(()=>({query:vi.fn(),write:vi.fn(),debit:vi.fn(),transaction:vi.fn(),user:vi.fn()}));
vi.mock("@/lib/db",()=>({db:{$queryRaw:mocks.query,$executeRaw:mocks.write,$transaction:mocks.transaction,user:{findFirst:mocks.user}}}));
vi.mock("@/server/quota/service",()=>({assertAccountCanSpend:vi.fn(),debitQuota:mocks.debit,refundQuota:vi.fn()}));
const digest=(value:string|Uint8Array)=>createHash("sha256").update(value).digest("hex");
const oldOptions={model:"P2-20260801",texture:true,textureResolution:"4K",pbr:true,faceCount:5000};
const oldHash=(bytes:Uint8Array)=>digest(JSON.stringify({image:digest(bytes),options:oldOptions,projectId:null,points:2}));
beforeEach(()=>{vi.clearAllMocks();Object.assign(process.env,{ANS_TRIPO_ACCEPTING_JOBS:"true",ANS_TRIPO_PRICE_POINTS:"2",ANS_TRIPO_PRICE_TABLE:"[]",ANS_VISUAL_STORAGE_MODE:"local",ANS_VISUAL_WORKER_KEY:"w".repeat(32),ANS_VISUAL_SIGNING_SECRET:"s".repeat(32)});mocks.user.mockResolvedValue({id:"owner"});mocks.transaction.mockImplementation(async callback=>callback({$queryRaw:mocks.query,$executeRaw:mocks.write,user:{findFirst:mocks.user}}));});
describe("legacy paid request recovery",()=>{
 it("matches the old hash only for old single-image semantics",()=>{
  const bytes=new Uint8Array([1,2,3]),options=createModelJobSchema.parse({idempotencyKey:"legacy_retry_key_123",acknowledged:true,acceptedPoints:2,options:oldOptions}).options;
  const hashes=modelRequestHashes(bytes,options,undefined,2);expect(hashes.legacy).toBe(oldHash(bytes));expect(hashes.current).not.toBe(hashes.legacy);
  for(const added of [{source:"text"},{source:"multiview"},{quad:true},{autoFix:true},{generateParts:true},{geometryQuality:"detailed"},{textureResolution:"8K"},{model:"v3.1-20260211"}])expect(modelRequestHashes(bytes,{...DEFAULT_TRIPO_OPTIONS,...added} as typeof DEFAULT_TRIPO_OPTIONS,undefined,2).legacy).toBeNull();
  expect(modelRequestHashes(new Uint8Array([3,2,1]),options,undefined,2).legacy).not.toBe(hashes.legacy);
  expect(modelRequestHashes(bytes,options,"another-project",2).legacy).not.toBe(hashes.legacy);
  expect(modelRequestHashes(bytes,options,undefined,3).legacy).not.toBe(hashes.legacy);
 });
 it("returns an old 4K reservation without a new quote, debit, upload or job",async()=>{
  const bytes=await readFile("public/visual-portfolio/reference/home/labelman.webp"),job={id:"old-job",ownerId:"owner",requestHash:oldHash(bytes),status:"QUEUED",stage:"queued",progress:0,costPoints:2,createdAt:new Date(),updatedAt:new Date(),options:oldOptions};
  mocks.query.mockImplementation(async(strings:TemplateStringsArray)=>strings.join("").includes("FROM visual_model_jobs")?[job]:[]);
  const result=await createModelJob("owner",{idempotencyKey:"legacy_retry_key_123",acknowledged:true,acceptedPoints:2,options:oldOptions},bytes);
  expect(result.id).toBe("old-job");expect(mocks.transaction).toHaveBeenCalledTimes(1);expect(mocks.write).not.toHaveBeenCalled();expect(mocks.debit).not.toHaveBeenCalled();
 });
 it("still rejects a changed legacy input using the original key",async()=>{
  const bytes=await readFile("public/visual-portfolio/reference/home/labelman.webp");mocks.query.mockImplementation(async(strings:TemplateStringsArray)=>strings.join("").includes("FROM visual_model_jobs")?[{requestHash:oldHash(bytes)}]:[]);
  await expect(createModelJob("owner",{idempotencyKey:"legacy_retry_key_123",acknowledged:true,acceptedPoints:2,options:{...oldOptions,faceCount:6000}},bytes)).rejects.toMatchObject({code:"IDEMPOTENCY_CONFLICT"});expect(mocks.write).not.toHaveBeenCalled();expect(mocks.debit).not.toHaveBeenCalled();
 });
 it("rejects a stale flat-price 8K request and FBX-only quad before reservation",async()=>{
  const bytes=await readFile("public/visual-portfolio/reference/home/labelman.webp");mocks.query.mockResolvedValue([]);
  await expect(createModelJob("owner",{idempotencyKey:"new_request_key_123",acknowledged:true,acceptedPoints:2,options:{...DEFAULT_TRIPO_OPTIONS,textureResolution:"8K"}},bytes)).rejects.toMatchObject({code:"PRICE_CHANGED"});
  mocks.transaction.mockClear();
  await expect(createModelJob("owner",{idempotencyKey:"new_request_key_123",acknowledged:true,acceptedPoints:2,options:{...DEFAULT_TRIPO_OPTIONS,quad:true}},bytes)).rejects.toMatchObject({code:"QUAD_DELIVERY_UNSUPPORTED"});expect(mocks.transaction).not.toHaveBeenCalled();expect(mocks.write).not.toHaveBeenCalled();expect(mocks.debit).not.toHaveBeenCalled();
 });
});
