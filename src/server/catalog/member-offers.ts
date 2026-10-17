import { db } from "@/lib/db";
import { marketListingInputSchema } from "@/contracts/marketplace";
import type { MarketOfferView } from "@/contracts/marketplace-view";

interface PublicOfferRow {
  source: "market" | "wall";
  id: string;
  slug: string;
  official: boolean;
  status: string;
  version: number;
  payload: unknown;
  sellerId: string;
  username: string;
  nickname: string | null;
  avatar: string | null;
}

/** Catalog cards need published offers, not vote counts, viewer state or round finalization.
 * Read the exact publication pointers in one snapshot without transactions or write locks.
 * Do not cache completed reads: withdrawals and seller suspension apply on the next request.
 */
export async function listCatalogMemberOffers() {
  const competitionId = process.env.ANS_AGRIHACKATHON_COMPETITION_ID?.trim() ?? "";
  const rows = await db.$queryRaw<PublicOfferRow[]>`
    WITH market AS (
      SELECT l.id, l.slug, l.official, l.status, v.version, v.payload,
        l."sellerId", u.username, u.nickname, u.avatar, l."updatedAt" AS "sortAt", l.id AS "sortId"
      FROM market_listings l
      JOIN market_listing_versions v ON v."listingId" = l.id AND v.version = l."publishedVersion"
      JOIN users u ON u.id = l."sellerId"
      WHERE l.status = 'PUBLISHED' AND NOT u.flagged AND u."deletedAt" IS NULL
      ORDER BY l."updatedAt" DESC LIMIT 100
    ), wall AS (
      SELECT l.id, l.slug, l.official, l.status, v.version, v.payload,
        l."sellerId", u.username, u.nickname, u.avatar, w."createdAt" AS "sortAt", w.id AS "sortId"
      FROM agri_wall_entries w
      JOIN team_competitions tc ON tc.id = w."teamCompetitionId"
      JOIN teams t ON t.id = tc."teamId"
      JOIN market_listings l ON l.id = w."listingId"
      JOIN market_listing_versions v ON v."listingId" = l.id AND v.version = l."publishedVersion"
      JOIN users u ON u.id = l."sellerId"
      WHERE w."competitionId" = ${competitionId}
        AND EXISTS (SELECT 1 FROM agri_workspaces ws WHERE ws."competitionId" = w."competitionId")
        AND l.status = 'PUBLISHED' AND NOT u.flagged AND u."deletedAt" IS NULL
        AND v."reviewedAt" IS NOT NULL
        AND v.payload->>'category' = 'competition' AND v.payload->>'subcategory' = 'agri-wall'
      ORDER BY w."createdAt", w.id
    )
    SELECT * FROM (
      SELECT 'market' AS source, market.* FROM market
      UNION ALL
      SELECT 'wall' AS source, wall.* FROM wall
    ) AS offers
    ORDER BY CASE source WHEN 'market' THEN 0 ELSE 1 END,
      CASE WHEN source = 'market' THEN "sortAt" END DESC,
      CASE WHEN source = 'wall' THEN "sortAt" END ASC, "sortId" ASC
  `;
  const market: MarketOfferView[] = [];
  const wall: MarketOfferView[] = [];
  for (const row of rows) {
    const offer: MarketOfferView = {
      id: row.id, slug: row.slug, official: row.official, status: row.status, version: row.version,
      seller: { id: row.sellerId, username: row.username, nickname: row.nickname, avatar: row.avatar },
      listing: marketListingInputSchema.parse(row.payload),
      submittedAt: null, reviewedAt: null, reviewNote: null,
    };
    (row.source === "wall" ? wall : market).push(offer);
  }
  return { market, wall };
}
