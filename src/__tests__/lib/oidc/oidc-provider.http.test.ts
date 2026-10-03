import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { generateKeyPairSync, createSign, createVerify, createPublicKey, createHash, randomBytes } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const testDb = vi.hoisted(() => {
  const grants = new Map<string, { token: string; expires: Date }>();
  return {
    grants,
    sessionUserId: "user_fixture_01" as string | null,
    user: { findFirst: vi.fn() },
    verificationToken: {
      deleteMany: vi.fn(async ({ where }: { where: { expires: { lt: Date } } }) => {
        for (const [key, value] of grants) if (value.expires < where.expires.lt) grants.delete(key);
        return { count: 0 };
      }),
      create: vi.fn(async ({ data }: { data: { identifier: string; token: string; expires: Date } }) => {
        grants.set(data.identifier, { token: data.token, expires: data.expires });
        return data;
      }),
    },
    $queryRaw: vi.fn(async (_strings: TemplateStringsArray, identifier: string) => {
      const value = grants.get(identifier);
      grants.delete(identifier);
      return value ? [value] : [];
    }),
  };
});

vi.mock("@/lib/db", () => ({ db: testDb }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn(async () => testDb.sessionUserId ? ({ user: { id: testDb.sessionUserId } }) : null) }));

import { GET as authorizeGet } from "@/app/api/oidc/authorize/route";
import { POST as tokenPost } from "@/app/api/oidc/token/route";
import { GET as userinfoGet } from "@/app/api/oidc/userinfo/route";
import { GET as jwksGet } from "@/app/api/oidc/jwks/route";
import { GET as discoveryGet } from "@/app/.well-known/openid-configuration/route";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const privatePem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const publicPem = publicKey.export({ type: "spki", format: "pem" }).toString();
const issuer = "https://ans.example.test";
const redirectUri = "https://toonflow.example.test/auth/callback/ans";
const clientId = "toonflow-test-client";
const clientSecret = "fixture+secret:with/slash%and space";
let baseUrl = "";
let server: ReturnType<typeof createServer>;

const b64url = (value: string | Buffer) => Buffer.from(value).toString("base64url");
const hash = (value: string) => createHash("sha256").update(value).digest("base64url");

async function dispatch(request: Request): Promise<Response> {
  const path = new URL(request.url).pathname;
  if (path === "/.well-known/openid-configuration" && request.method === "GET") return discoveryGet();
  if (path === "/api/oidc/authorize" && request.method === "GET") return authorizeGet(request);
  if (path === "/api/oidc/token" && request.method === "POST") return tokenPost(request);
  if (path === "/api/oidc/userinfo" && request.method === "GET") return userinfoGet(request);
  if (path === "/api/oidc/jwks" && request.method === "GET") return jwksGet();
  return Response.json({ error: "not_found" }, { status: 404 });
}

function serveRequest(req: IncomingMessage, res: ServerResponse) {
  void (async () => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks);
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (Array.isArray(value)) headers.set(key, value.join(", "));
      else if (value) headers.set(key, value);
    }
    const request = new Request(`${baseUrl}${req.url}`, {
      method: req.method,
      headers,
      ...(body.length ? { body } : {}),
    });
    const response = await dispatch(request);
    res.statusCode = response.status;
    response.headers.forEach((value, key) => res.setHeader(key, value));
    res.end(await response.text());
  })().catch(() => {
    res.statusCode = 500;
    res.end();
  });
}

async function http(path: string, init?: RequestInit) {
  return fetch(`${baseUrl}${path}`, { redirect: "manual", ...init });
}

function formEncode(value: string) {
  return new URLSearchParams([["value", value]]).toString().slice("value=".length);
}
function authHeader() {
  return `Basic ${Buffer.from(`${formEncode(clientId)}:${formEncode(clientSecret)}`).toString("base64")}`;
}

function authorizationUrl(options: { redirectUri?: string; state?: string; nonce?: string; challenge?: string } = {}) {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: options.redirectUri ?? redirectUri,
    scope: "openid profile email",
    state: options.state ?? randomBytes(24).toString("base64url"),
    nonce: options.nonce ?? randomBytes(24).toString("base64url"),
    code_challenge: options.challenge ?? hash(randomBytes(32).toString("base64url")),
    code_challenge_method: "S256",
  });
  return `/api/oidc/authorize?${params}`;
}

async function issueCode(verifier: string) {
  const nonce = randomBytes(24).toString("base64url");
  const state = randomBytes(24).toString("base64url");
  const challenge = hash(verifier);
  const authorization = await http(authorizationUrl({ nonce, state, challenge }));
  expect(authorization.status).toBe(302);
  const callback = new URL(authorization.headers.get("location")!);
  expect(callback.searchParams.get("state")).toBe(state);
  return { code: callback.searchParams.get("code")!, nonce, state };
}

async function exchange(code: string, verifier: string) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    code_verifier: verifier,
  });
  return http("/api/oidc/token", {
    method: "POST",
    headers: { authorization: authHeader(), "content-type": "application/x-www-form-urlencoded" },
    body,
  });
}

