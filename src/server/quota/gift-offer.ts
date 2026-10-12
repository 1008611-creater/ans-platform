import { db } from "@/lib/db";
import type { CreditGiftOffer } from "@/contracts/credit-gift";
export async function readCreditGiftOffer(userId: string): Promise<CreditGiftOffer> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { quotaClaimedAt: true, flagged: true, deletedAt: true } });
  if (!user || user.flagged || user.deletedAt) return { state: "unavailable" };
  if (user.quotaClaimedAt) return { state: "claimed" };
  const pool = await db.quotaPool.findFirst({ where: { active: true }, orderBy: { createdAt: "desc" }, select: { perUserPoints: true, totalPoints: true, claimedPoints: true } });
  if (!pool || !Number.isSafeInteger(pool.perUserPoints) || pool.perUserPoints <= 0 || pool.totalPoints - pool.claimedPoints < BigInt(pool.perUserPoints)) return { state: "unavailable" };
  return { state: "available", points: pool.perUserPoints };
}
