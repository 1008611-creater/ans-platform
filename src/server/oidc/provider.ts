import {
  createHash,
  createPrivateKey,
  createPublicKey,
  createSign,
  createVerify,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { db } from "@/lib/db";

const ACCESS_TOKEN_TTL_SECONDS = 300;
const ID_TOKEN_TTL_SECONDS = 300;
const AUTH_CODE_TTL_MS = 180_000;
const SUPPORTED_SCOPES = new Set(["openid", "profile", "email"]);
const CODE_IDENTIFIER_PREFIX = "oidc:code:";

interface OidcConfig {
  issuer: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  keyId: string;
  privateKeyPem: string;
  publicKeyPem?: string;
  previousKeyId?: string;
  previousPublicKeyPem?: string;
}

interface OidcGrant {
  clientId: string;
  redirectUri: string;
  subject: string;
  scope: string[];
  nonce: string;
  codeChallenge: string;
  createdAt: number;
}

interface OidcUser {
  id: string;
  email: string;
  emailVerified: Date | null;
  name: string | null;
  username: string;
  avatar: string | null;
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required OIDC configuration: ${name}`);
  return value;
}

function pem(value: string): string {
  return value.replace(/\\n/g, "\n");
}

function getConfig(): OidcConfig {
  const issuer = requiredEnv("OIDC_ISSUER").replace(/\/$/, "");
  const issuerUrl = new URL(issuer);
  if (
    (issuerUrl.protocol !== "https:" && issuerUrl.hostname !== "localhost") ||
    issuerUrl.username || issuerUrl.password || issuerUrl.search || issuerUrl.hash || issuerUrl.pathname !== "/"
  ) {
    throw new Error("OIDC_ISSUER must be an HTTPS origin without a path");
  }

  const redirectUri = requiredEnv("OIDC_TOONFLOW_REDIRECT_URI");
  const redirectUrl = new URL(redirectUri);
  if (
    redirectUrl.username || redirectUrl.password || redirectUrl.hash ||
    (redirectUrl.protocol !== "https:" && redirectUrl.hostname !== "localhost")
  ) {
    throw new Error("OIDC_TOONFLOW_REDIRECT_URI must be an exact HTTPS callback URL");
  }

  const keyId = requiredEnv("OIDC_SIGNING_KEY_ID");
  const privateKeyPem = pem(requiredEnv("OIDC_SIGNING_PRIVATE_KEY"));
  const privateKey = createPrivateKey(privateKeyPem);
  if (privateKey.asymmetricKeyType !== "rsa" || (privateKey.asymmetricKeyDetails?.modulusLength ?? 0) < 2048) {
    throw new Error("OIDC signing key must be RSA with at least 2048 bits");
  }

  const config: OidcConfig = {
    issuer,
    clientId: requiredEnv("OIDC_TOONFLOW_CLIENT_ID"),
    clientSecret: requiredEnv("OIDC_TOONFLOW_CLIENT_SECRET"),
    redirectUri,
    keyId,
    privateKeyPem,
    publicKeyPem: process.env.OIDC_SIGNING_PUBLIC_KEY ? pem(process.env.OIDC_SIGNING_PUBLIC_KEY) : undefined,
    previousKeyId: process.env.OIDC_PREVIOUS_KEY_ID?.trim() || undefined,
    previousPublicKeyPem: process.env.OIDC_PREVIOUS_PUBLIC_KEY ? pem(process.env.OIDC_PREVIOUS_PUBLIC_KEY) : undefined,
  };

  if (config.publicKeyPem) {
    const derived = createPublicKey(privateKey).export({ format: "jwk" });
    const configured = createPublicKey(config.publicKeyPem).export({ format: "jwk" });
    if (derived.n !== configured.n || derived.e !== configured.e) throw new Error("OIDC public key does not match signing key");
  }
  if (Buffer.byteLength(config.clientSecret, "utf8") < 32) {
    throw new Error("OIDC client secret must contain at least 32 bytes");
  }
  if (Boolean(config.previousKeyId) !== Boolean(config.previousPublicKeyPem)) {
    throw new Error("Both OIDC_PREVIOUS_KEY_ID and OIDC_PREVIOUS_PUBLIC_KEY are required during key rotation");
  }
  if (config.previousKeyId === config.keyId) {
    throw new Error("Current and previous OIDC signing key IDs must be different");
  }
  if (config.previousPublicKeyPem) {
    const previousKey = createPublicKey(config.previousPublicKeyPem);
    if (previousKey.asymmetricKeyType !== "rsa" || (previousKey.asymmetricKeyDetails?.modulusLength ?? 0) < 2048) {
      throw new Error("Previous OIDC signing key must be RSA with at least 2048 bits");
    }
  }
  return config;
}

function json(data: unknown, status = 200, headers: HeadersInit = {}): Response {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", Pragma: "no-cache", ...headers },
  });
}

function oauthError(error: string, status = 400, headers: HeadersInit = {}): Response {
  return json({ error }, status, { "Cache-Control": "no-store", ...headers });
}

function redirect(url: URL): Response {
  return new Response(null, {
    status: 302,
    headers: { Location: url.toString(), "Cache-Control": "no-store", Pragma: "no-cache" },
  });
}

function base64url(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("base64url");
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftHash = createHash("sha256").update(left).digest();
  const rightHash = createHash("sha256").update(right).digest();
  return timingSafeEqual(leftHash, rightHash);
}

function signingKey(config: OidcConfig) {
  return createPrivateKey(config.privateKeyPem);
}

function publicJwk(config: OidcConfig) {
  const fromConfiguredPublic = config.publicKeyPem
    ? createPublicKey(pem(config.publicKeyPem))
    : createPublicKey(signingKey(config));
  const jwk = fromConfiguredPublic.export({ format: "jwk" });
  return { ...jwk, kid: config.keyId, use: "sig", alg: "RS256" };
}

function base64Json(value: unknown): string {
  return base64url(JSON.stringify(value));
}

function signJwt(config: OidcConfig, claims: Record<string, unknown>): string {
  const header = base64Json({ alg: "RS256", typ: "JWT", kid: config.keyId });
  const payload = base64Json(claims);
  const input = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(input);
  signer.end();
  return `${input}.${signer.sign(signingKey(config)).toString("base64url")}`;
}

function getPublicKey(config: OidcConfig, kid: unknown) {
  if (kid === config.keyId) return createPublicKey(pem(config.publicKeyPem ?? config.privateKeyPem));
  if (kid === config.previousKeyId && config.previousPublicKeyPem) {
    return createPublicKey(pem(config.previousPublicKeyPem));
  }
  return null;
}

function verifyJwt(config: OidcConfig, token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8")) as Record<string, unknown>;
    if (header.alg !== "RS256" || typeof header.kid !== "string") return null;
    const key = getPublicKey(config, header.kid);
    if (!key) return null;

    const signatureVerifier = createVerify("RSA-SHA256");
    signatureVerifier.update(`${parts[0]}.${parts[1]}`);
    signatureVerifier.end();
    if (!signatureVerifier.verify(key, Buffer.from(parts[2], "base64url"))) return null;

    const claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as Record<string, unknown>;
    const now = Math.floor(Date.now() / 1000);
    const audience = claims.aud;
    if (
      claims.iss !== config.issuer ||
      !(audience === config.clientId || (Array.isArray(audience) && audience.includes(config.clientId))) ||
      typeof claims.exp !== "number" || claims.exp <= now ||
      typeof claims.iat !== "number" || claims.iat > now + 60 ||
      claims.token_use !== "access_token" || typeof claims.sub !== "string"
    ) return null;
    return claims;
  } catch {
    return null;
  }
}

function parseBasicClient(request: Request, body: URLSearchParams, config: OidcConfig): boolean {
  const authorization = request.headers.get("authorization");
  if (!authorization || !/^Basic\s/i.test(authorization)) return false;
  let clientId: string;
  let clientSecret: string;
  try {
    const decoded = Buffer.from(authorization.replace(/^Basic\s+/i, ""), "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    if (separator < 1) return false;
    const decodeFormComponent = (value: string) => decodeURIComponent(value.replace(/\+/g, " "));
    clientId = decodeFormComponent(decoded.slice(0, separator));
    clientSecret = decodeFormComponent(decoded.slice(separator + 1));
  } catch {
    return false;
  }
  if (body.has("client_id") || body.has("client_secret")) return false;
  return clientId === config.clientId && constantTimeEqual(clientSecret, config.clientSecret);
}

async function findEligibleUser(id: string): Promise<OidcUser | null> {
  return db.user.findFirst({
    where: { id, deletedAt: null, flagged: false },
    select: { id: true, email: true, emailVerified: true, name: true, username: true, avatar: true },
  });
}

export function discoveryHandler(): Response {
  try {
    const { issuer } = getConfig();
    return json({
      issuer,
      authorization_endpoint: `${issuer}/api/oidc/authorize`,
      token_endpoint: `${issuer}/api/oidc/token`,
      userinfo_endpoint: `${issuer}/api/oidc/userinfo`,
      jwks_uri: `${issuer}/api/oidc/jwks`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code"],
      subject_types_supported: ["public"],
      id_token_signing_alg_values_supported: ["RS256"],
      token_endpoint_auth_methods_supported: ["client_secret_basic"],
      code_challenge_methods_supported: ["S256"],
      scopes_supported: ["openid", "profile", "email"],
      claims_supported: ["sub", "iss", "aud", "exp", "iat", "nonce", "name", "preferred_username", "picture", "email", "email_verified"],
    });
  } catch {
    return json({ error: "OIDC provider is not configured" }, 503);
  }
}

export function jwksHandler(): Response {
  try {
    const config = getConfig();
    const keys = [publicJwk(config)];
    if (config.previousKeyId && config.previousPublicKeyPem) {
      const previous = createPublicKey(config.previousPublicKeyPem).export({ format: "jwk" });
      keys.push({ ...previous, kid: config.previousKeyId, use: "sig", alg: "RS256" });
    }
    return json({ keys }, 200, { "Cache-Control": "public, max-age=300, stale-while-revalidate=300" });
  } catch {
    return json({ error: "OIDC provider is not configured" }, 503);
  }
}

export async function authorizeHandler(request: Request, sessionUserId: string | null): Promise<Response> {
  let config: OidcConfig;
  let params: URLSearchParams;
  try {
    config = getConfig();
    params = new URL(request.url).searchParams;
  } catch {
    return json({ error: "OIDC provider is not configured" }, 503);
  }

  const redirectUri = params.get("redirect_uri");
  if (params.get("client_id") !== config.clientId || redirectUri !== config.redirectUri) {
    return oauthError("invalid_request");
  }
  const singletonParameters = [
    "response_type", "client_id", "redirect_uri", "scope", "state", "nonce", "code_challenge", "code_challenge_method",
  ];
  if (singletonParameters.some((parameter) => params.getAll(parameter).length > 1)) {
    return oauthError("invalid_request");
  }

  const state = params.get("state");
  const nonce = params.get("nonce");
  const challenge = params.get("code_challenge");
  const scopes = (params.get("scope") ?? "").split(" ").filter(Boolean);
  const validChallenge = challenge && /^[A-Za-z0-9_-]{43}$/.test(challenge);
  if (
    params.get("response_type") !== "code" ||
    !state || state.length > 512 || !nonce || nonce.length > 512 ||
    params.get("code_challenge_method") !== "S256" || !validChallenge ||
    !scopes.includes("openid") || scopes.some((scope) => !SUPPORTED_SCOPES.has(scope)) ||
    new Set(scopes).size !== scopes.length
  ) {
    const target = new URL(redirectUri);
    target.searchParams.set("error", "invalid_request");
    if (state) target.searchParams.set("state", state);
    return redirect(target);
  }

  if (!sessionUserId) {
    const login = new URL(`${config.issuer}/login`);
    login.searchParams.set("callbackUrl", `/api/oidc/authorize?${params.toString()}`);
    return redirect(login);
  }

  const user = await findEligibleUser(sessionUserId);
  if (!user) {
    const target = new URL(redirectUri);
    target.searchParams.set("error", "access_denied");
    target.searchParams.set("state", state);
    return redirect(target);
  }

  const code = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + AUTH_CODE_TTL_MS);
  await db.verificationToken.deleteMany({
    where: { identifier: { startsWith: CODE_IDENTIFIER_PREFIX }, expires: { lt: new Date() } },
  });
  await db.verificationToken.create({
    data: {
      identifier: `${CODE_IDENTIFIER_PREFIX}${sha256(code)}`,
      token: JSON.stringify({
        clientId: config.clientId,
        redirectUri,
        subject: user.id,
        scope: scopes,
        nonce,
        codeChallenge: challenge,
        createdAt: Date.now(),
      } satisfies OidcGrant),
      expires,
    },
  });

  const target = new URL(redirectUri);
  target.searchParams.set("code", code);
  target.searchParams.set("state", state);
  return redirect(target);
}

export async function tokenHandler(request: Request): Promise<Response> {
  let config: OidcConfig;
  let body: URLSearchParams;
  try {
    config = getConfig();
    if (!request.headers.get("content-type")?.includes("application/x-www-form-urlencoded")) {
      return oauthError("invalid_request");
    }
    body = new URLSearchParams(await request.text());
  } catch {
    return oauthError("invalid_request");
  }
  const singletonBodyParameters = ["grant_type", "code", "redirect_uri", "code_verifier"];
  if (singletonBodyParameters.some((parameter) => body.getAll(parameter).length > 1)) {
    return oauthError("invalid_request");
  }
  if (!parseBasicClient(request, body, config)) {
    return oauthError("invalid_client", 401, { "WWW-Authenticate": 'Basic realm="oidc-token", charset="UTF-8"' });
  }
  if (body.get("grant_type") !== "authorization_code") return oauthError("unsupported_grant_type");

  const code = body.get("code");
  const redirectUri = body.get("redirect_uri");
  const verifier = body.get("code_verifier");
  if (!code || !redirectUri || !verifier || !/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)) {
    return oauthError("invalid_request");
  }
  if (redirectUri !== config.redirectUri) return oauthError("invalid_grant");

  const rows = await db.$queryRaw<Array<{ token: string; expires: Date }>>`
    DELETE FROM "verification_tokens"
    WHERE "identifier" = ${`${CODE_IDENTIFIER_PREFIX}${sha256(code)}`}
    RETURNING "token", "expires"
  `;
  const row = rows[0];
  if (!row || row.expires.getTime() <= Date.now()) return oauthError("invalid_grant");

  let grant: OidcGrant;
  try {
    grant = JSON.parse(row.token) as OidcGrant;
  } catch {
    return oauthError("invalid_grant");
  }
  if (
    grant.clientId !== config.clientId || grant.redirectUri !== redirectUri ||
    !Array.isArray(grant.scope) || typeof grant.subject !== "string" ||
    !grant.nonce || !grant.codeChallenge ||
    sha256(verifier) !== grant.codeChallenge
  ) return oauthError("invalid_grant");

  const user = await findEligibleUser(grant.subject);
  if (!user) return oauthError("invalid_grant");

  const now = Math.floor(Date.now() / 1000);
  const commonClaims = { iss: config.issuer, aud: config.clientId, sub: user.id, iat: now };
  const idToken = signJwt(config, {
    ...commonClaims,
    exp: now + ID_TOKEN_TTL_SECONDS,
    nonce: grant.nonce,
    ...(grant.scope.includes("profile") ? { name: user.name ?? user.username, preferred_username: user.username, ...(user.avatar ? { picture: user.avatar } : {}) } : {}),
    ...(grant.scope.includes("email") ? { email: user.email, email_verified: Boolean(user.emailVerified) } : {}),
  });
  const accessToken = signJwt(config, {
    ...commonClaims,
    exp: now + ACCESS_TOKEN_TTL_SECONDS,
    token_use: "access_token",
    client_id: config.clientId,
    scope: grant.scope.join(" "),
  });

  return json({
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: ACCESS_TOKEN_TTL_SECONDS,
    id_token: idToken,
    scope: grant.scope.join(" "),
  });
}

export async function userinfoHandler(request: Request): Promise<Response> {
  let config: OidcConfig;
  try {
    config = getConfig();
  } catch {
    return oauthError("server_error", 503);
  }
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return oauthError("invalid_token", 401);
  const claims = verifyJwt(config, authorization.slice(7));
  if (!claims) return oauthError("invalid_token", 401);
  const user = await findEligibleUser(claims.sub as string);
  if (!user) return oauthError("invalid_token", 401);
  const scopes = typeof claims.scope === "string" ? claims.scope.split(" ") : [];
  return json({
    sub: user.id,
    ...(scopes.includes("profile") ? { name: user.name ?? user.username, preferred_username: user.username, ...(user.avatar ? { picture: user.avatar } : {}) } : {}),
    ...(scopes.includes("email") ? { email: user.email, email_verified: Boolean(user.emailVerified) } : {}),
  });
}
