import { z } from "zod";
import { MarketRuleError } from "@/domain/marketplace/order";
import type { CashProvider } from "./common";
import { AlipayMarketProvider } from "./alipay";
import { WechatMarketProvider } from "./wechat";

const cashOffersSchema = z.record(z.string().min(1).max(100), z.object({ version: z.number().int().positive(), priceMinor: z.number().int().min(1).max(100_000_000) }).strict());
export function configuredCashProvider(provider: CashProvider) {
  if (process.env.ANS_MARKET_CASH_ENABLED !== "true") throw new MarketRuleError("PAYMENT_NOT_CONFIGURED", 503);
  if (provider === "wechat") return new WechatMarketProvider();
  return new AlipayMarketProvider();
}
export function availableCashProviders(): CashProvider[] {
  return (["wechat", "alipay"] as const).filter(provider => { try { configuredCashProvider(provider); return true; } catch { return false; } });
}
/** Version-pinned, separately approved CNY prices prevent existing points prices becoming cash charges. */
export function cashListingPolicy(listingId: string, version: number, sellerId: string) {
  if (process.env.ANS_MARKET_CASH_ENABLED !== "true") throw new MarketRuleError("PAYMENT_NOT_CONFIGURED", 503);
  const officialSellers = (process.env.ANS_MARKET_CASH_OFFICIAL_SELLER_IDS ?? "").split(",").map(value => value.trim()).filter(Boolean);
  if (!officialSellers.includes(sellerId)) throw new MarketRuleError("SELLER_CASH_NOT_ENABLED", 503);
  let offers: z.infer<typeof cashOffersSchema>;
  try { offers = cashOffersSchema.parse(JSON.parse(process.env.ANS_MARKET_CASH_OFFERS ?? "")); } catch { throw new MarketRuleError("PRICING_NOT_CONFIGURED", 503); }
  const offer = offers[listingId];
  if (!offer || offer.version !== version) throw new MarketRuleError("CASH_PRICE_NOT_APPROVED", 503);
  const commission = process.env.ANS_MARKET_CASH_COMMISSION_BPS ?? "";
  if (!/^\d{1,5}$/.test(commission) || Number(commission) > 10_000) throw new MarketRuleError("PRICING_NOT_CONFIGURED", 503);
  return { priceMinor: offer.priceMinor, commissionBps: Number(commission) };
}
