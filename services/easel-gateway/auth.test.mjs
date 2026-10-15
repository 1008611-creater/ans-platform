import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { key, seal, open, origin, now, tenantId, verifyIdToken, cookieValue } from "./auth.mjs";
const encryptionKey = key(Buffer.alloc(32, 1).toString("base64url"));
const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: "jwk" }), kid: "test", alg: "RS256", use: "sig" };
const config = { issuer: "https://ans.example.test", clientId: "easel", nonce: "nonce" };
const claims = () => ({ iss: config.issuer, aud: config.clientId, nonce: config.nonce, sub: "user-a", exp: now() + 240, iat: now() });
function token(data, header = { alg: "RS256", kid: "test" }) {
  const input = [header, data].map(value => Buffer.from(JSON.stringify(value)).toString("base64url")).join(".");
  return input + "." + sign("RSA-SHA256", Buffer.from(input), privateKey).toString("base64url");
}
test("session encryption rejects tampering, expiry and another cookie purpose", () => {
  const encrypted = seal({ sub: "user-a", exp: now() + 20 }, encryptionKey, "session");
  assert.equal(open(encrypted, encryptionKey, "session").sub, "user-a");
  const bytes = Buffer.from(encrypted, "base64url"); bytes[30] ^= 1;
  assert.equal(open(bytes.toString("base64url"), encryptionKey, "session"), null);
  assert.equal(open(encrypted, encryptionKey, "transaction"), null);
  assert.equal(open(seal({ exp: now() - 1 }, encryptionKey, "session"), encryptionKey, "session"), null);
});
test("one subject maps to stable storage while another subject and another installation do not", () => {
  assert.equal(tenantId("a", encryptionKey), tenantId("a", encryptionKey));
  assert.notEqual(tenantId("a", encryptionKey), tenantId("b", encryptionKey));
  assert.notEqual(tenantId("a", encryptionKey), tenantId("a", Buffer.alloc(32, 2)));
  assert.throws(() => tenantId("", encryptionKey));
});
test("production origins and cookie keys fail closed", () => {
  for (const value of ["http://127.0.0.1:8000", "https://ans.example.test/", "https://u:p@ans.example.test", "https://ans.example.test/x"]) assert.throws(() => origin(value));
  assert.equal(origin("http://127.0.0.1:8000", true), "http://127.0.0.1:8000");
  assert.throws(() => origin("http://remote.example.test", true)); assert.throws(() => key("short"));
});
test("signed ID tokens require issuer, audience, nonce, lifetime and signature", () => {
  assert.equal(verifyIdToken(token(claims()), [jwk], config).sub, "user-a");
  for (const overrides of [{ iss: "https://evil.test" }, { aud: "other" }, { nonce: "other" }, { exp: now() - 1 }, { iat: now() + 100 }, { sub: "" }, { token_use: "access_token" }]) assert.throws(() => verifyIdToken(token({ ...claims(), ...overrides }), [jwk], config));
  assert.throws(() => verifyIdToken(token(claims(), { alg: "none", kid: "test" }), [jwk], config));
  assert.throws(() => verifyIdToken(token(claims()), [{ ...jwk, kid: "wrong" }], config));
  assert.throws(() => verifyIdToken(token(claims()).slice(0, -20) + "other", [jwk], config));
});
test("duplicate authentication cookies are rejected", () => {
  assert.equal(cookieValue("other=x; session=a", "session"), "a");
  assert.equal(cookieValue("session=a; session=b", "session"), undefined);
});
