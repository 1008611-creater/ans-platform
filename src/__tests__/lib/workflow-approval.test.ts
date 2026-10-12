// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import type { DbTransaction } from "@/lib/db";
import { hasWorkflowManualApproval } from "@/server/workflows/approval";
const v1 = { id: "v1", version: 1, createdAt: new Date("2026-10-13T00:00:00Z") };
const v2 = { id: "v2", version: 2, createdAt: new Date("2026-10-13T02:00:00Z") };
const workflow = { id: "w1", versions: [v2, v1] };
function audit(after: unknown, createdAt = new Date("2026-10-13T01:00:00Z")) {
  const findMany = vi.fn().mockResolvedValue([{ after, createdAt }]);
  return { tx: { auditLog: { findMany } } as unknown as DbTransaction, findMany };
}
describe("immutable manual approval evidence", () => {
  it.each([null, { status: "PENDING" }, { status: "PUBLISHED", publishedVersion: 2 }, { status: "PUBLISHED", publishedVersion: 1, versionId: "wrong-v1" }])("rejects mismatched approval %j", async after => {
    expect(await hasWorkflowManualApproval(audit(after).tx, workflow, v1)).toBe(false);
  });
  it("accepts exact version approval and scopes lookup to workflow and version time", async () => {
    const fixture = audit({ status: "PUBLISHED", publishedVersion: 1, versionId: "v1" });
    expect(await hasWorkflowManualApproval(fixture.tx, workflow, v1)).toBe(true);
    expect(fixture.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { resourceType: "workflow", resourceId: "w1", action: "WORKFLOW_APPROVED", createdAt: { gte: v1.createdAt } } }));
  });
  it("retains historical manual approvals regardless of database version sort order", async () => {
    const tx = audit({ status: "PUBLISHED" }).tx;
    expect(await hasWorkflowManualApproval(tx, workflow, v1)).toBe(true);
    expect(await hasWorkflowManualApproval(tx, workflow, v2)).toBe(false);
  });
});
