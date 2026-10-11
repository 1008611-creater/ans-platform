import type { MarketListingInput, MarketOrderStatus, MarketQuote } from "./marketplace";
export type MarketOfferView = {
  id: string; slug: string; official: boolean; status: string; version: number;
  seller: { id: string; username: string; nickname: string | null; avatar: string | null };
  listing: MarketListingInput; submittedAt: string | null; reviewedAt: string | null; reviewNote: string | null;
};
export type MarketOrderSummary = { id: string; buyerId: string; sellerId: string; status: MarketOrderStatus; quote: MarketQuote; revision: number; updatedAt: string };
export type MarketOrderView = MarketOrderSummary & {
  paymentMethod?: string; listingId: string; revisionRequests: number; requirements: string; paidAt: string | null; completedAt: string | null; createdAt: string;
  events: { id: string; actorId: string | null; action: string; fromStatus: MarketOrderStatus | null; toStatus: MarketOrderStatus; revision: number; message: string; createdAt: string }[];
  deliveries: { id: string; revision: number; markdown: string; createdAt: string }[];
  messages: { id: string; authorId: string; content: string; createdAt: string }[];
  review: { rating: number; content: string; createdAt: string } | null;
};
