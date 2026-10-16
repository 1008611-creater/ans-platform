// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { readModelBillingSnapshot, reserveModelPoints, receiptToMemberPoints, modelUsdToMemberPoints } from "@/server/integrations/model-billing-policy";
import { fixtureModelBillingPolicy } from "./model-billing-fixture";
const now = Date.parse("2026-10-16T12:00:00Z");
const read = (config: unknown, model = "gpt-6.1-sol") => readModelBillingSnapshot(model, { ANS_MODEL_BILLING_POLICY: JSON.stringify(config) }, now);
beforeEach(() => { vi.stubEnv("ANS_MODEL_BILLING_POLICY", JSON.stringify(fixtureModelBillingPolicy(7))); });
afterEach(() => vi.unstubAllEnvs());
it("requires explicit traceable FX and pricing/group evidence, with no production defaults", () => {
  expect(() => readModelBillingSnapshot("gpt-6.1-sol", {}, now)).toThrow("MODEL_BILLING_NOT_CONFIGURED");
  for (const config of [null, {}, { ...fixtureModelBillingPolicy(), fx: undefined }, { ...fixtureModelBillingPolicy(), models: {} },
    { ...fixtureModelBillingPolicy(), fx: { usdCny: 7 } }, { ...fixtureModelBillingPolicy(), fx: { usdCny: 0, source: "https://fixture.invalid", observedAt: "2026-10-15T00:00:00Z" } }])
    expect(() => read(config)).toThrow("MODEL_BILLING_NOT_CONFIGURED");
});
it("allows individually configured models without silently offering unconfigured models", () => {
  const config = fixtureModelBillingPolicy();
  const subset = { ...config, models: { "gpt-6.1-sol": config.models["gpt-6.1-sol"] } };
  expect(read(subset).modelId).toBe("gpt-6.1-sol");
  expect(() => read(subset, "gpt-6-astra")).toThrow("MODEL_BILLING_NOT_CONFIGURED");
});
it("rejects unverified future/invalid sources, extra fields, unknown models and multiplier conflation", () => {
  const config = fixtureModelBillingPolicy();
  for (const candidate of [
    { ...config, fx: { ...config.fx, observedAt: "2026-10-17T00:00:00Z" } },
    { ...config, fx: { ...config.fx, source: "https://private:secret@fixture.invalid" } },
    { ...config, fx: { ...config.fx, source: "https://fixture.invalid?secret=private" } },
    { ...config, fx: { ...config.fx, usdCny: 7.1234567 } }, { ...config, unrecognized: true },
    { ...config, models: { ...config.models, unknown: config.models["gpt-6.1-sol"] } },
    { ...config, models: { "gpt-6.1-sol": { ...config.models["gpt-6.1-sol"], consumptionMultiplier: 1 } } },
    { ...config, models: { "gpt-6.1-sol": { ...config.models["gpt-6.1-sol"], receiptEvidence: undefined } } },
  ]) expect(() => read(candidate)).toThrow("MODEL_BILLING_NOT_CONFIGURED");
  expect(() => read({ ...config, models: { "claude-opus-5-5": { ...config.models["claude-opus-5-5"], consumptionMultiplier: 0.8 } } }, "claude-opus-5-5")).toThrow("MODEL_BILLING_NOT_CONFIGURED");
});
it("charges $1 official GPT USD at FX7 as 11.2 points, removing the APIC-applied .16 exactly once", () => {
  const snapshot = read(fixtureModelBillingPolicy(7));
  expect(snapshot.consumptionMultiplier).toBe(0.16);
  // APIC has already charged $0.16 credit for one official list dollar.
  expect(receiptToMemberPoints({ billing: snapshot }, 80000)).toBe(11.2);
  expect(reserveModelPoints(snapshot, 1000000, 0, { input: 1, output: 1 })).toBe(11.2);
});
it("does not guess APIC group .16: an explicitly full-price receipt is normalized independently", () => {
  const config = fixtureModelBillingPolicy(7); config.models["gpt-6.1-sol"].receiptConsumptionMultiplier = 1;
  const snapshot = read(config);
  expect(receiptToMemberPoints({ billing: snapshot }, 500000)).toBe(11.2);
});
it("keeps Opus consumer multiplier1 separate from procurement .8", () => {
  const config = fixtureModelBillingPolicy(7);
  const snapshot = read(config, "claude-opus-5-5");
  expect(snapshot.procurementMultiplier).toBe(0.8);
  expect(snapshot.consumptionMultiplier).toBe(1);
  expect(receiptToMemberPoints({ billing: snapshot }, 500000)).toBe(70);
  config.models["claude-opus-5-5"].receiptConsumptionMultiplier = 0.8;
  expect(receiptToMemberPoints({ billing: read(config, "claude-opus-5-5") }, 400000)).toBe(70);
});
it("preserves old historical quota=USDcredit=point settlement without any current config", () => {
  vi.stubEnv("ANS_MODEL_BILLING_POLICY", "");
  for (const oldPrice of [null, { source: "APIC", quotaPerPoint: 500000 }, { policy: { version: "old-native" } }])
    expect(receiptToMemberPoints(oldPrice, 8137)).toBe(0.016274);
});
it("uses frozen historical FX even when current FX changes or disappears", () => {
  const snapshot = read(fixtureModelBillingPolicy(7));
  vi.stubEnv("ANS_MODEL_BILLING_POLICY", JSON.stringify(fixtureModelBillingPolicy(9)));
  expect(receiptToMemberPoints({ billing: snapshot }, 80000)).toBe(11.2);
  vi.stubEnv("ANS_MODEL_BILLING_POLICY", "");
  expect(receiptToMemberPoints({ billing: snapshot }, 80000)).toBe(11.2);
});
it("never downgrades present corrupt or unknown billing snapshots to the historical rule", () => {
  for (const billing of [undefined, null, {}, { version: "future" }, { ...read(fixtureModelBillingPolicy(7)), pointsPerCny: 1 }])
    expect(() => receiptToMemberPoints({ billing }, 500)).toThrow("MODEL_BILLING_SNAPSHOT_INVALID");
});
it("rounds reservations and receipts upward at six decimals using integer arithmetic", () => {
  const snapshot = read(fixtureModelBillingPolicy(7));
  expect(reserveModelPoints(snapshot, 1, 0, { input: 0.000001, output: 0.000001 })).toBe(0.000001);
  expect(receiptToMemberPoints({ billing: snapshot }, 1)).toBe(0.00014);
  const third = { ...snapshot, receiptConsumptionMultiplier: 3 };
  expect(receiptToMemberPoints({ billing: third }, 1)).toBe(0.000008);
});
it.each([-1, 0.5, NaN, Infinity, 500000001])("rejects invalid or unverified receipt quota %s", quota => {
  expect(() => receiptToMemberPoints({}, quota)).toThrow("MODEL_BILLING_RECEIPT_INVALID");
});
it("allows authoritative zero usage, rejects invalid token estimates and unsafe precision", () => {
  const snapshot = read(fixtureModelBillingPolicy(7));
  expect(receiptToMemberPoints({ billing: snapshot }, 0)).toBe(0);
  expect(() => reserveModelPoints(snapshot, 0.5, 1)).toThrow("MODEL_BILLING_SNAPSHOT_INVALID");
  expect(() => reserveModelPoints(snapshot, 1, -1)).toThrow("MODEL_BILLING_SNAPSHOT_INVALID");
  expect(() => reserveModelPoints(snapshot, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)).toThrow("MODEL_BILLING_SNAPSHOT_INVALID");
});

