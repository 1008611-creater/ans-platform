// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { computeCommandSchema } from "@/contracts/compute";
import { computePoints, computeQuote, loadComputePolicy } from "@/server/compute/policy";
const price = { unit: "token" as const, ratePoints: 3, rateUnits: 1_000_000, maxUnits: 1_000_000_000 };
afterEach(() => vi.unstubAllEnvs());
describe("unified compute pricing", () => {
  it("uses exact integer ceiling for token rates and refuses invalid or oversized usage", () => {
    expect(computePoints(price, 1)).toBe(1); expect(computePoints(price, 333_333)).toBe(1);
    expect(computePoints(price, 333_334)).toBe(2); expect(computePoints(price, 1_000_000)).toBe(3);
    expect(computePoints({ ...price, ratePoints: 999_999_937, rateUnits: 999_999_929 }, 999_999_929)).toBe(999_999_937);
    for (const units of [0, -1, NaN, 1.5, Infinity, 1_000_000_001]) expect(() => computePoints(price, units)).toThrow("COMPUTE_USAGE_INVALID");
    expect(() => computePoints({ ...price, ratePoints: 1_000_000_000, rateUnits: 1 }, 1_000_000_000)).toThrow("COMPUTE_BUDGET_INVALID");
  });
  it("fails closed without explicit switch, policy and model, including inherited model names", () => {
    vi.stubEnv("ANS_TOONFLOW_COMPUTE_ENABLED", ""); expect(() => computeQuote("model", 1)).toThrow("COMPUTE_NOT_CONFIGURED");
    vi.stubEnv("ANS_TOONFLOW_COMPUTE_ENABLED", "1"); vi.stubEnv("ANS_TOONFLOW_COMPUTE_POLICY", ""); expect(() => loadComputePolicy()).toThrow("COMPUTE_POLICY_UNAVAILABLE");
    vi.stubEnv("ANS_TOONFLOW_COMPUTE_POLICY", JSON.stringify({ version: "fixture-v1", concurrentMax: 2, models: { model: price } }));
    expect(computeQuote("model", 1).authorizedPoints).toBe(1); expect(() => computeQuote("constructor", 1)).toThrow("COMPUTE_MODEL_UNAVAILABLE");
    vi.stubEnv("ANS_TOONFLOW_COMPUTE_POLICY", "private-provider-marker"); expect(() => loadComputePolicy()).toThrow(/^COMPUTE_POLICY_UNAVAILABLE$/);
  });
  it("rejects authority or price overrides, unknown usage and refund without evidence", () => {
    expect(computeCommandSchema.safeParse({ action: "reserve", userId: "user", modelId: "model", maxUnits: 10, idempotencyKey: "request-1", authorizedPoints: 0 }).success).toBe(false);
    expect(computeCommandSchema.safeParse({ action: "settle", userId: "user", taskId: "task-123", eventId: "event-123", expectedRevision: 2, units: null, outcome: "succeeded", evidenceRef: "usage-123" }).success).toBe(false);
    expect(computeCommandSchema.safeParse({ action: "release", userId: "user", taskId: "task-123", eventId: "event-123", expectedRevision: 2, evidence: "timeout", evidenceRef: "usage-123" }).success).toBe(false);
  });
});
