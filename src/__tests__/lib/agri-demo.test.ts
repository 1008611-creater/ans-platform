import { describe, expect, it } from "vitest";
import { agriDemoCommandSchema, agriDemoSnapshotSchema, agriDemoDueSchema } from "@/contracts/agri-demo";
const condition = { status: "PASS", note: "Manual check" };
const demo = { schemaVersion: 1, mode: "LIVE", description: "Laptop screen demo", device: condition, compatibility: condition, network: condition, audio: condition,
  backup: { ...condition, url: null, artifactVersionId: null }, conclusion: "PASS", recheckDue: { state: "UNKNOWN", at: null } };
const command = { action: "recordDemoCheck", idempotencyKey: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", submissionId: "submission", expectedLatestCheckId: null,
  acknowledgeStaleSubmission: false, basis: "METADATA", demo, internalNote: null };
describe("strict exact-version Demo commands", () => {
  it("requires all conditions, explicit stale acknowledgement and exact recheck parent", () => {
    expect(agriDemoCommandSchema.parse(command)).toEqual(command);
    for (const field of ["expectedLatestCheckId", "acknowledgeStaleSubmission", "basis"]) {
      const input = { ...command }; delete input[field as keyof typeof input]; expect(agriDemoCommandSchema.safeParse(input).success).toBe(false);
    }
    expect(agriDemoCommandSchema.safeParse({ ...command, checkedAt: "2026-10-08T00:00:00Z" }).success).toBe(false);
    expect(agriDemoCommandSchema.safeParse({ ...command, checkedById: "forged" }).success).toBe(false);
  });
  it("refuses PASS for untested, failed or unreachable conditions", () => {
    for (const status of ["NOT_TESTED", "NEEDS_ACTION", "UNREACHABLE"]) expect(agriDemoSnapshotSchema.safeParse({ ...demo, network: { status, note: "" } }).success).toBe(false);
    expect(agriDemoSnapshotSchema.safeParse({ ...demo, conclusion: "NEEDS_ACTION", network: { status: "NOT_TESTED", note: "Pending local network" } }).success).toBe(true);
    expect(agriDemoSnapshotSchema.safeParse({ ...demo, conclusion: "UNREACHABLE", network: { status: "UNREACHABLE", note: "Unavailable" } }).success).toBe(true);
  });
  it("keeps unknown, tentative and confirmed dates distinct without inventing dates", () => {
    expect(agriDemoDueSchema.safeParse({ state: "UNKNOWN", at: null }).success).toBe(true);
    expect(agriDemoDueSchema.safeParse({ state: "TENTATIVE", at: "2026-10-10T09:00:00+08:00" }).success).toBe(true);
    expect(agriDemoDueSchema.safeParse({ state: "CONFIRMED", at: null }).success).toBe(false);
    expect(agriDemoDueSchema.safeParse({ state: "UNKNOWN", at: "2026-10-10T01:00:00Z" }).success).toBe(false);
    expect(agriDemoSnapshotSchema.safeParse({ ...demo, recheckDue: { state: "CONFIRMED", at: "2026-10-10T01:00:00Z" } }).success).toBe(false);
  });
  it("never accepts token-bearing URLs and requires private authority for backup references", () => {
    for (const url of ["https://example.invalid/?token=secret", "https://name:secret@example.invalid/demo", "http://example.invalid/demo", "https://example.invalid/demo#token"]) {
      expect(agriDemoCommandSchema.safeParse({ ...command, basis: "PRIVATE_MATERIALS", demo: { ...demo, backup: { ...demo.backup, url } } }).success).toBe(false);
    }
    const withReference = { ...command, demo: { ...demo, backup: { ...demo.backup, artifactVersionId: "version" } } };
    expect(agriDemoCommandSchema.safeParse(withReference).success).toBe(false);
    expect(agriDemoCommandSchema.safeParse({ ...withReference, basis: "PRIVATE_MATERIALS" }).success).toBe(true);
  });
  it("bounds all text and rejects hidden expansions", () => {
    expect(agriDemoSnapshotSchema.safeParse({ ...demo, description: "x".repeat(2001) }).success).toBe(false);
    expect(agriDemoSnapshotSchema.safeParse({ ...demo, device: { ...condition, contacts: "private" } }).success).toBe(false);
    expect(agriDemoSnapshotSchema.safeParse({ ...demo, backup: { ...demo.backup, internalNote: "private" } }).success).toBe(false);
  });
});
