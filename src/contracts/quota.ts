import type { VoiceOffer } from "./voice";
export type QuotaAdminOverview = {
 voice?: VoiceOffer & { pendingCount: number; recentCalls: number; cachedAudioBytes: number };
 users: { id: string; username: string; quotaPoints: number; flagged: boolean }[];
 operations: { id: string; userId: string; kind: string; amount: number; balanceAfter: number; note: string; evidenceRef?: string | null; createdAt: string }[];
 disputes: { id: string; buyerId: string; sellerId: string; totalMinor: number }[];
 uncertain: { id: string; userId: string; modelId: string; authorizedPoints: number }[];
 mismatchCount: number;
 pending: number;
 examPending?: { pendingCount: number; reservedPoints: number; items: { id: string; userId: string; points: number; createdAt: string }[] };
 manualRechargeEnabled: boolean;
 ldxp: { enabled: boolean; orders: { id: string; userId: string; tradeNo: string; amountCents: number; points: number; channelId: number; status: string; createdAt: string; paidAt: string | null; lastCheckedAt: string | null }[] };
};