function signAccessToken(claims: Record<string, unknown>) {
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT", kid: "test-key-1" }));
  const payload = b64url(JSON.stringify(claims));
  const unsigned = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  return `${unsigned}.${signer.sign(privateKey).toString("base64url")}`;
}

beforeAll(async () => {
  process.env.OIDC_ISSUER = issuer;
  process.env.OIDC_TOONFLOW_CLIENT_ID = clientId;
  process.env.OIDC_TOONFLOW_CLIENT_SECRET = clientSecret;
  process.env.OIDC_TOONFLOW_REDIRECT_URI = redirectUri;
  process.env.OIDC_SIGNING_KEY_ID = "test-key-1";
  process.env.OIDC_SIGNING_PRIVATE_KEY = privatePem;
  process.env.OIDC_SIGNING_PUBLIC_KEY = publicPem;

  server = createServer(serveRequest);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test HTTP server failed to bind");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  for (const key of [
    "OIDC_ISSUER", "OIDC_TOONFLOW_CLIENT_ID", "OIDC_TOONFLOW_CLIENT_SECRET",
    "OIDC_TOONFLOW_REDIRECT_URI", "OIDC_SIGNING_KEY_ID", "OIDC_SIGNING_PRIVATE_KEY", "OIDC_SIGNING_PUBLIC_KEY",
  ]) delete process.env[key];
});

beforeEach(() => {
  testDb.grants.clear();
  testDb.sessionUserId = "user_fixture_01";
  testDb.user.findFirst.mockResolvedValue({
    id: "user_fixture_01",
    email: "fixture@example.test",
    emailVerified: new Date("2026-01-01T00:00:00.000Z"),
    name: "Fixture User",
    username: "fixture-user",
    avatar: null,
  });
});

