import { createHash, randomBytes } from "crypto";

const API_KEY_PREFIX = "pchat_";
const API_KEY_LENGTH = 32;

/**
 * Hash an API key for storage. Keys are 32 random bytes (high entropy), so a
 * plain SHA-256 digest is safe — there is nothing to brute force and no salt
 * is needed. The deterministic digest also lets us look a user up directly by
 * `apiKey = hash(presentedKey)` instead of scanning and comparing.
 */
export function hashApiKey(apiKey: string): string {
  return createHash("sha256").update(apiKey, "utf8").digest("hex");
}

/**
 * Generate a secure API key with the pchat_ prefix
 */
export function generateApiKey(): string {
  const randomPart = randomBytes(API_KEY_LENGTH).toString("hex");
  return `${API_KEY_PREFIX}${randomPart}`;
}

/**
 * Validate that an API key has the correct format
 */
export function isValidApiKeyFormat(apiKey: string): boolean {
  if (!apiKey.startsWith(API_KEY_PREFIX)) {
    return false;
  }
  const randomPart = apiKey.slice(API_KEY_PREFIX.length);
  // Should be 64 hex characters (32 bytes)
  return /^[a-f0-9]{64}$/.test(randomPart);
}
