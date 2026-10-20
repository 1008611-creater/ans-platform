// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  userFindFirst: vi.fn(),
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
  ledgerCreate: vi.fn(),
  apiRequestCreate: vi.fn(),
  transaction: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock("@/lib/db", () => {
  const tx = {
    user: {
      findFirst: mocks.userFindFirst,
      findUnique: mocks.userFindUnique,
      update: mocks.userUpdate,
    },
    quotaLedger: {
      create: mocks.ledgerCreate,
    },
    apiComputeRequest: {
      create: mocks.apiRequestCreate,
    },
  };
  return {
    db: {
      ...tx,
      $transaction: (fn: (txArg: typeof tx) => unknown) => mocks.transaction(fn, tx),
    },
  };
});

import {
  calculateOfficialTokenPoints,
  chatCompletionsGateway,
  handleGatewayOptions,
  resolveGatewayModel,
  v1Models,
} from "@/server/integrations/chat-completions-gateway";
import { runModelPlaygroundViaPi } from "@/server/companion/pi-agent";

const validKey = "pchat_" + "a".repeat(64);

function makeChatRequest(body: unknown, token = validKey) {
  return new Request("https://ans.cauai.fun/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("External Agent Chat Completions Gateway & Official Token + Cache + Multiplier Billing", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("ANS_CODEX_GATEWAY_ENABLED", "1");
    vi.stubEnv("RUN_BASE_URL", "https://apic.cauai.fun/v1");
    vi.stubEnv("RUN_API_KEY", "upstream-secret-key");
    vi.stubEnv("ANS_MODEL_BILLING_POLICY", "");
    mocks.transaction.mockImplementation((fn, tx) => fn(tx));
    vi.stubGlobal("fetch", mocks.fetch);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("responds to CORS preflight OPTIONS with 204 and Access-Control-Allow-Origin", () => {
    const res = handleGatewayOptions();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("maps official ANS models and common external Agent aliases accurately", () => {
    expect(resolveGatewayModel("deepseek-v4.1-flash")).toBe("deepseek-v4.1-flash");
    expect(resolveGatewayModel("deepseek-chat")).toBe("deepseek-v4.1-flash");
    expect(resolveGatewayModel("gpt-6.1-sol")).toBe("gpt-6.1-sol");
    expect(resolveGatewayModel("gpt-4o")).toBe("gpt-6.1-sol");
    expect(resolveGatewayModel("gpt-6-astra")).toBe("gpt-6-astra");
    expect(resolveGatewayModel("unknown-model")).toBeNull();
  });

  it("calculates exact points from official input, output, cache_read, cache_write tariffs and official multipliers", () => {
    // DeepSeek V4.1 Flash: input=$0.3/M, output=$1.2/M, cacheRead=$0.006/M, multiplier=1.5, fx=7.2, 10 pts/CNY
    const ds = calculateOfficialTokenPoints("deepseek-v4.1-flash", {
      prompt_tokens: 2000,
      completion_tokens: 1000,
      prompt_tokens_details: { cached_tokens: 1000 },
    });
    expect(ds.uncachedInputTokens).toBe(1000);
    expect(ds.cachedReadTokens).toBe(1000);
    expect(ds.outputTokens).toBe(1000);
    expect(ds.consumptionMultiplier).toBe(1.5);
    // usdCost = (1000*0.3 + 1000*0.006 + 1000*1.2)/1e6 = 1.506 / 1e6 = 0.001506 USD
    // points = ceil(0.001506 * 7.2 * 10 * 1.5 * 1e6) / 1e6; the IEEE-754 product is 162648.00000000003,
    // so the gateway's ceil-to-1e-6 policy settles 0.162649 (exact 1.5x tariff value is 0.162648)
    expect(ds.billedPoints).toBe(0.162649);

    // GPT-6.1 Sol: input=$2/M, output=$10/M, cacheRead=$0.1/M, multiplier=0.16, fx=7.2, 10 pts/CNY
    const sol = calculateOfficialTokenPoints("gpt-6.1-sol", {
      prompt_tokens: 1000,
      completion_tokens: 500,
      prompt_tokens_details: { cached_tokens: 500 },
    });
    expect(sol.uncachedInputTokens).toBe(500);
    expect(sol.cachedReadTokens).toBe(500);
    expect(sol.consumptionMultiplier).toBe(0.16);
    // usdCost = (500*2 + 500*0.1 + 500*10)/1e6 = 6050 / 1e6 = 0.00605 USD
    // points = ceil(0.00605 * 7.2 * 10 * 0.16 * 1e6) / 1e6 = 0.069696 points
    expect(sol.billedPoints).toBe(0.069696);
  });

  it("rejects invalid API key on /api/v1/models and /api/v1/chat/completions with 401", async () => {
    const badModels = await v1Models(
      new Request("https://ans.cauai.fun/api/v1/models", {
        headers: { Authorization: "Bearer invalid_key" },
      }),
    );
    expect(badModels.status).toBe(401);

    const badChat = await chatCompletionsGateway(
      makeChatRequest({ model: "deepseek-v4.1-flash", messages: [{ role: "user", content: "hi" }] }, "invalid_key"),
    );
    expect(badChat.status).toBe(401);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("blocks external Agent call with 402 when user points are 0 without calling upstream", async () => {
    mocks.userFindFirst.mockResolvedValue({ id: "user-zero", quotaPoints: 0 });
    const res = await chatCompletionsGateway(
      makeChatRequest({
        model: "deepseek-v4.1-flash",
        messages: [{ role: "user", content: "Hello" }],
      }),
    );
    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.error.code).toBe("INSUFFICIENT_QUOTA");
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });

  it("executes external Agent /chat/completions, deducts token-calculated points in QuotaLedger, and records settled ApiComputeRequest", async () => {
    mocks.userFindFirst.mockResolvedValue({ id: "user-1", quotaPoints: 10 });
    mocks.userFindUnique.mockResolvedValue({ quotaPoints: 10 });
    // 10 starting points minus the authoritative 1.5x DeepSeek charge of 0.162649
    mocks.userUpdate.mockResolvedValue({ quotaPoints: 9.837351 });
    mocks.fetch.mockResolvedValue(
      Response.json(
        {
          id: "chatcmpl-upstream-1",
          object: "chat.completion",
          choices: [{ index: 0, message: { role: "assistant", content: "你好！我是 ANS 算力网关。" }, finish_reason: "stop" }],
          usage: {
            prompt_tokens: 2000,
            completion_tokens: 1000,
            prompt_tokens_details: { cached_tokens: 1000 },
            total_tokens: 3000,
          },
        },
        { status: 200, headers: { "x-oneapi-request-id": "req-up-123" } },
      ),
    );

    const res = await chatCompletionsGateway(
      makeChatRequest({
        model: "deepseek-chat",
        messages: [{ role: "user", content: "你好" }],
      }),
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("x-ans-model")).toBe("deepseek-v4.1-flash");
    expect(res.headers.get("x-ans-charged-points")).toBe("0.162649");
    const json = await res.json();
    expect(json.choices[0].message.content).toContain("ANS 算力网关");
    expect(json.ans_billing.charged_points).toBe(0.162649);
    expect(json.ans_billing.multiplier).toBe(1.5);
    expect(json.ans_billing.cached_read_tokens).toBe(1000);
    expect(mocks.ledgerCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          amount: -0.162649,
          reason: "RUN_COST",
        }),
      }),
    );
    expect(mocks.apiRequestCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          provider: "apic-codex",
          modelId: "deepseek-v4.1-flash",
          settledPoints: 0.162649,
          state: "SETTLED",
        }),
      }),
    );
  });

  it("does not deduct points or fabricate output in runModelPlaygroundViaPi when balance is 0 or upstream fails", async () => {
    mocks.userFindUnique.mockResolvedValueOnce({ quotaPoints: 0 });
    const zeroResult = await runModelPlaygroundViaPi("user-zero", "写一段代码", "deepseek-v4.1-flash");
    expect(zeroResult.ok).toBe(false);
    expect(zeroResult.pointsDelta).toBe(0);
    expect(mocks.fetch).not.toHaveBeenCalled();

    mocks.userFindUnique.mockResolvedValueOnce({ quotaPoints: 10 });
    mocks.fetch.mockResolvedValueOnce(new Response("upstream error", { status: 502 }));
    const failResult = await runModelPlaygroundViaPi("user-1", "写一段代码", "deepseek-v4.1-flash");
    expect(failResult.ok).toBe(false);
    expect(failResult.pointsDelta).toBe(0);
    expect(failResult.balancePoints).toBe(10);
    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });
});
