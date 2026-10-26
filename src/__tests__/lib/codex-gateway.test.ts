import { fixtureModelBillingPolicy } from "./model-billing-fixture";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { executeWorkflow } from "@/domain/workflows/executor";
import { QuotaError } from "@/server/quota/service";
const mocks=vi.hoisted(()=>({user:vi.fn(),create:vi.fn(),update:vi.fn(),find:vi.fn(),unique:vi.fn(),count:vi.fn(),transaction:vi.fn(),parentCost:vi.fn(),current:vi.fn(),evidence:vi.fn(),rejectedEvidence:vi.fn(),debit:vi.fn(),refund:vi.fn(),charge:vi.fn(),fetch:vi.fn()}));
vi.mock("@/lib/db",()=>{const tx={$queryRaw:vi.fn(),apiComputeRequest:{create:mocks.create,updateMany:mocks.update,findMany:mocks.find,findUnique:mocks.unique,findFirst:mocks.current,count:mocks.count},user:{findFirst:mocks.user},run:{updateMany:mocks.parentCost},workflowRun:{updateMany:mocks.parentCost}};return {db:{...tx,$transaction:(fn:(tx:unknown)=>unknown)=>mocks.transaction(fn,tx)}};});
vi.mock("@/server/quota/service",()=>({debitQuota:mocks.debit,refundQuota:mocks.refund,QuotaError:class extends Error{status=402;code="INSUFFICIENT_QUOTA";}}));
vi.mock("@/server/integrations/apic-billing",()=>({readApicCharge:mocks.charge}));
vi.mock("@/server/integrations/gateway-evidence",()=>({lockGatewayBillingAccount:vi.fn(),recordGatewayEvidence:mocks.evidence,hasNonexecutionEvidence:mocks.rejectedEvidence}));
import {codexResponses,codexModels,validateCodexPayload,meteredResponses,reconcileFailureCode} from "@/server/integrations/codex-gateway";
import { upstreamFailureCode } from "@/server/integrations/upstream-rejection";
const key="pchat_"+"a".repeat(64);
function request(body:unknown,token=key){return new Request("https://ans.invalid/api/codex/v1/responses",{method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify(body)});}
beforeEach(()=>{vi.stubEnv("ANS_MODEL_BILLING_POLICY", JSON.stringify(fixtureModelBillingPolicy()));vi.resetAllMocks();mocks.transaction.mockImplementation((fn,tx)=>fn(tx));mocks.unique.mockResolvedValue(null);mocks.count.mockResolvedValue(0);process.env.ANS_CODEX_GATEWAY_ENABLED="1";process.env.RUN_BASE_URL="https://apic.cauai.fun/v1";process.env.RUN_API_KEY="private-test-only";mocks.user.mockResolvedValue({id:"u"});mocks.find.mockResolvedValue([]);mocks.create.mockImplementation(({data})=>{mocks.current.mockResolvedValue({...data,id:"task"});return Promise.resolve({id:"task"});});mocks.rejectedEvidence.mockImplementation((_tx,_owner,id)=>Promise.resolve(mocks.evidence.mock.calls.find(call=>call[2]===id)?.[3].kind===undefined ? null : mocks.evidence.mock.calls.some(call=>call[2]===id && call[3].kind==="REJECTED")));mocks.update.mockResolvedValue({count:1});mocks.charge.mockResolvedValue({points:0.001,requestId:"request123456",quota:500});vi.stubGlobal("fetch",mocks.fetch);});
describe("Codex sole-ledger gateway",()=>{
 it("rejects unknown model, server state, and oversized output",()=>{for(const b of [{model:"unknown"},{model:"gpt-6.1-sol",previous_response_id:"another-user"},{model:"gpt-6.1-sol",background:true},{model:"gpt-6.1-sol",max_output_tokens:16385}])expect(()=>validateCodexPayload(b)).toThrow();});
 it("forces storage off, preserves tool schemas, and reserves above actual minimum",()=>{const result=validateCodexPayload({model:"gpt-6.1-sol",input:"hello",store:true,tools:[{type:"function",name:"test",parameters:{}}]});expect(JSON.parse(result.text).store).toBe(false);expect(JSON.parse(result.text).tools[0].name).toBe("test");expect(result.reserve).toBeGreaterThan(0.001);});
 it("rejects invalid and revoked keys without upstream call",async()=>{expect((await codexModels(request({},"bad"))).status).toBe(401);mocks.user.mockResolvedValue(null);expect((await codexResponses(request({model:"gpt-6.1-sol"}))).status).toBe(401);expect(mocks.fetch).not.toHaveBeenCalled();});
 it("reserves then settles the authoritative quota once",async()=>{mocks.fetch.mockResolvedValue(new Response('{"output":[]}',{headers:{"x-oneapi-request-id":"request123456"}}));const response=await codexResponses(request({model:"gpt-6.1-sol",input:"hello"}));expect(response.status).toBe(200);expect(mocks.debit).toHaveBeenCalledTimes(1);expect(mocks.refund).toHaveBeenCalledTimes(1);expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({state:"SETTLED",settledPoints:0.001})}));});
 it("records supplier excess while keeping user debit inside original authorization",async()=>{mocks.charge.mockResolvedValue({points:2,requestId:"request123456",quota:1000000});mocks.fetch.mockResolvedValue(new Response('{"output":[]}',{headers:{"x-oneapi-request-id":"request123456"}}));const response=await codexResponses(request({model:"gpt-6.1-sol",input:"hello"}));expect(response.status).toBe(200);expect(mocks.debit).toHaveBeenCalledTimes(1);expect(mocks.refund).not.toHaveBeenCalled();expect(mocks.evidence).toHaveBeenCalledWith(expect.anything(),"u","task",expect.objectContaining({kind:"VERIFIED",charge:expect.objectContaining({points:2}),billedPoints:validateCodexPayload({model:"gpt-6.1-sol",input:"hello"}).reserve}));});
 it("does not turn ambiguous upstream failure into free credit",async()=>{mocks.fetch.mockRejectedValue(new Error("timeout"));const response=await codexResponses(request({model:"gpt-6.1-sol"}));expect(response.status).toBe(502);expect(mocks.refund).not.toHaveBeenCalled();expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({state:"UNCERTAIN"})}));});
 it.each(["system_cpu_overloaded", "system_memory_overloaded", "system_disk_overloaded"])("explains %s without claiming zero cost or allowing an automatic retry", async code => {
  mocks.fetch.mockResolvedValue(Response.json({ error: { code, message: "supplier-private-diagnostic" } }, { status: 503, headers: { "x-oneapi-request-id": "request123456" } }));
  const response = await codexResponses(request({ model: "deepseek-v4.1-flash" }));
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ error: { code: "UPSTREAM_CAPACITY_UNAVAILABLE", message: "UPSTREAM_CAPACITY_UNAVAILABLE", type: "ans_gateway_error" } });
  expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ state: "UNCERTAIN", settledPoints: null, outcome: "request123456" }) }));
  expect(mocks.debit).toHaveBeenCalledTimes(1);
  expect(mocks.refund).not.toHaveBeenCalled();
  expect(mocks.charge).not.toHaveBeenCalled();
  expect(mocks.evidence).not.toHaveBeenCalled();
  expect(mocks.fetch).toHaveBeenCalledTimes(1);
 });
 it.each([
  [503, '{"error":{"code":"other_provider_error"}}'],
  [503, '{"error":{"code":"system_disk_overloaded-extra"}}'],
  [503, '{"error":[] }'],
  [503, '{'],
  [500, '{"error":{"code":"system_disk_overloaded"}}'],
 ])("does not classify status %s and unknown or malformed errors as capacity failures", async (status, body) => {
  expect(await upstreamFailureCode(new Response(body, { status }))).toBe("UPSTREAM_REJECTED");
 });
 it("bounds diagnostic reads and cancels an oversized body", async () => {
  const cancel = vi.fn();
  const body = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new Uint8Array(8193)); }, cancel });
  expect(await upstreamFailureCode(new Response(body, { status: 503 }))).toBe("UPSTREAM_REJECTED");
  expect(cancel).toHaveBeenCalledTimes(1);
 });
 it("fails closed on locked, broken, or invalid UTF-8 diagnostic bodies", async () => {
  const locked = Response.json({ error: { code: "system_disk_overloaded" } }, { status: 503 });
  const reader = locked.body!.getReader();
  expect(await upstreamFailureCode(locked)).toBe("UPSTREAM_REJECTED");
  reader.releaseLock();
  const broken = new ReadableStream<Uint8Array>({ start(controller) { controller.error(new Error("isolated-read-error")); } });
  expect(await upstreamFailureCode(new Response(broken, { status: 503 }))).toBe("UPSTREAM_REJECTED");
  expect(await upstreamFailureCode(new Response(new Uint8Array([255]), { status: 503 }))).toBe("UPSTREAM_REJECTED");
 });
 it("returns streamed tool events unchanged and settles",async()=>{const text='event: response.output_item.added\ndata: {"type":"function_call","name":"test"}\n\n';mocks.fetch.mockResolvedValue(new Response(text,{headers:{"x-oneapi-request-id":"request123456"}}));const response=await codexResponses(request({model:"gpt-6.1-sol",stream:true}));expect(await response.text()).toBe(text);expect(mocks.refund).toHaveBeenCalledTimes(1);});
 it("releases reservation for explicit upstream validation rejection",async()=>{mocks.fetch.mockResolvedValue(new Response("bad",{status:400}));expect((await codexResponses(request({model:"gpt-6.1-sol"}))).status).toBe(400);expect(mocks.refund).toHaveBeenCalledTimes(1);});
});


