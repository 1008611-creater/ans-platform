import { describe, it, expect, vi, beforeEach } from "vitest";
import { executeWorkflow } from "@/domain/workflows/executor";
import { QuotaError } from "@/server/quota/service";
const mocks=vi.hoisted(()=>({user:vi.fn(),create:vi.fn(),update:vi.fn(),find:vi.fn(),unique:vi.fn(),count:vi.fn(),transaction:vi.fn(),parentCost:vi.fn(),debit:vi.fn(),refund:vi.fn(),charge:vi.fn(),fetch:vi.fn()}));
vi.mock("@/lib/db",()=>{const tx={$queryRaw:vi.fn(),apiComputeRequest:{create:mocks.create,updateMany:mocks.update,findMany:mocks.find,findUnique:mocks.unique,count:mocks.count},user:{findFirst:mocks.user},run:{updateMany:mocks.parentCost},workflowRun:{updateMany:mocks.parentCost}};return {db:{...tx,$transaction:(fn:(tx:unknown)=>unknown)=>mocks.transaction(fn,tx)}};});
vi.mock("@/server/quota/service",()=>({debitQuota:mocks.debit,refundQuota:mocks.refund,QuotaError:class extends Error{status=402;code="INSUFFICIENT_QUOTA";}}));
vi.mock("@/server/integrations/apic-billing",()=>({readApicCharge:mocks.charge}));
import {codexResponses,codexModels,validateCodexPayload,meteredResponses} from "@/server/integrations/codex-gateway";
const key="pchat_"+"a".repeat(64);
function request(body:unknown,token=key){return new Request("https://ans.invalid/api/codex/v1/responses",{method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify(body)});}
beforeEach(()=>{vi.resetAllMocks();mocks.transaction.mockImplementation((fn,tx)=>fn(tx));mocks.unique.mockResolvedValue(null);mocks.count.mockResolvedValue(0);process.env.ANS_CODEX_GATEWAY_ENABLED="1";process.env.RUN_BASE_URL="https://apic.cauai.fun/v1";process.env.RUN_API_KEY="private-test-only";mocks.user.mockResolvedValue({id:"u"});mocks.find.mockResolvedValue([]);mocks.create.mockResolvedValue({id:"task"});mocks.update.mockResolvedValue({count:1});mocks.charge.mockResolvedValue({points:0.001,requestId:"request123456",quota:500});vi.stubGlobal("fetch",mocks.fetch);});
describe("Codex sole-ledger gateway",()=>{
 it("rejects unknown model, server state, and oversized output",()=>{for(const b of [{model:"unknown"},{model:"gpt-6.1-sol",previous_response_id:"another-user"},{model:"gpt-6.1-sol",background:true},{model:"gpt-6.1-sol",max_output_tokens:16385}])expect(()=>validateCodexPayload(b)).toThrow();});
 it("forces storage off, preserves tool schemas, and reserves above actual minimum",()=>{const result=validateCodexPayload({model:"gpt-6.1-sol",input:"hello",store:true,tools:[{type:"function",name:"test",parameters:{}}]});expect(JSON.parse(result.text).store).toBe(false);expect(JSON.parse(result.text).tools[0].name).toBe("test");expect(result.reserve).toBeGreaterThan(0.001);});
 it("rejects invalid and revoked keys without upstream call",async()=>{expect((await codexModels(request({},"bad"))).status).toBe(401);mocks.user.mockResolvedValue(null);expect((await codexResponses(request({model:"gpt-6.1-sol"}))).status).toBe(401);expect(mocks.fetch).not.toHaveBeenCalled();});
 it("reserves then settles the authoritative quota once",async()=>{mocks.fetch.mockResolvedValue(new Response('{"output":[]}',{headers:{"x-oneapi-request-id":"request123456"}}));const response=await codexResponses(request({model:"gpt-6.1-sol",input:"hello"}));expect(response.status).toBe(200);expect(mocks.debit).toHaveBeenCalledTimes(1);expect(mocks.refund).toHaveBeenCalledTimes(1);expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({state:"SETTLED",settledPoints:0.001})}));});
 it("settles verified usage beyond reservation with an atomic extra debit",async()=>{mocks.charge.mockResolvedValue({points:2,requestId:"request123456",quota:1000000});mocks.fetch.mockResolvedValue(new Response('{"output":[]}',{headers:{"x-oneapi-request-id":"request123456"}}));const response=await codexResponses(request({model:"gpt-6.1-sol",input:"hello"}));expect(response.status).toBe(200);expect(mocks.debit).toHaveBeenCalledTimes(2);expect(mocks.refund).not.toHaveBeenCalled();});
 it("does not turn ambiguous upstream failure into free credit",async()=>{mocks.fetch.mockRejectedValue(new Error("timeout"));const response=await codexResponses(request({model:"gpt-6.1-sol"}));expect(response.status).toBe(502);expect(mocks.refund).not.toHaveBeenCalled();expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({state:"UNCERTAIN"})}));});
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
    expect(rows[0].price.rejectedUpstreamStatus).toBe(429);
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
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ state: "SETTLED", settledPoints: cap, price: expect.objectContaining({ memberPointsCap: cap, verifiedUpstreamPoints: 2, platformCoveredPoints: 2 - cap }) }) }));
  });
  it("rejects an inadequate cap before any upstream call or debit", async () => {
    const response = await meteredResponses(request({ model: "deepseek-v4.1-flash", input: "hello" }), "u", undefined, { memberPointsCap: 0.000001 });
    expect(response.status).toBe(400); expect(mocks.fetch).not.toHaveBeenCalled(); expect(mocks.debit).not.toHaveBeenCalled();
  });
  it("keeps the same cap when an uncertain receipt is reconciled later", async () => {
    const { reconcileCodexCharges } = await import("@/server/integrations/codex-gateway");
    mocks.find.mockResolvedValue([{ id: "pending", outcome: "request123456", authorizedPoints: 0.01, price: { source: "APIC", memberPointsCap: 0.01 } }]);
    mocks.charge.mockResolvedValue({ points: 2, requestId: "request123456", quota: 1000000 });
    await reconcileCodexCharges("u");
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "pending", state: "UNCERTAIN" }, data: expect.objectContaining({ settledPoints: 0.01, price: expect.objectContaining({ verifiedUpstreamPoints: 2, platformCoveredPoints: 1.99 }) }) }));
    expect(mocks.debit).not.toHaveBeenCalled();
  });
});
