import type { DbTransaction } from "@/lib/db";
import { MarketRuleError } from "@/domain/marketplace/order";

/** The same public origin used for generated upload URLs, without module cycles. */
function mediaPublicOrigin() {
  const value = process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL || "https://ans.cauai.fun";
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password) throw new MarketRuleError("INTEGRATION_NOT_CONFIGURED", 503);
  return url.origin;
}

/** External covers remain permitted; local uploads must belong to this seller. */
export async function requireMarketCoverOwnership(tx: DbTransaction, sellerId: string, coverUrl?: string) {
  if (!coverUrl) return;
  const url = new URL(coverUrl);
  if (url.origin !== mediaPublicOrigin() || !url.pathname.startsWith("/api/market/media/")) return;
  const match = /^\/api\/market\/media\/([A-Za-z0-9_-]{1,100})$/.exec(url.pathname);
  if (!match || url.search || url.hash) throw new MarketRuleError("MEDIA_PERMISSION_REQUIRED", 403);
  const owned = await tx.marketMedia.findFirst({ where: { id: match[1], ownerId: sellerId }, select: { id: true } });
  if (!owned) throw new MarketRuleError("MEDIA_PERMISSION_REQUIRED", 403);
}
