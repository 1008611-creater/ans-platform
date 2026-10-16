import type { DbTransaction } from "@/lib/db";
import { readBenefitFunding } from "./benefit-billing";

export function unifiedModelBilling() {
  return process.env.ANS_UNIFIED_POINTS_ENABLED === "1" && process.env.ANS_APIC_BILLING_ENABLED === "1";
}

/** Statement amounts always come from durable requests, even when output handling failed. */
export async function readMeteredRunCost(tx: DbTransaction, userId: string, parent: { type: "run" | "workflow_run"; id: string }) {
  const rows = await tx.apiComputeRequest.findMany({
    where: { userId, provider: "apic-codex", AND: [
      { price: { path: ["parent", "type"], equals: parent.type } },
      { price: { path: ["parent", "id"], equals: parent.id } },
    ] }, select: { state: true, settledPoints: true, authorizedPoints: true, price: true },
  });
  let settled = 0, pending = 0;
  for (const row of rows) {
    if (readBenefitFunding(row.price)) continue; // Gift USD is recorded in the separate grant ledger.
    if (row.state === "SETTLED") settled += Number(row.settledPoints ?? 0);
    if (["AUTHORIZED", "RUNNING", "UNCERTAIN"].includes(row.state)) pending += Number(row.authorizedPoints);
  }
  return { settledPoints: Math.round(settled * 1e6) / 1e6, pendingPoints: Math.round(pending * 1e6) / 1e6, requestCount: rows.length };
}

/** Keep completed parent records accurate when a late receipt or operator waiver arrives. */
export async function refreshMeteredParentCost(tx: DbTransaction, userId: string, price: unknown) {
  if (!price || typeof price !== "object") return;
  const parent = (price as { parent?: unknown }).parent;
  if (!parent || typeof parent !== "object") return;
  const ref = parent as { type?: unknown; id?: unknown };
  if (!["run", "workflow_run"].includes(String(ref.type)) || typeof ref.id !== "string") return;
  const billing = await readMeteredRunCost(tx, userId, { type: ref.type as "run" | "workflow_run", id: ref.id });
  const command = { where: { id: ref.id, userId, status: { in: ["SUCCEEDED", "FAILED", "CANCELLED"] as ("SUCCEEDED" | "FAILED" | "CANCELLED")[] } }, data: { costPoints: billing.settledPoints + billing.pendingPoints } };
  if (ref.type === "run") await tx.run.updateMany(command);
  else await tx.workflowRun.updateMany(command);
}
