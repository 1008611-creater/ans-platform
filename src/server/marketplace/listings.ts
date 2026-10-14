import { lockAgriPopularityForListing, assertAgriListingRevision } from "@/server/competitions/agrihackathon/popularity";
import { assertMarketWorkflowBinding } from "./workflow-binding";
import { safeAwardGrowthEvent } from "@/server/growth/service";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { marketListingInputSchema, marketListingRevisionSchema } from "@/contracts/marketplace";
import { PROJECT_CATEGORIES } from "@/domain/catalog/projects";
import { MarketRuleError } from "@/domain/marketplace/order";
import { marketTransaction, requireMarketActor, requireMarketModerator } from "./shared";
import { requireMarketCoverOwnership } from "./media-access";

function parseListing(raw: unknown) {
  const data = marketListingInputSchema.parse(raw);
  if (data.execution && (data.fulfillment !== "resource" || data.priceMinor !== 0 || data.computeIncluded || data.pricingTiers?.length)) throw new MarketRuleError("WORKFLOW_COMPUTE_SEPARATE", 400);
  if (!data.execution && data.priceMinor === 0 && !data.pricingTiers?.length && (data.fulfillment !== "resource" || (!data.sourceUrl && !data.previewUrl && !data.githubUrl && !data.usageUrl) || data.computeIncluded)) {
    throw new MarketRuleError("INVALID_INPUT", 400);
  }
  const category = PROJECT_CATEGORIES.find((item) => item.id === data.category);
  if (!category || !(category.children as readonly string[]).includes(data.subcategory)) {
    throw new MarketRuleError("INVALID_CATEGORY", 400);
  }
  return { ...data, priceMinor: data.pricingTiers?.length ? Math.min(...data.pricingTiers.map(tier => tier.priceMinor)) : data.priceMinor, pricingTiers: data.pricingTiers ?? [] };
}

export async function createMarketListing(sellerId: string, raw: unknown, options: { official?: boolean } = {}) {
  const data = parseListing(raw);
  return marketTransaction(async (tx) => {
    await requireMarketActor(tx, sellerId);
    if (data.execution) await assertMarketWorkflowBinding(tx, sellerId, data.execution);
    if (options.official) await requireMarketModerator(tx, sellerId);
    await requireMarketCoverOwnership(tx, sellerId, data.coverUrl);
    if (await tx.marketListing.findUnique({ where: { slug: data.slug }, select: { id: true } })) {
      throw new MarketRuleError("SLUG_TAKEN");
    }
    const listing = await tx.marketListing.create({
      data: {
        sellerId, slug: data.slug, official: Boolean(options.official),
        versions: { create: { version: 1, payload: data as Prisma.InputJsonValue } },
      },
      include: { versions: true },
    });
    await tx.auditLog.create({ data: { actorId: sellerId, action: "MARKET_LISTING_CREATED", resourceType: "market_listing", resourceId: listing.id } });
    return listing;
  });
}

export async function reviseMarketListing(listingId: string, sellerId: string, raw: unknown) {
  const input = marketListingRevisionSchema.parse(raw);
  const data = parseListing(input.listing);
  return marketTransaction(async (tx) => {
    await lockAgriPopularityForListing(tx, listingId);
    await requireMarketActor(tx, sellerId);
    if (data.execution) await assertMarketWorkflowBinding(tx, sellerId, data.execution);
    const listing = await tx.marketListing.findFirst({ where: { id: listingId, sellerId } });
    if (!listing) throw new MarketRuleError("NOT_FOUND", 404);
    if (listing.currentVersion !== input.expectedVersion) throw new MarketRuleError("VERSION_CONFLICT");
    await assertAgriListingRevision(tx, listingId, data);
    if (listing.slug !== data.slug) throw new MarketRuleError("SLUG_IMMUTABLE", 400);
    await requireMarketCoverOwnership(tx, sellerId, data.coverUrl);
    const changed = await tx.marketListing.updateMany({
      where: { id: listing.id, currentVersion: input.expectedVersion },
      data: { currentVersion: { increment: 1 }, status: listing.status === "WITHDRAWN" ? "WITHDRAWN" : listing.publishedVersion ? "PUBLISHED" : "DRAFT" },
    });
    if (changed.count !== 1) throw new MarketRuleError("VERSION_CONFLICT");
    const version = await tx.marketListingVersion.create({ data: { listingId, version: input.expectedVersion + 1, payload: data as Prisma.InputJsonValue } });
    await tx.auditLog.create({ data: { actorId: sellerId, action: "MARKET_LISTING_REVISED", resourceType: "market_listing", resourceId: listingId, metadata: { version: version.version } } });
    return version;
  });
}