it("converts catalog USD prices without applying a single-request cap", () => {
  const snapshot = { ...read(fixtureModelBillingPolicy(7), "claude-opus-5-5"), requestMaxPoints: 1 };
  expect(modelUsdToMemberPoints(snapshot, 20)).toBe(1400);
  expect(modelUsdToMemberPoints(snapshot, 0)).toBe(0);
  expect(modelUsdToMemberPoints(snapshot, 0.000001)).toBe(0.00007);
  for (const value of [-1, Infinity, NaN, 0.0000001, Number.MAX_SAFE_INTEGER])
    expect(() => modelUsdToMemberPoints(snapshot, value)).toThrow("MODEL_BILLING_SNAPSHOT_INVALID");
  expect(() => reserveModelPoints(snapshot, 1000000, 0, { input: 20, output: 1 })).toThrow("MODEL_BILLING_REQUEST_LIMIT");
});
it("enforces the exact frozen request budget, independently of catalog conversions", () => {
  const snapshot = { ...read(fixtureModelBillingPolicy(7)), requestMaxPoints: 11.2 };
  expect(reserveModelPoints(snapshot, 1000000, 0, { input: 1, output: 1 })).toBe(11.2);
  expect(() => reserveModelPoints({ ...snapshot, requestMaxPoints: 11.199999 }, 1000000, 0, { input: 1, output: 1 })).toThrow("MODEL_BILLING_REQUEST_LIMIT");
});


