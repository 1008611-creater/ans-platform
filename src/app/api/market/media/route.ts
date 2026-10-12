import { marketResponse, marketUser } from "@/server/marketplace/http";
import { assertSameOrigin, HttpRequestError } from "@/server/http/json";
import { MarketRuleError } from "@/domain/marketplace/order";
import { saveMarketMedia } from "@/server/marketplace/media";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return marketResponse(async () => {
    const user = await marketUser(request);
    try { assertSameOrigin(request); } catch (e) { if (e instanceof HttpRequestError) throw new MarketRuleError(e.code,e.status); throw e; }
    if (!request.headers.get("content-type")?.startsWith("multipart/form-data")) throw new MarketRuleError("INVALID_INPUT", 415);
    const reader = request.body?.getReader(); if (!reader) throw new MarketRuleError("INVALID_INPUT", 400);
    const chunks: Uint8Array[] = []; let size = 0;
    try { for (;;) { const { value, done } = await reader.read(); if (done) break; size += value.byteLength;
      if (size > 4 * 1024 * 1024 + 65536) { await reader.cancel(); throw new MarketRuleError("MEDIA_TOO_LARGE", 413); } chunks.push(value); }
    } finally { reader.releaseLock(); }
    const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    let form: FormData; try { form = await new Request(request.url, { method: "POST", headers: { "content-type": request.headers.get("content-type")! }, body: bytes }).formData(); } catch { throw new MarketRuleError("INVALID_INPUT", 400); }
    const file = form.get("file"); if (!(file instanceof File)) throw new MarketRuleError("INVALID_INPUT", 400);
    return saveMarketMedia(user, file);
  }, 201);
}
