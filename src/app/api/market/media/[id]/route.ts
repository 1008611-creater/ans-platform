import { auth } from "@/lib/auth";
import { MarketRuleError } from "@/domain/marketplace/order";
import { readMarketMedia } from "@/server/marketplace/media";
export const runtime = "nodejs";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth(); const media = await readMarketMedia((await context.params).id, session?.user?.id);
    return new Response(new Uint8Array(media.content), { headers: { "Content-Type": media.mimeType, "Content-Length": String(media.size), "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store", "Content-Security-Policy": "default-src 'none'", "Content-Disposition": "inline" } });
  } catch (e) { return new Response(null, { status: e instanceof MarketRuleError ? e.status : 500, headers: { "Cache-Control": "no-store" } }); }
}
