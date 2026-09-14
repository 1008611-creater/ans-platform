// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  db: {
    template: { findFirst: vi.fn() },
  },
  runTemplate: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({ db: mocks.db }));
vi.mock("@/lib/run-service", () => ({ runTemplate: mocks.runTemplate }));

import { POST } from "@/app/api/templates/[id]/run/route";

const context = { params: Promise.resolve({ id: "test-template" }) };
const okResult = { ok: true, runId: "run1", status: "SUCCEEDED", outputText: "结果", costPoints: 3 };

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/templates/x/run", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: "user1" } });
  mocks.db.template.findFirst.mockResolvedValue({ id: "tpl1" });
  mocks.runTemplate.mockResolvedValue({ ...okResult });
});

describe("POST /api/templates/[slug]/run", () => {
  it("未登录返回 401", async () => {
    mocks.auth.mockResolvedValue(null);
    const response = await POST(request({}), context);
    expect(response.status).toBe(401);
    expect(mocks.runTemplate).not.toHaveBeenCalled();
  });

  it("模板不存在返回 404", async () => {
    mocks.db.template.findFirst.mockResolvedValue(null);
    const response = await POST(request({ inputs: {} }), context);
    expect(response.status).toBe(404);
  });

  it("请求体非法 JSON 返回 400", async () => {
    const response = await POST(new Request("http://localhost/api/templates/x/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{bad",
    }), context);
    expect(response.status).toBe(400);
    expect(mocks.runTemplate).not.toHaveBeenCalled();
  });

  it("modelKey 类型错误返回 400", async () => {
    const response = await POST(request({ inputs: {}, modelKey: 123 }), context);
    expect(response.status).toBe(400);
  });

  it("幂等键类型错误返回 400", async () => {
    const response = await POST(request({ inputs: {}, idempotencyKey: 123 }), context);
    expect(response.status).toBe(400);
  });

  it("成功路径返回 runId 与结果", async () => {
    const response = await POST(request({ inputs: { topic: "AI" }, modelKey: "gpt-5.6-terra" }), context);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.runId).toBe("run1");
    expect(data.outputText).toBe("结果");
    expect(mocks.runTemplate).toHaveBeenCalledWith(expect.objectContaining({
      userId: "user1",
      templateId: "tpl1",
      inputs: { topic: "AI" },
      modelKey: "gpt-5.6-terra",
      idempotencyKey: undefined,
      ipAddress: null,
      userAgent: null,
    }));
  });

  it("转发幂等键和请求审计上下文", async () => {
    const response = await POST(request({ inputs: {}, modelKey: "gpt-5.6-terra" }, {
      "Idempotency-Key": "  request-123  ",
      "x-forwarded-for": "203.0.113.9, 10.0.0.1",
      "user-agent": "ANS test client",
    }), context);
    expect(response.status).toBe(200);
    expect(mocks.runTemplate).toHaveBeenCalledWith(expect.objectContaining({
      idempotencyKey: "request-123",
      ipAddress: "203.0.113.9",
      userAgent: "ANS test client",
    }));
  });

  it("已有运行中的幂等请求返回 202", async () => {
    mocks.runTemplate.mockResolvedValue({
      ok: true,
      runId: "run-pending",
      status: "RUNNING",
      costPoints: 3,
      idempotentReplay: true,
    });
    const response = await POST(request({ inputs: {} }, { "Idempotency-Key": "request-123" }), context);
    expect(response.status).toBe(202);
    expect((await response.json()).status).toBe("RUNNING");
  });

  it("服务失败时透传错误状态和运行编号", async () => {
    mocks.runTemplate.mockResolvedValue({
      ok: false,
      error: "run_failed",
      message: "模型响应超时",
      status: 504,
      runId: "run-failed",
    });
    const response = await POST(request({ inputs: {} }), context);
    expect(response.status).toBe(504);
    const data = await response.json();
    expect(data.error).toBe("run_failed");
    expect(data.runId).toBe("run-failed");
  });
});
