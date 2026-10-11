import { PLAN_CATALOG_VERSION, type PlanSkuId } from "./plan-catalog";

export type PlanBlockerCode =
  | "MEMBERSHIP_LIFECYCLE_MISSING"
  | "CREDIT_BATCH_ALLOCATION_MISSING"
  | "CREDIT_PURPOSE_ISOLATION_MISSING"
  | "ENTITLEMENT_ENFORCEMENT_INCOMPLETE"
  | "REFUND_REVOCATION_INCOMPLETE"
  | "MEDIA_TERMS_UNCONFIRMED"
  | "PROCUREMENT_COST_UNVERIFIED"
  | "MERCHANT_PLAN_UNVERIFIED"
  | "PRO_DELIVERY_INCOMPLETE";

export type PlanSaleBlocker = Readonly<{
  code: PlanBlockerCode;
  detail: string;
}>;
export type PlanSkuReadiness = Readonly<{
  skuId: PlanSkuId;
  status: "blocked";
  canPurchase: false;
  checkoutUrl: null;
  blockerCodes: readonly PlanBlockerCode[];
}>;
export type PlanSalesReadiness = Readonly<{
  catalogVersion: typeof PLAN_CATALOG_VERSION;
  status: "blocked";
  canPurchase: false;
  checkoutUrl: null;
  blockers: readonly PlanSaleBlocker[];
  skus: readonly PlanSkuReadiness[];
}>;