export async function submitMarketListing(listingId: string, sellerId: string, expectedVersion: number) {
  return marketTransaction(async (tx) => {
    await lockAgriPopularityForListing(tx, listingId);
    await requireMarketActor(tx, sellerId);
    const listing = await tx.marketListing.findFirst({ where: { id: listingId, sellerId } });
    if (!listing) throw new MarketRuleError("NOT_FOUND", 404);
    if (listing.currentVersion !== expectedVersion) throw new MarketRuleError("VERSION_CONFLICT");
    const version = await tx.marketListingVersion.findUniqueOrThrow({ where: { listingId_version: { listingId, version: expectedVersion } } });
    const payload = parseListing(version.payload);
    await assertAgriListingRevision(tx, listingId, payload);
    if (payload.execution) await assertMarketWorkflowBinding(tx, sellerId, payload.execution);
    if (version.submittedAt || version.reviewedAt) throw new MarketRuleError("INVALID_LISTING_STATE");
    await tx.marketListingVersion.update({ where: { id: version.id }, data: { submittedAt: new Date() } });
    await tx.marketListing.update({ where: { id: listingId }, data: { status: listing.status === "WITHDRAWN" ? "WITHDRAWN" : listing.publishedVersion ? "PUBLISHED" : "PENDING" } });
    await tx.auditLog.create({ data: { actorId: sellerId, action: "MARKET_LISTING_SUBMITTED", resourceType: "market_listing", resourceId: listingId, metadata: { version: expectedVersion } } });
    return { submittedVersion: expectedVersion };
  });
}

export async function reviewMarketListing(listingId: string, reviewerId: string, versionNumber: number, approve: boolean, note: string) {
  if (!Number.isSafeInteger(versionNumber) || versionNumber < 1 || !note.trim() || note.length > 2000) throw new MarketRuleError("INVALID_INPUT", 400);
  return marketTransaction(async (tx) => {
    await lockAgriPopularityForListing(tx, listingId);
    await requireMarketModerator(tx, reviewerId);
    const listing = await tx.marketListing.findUnique({ where: { id: listingId } });
    if (!listing) throw new MarketRuleError("NOT_FOUND", 404);
    await requireMarketActor(tx, listing.sellerId);
    if (listing.sellerId === reviewerId && !listing.official) throw new MarketRuleError("SELF_REVIEW_FORBIDDEN", 403);
    if (listing.currentVersion !== versionNumber) throw new MarketRuleError("VERSION_CONFLICT");
    const version = await tx.marketListingVersion.findUniqueOrThrow({ where: { listingId_version: { listingId, version: versionNumber } } });
    if (!version.submittedAt || version.reviewedAt) throw new MarketRuleError("INVALID_LISTING_STATE");
    const reviewed = parseListing(version.payload);
    if (approve) await assertAgriListingRevision(tx, listingId, reviewed);
    if (approve && reviewed.execution) await assertMarketWorkflowBinding(tx, listing.sellerId, reviewed.execution);
    if (approve) await requireMarketCoverOwnership(tx, listing.sellerId, reviewed.coverUrl);
    await tx.marketListingVersion.update({ where: { id: version.id }, data: { reviewedAt: new Date(), reviewedById: reviewerId, reviewNote: note.trim() } });
    const updated = await tx.marketListing.update({
      where: { id: listingId },
      data: approve ? { publishedVersion: versionNumber, status: "PUBLISHED" } : { status: listing.status === "WITHDRAWN" ? "WITHDRAWN" : listing.publishedVersion ? "PUBLISHED" : "DRAFT" },
    });
    await tx.auditLog.create({ data: { actorId: reviewerId, action: approve ? "MARKET_LISTING_PUBLISHED" : "MARKET_LISTING_REJECTED", resourceType: "market_listing", resourceId: listingId, metadata: { version: versionNumber } } });
    return updated;
  }).then(async (updated) => {
    if (approve && !updated.official) await safeAwardGrowthEvent({ userId: updated.sellerId, type: "PUBLISH_TEMPLATE", reason: "PUBLISH_TEMPLATE", sourceType: "market_listing", sourceId: updated.id });
    return updated;
  });
}

