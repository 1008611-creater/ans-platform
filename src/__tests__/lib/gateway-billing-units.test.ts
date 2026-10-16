// @vitest-environment node
import { expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
import { readModelBillingSnapshot } from "@/server/integrations/model-billing-policy";
import { recordGatewayEvidence } from "@/server/integrations/gateway-evidence";
import { fixtureModelBillingPolicy } from "./model-billing-fixture";

it("keeps raw receipt quota but writes converted ANS point totals and covered excess in one unit", async () => {
  const billing = readModelBillingSnapshot("gpt-6.1-sol", { ANS_MODEL_BILLING_POLICY: JSON.stringify(fixtureModelBillingPolicy(7)) });
  const find = vi.fn().mockResolvedValue({ policyVersion: "apic-usd-cny-points-v2", price: { billing } });
  const execute = vi.fn().mockResolvedValue(1);
  await recordGatewayEvidence({ apiComputeRequest: { findFirstOrThrow: find }, $executeRaw: execute } as never, "owner", "task", {
    kind: "VERIFIED", charge: { requestId: "request123456", quota: 80000, points: 0.16 }, billedPoints: 10,
  });
  const values = execute.mock.calls[0].slice(1);
  expect(values).toContain(80000); expect(values).toContain("11.200000"); expect(values).toContain("10.000000"); expect(values).toContain("1.200000");
  expect(values).not.toContain("0.160000");
  expect(find).toHaveBeenCalledWith({ where: { id: "task", userId: "owner", provider: "apic-codex" }, select: { policyVersion: true, price: true } });
});
it("preserves old historical evidence numeric semantics without looking up any new FX", async () => {
  const execute = vi.fn().mockResolvedValue(1);
  await recordGatewayEvidence({ apiComputeRequest: { findFirstOrThrow: vi.fn().mockResolvedValue({ policyVersion: "apic-final-quota-v1", price: { source: "APIC", quotaPerPoint: 500000 } }) }, $executeRaw: execute } as never, "owner", "task", {
    kind: "VERIFIED", charge: { requestId: "request123456", quota: 8137, points: 0.016274 }, billedPoints: 0.016274,
  });
  expect(execute.mock.calls[0]).toContain("0.016274"); expect(execute.mock.calls[0]).toContain("0.000000");
});
it("rejects a mixed-unit overbilling claim before storing evidence", async () => {
  const execute = vi.fn();
  await expect(recordGatewayEvidence({ apiComputeRequest: { findFirstOrThrow: vi.fn().mockResolvedValue({ policyVersion: "legacy", price: {} }) }, $executeRaw: execute } as never, "owner", "task", {
    kind: "VERIFIED", charge: { requestId: "request123456", quota: 500, points: 0.001 }, billedPoints: 1,
  })).rejects.toThrow("INVALID_BILLED_CHARGE");
  expect(execute).not.toHaveBeenCalled();
});
it("migration preserves immutable quote, old arithmetic and terminal guards while verifying the new snapshot", async () => {
  const sql = await readFile("prisma/migrations/20261016120000_model_billing_units_v2/migration.sql", "utf8");
  expect(sql).toContain('IF NOT (task_.price ? \'billing\') THEN');
  expect(sql).toContain('expected_:=NEW."upstreamQuota"::numeric/500000;');
  expect(sql).toContain('usd-cny-points-v2'); expect(sql).toContain('API_BILLING_RECEIPT_UNITS_INVALID');
  expect(sql).toContain('ceil(NEW."upstreamQuota"::numeric/500000/receipt_*fx_*10*consumption_*1000000)/1000000');
  expect(sql).toContain('NEW."billedPoints">task_."authorizedPoints"');
  expect(sql).toContain("API_BILLING_EVIDENCE_IMMUTABLE");
  expect(sql).not.toContain("DROP TRIGGER"); expect(sql).not.toContain("UPDATE api_compute_requests"); expect(sql).not.toContain("UPDATE quota_ledgers");
});
