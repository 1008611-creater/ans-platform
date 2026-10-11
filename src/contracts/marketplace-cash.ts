import { z } from "zod";
export const marketCashCheckoutSchema = z.object({
  provider: z.enum(["wechat", "alipay"]), mode: z.enum(["qr", "redirect"]),
  url: z.string().min(1).max(10_000), expiresAt: z.string().datetime(),
}).strict().superRefine((value, context) => {
  let valid = false;
  try { const url = new URL(value.url);
    valid = value.provider === "wechat" ? value.mode === "qr" && url.protocol === "weixin:" && url.hostname === "wxpay" && ["/bizpayurl", "/bizpayurl/up"].includes(url.pathname) && !url.port && !url.username && !url.password : value.mode === "redirect" && url.protocol === "https:" && url.hostname === "openapi.alipay.com" && url.pathname === "/gateway.do" && !url.port && !url.username && !url.password;
  } catch { /* fail closed */ }
  if (!valid) context.addIssue({ code: "custom", path: ["url"], message: "INVALID_PROVIDER_CHECKOUT" });
});
export type MarketCashCheckout = z.infer<typeof marketCashCheckoutSchema>;
export type MarketCashOffer = { priceMinor: number; providers: ("wechat" | "alipay")[] };