type AttemptRow = {
  id: string;
  userId: string;
  provider: string;
  idempotencyKey: string;
  requestHash: string;
  state: "AUTHORIZED" | "RUNNING" | "UNCERTAIN" | "SETTLED" | "RELEASED";
  authorizedPoints: number;
  settledPoints: number | null;
  finishedAt: Date | null;
  outcome?: string | null;
  price: Record<string, unknown>;
};
function keyedRequest(body: unknown, idempotencyKey = "workflow:run-1:node-1") {
  const req = request(body);
  req.headers.set("Idempotency-Key", idempotencyKey);
  return req;
}

/** Stateful transaction fake exercises real gateway transitions and durable attempts. */
describe("durable model retries after verified non-execution", () => {
  let rows: AttemptRow[];
  let balance: number;
  let ledger: { amount: number; refId: string }[];
  beforeEach(() => {
    rows = [];
    balance = 10;
    ledger = [];
    let transactionTail = Promise.resolve();
    // Model the PostgreSQL user-row lock: competing reservations inspect the
    // committed RUNNING attempt before they may create another one.
    mocks.transaction.mockImplementation((fn, tx) => {
      const result = transactionTail.then(async () => {
        const previousRows = structuredClone(rows);
        const previousBalance = balance;
        const previousLedger = structuredClone(ledger);
        try { return await fn(tx); }
        catch (error) {
          rows = previousRows;
          balance = previousBalance;
          ledger = previousLedger;
          throw error;
        }
      });
      transactionTail = result.then(() => undefined, () => undefined);
      return result;
    });
    mocks.unique.mockImplementation(({ where }: { where: { userId_provider_idempotencyKey: { userId: string; provider: string; idempotencyKey: string } } }) => {
      const match = where.userId_provider_idempotencyKey;
      const row = rows.find(row => row.userId === match.userId && row.provider === match.provider && row.idempotencyKey === match.idempotencyKey);
      return Promise.resolve(row ? structuredClone(row) : null);
    });
    mocks.current.mockImplementation(({where}:{where:{id:string;userId:string;state:string}})=>Promise.resolve(structuredClone(rows.find(row=>row.id===where.id && row.userId===where.userId && row.state===where.state)??null)));
    mocks.count.mockImplementation(() => Promise.resolve(rows.filter(row => ["RUNNING", "UNCERTAIN"].includes(row.state)).length));
    mocks.create.mockImplementation(({ data }: { data: Omit<AttemptRow, "id" | "settledPoints" | "finishedAt"> }) => {
      if (rows.some(row => row.userId === data.userId && row.provider === data.provider && row.idempotencyKey === data.idempotencyKey)) throw new Error("P2002");
      const row: AttemptRow = { ...data, id: `attempt-${rows.length + 1}`, settledPoints: null, finishedAt: null };
      rows.push(row);
      return Promise.resolve({ id: row.id });
    });
    mocks.update.mockImplementation(({ where, data }: { where: { id?: string; state?: AttemptRow["state"] }; data: Partial<AttemptRow> }) => {
      const row = rows.find(row => row.id === where.id && (!where.state || row.state === where.state));
      if (!row) return Promise.resolve({ count: 0 });
      Object.assign(row, data);
      return Promise.resolve({ count: 1 });
    });
    mocks.debit.mockImplementation((_tx, args: { costPoints: number; ref: { id: string } }) => {
      balance -= args.costPoints;
      ledger.push({ amount: -args.costPoints, refId: args.ref.id });
    });
    mocks.refund.mockImplementation((_tx, args: { costPoints: number; ref: { id: string } }) => {
      balance += args.costPoints;
      ledger.push({ amount: args.costPoints, refId: args.ref.id });
    });
  });
  const body = { model: "gpt-6.1-sol", input: "same workflow prompt" };
  const ok = () => new Response('{"output":[]}', { headers: { "x-oneapi-request-id": "request123456" } });

  it("429 then success preserves the refunded attempt and charges only actual usage", async () => {
    mocks.fetch.mockResolvedValueOnce(new Response("rate limited", { status: 429 })).mockResolvedValueOnce(ok());
    expect((await codexResponses(keyedRequest(body))).status).toBe(429);
    const released = structuredClone(rows[0]);
    expect(balance).toBe(10);
    expect((await codexResponses(keyedRequest(body))).status).toBe(200);
    expect(rows[0]).toEqual(released);
    expect(rows.map(row => row.state)).toEqual(["RELEASED", "SETTLED"]);
    expect(rows[1].price.retry).toEqual({ rootRequestId: "attempt-1", previousRequestId: "attempt-1" });
    expect(mocks.debit.mock.calls.map(call => call[1].ref.id)).toEqual(["attempt-1", "attempt-2"]);
    expect(ledger.filter(entry => entry.refId === "attempt-1").reduce((sum, entry) => sum + entry.amount, 0)).toBe(0);
    expect(balance).toBeCloseTo(10 - 0.001, 8);
    const settled = structuredClone(rows);
    expect((await codexResponses(keyedRequest(body))).status).toBe(409);
    expect(rows).toEqual(settled);
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });

  it("follows multiple released attempts without overwriting their audit history", async () => {
    mocks.fetch.mockResolvedValueOnce(new Response("rate limited", { status: 429 }))
      .mockResolvedValueOnce(new Response("rate limited", { status: 429 })).mockResolvedValueOnce(ok());
    expect((await codexResponses(keyedRequest(body))).status).toBe(429);
    expect((await codexResponses(keyedRequest(body))).status).toBe(429);
    const released = structuredClone(rows);
    expect((await codexResponses(keyedRequest(body))).status).toBe(200);
    expect(rows.slice(0, 2)).toEqual(released);
    expect(rows[2].price.retry).toEqual({ rootRequestId: "attempt-1", previousRequestId: "attempt-2" });
    expect(new Set(rows.map(row => row.idempotencyKey)).size).toBe(3);
    expect(balance).toBeCloseTo(10 - 0.001, 8);
  });

  it("keeps all attempts on the original workflow and refreshes only actual parent cost", async () => {
    const parent = { type: "workflow_run" as const, id: "run-1" };
    mocks.find.mockImplementation(() => Promise.resolve(rows.map(row => ({
      state: row.state, authorizedPoints: row.authorizedPoints, settledPoints: row.settledPoints,
    }))));
    mocks.fetch.mockResolvedValueOnce(new Response("rate limited", { status: 429 })).mockResolvedValueOnce(ok());
    expect((await meteredResponses(keyedRequest(body), "u", parent)).status).toBe(429);
    expect((await meteredResponses(keyedRequest(body), "u", parent)).status).toBe(200);
    expect(rows.map(row => row.price.parent)).toEqual([parent, parent]);
    expect(mocks.parentCost).toHaveBeenLastCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: "run-1", userId: "u" }), data: { costPoints: 0.001 },
    }));
    expect(balance).toBeCloseTo(10 - 0.001, 8);
  });

  it("rejects a changed payload on a released key without debiting or calling upstream", async () => {
    mocks.fetch.mockResolvedValue(new Response("rate limited", { status: 429 }));
    await codexResponses(keyedRequest(body));
    const response = await codexResponses(keyedRequest({ ...body, input: "different prompt" }));
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("REQUEST_HASH_CONFLICT");
    expect(rows).toHaveLength(1);
    expect(mocks.debit).toHaveBeenCalledTimes(1);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });

  it("rejects rebinding a released key to a different parent", async () => {
    mocks.fetch.mockResolvedValue(new Response("rate limited", { status: 429 }));
    await codexResponses(keyedRequest(body));
    rows[0].price.parent = { type: "workflow_run", id: "original-run" };
    const response = await codexResponses(keyedRequest(body));
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("REQUEST_PARENT_CONFLICT");
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(rows).toHaveLength(1);
  });

  it.each(["AUTHORIZED", "RUNNING", "UNCERTAIN", "SETTLED"] as const)("never replays a %s attempt", async state => {
    mocks.fetch.mockResolvedValue(new Response("rate limited", { status: 429 }));
    await codexResponses(keyedRequest(body));
    rows[0].state = state;
    const previous = structuredClone(rows);
    expect((await codexResponses(keyedRequest(body))).status).toBe(409);
    expect(rows).toEqual(previous);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(mocks.debit).toHaveBeenCalledTimes(1);
  });

  it.each([null, 0.1])("does not retry RELEASED with missing or nonzero settlement (%s)", async points => {
    mocks.fetch.mockResolvedValue(new Response("rate limited", { status: 429 }));
    await codexResponses(keyedRequest(body));
    rows[0].settledPoints = points;
    expect((await codexResponses(keyedRequest(body))).status).toBe(409);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });

  it("does not replay a retry whose upstream outcome became uncertain", async () => {
    mocks.fetch.mockResolvedValueOnce(new Response("rate limited", { status: 429 })).mockRejectedValueOnce(new Error("timeout"));
    await codexResponses(keyedRequest(body));
    expect((await codexResponses(keyedRequest(body))).status).toBe(502);
    const uncertain = structuredClone(rows);
    expect((await codexResponses(keyedRequest(body))).status).toBe(409);
    expect(rows).toEqual(uncertain);
    expect(rows.map(row => row.state)).toEqual(["RELEASED", "UNCERTAIN"]);
    expect(balance).toBeCloseTo(10 - rows[1].authorizedPoints, 8);
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });

  it("serializes competing retries into one new reservation and one upstream request", async () => {
    mocks.fetch.mockResolvedValueOnce(new Response("rate limited", { status: 429 }));
    await codexResponses(keyedRequest(body));
    let upstreamResolve: (response: Response) => void = () => { throw new Error("upstream not called"); };
    let startedResolve: () => void = () => {};
    const started = new Promise<void>(resolve => { startedResolve = resolve; });
    mocks.fetch.mockImplementation(() => new Promise<Response>(resolve => { upstreamResolve = resolve; startedResolve(); }));
    const first = codexResponses(keyedRequest(body));
    await started;
    expect((await codexResponses(keyedRequest(body))).status).toBe(409);
    expect(rows.map(row => row.state)).toEqual(["RELEASED", "RUNNING"]);
    upstreamResolve(ok());
    expect((await first).status).toBe(200);
    expect(mocks.debit).toHaveBeenCalledTimes(2);
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
    expect(balance).toBeCloseTo(10 - 0.001, 8);
  });

  it("executes a workflow node retry using its unchanged idempotency key", async () => {
    mocks.fetch.mockResolvedValueOnce(new Response("rate limited", { status: 429 })).mockResolvedValueOnce(ok());
    const result = await executeWorkflow({
      version: 1,
      nodes: [{ id: "node-1", type: "model", label: "model", config: {}, timeoutMs: 1000, maxRetries: 1 }],
      edges: [],
    }, null, { handlers: { model: async ({ node }) => {
      const response = await codexResponses(keyedRequest(body, `workflow:run-1:${node.id}`));
      if (!response.ok) throw new Error(`UPSTREAM_${response.status}`);
      return "draft";
    } } });
    expect(result.status).toBe("succeeded");
    expect(result.output).toBe("draft");
    expect(result.executions[0].attempts).toBe(2);
    expect(rows.map(row => row.state)).toEqual(["RELEASED", "SETTLED"]);
    expect(balance).toBeCloseTo(10 - 0.001, 8);
  });

  it("rolls back a retry reservation if the account cannot afford it", async () => {
    mocks.fetch.mockResolvedValueOnce(new Response("rate limited", { status: 429 }));
    await codexResponses(keyedRequest(body));
    const released = structuredClone(rows);
    const oldLedger = structuredClone(ledger);
    mocks.debit.mockRejectedValueOnce(new QuotaError("insufficient"));
    expect((await codexResponses(keyedRequest(body))).status).toBe(402);
    expect(rows).toEqual(released);
    expect(ledger).toEqual(oldLedger);
    expect(balance).toBe(10);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });

  it("requires a completed RELEASED transition before retrying", async () => {
    mocks.fetch.mockResolvedValue(new Response("rate limited", { status: 429 }));
    await codexResponses(keyedRequest(body));
    rows[0].finishedAt = null;
    expect((await codexResponses(keyedRequest(body))).status).toBe(409);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });

  it("permits a legacy rejection outcome without rewriting the old record", async () => {
    mocks.fetch.mockResolvedValueOnce(new Response("rate limited", { status: 429 })).mockResolvedValueOnce(ok());
    await codexResponses(keyedRequest(body));
    delete rows[0].price.rejectedUpstreamStatus;
    expect(rows[0].outcome).toBe("RELEASED");
    const legacy = structuredClone(rows[0]);
    expect((await codexResponses(keyedRequest(body))).status).toBe(200);
    expect(rows[0]).toEqual(legacy);
  });

  it("records safe rejection evidence when upstream supplies a receipt id", async () => {
    mocks.fetch.mockResolvedValueOnce(new Response("rate limited", { status: 429, headers: { "x-oneapi-request-id": "rejected123456" } })).mockResolvedValueOnce(ok());
    await codexResponses(keyedRequest(body));
    expect(rows[0].price.rejectedUpstreamStatus).toBeUndefined();
    expect(mocks.evidence).toHaveBeenCalledWith(expect.anything(),"u","attempt-1",expect.objectContaining({kind:"REJECTED",status:429,upstreamRequestId:"rejected123456"}));
    expect(rows[0].outcome).toBe("rejected123456");
    expect((await codexResponses(keyedRequest(body))).status).toBe(200);
    expect(rows[0].outcome).toBe("rejected123456");
  });

  it.each([null, "UNCERTAIN", "unknown123456"])("does not replay an operator waiver with outcome %s", async outcome => {
    mocks.fetch.mockRejectedValueOnce(new Error("timeout"));
    await codexResponses(keyedRequest(body));
    // The actual operator service changes state/settlement and refunds, but
    // preserves outcome and records upstreamCostUnknown=true in its audit.
    rows[0].state = "RELEASED";
    rows[0].settledPoints = 0;
    rows[0].finishedAt = new Date();
    rows[0].outcome = outcome;
    const waived = structuredClone(rows);
    expect((await codexResponses(keyedRequest(body))).status).toBe(409);
    expect(rows).toEqual(waived);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(mocks.debit).toHaveBeenCalledTimes(1);
  });

  it("does not let external callers address the reserved internal attempt namespace", async () => {
    expect((await codexResponses(keyedRequest(body, "ans-internal-retry:fake"))).status).toBe(400);
    expect(rows).toHaveLength(0);
    expect(mocks.debit).not.toHaveBeenCalled();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});


