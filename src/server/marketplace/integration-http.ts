import { MarketRuleError } from "@/domain/marketplace/order";
export async function integrationJson(request: Request): Promise<unknown> {
  if (request.headers.get("origin")) throw new MarketRuleError("SERVER_ONLY", 403);
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") throw new MarketRuleError("INVALID_INPUT", 415);
  const reader = request.body?.getReader(); if (!reader) throw new MarketRuleError("INVALID_INPUT", 400);
  const chunks: Uint8Array[] = []; let size = 0;
  try { for (;;) { const { value, done } = await reader.read(); if (done) break; size += value.byteLength;
    if (size > 10_000) { await reader.cancel(); throw new MarketRuleError("REQUEST_TOO_LARGE", 413); } chunks.push(value); }
  } finally { reader.releaseLock(); }
  const all = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { all.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(all)); } catch { throw new MarketRuleError("INVALID_INPUT", 400); }
}
