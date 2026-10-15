import { createCipheriv, createDecipheriv, createHash, createHmac, createPublicKey, randomBytes, timingSafeEqual, verify } from "node:crypto";

export class GatewayError extends Error {
  constructor(code, status = 503) { super(code); this.code = code; this.status = status; }
}
export function origin(value, development = false) {
  const url = new URL(value);
  if (url.origin !== value || url.username || url.password ||
      !(url.protocol === "https:" || development && url.protocol === "http:" && ["127.0.0.1", "localhost"].includes(url.hostname))) throw new GatewayError("INVALID_ORIGIN");
  return url.origin;
}
export function key(value) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(value ?? "")) throw new GatewayError("INVALID_KEY");
  const result = Buffer.from(value, "base64url");
  if (result.length !== 32 || result.toString("base64url") !== value) throw new GatewayError("INVALID_KEY");
  return result;
}
export const now = () => Math.floor(Date.now() / 1000);
export const random = () => randomBytes(32).toString("base64url");
export const challenge = value => createHash("sha256").update(value).digest("base64url");
export function same(left, right) {
  return typeof left === "string" && typeof right === "string" &&
    timingSafeEqual(createHash("sha256").update(left).digest(), createHash("sha256").update(right).digest());
}
export function seal(value, encryptionKey, purpose) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey, iv);
  cipher.setAAD(Buffer.from(purpose));
  const body = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url");
}
export function open(value, encryptionKey, purpose) {
  try {
    if (!value || value.length > 20000 || !/^[A-Za-z0-9_-]+$/.test(value)) return null;
    const bytes = Buffer.from(value, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey, bytes.subarray(0, 12));
    decipher.setAAD(Buffer.from(purpose)); decipher.setAuthTag(bytes.subarray(12, 28));
    const data = JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString());
    return Number.isFinite(data.exp) && data.exp > now() ? data : null;
  } catch { return null; }
}
export function tenantId(subject, tenantKey) {
  if (typeof subject !== "string" || !subject || subject.length > 256) throw new GatewayError("INVALID_SUBJECT", 401);
  return createHmac("sha256", tenantKey).update(subject).digest("hex");
}
export function cookieValue(header, name) {
  const values = (header ?? "").split(";").map(part => part.trim()).filter(part => part.startsWith(name + "="));
  return values.length === 1 ? values[0].slice(name.length + 1) : undefined;
}
export function verifyIdToken(token, keys, { issuer, clientId, nonce, time = now() }) {
  try {
    if (typeof token !== "string" || token.length > 16000) throw new Error();
    const parts = token.split("."); if (parts.length !== 3) throw new Error();
    const header = JSON.parse(Buffer.from(parts[0], "base64url"));
    const claims = JSON.parse(Buffer.from(parts[1], "base64url"));
    if (header.alg !== "RS256" || typeof header.kid !== "string") throw new Error();
    const jwk = keys.find(item => item.kid === header.kid && item.kty === "RSA" && (!item.alg || item.alg === "RS256") && (!item.use || item.use === "sig"));
    if (!jwk) throw new Error();
    const publicKey = createPublicKey({ key: jwk, format: "jwk" });
    if ((publicKey.asymmetricKeyDetails?.modulusLength ?? 0) < 2048 ||
        !verify("RSA-SHA256", Buffer.from(parts[0] + "." + parts[1]), publicKey, Buffer.from(parts[2], "base64url"))) throw new Error();
    if (claims.iss !== issuer || claims.aud !== clientId || !same(claims.nonce, nonce) ||
        typeof claims.sub !== "string" || !claims.sub || claims.sub.length > 256 ||
        !Number.isFinite(claims.exp) || claims.exp <= time || !Number.isFinite(claims.iat) || claims.iat > time + 30 || claims.iat < time - 600 ||
        claims.token_use === "access_token") throw new Error();
    return claims;
  } catch { throw new GatewayError("INVALID_ID_TOKEN", 401); }
}
export async function remoteJson(url, options = {}) {
  const response = await fetch(url, { ...options, redirect: "error", signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new GatewayError("IDENTITY_UNAVAILABLE", response.status === 401 ? 401 : 503);
  const text = await response.text(); if (text.length > 64000) throw new GatewayError("INVALID_IDENTITY_RESPONSE");
  return JSON.parse(text);
}