describe("optional companion member budget cap", () => {
  it("preserves full supplier cost while capping the member debit", async () => {
    const body = { model: "deepseek-v4.1-flash", input: "hello", max_output_tokens: 900 };
    const cap = validateCodexPayload(body).reserve;
    mocks.charge.mockResolvedValue({ points: 2, requestId: "request123456", quota: 1000000 });
    mocks.fetch.mockResolvedValue(new Response('{"output":[]}', { headers: { "x-oneapi-request-id": "request123456" } }));
    const response = await meteredResponses(request(body), "u", undefined, { memberPointsCap: cap });
    expect(response.status).toBe(200); expect(mocks.debit).toHaveBeenCalledTimes(1);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ state: "SETTLED", settledPoints: cap }) }));
    expect(mocks.update.mock.calls.every(call=>call[0].data.price===undefined)).toBe(true);
    expect(mocks.evidence).toHaveBeenCalledWith(expect.anything(),"u","task",expect.objectContaining({kind:"VERIFIED",charge:expect.objectContaining({points:2}),billedPoints:cap}));
  });
  it("rejects an inadequate cap before any upstream call or debit", async () => {
    const response = await meteredResponses(request({ model: "deepseek-v4.1-flash", input: "hello" }), "u", undefined, { memberPointsCap: 0.000001 });
    expect(response.status).toBe(400); expect(mocks.fetch).not.toHaveBeenCalled(); expect(mocks.debit).not.toHaveBeenCalled();
  });
  it("keeps the same cap when an uncertain receipt is reconciled later", async () => {
    const { reconcileCodexCharges } = await import("@/server/integrations/codex-gateway");
    mocks.find.mockResolvedValue([{ id: "pending", outcome: "request123456", authorizedPoints: 0.01, price: { source: "APIC", memberPointsCap: 0.01 } }]);
    mocks.current.mockResolvedValue({id:"pending",userId:"u",provider:"apic-codex",authorizedPoints:.01,state:"UNCERTAIN",price:{source:"APIC",memberPointsCap:.01}});
    mocks.charge.mockResolvedValue({ points: 2, requestId: "request123456", quota: 1000000 });
    await reconcileCodexCharges("u");
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "pending", userId:"u", state: "UNCERTAIN" }, data: expect.objectContaining({ settledPoints: 0.01 }) }));
    expect(mocks.debit).not.toHaveBeenCalled();
  });
});


