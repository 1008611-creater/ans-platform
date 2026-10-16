// @vitest-environment node
import { expect, it } from "vitest";
import { readModelBillingSnapshot } from "@/server/integrations/model-billing-policy";
import { reserveOfficialUsdMicros, officialUsdMicrosFromReceipt, officialUsdMicrosForPointsReserve, readBenefitFunding } from "@/server/integrations/benefit-billing";
import { fixtureModelBillingPolicy } from "./model-billing-fixture";
const quote = (model = "gpt-6-astra", fx = 1) => readModelBillingSnapshot(model, { ANS_MODEL_BILLING_POLICY: JSON.stringify(fixtureModelBillingPolicy(fx)) }, Date.parse("2026-10-16T12:00:00Z"));
it.each([1, 6.7, 7.2])("charges one gift dollar for a GPT official dollar, independent of paid FX%s and .16", fx => {
  expect(officialUsdMicrosFromReceipt({ billing: quote("gpt-6-astra", fx) }, 80000)).toBe(BigInt(1_000_000));
});
it("does not confuse procurement with a consumer gift discount", () => {
  expect(officialUsdMicrosFromReceipt({ billing: quote("claude-opus-5-5") }, 500000)).toBe(BigInt(1_000_000));
  const policy = fixtureModelBillingPolicy(1); policy.models["claude-opus-5-5"].receiptConsumptionMultiplier = 0.8;
  const billing = readModelBillingSnapshot("claude-opus-5-5", { ANS_MODEL_BILLING_POLICY: JSON.stringify(policy) }, Date.parse("2026-10-16T12:00:00Z"));
  expect(officialUsdMicrosFromReceipt({ billing }, 400000)).toBe(BigInt(1_000_000));
});
it("preserves conservative token reserves in official USD, rounded upward to microUSD", () => {
  const billing = quote("deepseek-v4.1-flash");
  expect(reserveOfficialUsdMicros(billing, 1000000, 0)).toBe(BigInt(300000));
  expect(reserveOfficialUsdMicros(billing, 1, 0)).toBe(BigInt(1));
  expect(reserveOfficialUsdMicros(billing, 0, 0)).toBe(BigInt(0));
  expect(() => reserveOfficialUsdMicros(billing, -1, 0)).toThrow();
});
it.each([-1, 0.5, Infinity, NaN, 500000001])("rejects invalid raw receipt %s", q => {
  expect(() => officialUsdMicrosFromReceipt({ billing: quote() }, q)).toThrow();
});
it("does not turn missing or damaged gift pricing into legacy conversion", () => {
  for (const price of [null, {}, { billing: {} }, { billing: null }]) expect(() => officialUsdMicrosFromReceipt(price, 500000)).toThrow();
});
it("distinguishes absent funding from corrupted funding", () => {
  expect(readBenefitFunding({})).toBeNull();
  const gift = { version: "official-usd-gift-v1", grantId: "11111111-1111-4111-8111-111111111111", reservedUsdMicros: "1000000" };
  expect(readBenefitFunding({ benefitFunding: gift })).toEqual(gift);
  for (const bad of [null, {}, { ...gift, reservedUsdMicros: "0" }, { ...gift, reservedUsdMicros: "1000000001" }, { ...gift, grantId: "other" }, { ...gift, extra: true }])
    expect(() => readBenefitFunding({ benefitFunding: bad })).toThrow();
});

it("reverses conservative paid reserve without losing cache ceilings or retail rounding", () => {
  expect(officialUsdMicrosForPointsReserve(quote("gpt-6-astra", 1), 1.6)).toBe(BigInt(1000000));
  expect(officialUsdMicrosForPointsReserve(quote("gpt-6-astra", 1), 0.000001)).toBe(BigInt(1));
  expect(officialUsdMicrosForPointsReserve(quote("claude-opus-5-5", 1), 20)).toBe(BigInt(2000000));
  expect(officialUsdMicrosForPointsReserve(quote("gpt-6-astra", 6.7), 10.72)).toBe(BigInt(1000000));
  for (const bad of [0, -1, Infinity, NaN, 0.0000001]) expect(() => officialUsdMicrosForPointsReserve(quote(), bad)).toThrow();
});
