import { createHash } from "node:crypto";
import sharp from "sharp";
import { db } from "@/lib/db";
import { marketPublicOrigin } from "./integration";
import { requireMarketActor } from "./shared";
import { MarketRuleError } from "@/domain/marketplace/order";
import { RateLimiter } from "@/lib/rate-limit";
const limiter = new RateLimiter({ max: 10, windowSeconds: 60 });
const MAX = 4 * 1024 * 1024;
export async function saveMarketMedia(ownerId: string, file: File) {
  await requireMarketActor(db, ownerId);
  if (!limiter.check(ownerId).allowed) throw new MarketRuleError("RATE_LIMITED", 429);
  if (!file.size || file.size > MAX) throw new MarketRuleError("MEDIA_TOO_LARGE", 413);
  const bytes = Buffer.from(await file.arrayBuffer());
  let format: string | undefined; let width = 0; let height = 0;
  try { const meta = await sharp(bytes, { limitInputPixels: 40_000_000 }).metadata(); format = meta.format; width = meta.width ?? 0; height = meta.height ?? 0; }
  catch { throw new MarketRuleError("INVALID_MEDIA", 400); }
  const types: Record<string, string> = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
  if (!format || !types[format] || !width || !height || width * height > 40_000_000) throw new MarketRuleError("INVALID_MEDIA", 400);
  const count = await db.marketMedia.count({ where: { ownerId } });
  if (count >= 200) throw new MarketRuleError("MEDIA_LIMIT_REACHED", 409);
  // Preserve the uploader's exact bytes. No production image editing is performed.
  const media = await db.marketMedia.create({ data: { ownerId, mimeType: types[format], sha256: createHash("sha256").update(bytes).digest("hex"), size: bytes.length, content: bytes }, select: { id: true } });
  return { url: marketPublicOrigin() + "/api/market/media/" + media.id };
}
export async function readMarketMedia(id: string, actorId?: string) {
  const media = await db.marketMedia.findUnique({ where: { id } });
  if (!media) throw new MarketRuleError("NOT_FOUND", 404);
  const owner = actorId === media.ownerId && await db.user.findFirst({ where: { id: actorId, deletedAt: null, flagged: false }, select: { id: true } });
  if (!owner) {
    const url = marketPublicOrigin() + "/api/market/media/" + id;
    const versions = await db.marketListingVersion.findMany({ where: { payload: { path: ["coverUrl"], equals: url }, listing: { sellerId: media.ownerId, status: "PUBLISHED", seller: { deletedAt: null, flagged: false } } }, select: { version: true, listing: { select: { publishedVersion: true } } } });
    if (!versions.some(v => v.version === v.listing.publishedVersion)) throw new MarketRuleError("NOT_FOUND", 404);
  }
  return media;
}