/** Native Messages uses the same real reservation/settlement engine. All prices,
 * keys and upstream replies below are isolated fixtures, never a paid request. */
describe("guarded native Claude metering", () => {
  const fixture = () => ({
    version: "claude-isolated-policy-v1", modelId: "claude-opus-5-5",
    reserveRatesUsdPerMillion: { input: 3, output: 17, cacheWrite5m: 4, cacheWrite1h: 6, cacheRead: 0.1 },
    consumptionMultiplier: 1, verifiedSource: "https://fixture.invalid/pricing", verifiedAt: "2026-10-15T00:00:00Z",
    maxBodyBytes: 262144, maxOutputTokens: 8192, inputOverheadTokens: 1024,
    requestMaxPoints: 1, rollingDayMaxPoints: 2, maxConcurrent: 1, timeoutMs: 300000,
  });
  const claudeBody = (stream = false) => ({ model: "claude-opus-5-5", max_tokens: 2048, messages: [{ role: "user", content: "hello" }], stream });
  function claudeRequest(body: unknown = claudeBody(), headers: Record<string, string> = {}) {
    return new Request("https://ans.invalid/api/claude/v1/messages", { method: "POST", headers: {
      "x-api-key": key, "Content-Type": "application/json", "x-ans-max-points": "1", "Idempotency-Key": "claude-job-1:message-1", ...headers,
    }, body: JSON.stringify(body) });
  }
  beforeEach(() => {
    vi.stubEnv("ANS_CLAUDE_GATEWAY_ENABLED", "1"); vi.stubEnv("ANS_CLAUDE_POLICY", JSON.stringify(fixture()));
    vi.stubEnv("ANS_APIC_BILLING_ENABLED", "1"); vi.stubEnv("ANS_CLAUDE_UPSTREAM_VERIFIED", "1"); vi.stubEnv("ANS_CLAUDE_BILLING_VERIFIED", "1");
    vi.stubEnv("APIC_COST_BRIDGE_URL", "https://fixture.invalid/cost"); vi.stubEnv("APIC_COST_BRIDGE_SECRET", "isolated-bridge-fixture");
  });
  afterEach(() => { vi.unstubAllEnvs(); });

  it("is closed before authentication or spending until every readiness gate is set", async () => {
    const { claudeMessages } = await import("@/server/integrations/claude-gateway");
    for (const field of ["ANS_CLAUDE_GATEWAY_ENABLED", "ANS_CLAUDE_UPSTREAM_VERIFIED", "ANS_CLAUDE_BILLING_VERIFIED", "ANS_APIC_BILLING_ENABLED"]) {
      vi.stubEnv(field, "0");
      expect((await claudeMessages(claudeRequest())).status).toBe(503);
      vi.stubEnv(field, "1");
    }
    expect(mocks.debit).not.toHaveBeenCalled(); expect(mocks.fetch).not.toHaveBeenCalled(); expect(mocks.user).not.toHaveBeenCalled();
  });
  it("rejects cleartext infrastructure before authentication or spending", async () => {
    const { claudeMessages } = await import("@/server/integrations/claude-gateway");
    vi.stubEnv("RUN_BASE_URL", "http://apic.cauai.fun:3000/v1");
    expect((await claudeMessages(claudeRequest())).status).toBe(503);
    expect(mocks.user).not.toHaveBeenCalled(); expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it.each<Record<string, string>>([
    { "x-ans-max-points": "" }, { "x-ans-max-points": "0" }, { "x-ans-max-points": "2" },
    { "x-ans-max-points": "1e-3" }, { "idempotency-key": "" }, { "idempotency-key": "ans-internal-retry:private" },
    { "anthropic-beta": "unknown-paid-feature" },
  ])("requires explicit spend and retry authorization before provider contact %j", async headers => {
    const { claudeMessages } = await import("@/server/integrations/claude-gateway");
    expect((await claudeMessages(claudeRequest(claudeBody(), headers))).status).toBe(400);
    expect(mocks.debit).not.toHaveBeenCalled(); expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("derives a stable Claude Code message key for automatic retry deduplication", async () => {
    const { claudeMessages } = await import("@/server/integrations/claude-gateway");
    const req = claudeRequest(); req.headers.delete("idempotency-key");
    req.headers.set("x-claude-code-session-id", "c727db46-3473-4f30-8d1f-b2185cb95b3c");
    req.headers.set("x-claude-code-prompt-id", "d180765a-969e-43e9-881b-4814b2536734");
    mocks.fetch.mockResolvedValue(Response.json({ type: "message", content: [{ type: "text", text: "fixture answer" }] }, { headers: { "x-oneapi-request-id": "request123456" } }));
    const result = await claudeMessages(req);
    expect(result.status).toBe(200);
    const call = mocks.create.mock.calls[0][0];
    expect(call.data.idempotencyKey).toMatch(/^claude-code:[a-f0-9]{64}$/);
    const duplicate = claudeRequest(); duplicate.headers.delete("idempotency-key");
    duplicate.headers.set("x-claude-code-session-id", "c727db46-3473-4f30-8d1f-b2185cb95b3c");
    duplicate.headers.set("x-claude-code-prompt-id", "d180765a-969e-43e9-881b-4814b2536734");
    duplicate.headers.set("x-stainless-retry-count", "1");
    mocks.unique.mockResolvedValue({ id: "task", ...call.data, state: "SETTLED", settledPoints: 0.001, finishedAt: new Date() });
    expect((await claudeMessages(duplicate)).status).toBe(409);
    expect(mocks.debit).toHaveBeenCalledTimes(1); expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
  it("rejects a changed protocol version before debit or provider contact", async () => {
    const { claudeMessages } = await import("@/server/integrations/claude-gateway");
    const result = await claudeMessages(claudeRequest(claudeBody(), { "anthropic-version": "unsupported" }));
    expect(result.status).toBe(400); expect(mocks.fetch).not.toHaveBeenCalled(); expect(mocks.debit).not.toHaveBeenCalled();
  });
  it("authenticates native model discovery without reconciliation or wallet mutations", async () => {
    const { claudeModels } = await import("@/server/integrations/claude-gateway");
    vi.stubEnv("ANS_CLAUDE_POLICY", JSON.stringify({ ...fixture(), modelMetadata: {
      createdAt: "2026-10-14T00:00:00Z", source: "https://fixture.invalid/v1/models", observedAt: "2026-10-15T00:00:00Z",
    } }));
    const result = await claudeModels(claudeRequest());
    expect(result.status).toBe(200);
    expect(result.headers.get("x-ans-model-metadata-kind")).toBe("upstream-reported");
    expect(await result.json()).toEqual({ data: [{ id: "claude-opus-5-5", type: "model", display_name: "Claude Opus 5.5", created_at: "2026-10-14T00:00:00Z" }], has_more: false, first_id: "claude-opus-5-5", last_id: "claude-opus-5-5" });
    expect(mocks.find).not.toHaveBeenCalled(); expect(mocks.update).not.toHaveBeenCalled(); expect(mocks.debit).not.toHaveBeenCalled(); expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("does not invent catalog dates when metadata has not been explicitly recorded", async () => {
    const { claudeModels } = await import("@/server/integrations/claude-gateway");
    const result = await claudeModels(claudeRequest());
    expect(result.status).toBe(503); expect((await result.json()).error.message).toBe("CLAUDE_MODEL_METADATA_UNAVAILABLE");
    expect(mocks.fetch).not.toHaveBeenCalled(); expect(mocks.debit).not.toHaveBeenCalled();
  });
  it("counts a labeled local upper bound without upstream spend or receipt reconciliation", async () => {
    const { claudeCountTokens } = await import("@/server/integrations/claude-gateway");
    const body = { model: "claude-opus-5-5", messages: [{ role: "user", content: "multibyte \u4e2d\u6587" }] };
    const result = await claudeCountTokens(claudeRequest(body));
    expect(result.status).toBe(200); expect(result.headers.get("x-ans-token-count-kind")).toBe("conservative-utf8-upper-bound");
    expect((await result.json()).input_tokens).toBeGreaterThan(Buffer.byteLength(JSON.stringify(body)));
    expect(mocks.find).not.toHaveBeenCalled(); expect(mocks.update).not.toHaveBeenCalled(); expect(mocks.debit).not.toHaveBeenCalled(); expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("counts structurally valid input even with missing pricing or a tiny paid request cap", async () => {
    const { claudeCountTokens, claudeMessages } = await import("@/server/integrations/claude-gateway");
    const body = { model: "claude-opus-5-5", messages: [{ role: "user", content: "local estimate" }] };
    vi.stubEnv("ANS_MODEL_BILLING_POLICY", "");
    expect((await claudeCountTokens(claudeRequest(body))).status).toBe(200);
    expect((await claudeMessages(claudeRequest())).status).toBe(503);
    const billing = fixtureModelBillingPolicy();
    billing.models["claude-opus-5-5"].requestMaxPoints = 0.000001;
    vi.stubEnv("ANS_MODEL_BILLING_POLICY", JSON.stringify(billing));
    expect((await claudeCountTokens(claudeRequest(body))).status).toBe(200);
    expect(mocks.find).not.toHaveBeenCalled(); expect(mocks.update).not.toHaveBeenCalled();
    expect((await claudeMessages(claudeRequest())).status).toBe(402);
    expect(mocks.debit).not.toHaveBeenCalled(); expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it.each(["bad-key", ""]) ("rejects invalid keys for metadata without provider calls %s", async key => {
    const { claudeModels, claudeCountTokens } = await import("@/server/integrations/claude-gateway");
    expect((await claudeModels(claudeRequest(claudeBody(), { "x-api-key": key }))).status).toBe(401);
    expect((await claudeCountTokens(claudeRequest(claudeBody(), { "x-api-key": key }))).status).toBe(401);
    expect(mocks.fetch).not.toHaveBeenCalled(); expect(mocks.debit).not.toHaveBeenCalled();
  });
  it("rejects oversized or unknown CountTokens features without spending", async () => {
    const { claudeCountTokens } = await import("@/server/integrations/claude-gateway");
    const body = { model: "claude-opus-5-5", messages: [{ role: "user", content: "x".repeat(262145) }] };
    expect((await claudeCountTokens(claudeRequest(body))).status).toBe(413);
    expect((await claudeCountTokens(claudeRequest({ ...body, messages: [{ role: "user", content: "hi" }], server_tool: true }))).status).toBe(400);
    expect(mocks.fetch).not.toHaveBeenCalled(); expect(mocks.debit).not.toHaveBeenCalled();
  });
  it("uses native Messages and the infrastructure key, settles only the receipt, and snapshots its own rates", async () => {
    const { claudeMessages } = await import("@/server/integrations/claude-gateway");
    mocks.fetch.mockResolvedValue(Response.json({ type: "message", content: [{ type: "text", text: "fixture answer" }], usage: { input_tokens: 99, output_tokens: 99 } }, { headers: { "x-oneapi-request-id": "request123456" } }));
    const result = await claudeMessages(claudeRequest());
    expect(result.status).toBe(200); expect((await result.json()).type).toBe("message");
    expect(mocks.fetch).toHaveBeenCalledWith("https://apic.cauai.fun/v1/messages", expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer private-test-only", "anthropic-version": "2023-06-01" }) }));
    expect(JSON.stringify(mocks.fetch.mock.calls)).not.toContain(key);
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ modelId: "claude-opus-5-5", provider: "apic-codex", policyVersion: "claude-isolated-policy-v1", price: expect.objectContaining({ protocol: "anthropic-messages", memberPointsCap: 1, policy: expect.objectContaining({ consumptionMultiplier: 1 }) }) }) }));
    expect(mocks.evidence).toHaveBeenCalledWith(expect.anything(), "u", "task", expect.objectContaining({ kind: "VERIFIED", billedPoints: 0.001 }));
    expect(mocks.debit).toHaveBeenCalledTimes(1); expect(mocks.refund).toHaveBeenCalledTimes(1);
  });
  it("checks rolling settled cost and outstanding holds inside the account transaction", async () => {
    const { claudeMessages } = await import("@/server/integrations/claude-gateway");
    mocks.find.mockImplementation(({where}) => Promise.resolve(where.modelId ? [{ state: "SETTLED", settledPoints: 1.99, authorizedPoints: 2 }] : []));
    const result = await claudeMessages(claudeRequest());
    expect(result.status).toBe(429); expect((await result.json()).error.message).toBe("DAILY_BUDGET_EXCEEDED");
    expect(mocks.find).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ modelId: "claude-opus-5-5", userId: "u", OR: expect.arrayContaining([expect.objectContaining({ state: "SETTLED", finishedAt: { gte: expect.any(Date) } }), expect.objectContaining({ state: { in: ["AUTHORIZED", "RUNNING", "UNCERTAIN"] } })]) }) }));
    expect(mocks.debit).not.toHaveBeenCalled(); expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("does not treat missing settled cost as free budget", async () => {
    const { claudeMessages } = await import("@/server/integrations/claude-gateway");
    mocks.find.mockImplementation(({where}) => Promise.resolve(where.modelId ? [{ state: "SETTLED", settledPoints: null, authorizedPoints: 2 }] : []));
    const result = await claudeMessages(claudeRequest());
    expect(result.status).toBe(503); expect((await result.json()).error.message).toBe("BUDGET_STATE_UNAVAILABLE"); expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("limits Claude concurrency without mistaking another model's hold for Claude", async () => {
    const { claudeMessages } = await import("@/server/integrations/claude-gateway");
    mocks.count.mockResolvedValue(1);
    const result = await claudeMessages(claudeRequest());
    expect(result.status).toBe(429); expect(mocks.count).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ modelId: "claude-opus-5-5" }) }));
    expect(mocks.debit).not.toHaveBeenCalled(); expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("keeps an uncertain native response reserved without inventing a refund", async () => {
    const { claudeMessages } = await import("@/server/integrations/claude-gateway");
    mocks.fetch.mockRejectedValue(new Error("isolated timeout"));
    expect((await claudeMessages(claudeRequest())).status).toBe(502);
    expect(mocks.refund).not.toHaveBeenCalled(); expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ state: "UNCERTAIN" }) }));
  });
  it("returns native error envelopes after a provider timeout", async () => {
    const { claudeMessages } = await import("@/server/integrations/claude-gateway");
    mocks.fetch.mockRejectedValue(new Error("timeout"));
    const result = await claudeMessages(claudeRequest());
    expect(await result.json()).toEqual({ type: "error", error: { type: "api_error", message: "UPSTREAM_RESULT_UNCERTAIN" } });
  });
  it("emits a native stream error when authoritative billing is pending", async () => {
    const { claudeMessages } = await import("@/server/integrations/claude-gateway");
    mocks.fetch.mockResolvedValue(new Response('event: message_start\ndata: {"type":"message_start"}\n\n', { headers: { "x-oneapi-request-id": "request123456" } }));
    mocks.charge.mockRejectedValue(new Error("receipt missing"));
    const result = await claudeMessages(claudeRequest(claudeBody(true)));
    const text = await result.text();
    expect(text).toContain('event: error\ndata: {"type":"error","error":{"type":"api_error","message":"BILLING_OR_UPSTREAM_PENDING"}}');
    expect(mocks.refund).not.toHaveBeenCalled();
  });
  it("streams native tool events unchanged while retaining authoritative settlement", async () => {
    const { claudeMessages } = await import("@/server/integrations/claude-gateway");
    const stream = 'event: content_block_start\ndata: {"type":"content_block_start","content_block":{"type":"tool_use","name":"fixture"}}\n\n';
    mocks.fetch.mockResolvedValue(new Response(stream, { headers: { "x-oneapi-request-id": "request123456" } }));
    const result = await claudeMessages(claudeRequest(claudeBody(true)));
    expect(await result.text()).toBe(stream); expect(mocks.charge).toHaveBeenCalledTimes(1); expect(mocks.refund).toHaveBeenCalledTimes(1);
  });
});

