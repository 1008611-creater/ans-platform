"use client";
export class MarketRequestRejection extends Error {
  constructor(code: string, public readonly status: number) { super(code); this.name = "MarketRequestRejection"; }
}

// These service rules reject before committing. Account/not-found failures may
// instead come from the acknowledgement read after a committed order action.
const confirmedRejectionCodes = new Set([
  "ACCOUNT_CHANGED", "UNAUTHORIZED", "VERSION_CONFLICT", "INVALID_ORDER_STATE", "REVISION_LIMIT_REACHED", "INVALID_INPUT",
  "ARTIFACT_PERMISSION_REQUIRED", "REVIEW_ALREADY_SUBMITTED", "IDEMPOTENCY_CONFLICT", "FORBIDDEN",
]);

export async function marketRequest<T>(url: string, method: string, body: unknown, account: { actorId: string; signal?: AbortSignal }): Promise<T> {
  if (!account.actorId || account.signal?.aborted) throw new MarketRequestRejection("ACCOUNT_CHANGED", 409);
  const response = await fetch(url, { method, signal: account.signal, credentials: "same-origin", headers: { "Content-Type": "application/json", "x-ans-actor": account.actorId }, body: JSON.stringify(body) });
  if (account.signal?.aborted) throw new MarketRequestRejection("ACCOUNT_CHANGED", 409);
  const envelope = await response.json().catch(() => null);
  if (!response.ok && envelope?.ok === false && typeof envelope.error?.code === "string" && response.status >= 400 && response.status < 500 && confirmedRejectionCodes.has(envelope.error.code)) {
    throw new MarketRequestRejection(envelope.error.code, response.status);
  }
  if (!response.ok || !envelope?.ok) throw new Error(typeof envelope?.error?.code === "string" ? envelope.error.code : "INTERNAL_ERROR");
  return envelope.data as T;
}
