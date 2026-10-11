import { PLAN_CATALOG_VERSION, PLAN_SKUS, getPlanSkuById, type PlanSkuId } from "@/domain/billing/plan-catalog";

import type { PlanBlockerCode, PlanSaleBlocker, PlanSkuReadiness, PlanSalesReadiness } from "@/domain/billing/plan-readiness";
export type { PlanBlockerCode, PlanSaleBlocker, PlanSkuReadiness, PlanSalesReadiness } from "@/domain/billing/plan-readiness";

/** Source-backed gaps in this release. Neither an environment enable flag, a
 * merchant URL nor client input constitutes evidence of a completed lifecycle.
 * Replace individual gaps only together with actual implementation and evidence.
 * This module must never be used as an entitlement issuer. */
const COMMON_BLOCKERS: readonly PlanSaleBlocker[] = Object.freeze([
  Object.freeze({ code: "MEMBERSHIP_LIFECYCLE_MISSING", detail: "会员开通、分期发放、续购、到期提醒与权益快照尚未完整实现。" }),
  Object.freeze({ code: "CREDIT_BATCH_ALLOCATION_MISSING", detail: "积分来源批次、到期、扣费分配与原批次返还尚未完整实现。" }),
  Object.freeze({ code: "CREDIT_PURPOSE_ISOLATION_MISSING", detail: "套餐及活动积分尚未在所有市场和转移入口完成服务端用途隔离。" }),
  Object.freeze({ code: "ENTITLEMENT_ENFORCEMENT_INCOMPLETE", detail: "项目、存储、并发、版本与其他套餐权益尚未完整落地和验证。" }),
  Object.freeze({ code: "REFUND_REVOCATION_INCOMPLETE", detail: "套餐退款、已消耗额度核算、卡密撤销及防止重复兑换尚未完整实现。" }),
  Object.freeze({ code: "MEDIA_TERMS_UNCONFIRMED", detail: "大体积媒体保存、归档、流量和退款条款尚未最终确定。" }),
  Object.freeze({ code: "PROCUREMENT_COST_UNVERIFIED", detail: "套餐满额使用的真实模型采购及其他直接成本尚未核验。" }),
  Object.freeze({ code: "MERCHANT_PLAN_UNVERIFIED", detail: "链动小铺会员商品、期限卡与原渠道退款尚未完成对应核验。" }),
]);
const PRO_BLOCKER: PlanSaleBlocker = Object.freeze({
  code: "PRO_DELIVERY_INCOMPLETE", detail: "Pro 批量、分支版本、协作和交付工具尚未完成权益验收。",
});

export function getPlanSalesReadiness(): PlanSalesReadiness {
  return Object.freeze({
    catalogVersion: PLAN_CATALOG_VERSION,
    status: "blocked",
    canPurchase: false,
    checkoutUrl: null,
    blockers: Object.freeze([...COMMON_BLOCKERS, PRO_BLOCKER]),
    skus: Object.freeze(PLAN_SKUS.map((sku): PlanSkuReadiness => Object.freeze({
      skuId: sku.id, status: "blocked", canPurchase: false, checkoutUrl: null,
      blockerCodes: Object.freeze([
        ...COMMON_BLOCKERS.map((blocker) => blocker.code),
        ...(sku.tier === "pro" ? [PRO_BLOCKER.code] : []),
      ]),
    }))),
  });
}

export class PlanSaleUnavailableError extends Error {
  readonly code = "PLAN_SALE_UNAVAILABLE";
  readonly status = 503;
  constructor(readonly skuId: PlanSkuId, readonly blockerCodes: readonly PlanBlockerCode[]) {
    super("PLAN_SALE_UNAVAILABLE");
    this.name = "PlanSaleUnavailableError";
  }
}

/** A future issuing/purchase service must call this at the server boundary.
 * There is deliberately no checkout URL resolver until all sale gates pass. */
export function requirePlanSaleReady(skuId: string): never {
  const sku = getPlanSkuById(skuId);
  const readiness = getPlanSalesReadiness().skus.find((entry) => entry.skuId === sku.id)!;
  throw new PlanSaleUnavailableError(sku.id, readiness.blockerCodes);
}
