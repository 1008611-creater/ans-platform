import type { DbTransaction } from "@/lib/db";
import { randomUUID } from "node:crypto";
import type { AgriPopularityView, AgriWallResult } from "@/contracts/agri-wall";
import { AgriWorkspaceError } from "@/contracts/agri-workspace";
import { agriDatabaseClock } from "./workspace";

export interface PopularityRoundRow { id: string; competitionId: string; revision: number; opensAt: Date; closesAt: Date; configuredById: string; frozenAt: Date | null; results: unknown }
export const wallFailure = (code: string, status = 409): never => { throw new AgriWorkspaceError(code, status); };
export async function lockPopularityRound(tx: DbTransaction, competitionId: string) {
  const [row] = await tx.$queryRaw<PopularityRoundRow[]>`SELECT * FROM agri_popularity_rounds WHERE "competitionId"=${competitionId} FOR UPDATE`;
  return row ?? null;
}
interface ResultRow { entryId: string; listingId: string; title: string; teamName: string; votes: number }
/** Only a reviewed public project can compete. Never return voter identities. */
export async function popularityCounts(tx: DbTransaction, round: PopularityRoundRow) {
  return tx.$queryRaw<ResultRow[]>`SELECT w.id AS "entryId",w."listingId",lv.payload->>'title' AS title,t.name AS "teamName",
    (SELECT count(*)::integer FROM agri_popularity_votes v JOIN users voter ON voter.id=v."userId"
      WHERE v."roundId"=${round.id} AND v."wallEntryId"=w.id AND NOT voter.flagged AND voter."deletedAt" IS NULL
      AND v."userId"<>l."sellerId"
      AND NOT EXISTS(SELECT 1 FROM team_members tm WHERE tm."teamId"=tc."teamId" AND tm."userId"=v."userId" AND tm.status='ACTIVE')
      AND NOT EXISTS(SELECT 1 FROM agri_official_roster_members m JOIN agri_official_rosters r ON r.id=m."rosterId" WHERE r."teamCompetitionId"=tc.id AND m."userId"=v."userId")) AS votes
    FROM agri_wall_entries w JOIN team_competitions tc ON tc.id=w."teamCompetitionId" JOIN teams t ON t.id=tc."teamId"
    JOIN market_listings l ON l.id=w."listingId" JOIN market_listing_versions lv ON lv."listingId"=l.id AND lv.version=l."publishedVersion"
    JOIN users seller ON seller.id=l."sellerId" WHERE w."competitionId"=${round.competitionId} AND l.status='PUBLISHED'
    AND NOT seller.flagged AND seller."deletedAt" IS NULL AND lv.payload->>'category'='competition' AND lv.payload->>'subcategory'='agri-wall'
    ORDER BY votes DESC,w.id`;
}
export function rankPopularityResults(rows: ResultRow[]): AgriWallResult[] {
  const ordered = [...rows].sort((a,b) => b.votes-a.votes || a.entryId.localeCompare(b.entryId));
  let rank = 0;
  return ordered.map((row,index) => {
    if (index===0 || row.votes!==ordered[index-1].votes) rank=index+1;
    return { ...row, rank, winner: rank===1 && row.votes>0 };
  });
}
export async function freezePopularityRound(tx: DbTransaction, round: PopularityRoundRow) {
  if (!round.frozenAt && (await agriDatabaseClock(tx))>=round.closesAt) {
    const results = rankPopularityResults(await popularityCounts(tx, round));
    const now = await agriDatabaseClock(tx);
    await tx.$executeRaw`UPDATE agri_popularity_rounds SET "frozenAt"=${now},results=${JSON.stringify(results)}::jsonb WHERE id=${round.id} AND "frozenAt" IS NULL`;
    round.frozenAt=now; round.results=results;
  }
  return round;
}
export async function popularityView(tx: DbTransaction, round: PopularityRoundRow | null): Promise<AgriPopularityView | null> {
  if (!round) return null;
  await freezePopularityRound(tx,round);
  const now=await agriDatabaseClock(tx);
  return { revision:round.revision,opensAt:round.opensAt.toISOString(),closesAt:round.closesAt.toISOString(),
    state:round.frozenAt ? "CLOSED" : now<round.opensAt ? "NOT_OPEN" : "OPEN",frozenAt:round.frozenAt?.toISOString()??null,
    results:round.frozenAt ? round.results as AgriWallResult[] : rankPopularityResults(await popularityCounts(tx,round)) };
}
/** Market writes take the round lock first so withdrawal or revision cannot race finalization. */
export async function lockAgriPopularityForListing(tx: DbTransaction, listingId: string) {
  const rounds=await tx.$queryRaw<PopularityRoundRow[]>`SELECT r.* FROM agri_popularity_rounds r JOIN agri_wall_entries w ON w."competitionId"=r."competitionId" WHERE w."listingId"=${listingId} ORDER BY r.id FOR UPDATE OF r`;
  for (const round of rounds) await freezePopularityRound(tx,round);
  return rounds;
}
export async function assertAgriListingRevision(tx: DbTransaction,listingId: string,payload: { category: string; subcategory: string; priceMinor: number; fulfillment: string; execution?: unknown; computeIncluded: boolean; pricingTiers?: unknown[] }) {
  const [wall]=await tx.$queryRaw<Array<{id:string}>>`SELECT id FROM agri_wall_entries WHERE "listingId"=${listingId} LIMIT 1`;
  if (wall && (payload.category!=="competition" || payload.subcategory!=="agri-wall" || payload.priceMinor!==0 || payload.fulfillment!=="resource" || payload.execution || payload.computeIncluded || payload.pricingTiers?.length)) wallFailure("AGRI_WALL_CATEGORY_LOCKED");
}
export interface AgriPopularityStarState { open: boolean; eligible: boolean; voted: boolean }
/** Read-only metadata for the one Star action. Reading never backfills pre-window Stars. */
export async function readAgriPopularityStarState(tx: DbTransaction, listingId: string, userId: string): Promise<AgriPopularityStarState | undefined> {
  const [state] = await tx.$queryRaw<AgriPopularityStarState[]>`SELECT
    (r."frozenAt" IS NULL AND clock_timestamp()>=r."opensAt" AND clock_timestamp()<r."closesAt") AS open,
    (NOT u.flagged AND u."deletedAt" IS NULL AND l."sellerId"<>${userId}
      AND NOT EXISTS(SELECT 1 FROM team_members tm WHERE tm."teamId"=tc."teamId" AND tm."userId"=${userId} AND tm.status='ACTIVE')
      AND NOT EXISTS(SELECT 1 FROM agri_official_roster_members m JOIN agri_official_rosters roster ON roster.id=m."rosterId" WHERE roster."teamCompetitionId"=tc.id AND m."userId"=${userId})) AS eligible,
    EXISTS(SELECT 1 FROM agri_popularity_votes v WHERE v."roundId"=r.id AND v."wallEntryId"=w.id AND v."userId"=${userId}) AS voted
    FROM agri_wall_entries w JOIN agri_popularity_rounds r ON r."competitionId"=w."competitionId"
    JOIN team_competitions tc ON tc.id=w."teamCompetitionId" JOIN market_listings l ON l.id=w."listingId"
    JOIN market_listing_versions lv ON lv."listingId"=l.id AND lv.version=l."publishedVersion"
    JOIN users u ON u.id=${userId}
    WHERE w."listingId"=${listingId} AND l.status='PUBLISHED' AND lv."reviewedAt" IS NOT NULL
      AND lv.payload->>'category'='competition' AND lv.payload->>'subcategory'='agri-wall' LIMIT 1`;
  return state;
}
/** The actual OPEN-window Star write casts a vote, including an explicit repeat of an older Star. */
export async function syncAgriPopularityStar(tx: DbTransaction,listingId: string,userId: string,starred: boolean) {
  const rounds=await lockAgriPopularityForListing(tx,listingId);
  for (const round of rounds) {
    const now=await agriDatabaseClock(tx);
    if (round.frozenAt || now<round.opensAt || now>=round.closesAt) continue;
    const [wall]=await tx.$queryRaw<Array<{id:string;eligible:boolean}>>`SELECT w.id,
      (u.id IS NOT NULL AND NOT u.flagged AND u."deletedAt" IS NULL AND l."sellerId"<>${userId}
       AND NOT EXISTS(SELECT 1 FROM team_members tm WHERE tm."teamId"=tc."teamId" AND tm."userId"=${userId} AND tm.status='ACTIVE')
       AND NOT EXISTS(SELECT 1 FROM agri_official_roster_members m JOIN agri_official_rosters r ON r.id=m."rosterId" WHERE r."teamCompetitionId"=tc.id AND m."userId"=${userId})) AS eligible
      FROM agri_wall_entries w JOIN team_competitions tc ON tc.id=w."teamCompetitionId" JOIN market_listings l ON l.id=w."listingId"
      LEFT JOIN users u ON u.id=${userId} WHERE w."listingId"=${listingId} AND w."competitionId"=${round.competitionId}`;
    if (!wall) continue;
    // Guards check database time again at the actual write, including races near the deadline.
    if (starred && wall.eligible) await tx.$executeRaw`INSERT INTO agri_popularity_votes(id,"competitionId","roundId","wallEntryId","userId","createdAt") VALUES(${randomUUID()},${round.competitionId},${round.id},${wall.id},${userId},${now}) ON CONFLICT("roundId","wallEntryId","userId") DO NOTHING`;
    else await tx.$executeRaw`DELETE FROM agri_popularity_votes WHERE "roundId"=${round.id} AND "wallEntryId"=${wall.id} AND "userId"=${userId}`;
  }
}
