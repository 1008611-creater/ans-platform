import type { MarketListingInput, MarketOrderAction, MarketOrderStatus, MarketQuote } from "@/contracts/marketplace";

export class MarketRuleError extends Error {
  constructor(public readonly code: string, public readonly status = 409) {
    super(code);
    this.name = "MarketRuleError";
  }
}

/** Prices are integer fen. No floating-point currency or implicit platform fee. */
export function buildMarketQuote(
  listing: MarketListingInput,
  identity: { listingId: string; listingVersion: number; sellerId: string },
  commissionBps: number,
): MarketQuote {
  if (listing.priceMinor <= 0) throw new MarketRuleError("FREE_RESOURCE", 400);
  if (!Number.isInteger(commissionBps) || commissionBps < 0 || commissionBps > 10_000) {
    throw new MarketRuleError("PRICING_NOT_CONFIGURED", 503);
  }
  const platformFeeMinor = Math.floor(listing.priceMinor * commissionBps / 10_000);
  return { ...listing, ...identity, commissionBps, platformFeeMinor, sellerDueMinor: listing.priceMinor - platformFeeMinor };
}

export function nextOrderStatus(
  order: { status: MarketOrderStatus; revisionRequests: number; revisionLimit: number },
  action: MarketOrderAction["action"],
  role: "buyer" | "seller",
): MarketOrderStatus {
  switch (action) {
    case "submit_requirements":
      if (role !== "buyer") throw new MarketRuleError("FORBIDDEN", 403);
      if (order.status === "AWAITING_REQUIREMENTS") return "IN_PROGRESS";
      break;
    case "deliver":
      if (role !== "seller") throw new MarketRuleError("FORBIDDEN", 403);
      if (["IN_PROGRESS", "REVISION_REQUESTED"].includes(order.status)) return "DELIVERED";
      break;
    case "request_revision":
      if (role !== "buyer") throw new MarketRuleError("FORBIDDEN", 403);
      if (order.status === "DELIVERED") {
        if (order.revisionRequests >= order.revisionLimit) throw new MarketRuleError("REVISION_LIMIT_REACHED");
        return "REVISION_REQUESTED";
      }
      break;
    case "accept":
      if (role !== "buyer") throw new MarketRuleError("FORBIDDEN", 403);
      if (order.status === "DELIVERED") return "COMPLETED";
      break;
    case "cancel":
      if (order.status === "AWAITING_PAYMENT") return "CANCELLED";
      break;
    case "dispute":
      if (role !== "buyer") throw new MarketRuleError("FORBIDDEN", 403);
      if (["AWAITING_REQUIREMENTS", "IN_PROGRESS", "DELIVERED", "REVISION_REQUESTED", "COMPLETED"].includes(order.status)) return "DISPUTED";
      break;
  }
  throw new MarketRuleError("INVALID_ORDER_STATE");
}

export type CashPosting = {
  account: "PROVIDER_RECEIVABLE" | "BUYER_HELD" | "SELLER_PAYABLE" | "PLATFORM_REVENUE" | "REFUND_PAYABLE";
  amountMinor: number;
};

/** A balanced journal is a claim/accounting record, never proof of seller payout. */
export function paymentPostings(totalMinor: number): CashPosting[] {
  return [
    { account: "PROVIDER_RECEIVABLE", amountMinor: totalMinor },
    { account: "BUYER_HELD", amountMinor: -totalMinor },
  ];
}

export function completionPostings(quote: MarketQuote): CashPosting[] {
  return [
    { account: "BUYER_HELD", amountMinor: quote.priceMinor },
    { account: "SELLER_PAYABLE", amountMinor: -quote.sellerDueMinor },
    { account: "PLATFORM_REVENUE", amountMinor: -quote.platformFeeMinor },
  ].filter((posting) => posting.amountMinor !== 0) as CashPosting[];
}
