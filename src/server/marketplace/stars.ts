import { lockAgriPopularityForListing, readAgriPopularityStarState, syncAgriPopularityStar } from "@/server/competitions/agrihackathon/popularity";
import type { DbTransaction } from "@/lib/db";
import { marketStarInputSchema } from "@/contracts/marketplace";
import { MarketRuleError } from "@/domain/marketplace/order";
import { marketTransaction, requireMarketActor } from "./shared";

async function requirePublicListing(tx: DbTransaction, listingId: string) {
  const listing = await tx.marketListing.findFirst({
    where: { id: listingId, status: "PUBLISHED", publishedVersion: { not: null }, seller: { deletedAt: null, flagged: false } },
    select: { id: true },
  });
  if (!listing) throw new MarketRuleError("NOT_FOUND", 404);
}

async function starState(tx: DbTransaction, listingId: string, userId?: string) {
  const [starCount, star] = await Promise.all([
    tx.marketListingStar.count({ where: { listingId } }),
    userId ? tx.marketListingStar.findUnique({ where: { userId_listingId: { userId, listingId } }, select: { id: true } }) : Promise.resolve(null),
  ]);
  const eventVote = userId ? await readAgriPopularityStarState(tx, listingId, userId) : undefined;
  return { starCount, starred: Boolean(star), ...(eventVote ? { eventVote } : {}) };
}

export async function getMarketListingStar(listingId: string, userId?: string) {
  return marketTransaction(async tx => {
    if (userId) await requireMarketActor(tx, userId);
    await requirePublicListing(tx, listingId);
    return starState(tx, listingId, userId);
  });
}

/** PUT desired state, never toggle: request retries preserve the same result. */
export async function setMarketListingStar(listingId: string, userId: string, raw: unknown) {
  const input = marketStarInputSchema.parse(raw);
  return marketTransaction(async tx => {
    await lockAgriPopularityForListing(tx, listingId);
    await requireMarketActor(tx, userId);
    await requirePublicListing(tx, listingId);
    if (input.starred) {
      await tx.marketListingStar.upsert({
        where: { userId_listingId: { userId, listingId } },
        create: { userId, listingId }, update: {}, select: { id: true },
      });
    } else {
      await tx.marketListingStar.deleteMany({ where: { userId, listingId } });
    }
    await syncAgriPopularityStar(tx, listingId, userId, input.starred);
    return starState(tx, listingId, userId);
  });
}
