import { randomUUID } from "node:crypto";
import type { DbTransaction } from "@/lib/db";
import type { ApicCharge } from "./apic-billing";
import { QuotaError, normalizeQuotaAmount } from "@/server/quota/service";

export async function recordGatewayEvidence(tx: DbTransaction, owner: string, requestId: string,
 command: { kind: "VERIFIED"; charge: ApicCharge; billedPoints: number } | { kind: "REJECTED"; status: number; upstreamRequestId?: string } | { kind: "WAIVER"; actorId: string }) {
 const task = await tx.apiComputeRequest.findFirstOrThrow({ where: { id: requestId, userId: owner, provider: "apic-codex" }, select: { policyVersion: true } });
 const charge = command.kind === "VERIFIED" ? command.charge : null;
 const billed = command.kind === "VERIFIED" ? normalizeQuotaAmount(command.billedPoints).toFixed(6) : "0.000000";
 const upstream = charge ? normalizeQuotaAmount(charge.points).toFixed(6) : null;
 const coveredMicros = charge ? BigInt(Math.round(normalizeQuotaAmount(charge.points)*1e6)) - BigInt(Math.round(normalizeQuotaAmount(command.kind === "VERIFIED" ? command.billedPoints : 0)*1e6)) : null;
 if (coveredMicros !== null && coveredMicros < BigInt(0)) throw new Error("INVALID_BILLED_CHARGE");
 const covered = coveredMicros === null ? null : `${coveredMicros / BigInt(1000000)}.${(coveredMicros % BigInt(1000000)).toString().padStart(6,"0")}`;
 const rawRequestId = charge?.requestId ?? (command.kind === "REJECTED" ? command.upstreamRequestId : undefined);
 const upstreamRequestId = rawRequestId && /^[A-Za-z0-9_-]{8,128}$/.test(rawRequestId) ? rawRequestId : null;
 await tx.$executeRaw`INSERT INTO api_compute_billing_evidence(id,"requestId","ownerId",kind,"upstreamRequestId","upstreamQuota","upstreamPoints","billedPoints","platformCoveredPoints","rejectedUpstreamStatus","actorId","policyVersion")
  VALUES(${randomUUID()},${requestId},${owner},${command.kind},${upstreamRequestId},${charge?.quota ?? null},${upstream}::numeric,${billed}::numeric,${covered}::numeric,${command.kind === "REJECTED" ? command.status : null},${command.kind === "WAIVER" ? command.actorId : null},${task.policyVersion})`;
}
/** Null identifies a historical request without additive evidence. Existing
 * WAIVER/VERIFIED evidence always overrides legacy outcome heuristics. */
export async function hasNonexecutionEvidence(tx: DbTransaction, owner: string, requestId: string): Promise<boolean | null> {
 const rows = await tx.$queryRaw<{kind:string}[]>`SELECT kind FROM api_compute_billing_evidence WHERE "requestId"=${requestId} AND "ownerId"=${owner}`;
 return rows.length === 0 ? null : rows[0].kind === "REJECTED";
}

/** Account locks precede request mutations. Existing liabilities may finish after a block. */
export async function lockGatewayBillingAccount(tx: DbTransaction, owner: string, reconcile = false) {
 const rows = await tx.$queryRaw<{id:string;flagged:boolean;deletedAt:Date|null}[]>`SELECT id,flagged,"deletedAt" FROM users WHERE id=${owner} FOR UPDATE`;
 const user = rows[0];
 if (!user || (!reconcile && (user.flagged || user.deletedAt))) throw new QuotaError("ACCOUNT_UNAVAILABLE","ACCOUNT_UNAVAILABLE",403);
}
