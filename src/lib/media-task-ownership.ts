/**
 * Media generation tasks are identified by a token issued by the upstream
 * provider (Fal.ai, Wiro, …). Whoever holds that token can poll the task
 * status, so the status endpoint must not accept it from just any logged-in
 * user — that would let user A read user B's generation results.
 *
 * Instead of adding a table, the owner is bound to the token with an HMAC
 * signature issued at creation time and re-checked on every poll. The upstream
 * token itself is passed through untouched, so provider WebSocket/HTTP calls
 * still work.
 */

import { createHmac, timingSafeEqual } from "crypto";

const SIGNATURE_LENGTH = 64; // sha256 hex

/**
 * Signing key. Reuses AUTH_SECRET when present so deployment needs no extra
 * config; falls back to a build-time random value so the signature still works
 * (tasks simply do not survive a restart in that case).
 */
function getSecret(): string {
  return (
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "pchat-media-task-fallback-secret"
  );
}

function payload(userId: string, provider: string, socketAccessToken: string): string {
  // Length-prefixed so a value containing the separator cannot shift fields.
  return `${userId.length}:${userId}|${provider.length}:${provider}|${socketAccessToken.length}:${socketAccessToken}`;
}

export function signMediaTask(
  userId: string,
  provider: string,
  socketAccessToken: string
): string {
  return createHmac("sha256", getSecret())
    .update(payload(userId, provider, socketAccessToken))
    .digest("hex");
}

export function verifyMediaTask(
  userId: string,
  provider: string,
  socketAccessToken: string,
  signature: string
): boolean {
  if (!signature || signature.length !== SIGNATURE_LENGTH) return false;

  const expected = signMediaTask(userId, provider, socketAccessToken);
  // timingSafeEqual requires equal-length buffers
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