it.each([
  ["deepseek-v4.1-flash", 1, 500000, 67],
  ["gpt-6-astra", 0.16, 80000, 10.72],
  ["gpt-6.1-sol", 0.16, 80000, 10.72],
  ["claude-opus-5-5", 1, 500000, 67],
] as const)("supports a historical FX6.7 fixture for %s, with no repeated receipt multiplier", (model, multiplier, quota, points) => {
  const snapshot = read(fixtureModelBillingPolicy(6.7), model);
  expect(snapshot.fx.usdCny).toBe(6.7);
  expect(snapshot.pointsPerCny).toBe(10);
  expect(snapshot.consumptionMultiplier).toBe(multiplier);
  expect(modelUsdToMemberPoints(snapshot, 1)).toBe(points);
  expect(reserveModelPoints(snapshot, 1000000, 0, { input: 1, output: 1 })).toBe(points);
  expect(receiptToMemberPoints({ billing: snapshot }, quota)).toBe(points);
});
it("keeps a historical FX6.7 snapshot frozen after a later config change and enforces its exact cap", () => {
  const snapshot = { ...read(fixtureModelBillingPolicy(6.7), "claude-opus-5-5"), requestMaxPoints: 67 };
  vi.stubEnv("ANS_MODEL_BILLING_POLICY", JSON.stringify(fixtureModelBillingPolicy(7.2)));
  expect(receiptToMemberPoints({ billing: snapshot }, 500000)).toBe(67);
  expect(reserveModelPoints(snapshot, 1000000, 0, { input: 1, output: 1 })).toBe(67);
  expect(() => reserveModelPoints({ ...snapshot, requestMaxPoints: 66.999999 }, 1000000, 0, { input: 1, output: 1 })).toThrow("MODEL_BILLING_REQUEST_LIMIT");
});


it.each([
  ["deepseek-v4.1-flash", 1, 500000, 10],
  ["gpt-6-astra", 0.16, 80000, 1.6],
  ["gpt-6.1-sol", 0.16, 80000, 1.6],
  ["claude-opus-5-5", 1, 500000, 10],
] as const)("uses the approved nominal USD-credit conversion1 for %s while retaining its multiplier", (model, multiplier, quota, points) => {
  const snapshot = read(fixtureModelBillingPolicy(1), model);
  expect(snapshot.fx.usdCny).toBe(1);
  expect(snapshot.pointsPerCny).toBe(10);
  expect(snapshot.consumptionMultiplier).toBe(multiplier);
  expect(modelUsdToMemberPoints(snapshot, 1)).toBe(points);
  expect(reserveModelPoints(snapshot, 1000000, 0, { input: 1, output: 1 })).toBe(points);
  expect(receiptToMemberPoints({ billing: snapshot }, quota)).toBe(points);
});
it("retains GPT.16 exactly once for a full-price receipt at the approved nominal conversion", () => {
  const config = fixtureModelBillingPolicy(1);
  config.models["gpt-6.1-sol"].receiptConsumptionMultiplier = 1;
  const snapshot = read(config);
  expect(receiptToMemberPoints({ billing: snapshot }, 500000)).toBe(1.6);
  vi.stubEnv("ANS_MODEL_BILLING_POLICY", JSON.stringify(fixtureModelBillingPolicy(6.7)));
  expect(receiptToMemberPoints({ billing: snapshot }, 500000)).toBe(1.6);
});
