import type { DbTransaction } from "@/lib/db";

/** Manual approval binds an immutable version; an AI verdict or self-publish is insufficient. */
export async function hasWorkflowManualApproval(
  tx: DbTransaction,
  workflow: { id: string; versions: Array<{ id: string; version: number; createdAt: Date }> },
  version: { id: string; version: number; createdAt: Date },
) {
  const approvals = await tx.auditLog.findMany({
    where: { resourceType: "workflow", resourceId: workflow.id, action: "WORKFLOW_APPROVED", createdAt: { gte: version.createdAt } },
    orderBy: { createdAt: "desc" }, take: 100, select: { createdAt: true, after: true },
  });
  return approvals.some(approval => {
    const after = approval.after;
    if (!after || typeof after !== "object" || Array.isArray(after) || after.status !== "PUBLISHED") return false;
    if (typeof after.publishedVersion === "number") {
      return after.publishedVersion === version.version && (after.versionId === undefined || after.versionId === version.id);
    }
    // Original manual reviews bound the latest immutable version at the approval time.
    return [...workflow.versions].sort((a, b) => a.version - b.version)
      .filter(row => row.createdAt <= approval.createdAt).at(-1)?.id === version.id;
  });
}
