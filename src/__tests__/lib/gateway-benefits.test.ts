// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { fixtureModelBillingPolicy } from "./model-billing-fixture";
const m=vi.hoisted(()=>({rows:[] as Array<Record<string,unknown>>,reserve:vi.fn(),complete:vi.fn(),debit:vi.fn(),refund:vi.fn(),charge:vi.fn(),evidence:vi.fn(),fetch:vi.fn(),enabled:true}));
vi.mock("@/lib/db",()=>{
  const tx={apiComputeRequest:{
    create:vi.fn(async ({data}:{data:Record<string,unknown>})=>{m.rows.push({...data,settledPoints:null});return {id:data.id};}),
    findFirst:vi.fn(async ({where}:{where:Record<string,unknown>})=>m.rows.find(r=>r.id===where.id && r.state===where.state)),
    findUnique:vi.fn(async ({where}:{where:{userId_provider_idempotencyKey:{idempotencyKey:string}}})=>m.rows.find(r=>r.idempotencyKey===where.userId_provider_idempotencyKey.idempotencyKey)??null),
    findMany:vi.fn(async ({where}:{where:Record<string,unknown>})=>where.state === "UNCERTAIN" ? m.rows.filter(r=>r.state==="UNCERTAIN" && r.outcome!==null) : m.rows),
    count:vi.fn(async()=>0),
    updateMany:vi.fn(async ({where,data}:{where:Record<string,unknown>;data:Record<string,unknown>})=>{if(!where.id)return {count:0};const r=m.rows.find(r=>r.id===where.id&&(!where.state||r.state===where.state));if(!r)return {count:0};Object.assign(r,data);return {count:1};}),
  },user:{findFirst:vi.fn(async()=>({id:"owner"}))}};
  return {db:{...tx,$transaction:async(fn:(tx:unknown)=>unknown)=>fn(tx)}};
});
vi.mock("@/server/compute-benefits/service",()=>({benefitsEnabled:()=>m.enabled,reserveBenefit:m.reserve,completeBenefit:m.complete}));
vi.mock("@/server/quota/service",()=>({debitQuota:m.debit,refundQuota:m.refund,QuotaError:class extends Error{code="INSUFFICIENT_QUOTA";status=402;}}));
vi.mock("@/server/integrations/gateway-evidence",()=>({lockGatewayBillingAccount:vi.fn(),recordGatewayEvidence:m.evidence,hasNonexecutionEvidence:vi.fn(async()=>false)}));
vi.mock("@/server/integrations/apic-billing",()=>({readApicCharge:m.charge}));
import { ComputeBenefitError } from "@/contracts/compute-benefits";
import { meteredResponses, reconcileCodexCharges, meteredGatewayRequest } from "@/server/integrations/codex-gateway";
const grantId="11111111-1111-4111-8111-111111111111";
function request(mode?:string) {return new Request("http://ans.internal/responses",{method:"POST",headers:{"Content-Type":"application/json","idempotency-key":"gift-request-1",...(mode?{"x-ans-funding":mode}:{})},body:JSON.stringify({model:"gpt-6-astra",input:"hello",max_output_tokens:8})});}
beforeEach(()=>{
  vi.resetAllMocks();m.rows=[];m.enabled=true;
  vi.stubEnv("ANS_MODEL_BILLING_POLICY",JSON.stringify(fixtureModelBillingPolicy(1)));
  vi.stubEnv("RUN_BASE_URL","https://apic.cauai.fun/v1");
  m.reserve.mockImplementation(async(_tx,input)=>({grantId,reservedUsdMicros:input.usdMicros.toString()}));
  m.fetch.mockImplementation(async()=>Response.json({output:[]},{headers:{"x-oneapi-request-id":"receipt123456"}}));
  m.charge.mockResolvedValue({quota:80000,requestId:"receipt123456"});vi.stubGlobal("fetch",m.fetch);
});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
it("gift success charges one official USD and never touches the paid wallet",async()=>{
  const response=await meteredResponses(request(),"owner");expect(response.status).toBe(200);
  expect(m.complete).toHaveBeenCalledWith(expect.anything(),expect.objectContaining({userId:"owner",actualUsdMicros:BigInt(1000000),state:"SETTLED"}));
  expect(m.debit).not.toHaveBeenCalled();expect(m.refund).not.toHaveBeenCalled();
  expect(m.rows[0].settledPoints).toBe(0);expect(m.evidence).toHaveBeenCalledWith(expect.anything(),"owner",expect.any(String),expect.objectContaining({billedPoints:0}));
});
it("rejection returns only the original gift hold",async()=>{
  m.fetch.mockResolvedValue(new Response("bad",{status:400}));expect((await meteredResponses(request(),"owner")).status).toBe(400);
  expect(m.complete).toHaveBeenCalledWith(expect.anything(),expect.objectContaining({state:"RELEASED",actualUsdMicros:BigInt(0)}));
  expect(m.debit).not.toHaveBeenCalled();expect(m.refund).not.toHaveBeenCalled();
});
it("ambiguous transport retains gift liability until recovery, even after flag off",async()=>{
  m.fetch.mockRejectedValue(new Error("network"));expect((await meteredResponses(request(),"owner")).status).toBe(502);
  expect(m.rows[0].state).toBe("UNCERTAIN");expect(m.complete).not.toHaveBeenCalled();
  m.rows[0].outcome="receipt123456";m.enabled=false;
  await reconcileCodexCharges("owner");expect(m.rows[0].state).toBe("SETTLED");expect(m.rows[0].settledPoints).toBe(0);
  expect(m.complete).toHaveBeenCalledWith(expect.anything(),expect.objectContaining({actualUsdMicros:BigInt(1000000),state:"SETTLED"}));expect(m.refund).not.toHaveBeenCalled();
});
it("paid mode explicitly bypasses the gift source",async()=>{
  expect((await meteredResponses(request("paid"),"owner")).status).toBe(200);expect(m.reserve).not.toHaveBeenCalled();expect(m.debit).toHaveBeenCalledOnce();expect(m.complete).not.toHaveBeenCalled();
});
it("auto without a matching gift preserves the paid path",async()=>{
  m.reserve.mockResolvedValue(null);expect((await meteredResponses(request(),"owner")).status).toBe(200);expect(m.debit).toHaveBeenCalledOnce();
});
it("explicit gift without entitlement cannot silently charge paid points",async()=>{
  m.reserve.mockResolvedValue(null);expect((await meteredResponses(request("gift"),"owner")).status).toBe(402);expect(m.debit).not.toHaveBeenCalled();expect(m.fetch).not.toHaveBeenCalled();
});
it("expired or insufficient matching gift cannot silently charge paid points",async()=>{
  m.reserve.mockRejectedValue(new ComputeBenefitError("BENEFIT_UNAVAILABLE",402));expect((await meteredResponses(request(),"owner")).status).toBe(402);expect(m.debit).not.toHaveBeenCalled();expect(m.fetch).not.toHaveBeenCalled();
});
it("rejects invalid funding and disabled gift before upstream or wallet",async()=>{
  expect((await meteredResponses(request("anything"),"owner")).status).toBe(400);m.enabled=false;
  expect((await meteredResponses(request("gift"),"owner")).status).toBe(503);expect(m.fetch).not.toHaveBeenCalled();expect(m.debit).not.toHaveBeenCalled();
});
it("prevents an idempotency key changing its funding source",async()=>{
  await meteredResponses(request(),"owner");const response=await meteredResponses(request("paid"),"owner");
  expect(response.status).toBe(409);expect(await response.json()).toMatchObject({error:{code:"REQUEST_FUNDING_CONFLICT"}});expect(m.fetch).toHaveBeenCalledOnce();
});
it("counts settled gifts conservatively toward adapter daily safety caps",async()=>{
  const billing=fixtureModelBillingPolicy(1); const payload={text:"{}",model:"claude-opus-5-5",limit:1,reserve:1,streaming:false,
    billing:{version:"usd-cny-points-v2" as const,configVersion:"test",modelId:"claude-opus-5-5" as const,pointsPerCny:10 as const,fx:billing.fx,...billing.models["claude-opus-5-5"]}};
  m.rows.push({state:"SETTLED",authorizedPoints:2,settledPoints:0,price:{benefitFunding:{version:"official-usd-gift-v1",grantId,reservedUsdMicros:"200000"}}});
  const adapter={parse:()=>payload,maxBodyBytes:10000,path:"messages" as const,policyVersion:"test",priceSnapshot:{protocol:"anthropic-messages" as const,policy:{},billing:payload.billing},maxConcurrent:1 as const,rollingDayMaxPoints:2,timeoutMs:5000};
  const response=await meteredGatewayRequest(request(),"owner",undefined,{memberPointsCap:1},adapter);
  expect(response.status).toBe(429);expect(m.fetch).not.toHaveBeenCalled();
});
