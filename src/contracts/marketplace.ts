import { z } from "zod";
import { marketWorkflowBindingSchema } from "./market-workflow";

export const marketCategorySchema = z.enum([
  "learning", "career", "aigc", "web", "github", "business", "productivity", "competition",
]);
export const marketOrderStatusSchema = z.enum([
  "AWAITING_PAYMENT", "AWAITING_REQUIREMENTS", "IN_PROGRESS", "DELIVERED",
  "REVISION_REQUESTED", "COMPLETED", "CANCELLED", "DISPUTED", "REFUND_PENDING", "REFUNDED",
]);
export const marketMoneySchema = z.number().int().min(1).max(100_000_000);
const safeUrl = z.string().trim().url().max(1000).refine((value) => {
  const url = new URL(value);
  return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password;
}, "INVALID_URL");
const httpsUrl = safeUrl.refine(value => new URL(value).protocol === "https:", "HTTPS_REQUIRED");
const githubUrl = httpsUrl.refine(value => {
  const url = new URL(value);
  return url.hostname === "github.com" && !url.port && !url.search && !url.hash && /^\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+\/?$/.test(url.pathname);
}, "INVALID_GITHUB_URL");
export const marketTierIdSchema = z.string().regex(/^[a-zA-Z0-9_-]{1,60}$/);
export const marketPricingTierSchema = z.object({
  id: marketTierIdSchema,
  title: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(1000),
  priceMinor: marketMoneySchema,
  deliverables: z.array(z.string().trim().min(1).max(300)).min(1).max(20),
}).strict();
export type MarketPricingTier = z.infer<typeof marketPricingTierSchema>;
export const marketStarInputSchema = z.object({ starred: z.boolean() }).strict();
export const marketListingInputSchema = z.object({
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).min(3).max(80),
  title: z.string().trim().min(2).max(100),
  summary: z.string().trim().min(10).max(300),
  description: z.string().trim().min(20).max(20_000),
  category: marketCategorySchema,
  subcategory: z.string().trim().min(1).max(80),
  execution: marketWorkflowBindingSchema.optional(),
  fulfillment: z.enum(["service", "resource"]),
  priceMinor: z.number().int().min(0).max(100_000_000),
  currency: z.literal("CNY"),
  deliveryDays: z.number().int().min(1).max(90),
  revisionLimit: z.number().int().min(0).max(20),
  computeIncluded: z.boolean(),
  deliverables: z.array(z.string().trim().min(1).max(300)).min(1).max(20),
  licenseTerms: z.string().trim().min(10).max(3000),
  coverUrl: httpsUrl.optional(),
  githubUrl: githubUrl.optional(),
  usageUrl: httpsUrl.optional(),
  pricingTiers: z.array(marketPricingTierSchema).max(6).refine(tiers => new Set(tiers.map(tier => tier.id)).size === tiers.length, "DUPLICATE_TIER_ID").optional(),
  previewUrl: safeUrl.optional(),
  sourceUrl: safeUrl.optional(),
}).strict();
export const marketListingRevisionSchema = z.object({
  expectedVersion: z.number().int().positive(),
  listing: marketListingInputSchema,
}).strict();
export const marketOrderCreateSchema = z.object({
  listingId: z.string().trim().min(1).max(100),
  paymentMethod: z.enum(["POINTS", "WECHAT", "ALIPAY"]).optional(),
  tierId: marketTierIdSchema.optional(),
  expectedVersion: z.number().int().positive(),
  idempotencyKey: z.string().regex(/^[a-zA-Z0-9_-]{8,80}$/),
  requirements: z.string().trim().max(10_000).default(""),
}).strict();
export const marketOrderActionSchema = z.object({
  action: z.enum(["submit_requirements", "deliver", "request_revision", "accept", "cancel", "dispute"]),
  expectedRevision: z.number().int().nonnegative(),
  idempotencyKey: z.string().regex(/^[a-zA-Z0-9_-]{8,80}$/),
  message: z.string().trim().max(20_000).default(""),
  artifactVersionId: z.string().trim().min(1).max(100).optional(),
}).strict().superRefine((input, ctx) => {
  if (["submit_requirements", "deliver", "request_revision", "dispute"].includes(input.action) && !input.message) {
    ctx.addIssue({ code: "custom", path: ["message"], message: "MESSAGE_REQUIRED" });
  }
  if (input.artifactVersionId && input.action !== "deliver") {
    ctx.addIssue({ code: "custom", path: ["artifactVersionId"], message: "DELIVERY_ONLY" });
  }
});
export const marketMessageSchema = z.object({
  content: z.string().trim().min(1).max(4000),
  idempotencyKey: z.string().regex(/^[a-zA-Z0-9_-]{8,80}$/),
}).strict();
export const marketReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  content: z.string().trim().min(1).max(2000),
}).strict();

export type MarketListingInput = z.infer<typeof marketListingInputSchema>;
export type MarketOrderCreateInput = z.infer<typeof marketOrderCreateSchema>;
export type MarketOrderStatus = z.infer<typeof marketOrderStatusSchema>;
export type MarketOrderAction = z.infer<typeof marketOrderActionSchema>;
export const marketQuoteSchema = marketListingInputSchema.extend({
  paymentProvider: z.enum(["wechat", "alipay"]).optional(),
  selectedTierId: marketTierIdSchema.optional(),
  selectedTierTitle: z.string().trim().min(1).max(80).optional(),
  priceMinor: marketMoneySchema,
  listingId: z.string().min(1),
  listingVersion: z.number().int().positive(),
  sellerId: z.string().min(1),
  commissionBps: z.number().int().min(0).max(10_000),
  platformFeeMinor: z.number().int().nonnegative(),
  sellerDueMinor: z.number().int().nonnegative(),
}).refine((quote) => quote.platformFeeMinor + quote.sellerDueMinor === quote.priceMinor && quote.platformFeeMinor === Math.floor(quote.priceMinor * quote.commissionBps / 10_000), "INVALID_QUOTE");
export type MarketQuote = z.infer<typeof marketQuoteSchema>;

/** Normalized provider events. Raw webhook bodies must first pass adapter verification. */
export const marketProviderEventSchema = z.object({
  provider: z.string().regex(/^[a-z0-9_-]{1,40}$/),
  eventId: z.string().min(1).max(120),
  orderId: z.string().min(1).max(100),
  paymentId: z.string().min(1).max(120),
  type: z.enum(["payment_succeeded", "refund_succeeded"]),
  amountMinor: marketMoneySchema,
  currency: z.string().regex(/^[A-Z]{3}$/),
  refundId: z.string().min(1).max(120).optional(),
  refundRequestId: z.string().min(1).max(100).optional(),
}).strict().superRefine((event, ctx) => {
  if (event.type === "refund_succeeded" && !event.refundId) {
    ctx.addIssue({ code: "custom", path: ["refundId"], message: "REFUND_ID_REQUIRED" });
  }
});
export type MarketProviderEvent = z.infer<typeof marketProviderEventSchema>;
