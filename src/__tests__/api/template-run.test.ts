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

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: "user1" } });
  mocks.db.template.findFirst.mockResolvedValue({ id: "tpl1" });
  mocks.runTemplate.mockResolvedValue({ ...okResult });
});

describe("POST /api/templates/[slug]/run", () => {
  it("未登录返回 401", async () => {
    mocks.auth.mockResolvedValue(null);
    const response = await POST(new Request("http://localhost/api/templates/x/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    }), context);
    expect(response.status).toBe(401);
    expect(mocks.runTemplate).not.toHaveBeenCalled();
  });

  it("模板不存在返回 404", async () => {
    mocks.db.template.findFirst.mockResolvedValue(null);
    const response = await POST(new Request("http://localhost/api/templates/x/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inputs: {} }),
    }), context);
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
    const response = await POST(new Request("http://localhost/api/templates/x/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inputs: {}, modelKey: 123 }),
    }), context);
    expect(response.status).toBe(400);
  });

  it("成功路径返回 runId 与结果", async () => {
    const response = await POST(new Request("http://localhost/api/templates/x/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inputs: { topic: "AI" }, modelKey: "gpt-5.6-terra" }),
    }), context);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.runId).toBe("run1");
    expect(data.outputText).toBe("结果");
    expect(mocks.runTemplate).toHaveBeenCalledWith({
      userId: "user1",
      templateId: "tpl1",
      inputs: { topic: "AI" },
      modelKey: "gpt-5.6-terra",
    });
  });

  it("服务失败时透传错误状态", async () => {
    mocks.runTemplate.mockResolvedValue({ ok: false, error: "insufficient_quota", message: "算力不足", status: 402 });
    const response = await POST(new Request("http://localhost/api/templates/x/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inputs: {} }),
    }), context);
    expect(response.status).toBe(402);
    const data = await response.json();
    expect(data.error).toBe("insufficient_quota");
  });
});
