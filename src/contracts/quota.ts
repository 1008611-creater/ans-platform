export type QuotaAdminOverview = {
 users: { id: string; username: string; quotaPoints: number; flagged: boolean }[];
 operations: { id: string; userId: string; kind: string; amount: number; balanceAfter: number; note: string; createdAt: string }[];
 disputes: { id: string; buyerId: string; sellerId: string; totalMinor: number }[];
 uncertain: { id: string; userId: string; modelId: string; authorizedPoints: number }[];
 mismatchCount: number;
 pending: number;
 manualRechargeEnabled: boolean;
 ldxp: { enabled: boolean; orders: { id: string; userId: string; tradeNo: string; amountCents: number; points: number; channelId: number; status: string; createdAt: string; paidAt: string | null; lastCheckedAt: string | null }[] };
};
