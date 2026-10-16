// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  metered: vi.fn(),
  db: {
    template: { findFirst: vi.fn(), update: vi.fn() },
    apiComputeRequest: { findMany: vi.fn(), findFirst: vi.fn() },
    user: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
    run: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    quotaLedger: { create: vi.fn() },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn(),
  },
  fetch: vi.fn(),
  overrideTemplate: null as null | Record<string, unknown>,
}));

vi.mock("@/server/integrations/codex-gateway", () => ({ meteredResponses: mocks.metered, reconcileCodexCharges: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({ db: mocks.db }));

import { runTemplate } from "@/lib/run-service";

const published = {
  id: "tpl1",
  slug: "test-template",
  title: "测试模板",
  status: "PUBLISHED",
  formSchema: [
    { key: "topic", label: "主题", type: "text", required: true },
    { key: "tone", label: "语气", type: "select", required: false, options: ["正式", "轻松"] },
  ],
  promptBody: "请围绕 {{topic}} 写一段内容，语气{{tone}}。",
  modelKey: null,
  params: null,
  outputType: "TEXT",
  estimatedCost: 3,
  authorId: "author",
  categoryId: "scene",
};

const user = { id: "user1", quotaPoints: 10, flagged: false, deletedAt: null };

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("fetch", mocks.fetch);
  vi.stubEnv("TEMPLATE_REVIEW_BASE_URL", "https://tr.example.test/v1");
  vi.stubEnv("TEMPLATE_REVIEW_API_KEY", "test-key");
  vi.stubEnv("RUN_BASE_URL", "https://run.example.test/v1");
  vi.stubEnv("RUN_API_KEY", "test-only");
  mocks.auth.mockResolvedValue({ user: { id: "user1" } });
  mocks.db.template.findFirst.mockImplementation(async ({ where }: { where?: { status?: string } }) => {
    if (mocks.overrideTemplate) {
      const rec = { ...mocks.overrideTemplate };
      if (where?.status && rec.status !== where.status) return null;
      return rec;
    }
    const rec = { ...published };
    if (where?.status && rec.status !== where.status) return null;
    return rec;
  });
  mocks.db.user.findUnique.mockResolvedValue({ ...user });
  mocks.db.user.updateMany.mockResolvedValue({ count: 1 });
  mocks.db.user.findUniqueOrThrow.mockResolvedValue({ quotaPoints: 7 });
  mocks.db.user.update.mockResolvedValue({ quotaPoints: 10 });
  mocks.db.run.findFirst.mockResolvedValue(null);
  mocks.db.run.updateMany.mockResolvedValue({ count: 1 });
  mocks.db.auditLog.create.mockResolvedValue({ id: "audit1" });
  mocks.db.run.create.mockImplementation(async ({ data }) => ({ id: "run1", ...data, status: "QUEUED" }));
  mocks.db.quotaLedger.create.mockResolvedValue({ id: "ledger1" });
  mocks.db.$transaction.mockImplementation(async (fn: (tx: typeof mocks.db) => unknown) => fn(mocks.db));
  mocks.fetch.mockResolvedValue({
    ok: true,
    json: async () => ({ choices: [{ message: { content: "生成好的内容" } }] }),
  });
  mocks.overrideTemplate = null;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("runTemplate", () => {
  it("并发扣款条件失败时不创建运行或调用模型", async () => {
    mocks.db.user.updateMany.mockResolvedValue({ count: 0 });
    const result = await runTemplate({ userId: "user1", templateId: "tpl1", inputs: { topic: "AI" } });
    expect(!result.ok && result.error).toBe("insufficient_quota");
    expect(mocks.db.run.create).not.toHaveBeenCalled();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("已结算任务不重复退费", async () => {
    mocks.fetch.mockResolvedValue({ ok: false, status: 500 });
    mocks.db.run.updateMany.mockResolvedValue({ count: 0 });
    await runTemplate({ userId: "user1", templateId: "tpl1", inputs: { topic: "AI" } });
    expect(mocks.db.user.update).not.toHaveBeenCalled();
    expect(mocks.db.quotaLedger.create).toHaveBeenCalledTimes(1);
  });

  it("运行配置缺失时不借用审核凭据且不扣费", async () => {
    vi.stubEnv("RUN_API_KEY", "");
    const result = await runTemplate({ userId: "user1", templateId: "tpl1", inputs: { topic: "AI" } });
    expect(!result.ok && result.error).toBe("run_not_configured");
    expect(mocks.db.user.updateMany).not.toHaveBeenCalled();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("额度充足时扣费并创建运行记录", async () => {
    const result = await runTemplate({ userId: "user1", templateId: "tpl1", inputs: { topic: "AI", tone: "正式" } });
    expect(result.ok).toBe(true);
    expect(result.ok && result.runId).toBe("run1");
    expect(mocks.db.run.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        templateId: "tpl1",
        userId: "user1",
        costPoints: 3,
        status: "QUEUED",
        inputs: { topic: "AI", tone: "正式" },
      }),
    }));
    expect(mocks.db.user.findUnique).toHaveBeenCalled();
    expect(mocks.db.quotaLedger.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ amount: -3, reason: "RUN_COST", refType: "run" }),
    }));
  });

  it("模板未发布时拒绝", async () => {
    mocks.overrideTemplate = { ...published, status: "PENDING" };
    const result = await runTemplate({ userId: "user1", templateId: "tpl1", inputs: { topic: "AI" } });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toBe("template_unavailable");
    expect(mocks.db.run.create).not.toHaveBeenCalled();
  });

  it("必填字段缺失时拒绝且不扣费", async () => {
    const result = await runTemplate({ userId: "user1", templateId: "tpl1", inputs: { tone: "正式" } });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toBe("invalid_input");
    expect(mocks.db.quotaLedger.create).not.toHaveBeenCalled();
  });

  it("余额不足时拒绝且不扣费", async () => {
    mocks.db.user.findUnique.mockResolvedValue({ ...user, quotaPoints: 2 });
    const result = await runTemplate({ userId: "user1", templateId: "tpl1", inputs: { topic: "AI" } });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toBe("insufficient_quota");
    expect(mocks.db.run.create).not.toHaveBeenCalled();
  });

  it("模型不在白名单时拒绝", async () => {
    const result = await runTemplate({ userId: "user1", templateId: "tpl1", inputs: { topic: "AI" }, modelKey: "gpt-999-bad" });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toBe("model_unavailable");
  });

  it("模型白名单只包含生产网关实测可用的三个模型", async () => {
    const { RUN_MODEL_KEYS } = await import("@/lib/run-service");
    expect(RUN_MODEL_KEYS).toEqual(["deepseek-v4.1-flash", "gpt-6-astra", "gpt-6.1-sol"]);
    // 2026-10-05 网关探测：TR 国模全部 404，不得留在白名单里让用户选中后必然失败。
    expect(RUN_MODEL_KEYS).not.toContain("glm-5.2");
    expect(RUN_MODEL_KEYS).not.toContain("deepseek-v4-pro");
  });

  it("默认模型为 deepseek-v4.1-flash", async () => {
    const { DEFAULT_RUN_MODEL } = await import("@/lib/run-service");
    expect(DEFAULT_RUN_MODEL).toBe("deepseek-v4.1-flash");
  });

  it("调用 OpenAI 兼容接口并回写结果", async () => {
    const result = await runTemplate({ userId: "user1", templateId: "tpl1", inputs: { topic: "AI", tone: "正式" } });
    expect(mocks.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/chat/completions"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: expect.stringContaining("Bearer ") }),
        body: expect.stringContaining("deepseek-v4.1-flash"),
      })
    );
    expect(mocks.db.run.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "SUCCEEDED", outputText: "生成好的内容" }),
    }));
  });

  it("调用失败时标记 FAILED 并退回算力", async () => {
    mocks.fetch.mockResolvedValue({ ok: false, status: 500 });
    const result = await runTemplate({ userId: "user1", templateId: "tpl1", inputs: { topic: "AI" } });
    expect(result.ok).toBe(false);
    expect(mocks.db.run.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "FAILED" }),
    }));
    expect(mocks.db.quotaLedger.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ amount: 3, reason: "REFUND" }),
    }));
  });

  it("模板输出非 TEXT 时暂不支持", async () => {
    mocks.overrideTemplate = { ...published, outputType: "IMAGE" };
    const result = await runTemplate({ userId: "user1", templateId: "tpl1", inputs: { topic: "AI" } });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toBe("output_type_unsupported");
  });

  it("同一幂等键重放结果且不重复扣费", async () => {
    const existing = {
      id: "run1",
      status: "SUCCEEDED",
      outputText: "生成好的内容",
      error: null,
      costPoints: 3,
      templateId: "tpl1",
    };
    mocks.db.run.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(existing);
    const first = await runTemplate({
      userId: "user1",
      templateId: "tpl1",
      inputs: { topic: "AI" },
      idempotencyKey: "request-123",
    });
    const second = await runTemplate({
      userId: "user1",
      templateId: "tpl1",
      inputs: { topic: "AI" },
      idempotencyKey: "request-123",
    });
    expect(first.ok).toBe(true);
    expect(second.ok && second.idempotentReplay).toBe(true);
    expect(second.ok && second.outputText).toBe("生成好的内容");
    expect(mocks.db.user.updateMany).toHaveBeenCalledTimes(1);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });

  it("模型响应超时会标记失败并退费", async () => {
    vi.useFakeTimers();
    try {
      mocks.fetch.mockImplementation((_url: string, options: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          options.signal.addEventListener("abort", () => reject(new Error("aborted")));
        })
      );
      const pending = runTemplate({
        userId: "user1",
        templateId: "tpl1",
        inputs: { topic: "AI" },
      });
      await vi.advanceTimersByTimeAsync(60_000);
      const result = await pending;
      expect(result.ok).toBe(false);
      expect(!result.ok && result.message).toBe("模型响应超时或网络不可用");
      expect(mocks.db.run.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: "FAILED", error: "模型响应超时或网络不可用" }),
      }));
      expect(mocks.db.quotaLedger.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ amount: 3, reason: "REFUND" }),
      }));
    } finally {
      vi.useRealTimers();
    }
  });

  it("refuses non-unified direct APIC settlement and refunds outer reservation", async () => {
    vi.stubEnv("ANS_APIC_BILLING_ENABLED", "1");
    vi.stubEnv("RUN_BASE_URL", "https://apic.cauai.fun/v1");
    const result = await runTemplate({userId:"user1",templateId:"tpl1",inputs:{topic:"AI"}});
    expect(result).toMatchObject({ok:false,error:"run_failed",message:"METERED_ACCOUNT_REQUIRED"});
    expect(mocks.db.user.updateMany).toHaveBeenCalledWith(expect.objectContaining({data:{quotaPoints:{decrement:0.25}}}));
    expect(mocks.db.user.update).toHaveBeenCalledWith(expect.objectContaining({data:{quotaPoints:{increment:0.25}}}));
    expect(mocks.db.run.updateMany).toHaveBeenCalledWith(expect.objectContaining({where:{id:"run1",userId:"user1",status:{in:["QUEUED","RUNNING"]}},data:expect.objectContaining({status:"FAILED",error:"METERED_ACCOUNT_REQUIRED"})}));
  });

});
describe("durable unified template billing", () => {
  beforeEach(() => {
    vi.stubEnv("ANS_UNIFIED_POINTS_ENABLED", "1"); vi.stubEnv("ANS_APIC_BILLING_ENABLED", "1"); vi.stubEnv("RUN_BASE_URL", "https://apic.cauai.fun/v1");
    mocks.db.apiComputeRequest.findFirst.mockResolvedValue({ settledPoints: 0.02, outcome: "upstream123456", billingEvidence: [{ upstreamQuota: BigInt(100) }] });
  });
  it("takes model cost from the durable receipt without an outer template debit or refund", async () => {
    mocks.metered.mockResolvedValue(Response.json({ output: [{ type: "message", content: [{ type: "output_text", text: "complete" }] }] }, { headers: { "x-ans-request-id": "req1" } }));
    const result = await runTemplate({ userId: "user1", templateId: "tpl1", inputs: { topic: "AI" } });
    expect(result).toMatchObject({ ok: true, costPoints: 0.02 }); expect(mocks.db.quotaLedger.create).not.toHaveBeenCalled(); expect(mocks.db.user.update).not.toHaveBeenCalled();
    const [request, user, parent] = mocks.metered.mock.calls[0]; expect(user).toBe("user1"); expect(parent).toEqual({ type: "run", id: "run1" }); expect(request.headers.get("idempotency-key")).toBe("template:run1");
  });
  it("retains an uncertain model reservation when generation fails", async () => {
    mocks.metered.mockResolvedValue(Response.json({ error: { code: "BILLING_PENDING" } }, { status: 502 }));
    mocks.db.apiComputeRequest.findMany.mockResolvedValue([{ state: "UNCERTAIN", settledPoints: null, authorizedPoints: 0.1 }]);
    const result = await runTemplate({ userId: "user1", templateId: "tpl1", inputs: { topic: "AI" } });
    expect(result.ok).toBe(false); expect(mocks.db.user.update).not.toHaveBeenCalled(); expect(mocks.db.quotaLedger.create).not.toHaveBeenCalled();
    expect(mocks.db.run.update).toHaveBeenCalledWith({ where: { id: "run1" }, data: { costPoints: 0.1 } });
  });
});