describe("ANS OIDC HTTP flow", () => {
  it("publishes discovery/JWKS and completes Authorization Code + PKCE, nonce, and userinfo", async () => {
    const discoveryResponse = await http("/.well-known/openid-configuration");
    expect(discoveryResponse.status).toBe(200);
    const discovery = await discoveryResponse.json();
    expect(discovery.issuer).toBe(issuer);
    expect(discovery.response_types_supported).toEqual(["code"]);
    expect(discovery.code_challenge_methods_supported).toEqual(["S256"]);

    const jwks = await (await http("/api/oidc/jwks")).json();
    expect(jwks.keys).toHaveLength(1);
    expect(jwks.keys[0]).toMatchObject({ kid: "test-key-1", alg: "RS256", use: "sig" });

    const verifier = randomBytes(32).toString("base64url");
    const { code, nonce } = await issueCode(verifier);
    const response = await exchange(code, verifier);
    expect(response.status).toBe(200);
    const tokens = await response.json();
    expect(tokens.token_type).toBe("Bearer");
    expect(tokens.expires_in).toBe(300);
    const idClaims = JSON.parse(Buffer.from(tokens.id_token.split(".")[1], "base64url").toString());
    expect(idClaims).toMatchObject({ iss: issuer, aud: clientId, sub: "user_fixture_01", nonce });
    expect(idClaims.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    const jwk = jwks.keys[0];
    const verifierSignature = createVerify("RSA-SHA256");
    verifierSignature.update(tokens.id_token.split(".").slice(0, 2).join("."));
    verifierSignature.end();
    expect(verifierSignature.verify(createPublicKey({ key: jwk, format: "jwk" }), Buffer.from(tokens.id_token.split(".")[2], "base64url"))).toBe(true);

    const userinfo = await http("/api/oidc/userinfo", { headers: { authorization: `Bearer ${tokens.access_token}` } });
    expect(userinfo.status).toBe(200);
    expect(await userinfo.json()).toEqual({
      sub: "user_fixture_01", name: "Fixture User", preferred_username: "fixture-user",
      email: "fixture@example.test", email_verified: true,
    });
  });

  it("preserves the authorization request through the existing ANS login session", async () => {
    testDb.sessionUserId = null;
    const params = new URLSearchParams(authorizationUrl().split("?")[1]);
    const login = await http(`/api/oidc/authorize?${params}`);
    expect(login.status).toBe(302);
    const loginUrl = new URL(login.headers.get("location")!);
    expect(loginUrl.pathname).toBe("/login");
    const callbackUrl = loginUrl.searchParams.get("callbackUrl")!;
    expect(callbackUrl.startsWith("/api/oidc/authorize?")).toBe(true);

    // Represents the same browser returning from ANS's existing credential/OAuth login.
    testDb.sessionUserId = "user_fixture_01";
    const resumed = await http(callbackUrl);
    expect(resumed.status).toBe(302);
    const callback = new URL(resumed.headers.get("location")!);
    expect(callback.searchParams.get("code")).toBeTruthy();
    expect(callback.searchParams.get("state")).toBe(params.get("state"));
  });

  it("rejects an unregistered callback before redirecting", async () => {
    const response = await http(authorizationUrl({ redirectUri: "https://attacker.example/callback" }));
    expect(response.status).toBe(400);
    expect(response.headers.get("location")).toBeNull();
  });

  it("rejects wrong PKCE and burns the authorization code", async () => {
    const correctVerifier = randomBytes(32).toString("base64url");
    const { code } = await issueCode(correctVerifier);
    const wrong = await exchange(code, randomBytes(32).toString("base64url"));
    expect(wrong.status).toBe(400);
    expect(await wrong.json()).toEqual({ error: "invalid_grant" });
    const replay = await exchange(code, correctVerifier);
    expect(replay.status).toBe(400);
  });

  it("rejects unknown, replayed, and expired authorization codes", async () => {
    const verifier = randomBytes(32).toString("base64url");
    const unknown = await exchange("not-a-code", verifier);
    expect(unknown.status).toBe(400);

    const { code } = await issueCode(verifier);
    const first = await exchange(code, verifier);
    expect(first.status).toBe(200);
    const replay = await exchange(code, verifier);
    expect(replay.status).toBe(400);

    const expiredCode = randomBytes(32).toString("base64url");
    const digest = createHash("sha256").update(expiredCode).digest("base64url");
    testDb.grants.set(`oidc:code:${digest}`, {
      token: JSON.stringify({ clientId, redirectUri, subject: "user_fixture_01", scope: ["openid"], nonce: "n", codeChallenge: hash(verifier), createdAt: Date.now() }),
      expires: new Date(Date.now() - 1_000),
    });
    const expired = await exchange(expiredCode, verifier);
    expect(expired.status).toBe(400);
  });

  it("requires state and nonce, preserves state, and binds the ID Token to the requested nonce", async () => {
    const params = new URLSearchParams(authorizationUrl().split("?")[1]);
    params.delete("state");
    const noState = await http(`/api/oidc/authorize?${params}`);
    expect(noState.status).toBe(302);
    expect(new URL(noState.headers.get("location")!).searchParams.get("error")).toBe("invalid_request");

    params.set("state", "present");
    params.delete("nonce");
    const noNonce = await http(`/api/oidc/authorize?${params}`);
    expect(new URL(noNonce.headers.get("location")!).searchParams.get("error")).toBe("invalid_request");

    const verifier = randomBytes(32).toString("base64url");
    const { code, nonce, state } = await issueCode(verifier);
    const tokens = await (await exchange(code, verifier)).json();
    const idClaims = JSON.parse(Buffer.from(tokens.id_token.split(".")[1], "base64url").toString());
    expect(idClaims.nonce).toBe(nonce);
    expect(state).toBeTruthy();
  });

  it("rejects duplicate protocol parameters and models RP state/nonce validation", async () => {
    const duplicate = new URLSearchParams(authorizationUrl().split("?")[1]);
    duplicate.append("state", "attacker-state");
    const duplicateResponse = await http(`/api/oidc/authorize?${duplicate}`);
    expect(duplicateResponse.status).toBe(400);

    const verifier = randomBytes(32).toString("base64url");
    const expectedState = randomBytes(24).toString("base64url");
    const requestedNonce = randomBytes(24).toString("base64url");
    const authorization = await http(authorizationUrl({ state: expectedState, nonce: requestedNonce, challenge: hash(verifier) }));
    const callback = new URL(authorization.headers.get("location")!);

    // ANS echoes state; the RP must compare it with the value stored before redirecting.
    const returnedState = callback.searchParams.get("state");
    expect(returnedState).toBe(expectedState);
    const validateState = (actual: string | null, expected: string) => {
      if (actual !== expected) throw new Error("state mismatch");
    };
    expect(() => validateState(`${returnedState}-tampered`, expectedState)).toThrow("state mismatch");
    validateState(returnedState, expectedState);

    const tokensResponse = await exchange(callback.searchParams.get("code")!, verifier);
    expect(tokensResponse.status).toBe(200);
    const tokens = await tokensResponse.json();
    const idClaims = JSON.parse(Buffer.from(tokens.id_token.split(".")[1], "base64url").toString());
    const expectedNonce = `${requestedNonce}-tampered`;
    const validateNonce = (actual: unknown, expected: string) => {
      if (actual !== expected) throw new Error("nonce mismatch");
    };
    expect(() => validateNonce(idClaims.nonce, expectedNonce)).toThrow("nonce mismatch");
    validateNonce(idClaims.nonce, requestedNonce);
  });

  it("rejects duplicate token body parameters", async () => {
    const body = new URLSearchParams({
      grant_type: "authorization_code", code: "unused", redirect_uri: redirectUri,
      code_verifier: randomBytes(32).toString("base64url"),
    });
    body.append("code", "second-code");
    const response = await http("/api/oidc/token", {
      method: "POST",
      headers: { authorization: authHeader(), "content-type": "application/x-www-form-urlencoded" },
      body,
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_request" });
  });
  it("rejects expired access tokens at UserInfo", async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = signAccessToken({
      iss: issuer, aud: clientId, sub: "user_fixture_01", iat: now - 600, exp: now - 1,
      token_use: "access_token", scope: "openid profile email",
    });
    const response = await http("/api/oidc/userinfo", { headers: { authorization: `Bearer ${token}` } });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "invalid_token" });
  });
});
