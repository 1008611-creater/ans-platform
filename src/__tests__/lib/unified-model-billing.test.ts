// @vitest-environment node
import { beforeEach, afterEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ response: vi.fn(), reconcile: vi.fn(), record: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { apiComputeRequest: { findFirst: m.record } } }));
vi.mock("@/server/integrations/codex-gateway", () => ({ meteredResponses: m.response, reconcileCodexCharges: m.reconcile }));
import { callModelTextWithUsage } from "@/server/integrations/model-client";
const args = { target: { baseUrl: "https://apic.cauai.fun/v1", apiKey: "never-directly-use-this", upstream: "gpt-6.1-sol", label: "sol" }, prompt: "hello", userId: "u", chargeRef: { type: "run" as const, id: "run1" }, idempotencyKey: "template:run1" };
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv("ANS_APIC_BILLING_ENABLED", "1"); vi.stubEnv("ANS_UNIFIED_POINTS_ENABLED", "1");
  m.record.mockResolvedValue({ settledPoints: 0.002, outcome: "upstream123456" });
  m.response.mockImplementation(async () => Response.json({ output: [{ type: "reasoning", content: [{ text: "private" }] }, { type: "message", content: [{ type: "output_text", text: "answer" }] }], usage: { input_tokens: 10, output_tokens: 2 } }, { headers: { "x-ans-request-id": "req1" } }));
});
afterEach(() => vi.unstubAllEnvs());
it("uses the authenticated member and durable parent, with no second direct upstream request", async () => {
  expect(await callModelTextWithUsage(args)).toMatchObject({ text: "answer", metered: true, charge: { points: 0.002 }, usage: { inputTokens: 10, outputTokens: 2 } });
  const [request, user, parent] = m.response.mock.calls[0];
  expect(user).toBe("u"); expect(parent).toEqual(args.chargeRef);
  expect(request.headers.get("idempotency-key")).toBe("template:run1");
  expect(request.headers.has("authorization")).toBe(false);
  expect(await request.json()).toMatchObject({ model: "gpt-6.1-sol", max_output_tokens: 2048, stream: false });
});
it("rejects platform calls missing an authenticated billing context before dispatch", async () => {
  await expect(callModelTextWithUsage({ target: args.target, prompt: "hello" })).rejects.toMatchObject({ code: "METERED_ACCOUNT_REQUIRED" });
  expect(m.response).not.toHaveBeenCalled();
});
it("keeps ambiguous settlement pending instead of treating it as free output", async () => {
  m.response.mockResolvedValue(Response.json({ error: { code: "BILLING_PENDING" } }, { status: 502 }));
  await expect(callModelTextWithUsage(args)).rejects.toMatchObject({ code: "MODEL_BILLING_PENDING" });
  expect(m.record).not.toHaveBeenCalled();
});
it("empty output remains a paid settled request", async () => {
  m.response.mockResolvedValue(Response.json({ output: [] }, { headers: { "x-ans-request-id": "req1" } }));
  await expect(callModelTextWithUsage(args)).rejects.toMatchObject({ code: "MODEL_EMPTY_OUTPUT" });
  expect(m.record).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "req1", userId: "u", state: "SETTLED" } }));
});