describe("snapshot USD CNY ANS point units", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("refuses new model charges before debit or provider when FX is absent", async () => {
    vi.stubEnv("ANS_MODEL_BILLING_POLICY", "");
    const result = await codexResponses(request({ model: "gpt-6.1-sol", input: "hello" }));
    expect(result.status).toBe(503);
    expect((await result.json()).error.code).toBe("MODEL_BILLING_NOT_CONFIGURED");
    expect(mocks.create).not.toHaveBeenCalled(); expect(mocks.debit).not.toHaveBeenCalled(); expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("stores the exact price snapshot and applies FX and points per CNY to the receipt once", async () => {
    vi.stubEnv("ANS_MODEL_BILLING_POLICY", JSON.stringify(fixtureModelBillingPolicy(7)));
    mocks.fetch.mockResolvedValue(Response.json({ output: [] }, { headers: { "x-oneapi-request-id": "request123456" } }));
    mocks.charge.mockResolvedValue({ requestId: "request123456", quota: 80, points: 0.00016 });
    const result = await codexResponses(request({ model: "gpt-6.1-sol", input: "hello" }));
    expect(result.status).toBe(200);
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      policyVersion: "apic-usd-cny-points-v2", price: expect.objectContaining({ quotaPerUsd: 500000, billing: expect.objectContaining({
        version: "usd-cny-points-v2", pointsPerCny: 10, consumptionMultiplier: 0.16, receiptConsumptionMultiplier: 0.16,
        fx: expect.objectContaining({ usdCny: 7 }),
      }) }),
    }) }));
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ state: "SETTLED", settledPoints: 0.0112 }) }));
  });
  it("recovers an old historical request with its original rule even after FX config is removed", async () => {
    const { reconcileCodexCharges } = await import("@/server/integrations/codex-gateway");
    vi.stubEnv("ANS_MODEL_BILLING_POLICY", "");
    mocks.find.mockResolvedValueOnce([{ id: "old-task", outcome: "request123456", authorizedPoints: 1, price: { source: "APIC", quotaPerPoint: 500000 } }]);
    mocks.current.mockResolvedValue({ id: "old-task", state: "UNCERTAIN", authorizedPoints: 1, price: { source: "APIC", quotaPerPoint: 500000 } });
    mocks.charge.mockResolvedValue({ requestId: "request123456", quota: 8137, points: 0.016274 });
    await reconcileCodexCharges("u");
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "old-task", userId: "u", state: "UNCERTAIN" }, data: expect.objectContaining({ settledPoints: 0.016274 }) }));
    expect(mocks.debit).not.toHaveBeenCalled(); expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("recovers v2 using the old frozen FX, not today's changed environment", async () => {
    const { readModelBillingSnapshot } = await import("@/server/integrations/model-billing-policy");
    const { reconcileCodexCharges } = await import("@/server/integrations/codex-gateway");
    const billing = readModelBillingSnapshot("gpt-6.1-sol", { ANS_MODEL_BILLING_POLICY: JSON.stringify(fixtureModelBillingPolicy(7)) });
    vi.stubEnv("ANS_MODEL_BILLING_POLICY", JSON.stringify(fixtureModelBillingPolicy(9)));
    mocks.find.mockResolvedValueOnce([{ id: "new-task", outcome: "request123456", authorizedPoints: 1, price: { billing } }]);
    mocks.current.mockResolvedValue({ id: "new-task", state: "UNCERTAIN", authorizedPoints: 1, price: { billing } });
    mocks.charge.mockResolvedValue({ requestId: "request123456", quota: 80, points: 0.00016 });
    await reconcileCodexCharges("u");
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "new-task", userId: "u", state: "UNCERTAIN" }, data: expect.objectContaining({ settledPoints: 0.0112 }) }));
    expect(mocks.debit).not.toHaveBeenCalled();
  });
});

describe("reconcileFailureCode", () => {
  it("names APIC receipt states, guard rejections and fetch failures without echoing the message", () => {
    expect(reconcileFailureCode(new Error("APIC_BILLING_PENDING"))).toBe("APIC_BILLING_PENDING");
    expect(reconcileFailureCode(new Error("APIC_BILLING_UNAVAILABLE"))).toBe("APIC_BILLING_UNAVAILABLE");
    expect(reconcileFailureCode(new Error("Raw query failed. Code: `P0001`. Message: `ERROR: API_BILLING_SNAPSHOT_INVALID`"))).toBe("API_BILLING_SNAPSHOT_INVALID");
    expect(reconcileFailureCode(new Error("Timed out fetching a new connection (P2024)"))).toBe("P2024");
    expect(reconcileFailureCode(new Error("ERROR: API_BILLING_SNAPSHOT_INVALID"))).toBe("API_BILLING_SNAPSHOT_INVALID");
    expect(reconcileFailureCode(Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" }))).toBe("FETCH_TimeoutError");
    expect(reconcileFailureCode(new Error("secret postgres://user:pass@host"))).toBe("UNKNOWN");
  });
});
