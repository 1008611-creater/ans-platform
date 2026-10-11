import { z, ZodError } from "zod";
import { MarketRuleError } from "@/domain/marketplace/order";
import { configuredMarketPaymentAdapter, handleMarketWebhook } from "@/server/marketplace/payments";
export const runtime = "nodejs";
export async function POST(request: Request, context: { params: Promise<{ provider: string }> }) {
  try {
    const { provider } = await context.params; z.enum(["wechat", "alipay"]).parse(provider);
    if (Number(request.headers.get("content-length")) > 64_000) throw new MarketRuleError("PAYLOAD_TOO_LARGE", 413);
    const reader = request.body?.getReader(); if (!reader) throw new MarketRuleError("INVALID_INPUT", 400);
    const parts: Uint8Array[] = []; let length = 0;
    try { while (true) { const chunk = await reader.read(); if (chunk.done) break; length += chunk.value.byteLength; if (length > 64_000) { await reader.cancel(); throw new MarketRuleError("PAYLOAD_TOO_LARGE", 413); } parts.push(chunk.value); } }
    finally { reader.releaseLock(); }
    const body = Buffer.concat(parts).toString("utf8");
    await handleMarketWebhook(body, request.headers, configuredMarketPaymentAdapter(provider));
    return provider === "alipay" ? new Response("success", { headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" } }) : new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = error instanceof MarketRuleError ? error.status : error instanceof ZodError ? 400 : 500;
    return new Response("failure", { status, headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" } });
  }
}