export async function withdrawMarketListing(listingId: string, sellerId: string) {
  return marketTransaction(async (tx) => {
    await lockAgriPopularityForListing(tx, listingId);
    await requireMarketActor(tx, sellerId);
    const updated = await tx.marketListing.updateMany({ where: { id: listingId, sellerId }, data: { status: "WITHDRAWN" } });
    if (!updated.count) throw new MarketRuleError("NOT_FOUND", 404);
    await tx.auditLog.create({ data: { actorId: sellerId, action: "MARKET_LISTING_WITHDRAWN", resourceType: "market_listing", resourceId: listingId } });
    return { withdrawn: true };
  });
}

function listingReadInclude(viewerId?: string) {
  return {
    versions: { orderBy: { version: "desc" as const } },
    seller: { select: { id: true, username: true, nickname: true, avatar: true } },
    _count: { select: { stars: true } },
    stars: { where: { userId: viewerId ?? "" }, select: { userId: true } },
  } satisfies Prisma.MarketListingInclude;
}

export async function listMarketListings(sellerId?: string, viewerId?: string) {
  if (sellerId) await requireMarketActor(db, sellerId);
  const listings = await db.marketListing.findMany({
    where: sellerId ? { sellerId } : { status: "PUBLISHED", seller: { deletedAt: null, flagged: false } },
    include: listingReadInclude(viewerId ?? sellerId),
    orderBy: { updatedAt: "desc" }, take: 100,
  });
  return listings.flatMap((listing) => {
    const version = listing.versions.find((item) => item.version === (sellerId ? listing.currentVersion : listing.publishedVersion));
    if (!version) return [];
    return [{ id: listing.id, slug: listing.slug, official: listing.official, status: listing.status, version: version.version, seller: listing.seller, starCount: listing._count.stars, starred: listing.stars.length > 0, listing: marketListingInputSchema.parse(version.payload), submittedAt: version.submittedAt?.toISOString() ?? null, reviewedAt: version.reviewedAt?.toISOString() ?? null, reviewNote: sellerId ? version.reviewNote : null }];
  });
}


export async function listPublishedMarketListingsBySeller(sellerId: string, viewerId?: string) {
  const listings = await db.marketListing.findMany({
    where: { sellerId, status: "PUBLISHED", seller: { deletedAt: null, flagged: false } },
    include: listingReadInclude(viewerId),
    orderBy: { updatedAt: "desc" }, take: 24,
  });
  return listings.flatMap((listing) => {
    const version = listing.versions.find((item) => item.version === listing.publishedVersion);
    if (!version) return [];
    return [{ id: listing.id, slug: listing.slug, official: listing.official, status: listing.status, version: version.version, seller: listing.seller, starCount: listing._count.stars, starred: listing.stars.length > 0, listing: marketListingInputSchema.parse(version.payload), submittedAt: null, reviewedAt: null, reviewNote: null }];
  });
}

