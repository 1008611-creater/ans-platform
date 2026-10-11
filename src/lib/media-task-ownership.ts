/**
 * Media generation tasks are identified by a token issued by the upstream
 * provider (Fal.ai, Wiro, …). Whoever holds that token can poll the task
 * status, so the status endpoint must not accept it from just any logged-in
 * user — that would let user A read user B's generation results.
 *
 * The owner is bound to the token with an HMAC
 * signature issued at creation time and re-checked on every poll. The upstream
 * token itself is passed through untouched, so provider WebSocket/HTTP calls
 * still work.
 */

import { createHmac, timingSafeEqual } from "crypto";

const SIGNATURE_LENGTH = 64; // sha256 hex

/** Unconfigured signatures fail closed; a public fallback can be forged. */
export function isMediaTaskSigningConfigured(): boolean {
  return !!(process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim());
}
function getSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim();
  if (!secret) throw new Error("MEDIA_SIGNING_NOT_CONFIGURED");
  return secret;
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
  if (!isMediaTaskSigningConfigured() || !signature || signature.length !== SIGNATURE_LENGTH) return false;

  const expected = signMediaTask(userId, provider, socketAccessToken);
  // timingSafeEqual requires equal-length buffers
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
