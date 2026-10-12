import { refreshMeteredParentCost } from "@/server/integrations/metered-cost";
import { db } from "@/lib/db";
import { refundQuota, QuotaError } from "./service";
import { recordGatewayEvidence, lockGatewayBillingAccount } from "@/server/integrations/gateway-evidence";
import { hasAdminPermission } from "@/lib/admin-permission-values";
/** Explicit operator waiver, not an automatic inference that upstream usage was free. */
export async function waiveUncertainRequest(actorId: string, id: string, reason: string) {
 if (!reason.trim() || reason.length > 1000) throw new QuotaError("REASON_REQUIRED", "ACCOUNT_UNAVAILABLE", 400);
 const existing = await db.apiComputeRequest.findUnique({ where: { id }, select: { userId: true } });
 if (!existing) throw new QuotaError("NOT_FOUND", "ACCOUNT_UNAVAILABLE", 404);
 return db.$transaction(async tx => {
   // Global account-first order includes the operator, before task/hold changes.
   for (const owner of [...new Set([actorId, existing.userId])].sort()) await lockGatewayBillingAccount(tx, owner, true);
   const actor = await tx.user.findUnique({ where: { id: actorId }, select: { role: true, flagged: true, deletedAt: true, adminPermissions: true } });
   if (!actor || actor.role !== "ADMIN" || actor.flagged || actor.deletedAt || !hasAdminPermission(actor.adminPermissions, "USERS_MANAGE")) throw new QuotaError("FORBIDDEN", "ACCOUNT_UNAVAILABLE", 403);
   const request = await tx.apiComputeRequest.findUnique({ where: { id } });
   if (!request) throw new QuotaError("NOT_FOUND", "ACCOUNT_UNAVAILABLE", 404);
   if (request.state === "RELEASED") return { released: true, duplicate: true };
   if (request.state !== "UNCERTAIN") throw new QuotaError("REQUEST_NOT_UNCERTAIN", "ACCOUNT_UNAVAILABLE", 409);
   if(request.provider === "apic-codex") await recordGatewayEvidence(tx, request.userId, id, { kind: "WAIVER", actorId });
   const changed = await tx.apiComputeRequest.updateMany({ where: { id, state: "UNCERTAIN" }, data: { state: "RELEASED", settledPoints: 0, finishedAt: new Date() } });
   if (changed.count !== 1) throw new QuotaError("STATE_CONFLICT", "ACCOUNT_UNAVAILABLE", 409);
   if (Number(request.authorizedPoints) > 0) await refundQuota(tx, { userId: request.userId, costPoints: Number(request.authorizedPoints), ref: { type: "api_compute_request", id }, note: reason.trim() });
   await refreshMeteredParentCost(tx, request.userId, request.price);
   await tx.auditLog.create({ data: { actorId, action: "API_COMPUTE_OPERATOR_WAIVER", resourceType: "api_compute_request", resourceId: id, metadata: { reason: reason.trim(), points: Number(request.authorizedPoints), previousOutcome: request.outcome, upstreamCostUnknown: true } } });
   return { released: true, duplicate: false };
 });
}