export async function getMarketListing(slug: string, viewerId?: string) {
  const listing = await db.marketListing.findFirst({
    where: { slug, status: "PUBLISHED", seller: { deletedAt: null, flagged: false } },
    include: listingReadInclude(viewerId),
  });
  const version = listing?.versions.find((item) => item.version === listing.publishedVersion);
  if (!listing || !version) throw new MarketRuleError("NOT_FOUND", 404);
  return { id: listing.id, slug: listing.slug, official: listing.official, status: listing.status, version: version.version, seller: listing.seller, starCount: listing._count.stars, starred: listing.stars.length > 0, listing: marketListingInputSchema.parse(version.payload), submittedAt: null, reviewedAt: null, reviewNote: null };
}

export async function getOwnedMarketListing(id: string, sellerId: string) {
  await requireMarketActor(db, sellerId);
  const row = await db.marketListing.findFirst({ where: { id, sellerId }, include: listingReadInclude(sellerId) });
  const version = row?.versions.find((item) => item.version === row.currentVersion);
  if (!row || !version) throw new MarketRuleError("NOT_FOUND", 404);
  return { id: row.id, slug: row.slug, official: row.official, status: row.status, version: version.version, seller: row.seller, starCount: row._count.stars, starred: row.stars.length > 0, listing: marketListingInputSchema.parse(version.payload), submittedAt: version.submittedAt?.toISOString() ?? null, reviewedAt: version.reviewedAt?.toISOString() ?? null, reviewNote: version.reviewNote };
}

export async function listPendingMarketListings(reviewerId: string) {
  await requireMarketModerator(db, reviewerId);
  const rows = await db.marketListing.findMany({
    where: { versions: { some: { submittedAt: { not: null }, reviewedAt: null } }, seller: { deletedAt: null, flagged: false } },
    include: listingReadInclude(reviewerId),
    orderBy: { updatedAt: "asc" }, take: 100,
  });
  return rows.flatMap((row) => {
    const version = row.versions.find((item) => item.version === row.currentVersion && item.submittedAt && !item.reviewedAt);
    return version ? [{ id: row.id, slug: row.slug, official: row.official, status: row.status, version: version.version, seller: row.seller, starCount: row._count.stars, starred: row.stars.length > 0, listing: marketListingInputSchema.parse(version.payload), submittedAt: version.submittedAt!.toISOString(), reviewedAt: null, reviewNote: null }] : [];
  });
}

/** Target associations rather than the discovery page's first 100 listings. */
export async function listRelatedPublishedMarketListings(input: { slugs?: string[]; workflowIds?: string[] }) {
  const slugs = [...new Set(input.slugs ?? [])];
  const workflowIds = [...new Set(input.workflowIds ?? [])];
  if (!slugs.length && !workflowIds.length) return [];
  const rows = await db.marketListing.findMany({
    where: {
      status: "PUBLISHED", seller: { deletedAt: null, flagged: false },
      OR: [
        ...(slugs.length ? [{ slug: { in: slugs } }] : []),
        ...workflowIds.map(id => ({ versions: { some: { payload: { path: ["execution", "workflowId"], equals: id } } } })),
      ],
    },
    include: listingReadInclude(), orderBy: { updatedAt: "desc" },
  });
  return rows.flatMap(row => {
    const version = row.versions.find(item => item.version === row.publishedVersion);
    if (!version?.reviewedAt) return [];
    const listing = marketListingInputSchema.parse(version.payload);
    // Historical versions select candidates only; the current reviewed snapshot decides linkage.
    if (!slugs.includes(row.slug) && (!listing.execution || !workflowIds.includes(listing.execution.workflowId))) return [];
    return [{ id: row.id, slug: row.slug, official: row.official, status: row.status, version: version.version,
      seller: row.seller, starCount: row._count.stars, starred: false, listing,
      submittedAt: null, reviewedAt: null, reviewNote: null }];
  });
}
