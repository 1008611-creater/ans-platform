import { describe, expect, it } from "vitest";
import { agriOnsiteCommandSchema, agriOnsiteFieldsSchema, agriOnsiteQuerySchema } from "@/contracts/agri-onsite";
import { agriWorkspaceScopeSchema } from "@/contracts/agrihackathon";
const operations = { device: "Laptop and HDMI", conditions: "Venue network pending", schedule: { state: "UNKNOWN", at: null }, status: "NOT_STARTED", result: null };
const fields = { title: "Local demo setup", mode: "LIVE", summary: "Connect projector", backupSummary: "Offline recording ready", operations };
const command = { action: "createOnsite", idempotencyKey: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", submissionId: "exact-submission", demoCheckId: null, acknowledgeStaleSubmission: false, fields };
describe("onsite explicit safe projection contracts", () => {
  it("requires independent write scope and exact source identity", () => {
    expect(agriWorkspaceScopeSchema.parse("ONSITE_WRITE")).toBe("ONSITE_WRITE"); expect(agriOnsiteCommandSchema.parse(command)).toEqual(command);
    for (const extra of [{ actorId: "forged" }, { publicConsent: true }, { checkedAt: new Date().toISOString() }, { fields: { ...fields, internalNote: "hidden" } }]) expect(agriOnsiteCommandSchema.safeParse({ ...command, ...extra }).success).toBe(false);
  });
  it("has no fields for repository, backup URLs, contacts or internal notes", () => {
    for (const text of ["https://example.invalid/private", "http://example.invalid/demo", "www.example.invalid", "person@example.invalid"]) {
      expect(agriOnsiteFieldsSchema.safeParse({ ...fields, summary: text }).success).toBe(false);
      expect(agriOnsiteFieldsSchema.safeParse({ ...fields, operations: { ...operations, device: text } }).success).toBe(false);
    }
    expect(agriOnsiteFieldsSchema.safeParse({ ...fields, backupUrl: "secret" }).success).toBe(false);
  });
  it("preserves unknown/tentative/confirmed timing and requires actual completion result", () => {
    expect(agriOnsiteFieldsSchema.safeParse(fields).success).toBe(true);
    expect(agriOnsiteFieldsSchema.safeParse({ ...fields, operations: { ...operations, schedule: { state: "TENTATIVE", at: "2026-10-09T09:00:00+08:00" } } }).success).toBe(true);
    for (const extra of [{ status: "DONE" }, { result: "already complete" }, { schedule: { state: "CONFIRMED", at: null } }]) expect(agriOnsiteFieldsSchema.safeParse({ ...fields, operations: { ...operations, ...extra } }).success).toBe(false);
  });
  it("requires explicit publication review, CAS and prevents source retargeting in operations", () => {
    const common = { itemId: "item", expectedRevision: 2, idempotencyKey: command.idempotencyKey };
    expect(agriOnsiteCommandSchema.safeParse({ ...common, action: "publishOnsite", reviewedForOnsite: true }).success).toBe(true);
    expect(agriOnsiteCommandSchema.safeParse({ ...common, action: "publishOnsite", reviewedForOnsite: false }).success).toBe(false);
    expect(agriOnsiteCommandSchema.safeParse({ ...common, action: "updateOnsiteOperations", operations }).success).toBe(true);
    expect(agriOnsiteCommandSchema.safeParse({ ...common, action: "updateOnsiteOperations", operations, submissionId: "other" }).success).toBe(false);
  });
  it("keeps onsite-only list free of precise source filtering", () => {
    expect(agriOnsiteQuerySchema.parse({})).toEqual({ scope: "onsite" });
    expect(agriOnsiteQuerySchema.safeParse({ submissionId: "private" }).success).toBe(false);
    expect(agriOnsiteQuerySchema.parse({ scope: "staff", submissionId: "exact" })).toEqual({ scope: "staff", submissionId: "exact" });
    expect(agriOnsiteQuerySchema.safeParse({ scope: "team" }).success).toBe(false);
  });
});
