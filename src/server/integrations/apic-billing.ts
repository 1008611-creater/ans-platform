/** Server-only lookup of APIC's final charged quota. Never derive a charge from
 * an estimate, token count, client field, or the asynchronously updated balance.
 * The bridge scopes every lookup to the dedicated ANS infrastructure token.
 */
export type ApicCharge = { requestId: string; quota: number; /** Legacy USD-credit alias; never ANS retail points. */ points: number; usdCredit?: number; memberPoints?: number };
export async function readApicCharge(requestId: string, attempts = 15): Promise<ApicCharge> {
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(requestId)) throw new Error("APIC_BILLING_REQUEST_ID_INVALID");
  const base = process.env.APIC_COST_BRIDGE_URL;
  const secret = process.env.APIC_COST_BRIDGE_SECRET;
  if (!base || !secret) throw new Error("APIC_BILLING_NOT_CONFIGURED");
  for (let attempt = 0; attempt < attempts; attempt++) {
    const response = await fetch(`${base.replace(/\/$/, "")}/cost/${requestId}`, {
      headers: { Authorization: `Bearer ${secret}` }, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(3000),
    });
    if (response.status === 404) { if (attempt + 1 < attempts) await new Promise(resolve => setTimeout(resolve, 1000)); continue; }
    if (!response.ok) throw new Error("APIC_BILLING_UNAVAILABLE");
    const charge: unknown = await response.json();
    if (!charge || typeof charge !== "object") throw new Error("APIC_BILLING_INVALID");
    const value = charge as Record<string, unknown>;
    if (value.requestId !== requestId || !Number.isSafeInteger(value.quota) || Number(value.quota) < 0 || Number(value.quota) > 500_000_000) throw new Error("APIC_BILLING_INVALID");
    // APIC quota is 1 / 500000 USD CREDIT, not an ANS point. Conversion
    // belongs to the immutable request billing snapshot; old points is an alias.
    return { requestId, quota: Number(value.quota), usdCredit: Number(value.quota) / 500000, points: Number(value.quota) / 500000 };
  }
  throw new Error("APIC_BILLING_PENDING");
}
export function isApicTarget(baseUrl: string) {
  return process.env.ANS_APIC_BILLING_ENABLED === "1" && new URL(baseUrl).hostname === "apic.cauai.fun";
}
