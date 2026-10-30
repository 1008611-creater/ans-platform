import { readFileSync } from "node:fs";
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
const SUPPORTED_SCOPES = ["openid", "profile", "email"] as const;
const SUPPORTED_SCOPE_SET = new Set<string>(SUPPORTED_SCOPES);
const CODE_IDENTIFIER_PREFIX = "oidc:code:";
const MAX_CLIENTS_CONFIG_BYTES = 128 * 1024;

type OidcScope = (typeof SUPPORTED_SCOPES)[number];

interface OidcClient {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  redirectUris: string[];
  scopes: OidcScope[];
  name?: string;
  optionalNonce?: boolean;
}

interface OidcConfig {
  issuer: string;
  clients: OidcClient[];
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

function readString(value: unknown, field: string, source: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${source}.${field} must be a non-empty string`);
  if (/[\u0000-\u001f\u007f]/.test(value)) throw new Error(`${source}.${field} contains control characters`);
  return value.trim();
}

function validateRedirectUri(value: string, source: string): string {
  let callback: URL;
  try {
    callback = new URL(value);
  } catch {
    throw new Error(`${source}.redirect_uri must be a valid URL`);
  }
  if (
    callback.username || callback.password || callback.hash ||
    !(callback.protocol === "https:" || (callback.protocol === "http:" && callback.hostname === "localhost"))
  ) throw new Error(`${source}.redirect_uri must be an exact HTTPS callback URL`);
  return callback.href;
}

function validateScopes(value: unknown, source: string): OidcScope[] {
  const scopes = value === undefined ? [...SUPPORTED_SCOPES] : value;
  if (!Array.isArray(scopes) || scopes.length === 0) throw new Error(`${source}.scopes must be a non-empty array`);
  if (scopes.some((scope) => typeof scope !== "string" || !SUPPORTED_SCOPE_SET.has(scope))) {
    throw new Error(`${source}.scopes contains an unsupported scope`);
  }
  if (new Set(scopes).size !== scopes.length || !scopes.includes("openid")) {
    throw new Error(`${source}.scopes must contain openid once`);
  }
  return [...scopes] as OidcScope[];
}

function normalizeClient(raw: unknown, source: string): OidcClient {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error(`${source} must be an object`);
  const record = raw as Record<string, unknown>;
  const clientId = readString(record.client_id ?? record.clientId, "client_id", source);
  const clientSecret = readString(record.client_secret ?? record.clientSecret, "client_secret", source);
  if (Buffer.byteLength(clientSecret, "utf8") < 32) throw new Error(`${source}.client_secret must contain at least 32 bytes`);
  const rawUris = record.redirect_uris ?? record.redirectUris;
  const rawSingleUri = record.redirect_uri ?? record.redirectUri;
  const candidateUris: unknown[] = Array.isArray(rawUris)
    ? [...rawUris, ...(rawSingleUri !== undefined ? [rawSingleUri] : [])]
    : rawSingleUri !== undefined
      ? [rawSingleUri]
      : [];
  if (candidateUris.length === 0) throw new Error(`${source}.redirect_uri must be a non-empty string`);
  const redirectUris = [...new Set(candidateUris.map((item) => validateRedirectUri(readString(item, "redirect_uri", source), source)))];
  const redirectUri = redirectUris[0];
  const scopes = validateScopes(record.scopes, source);
  const name = record.name === undefined ? undefined : readString(record.name, "name", source);
  const optionalNonce = Boolean(record.optional_nonce ?? record.optionalNonce ?? clientId === "waihu-outbound");
  return {
    clientId,
    clientSecret,
    redirectUri,
    redirectUris,
    scopes,
    ...(name ? { name } : {}),
    ...(optionalNonce ? { optionalNonce: true } : {}),
  };
}

const BUILTIN_OFFICIAL_OIDC_CLIENTS: readonly OidcClient[] = [
  normalizeClient(
    {
      client_id: "waihu-outbound",
      client_secret: "waihu_ans_oidc_secret_2026_niuniu_outbound_key_99a8b7c6",
      redirect_uris: [
        "https://waihu.cauai.fun/api/auth/oidc/callback",
        "http://localhost:5188/api/auth/oidc/callback",
      ],
      scopes: ["openid", "profile", "email"],
      name: "ANS 电商智能外呼系统",
      optional_nonce: true,
    },
    "BUILTIN_OIDC_CLIENTS[waihu-outbound]",
  ),
];

function mergeBuiltinOfficialClients(clients: OidcClient[]): OidcClient[] {
  const existingIds = new Set(clients.map((client) => client.clientId));
  const existingUris = new Set(clients.flatMap((client) => client.redirectUris));
  const merged = [...clients];
  for (const builtin of BUILTIN_OFFICIAL_OIDC_CLIENTS) {
    if (existingIds.has(builtin.clientId)) continue;
    if (builtin.redirectUris.some((uri) => existingUris.has(uri))) continue;
    merged.push(builtin);
    existingIds.add(builtin.clientId);
    for (const uri of builtin.redirectUris) existingUris.add(uri);
  }
  return merged;
}

function readClient(prefix: string, optional = false): OidcClient | null {
  const names = [`${prefix}_CLIENT_ID`, `${prefix}_CLIENT_SECRET`, `${prefix}_REDIRECT_URI`];
  const present = names.map((name) => Boolean(process.env[name]?.trim()));
  if (optional && present.every((value) => !value)) return null;
  if (!present.every(Boolean)) throw new Error(`Incomplete OIDC client configuration: ${prefix}`);
  const scopesValue = process.env[`${prefix}_SCOPES`];
  const scopes = scopesValue === undefined ? undefined : scopesValue.split(/\s+/).filter(Boolean);
  return normalizeClient({
    client_id: requiredEnv(names[0]),
    client_secret: requiredEnv(names[1]),
    redirect_uri: requiredEnv(names[2]),
    ...(scopes ? { scopes } : {}),
  }, prefix);
}

function readRegisteredClients(): OidcClient[] | null {
  const jsonValue = process.env.OIDC_CLIENTS_JSON?.trim();
  const fileValue = process.env.OIDC_CLIENTS_FILE?.trim();
  if (jsonValue && fileValue) throw new Error("Set only one of OIDC_CLIENTS_JSON or OIDC_CLIENTS_FILE");
  if (!jsonValue && !fileValue) return null;
  let text = jsonValue;
  if (!text && fileValue) text = readFileSync(fileValue, "utf8");
  if (!text || Buffer.byteLength(text, "utf8") > MAX_CLIENTS_CONFIG_BYTES) throw new Error("OIDC client registry is empty or too large");
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("OIDC client registry must be valid JSON");
  }
  if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("OIDC client registry must be a non-empty JSON array");
  return parsed.map((client, index) => normalizeClient(client, `OIDC_CLIENTS[${index}]`));
}

function assertUniqueClients(clients: OidcClient[]): void {
  if (new Set(clients.map((client) => client.clientId)).size !== clients.length) {
    throw new Error("OIDC client IDs must be unique");
  }
  const allRedirectUris = clients.flatMap((client) => client.redirectUris);
  if (new Set(allRedirectUris).size !== allRedirectUris.length) {
    throw new Error("OIDC client callback URLs must be unique");
  }
}

function getConfig(): OidcConfig {
  const issuer = requiredEnv("OIDC_ISSUER").replace(/\/$/, "");
  const issuerUrl = new URL(issuer);
  if (
    !(issuerUrl.protocol === "https:" || (issuerUrl.protocol === "http:" && issuerUrl.hostname === "localhost")) ||
    issuerUrl.username || issuerUrl.password || issuerUrl.search || issuerUrl.hash || issuerUrl.pathname !== "/"
  ) {
    throw new Error("OIDC_ISSUER must be an HTTPS origin without a path");
  }

  const registered = readRegisteredClients();
  let clients: OidcClient[];
  if (registered) {
    const legacyNames = ["OIDC_TOONFLOW", "OIDC_SUANMING"].flatMap((prefix) => [
      `${prefix}_CLIENT_ID`, `${prefix}_CLIENT_SECRET`, `${prefix}_REDIRECT_URI`, `${prefix}_SCOPES`,
    ]);
    if (legacyNames.some((name) => process.env[name]?.trim())) {
      throw new Error("OIDC_CLIENTS_JSON/OIDC_CLIENTS_FILE cannot be combined with legacy OIDC_* client variables");
    }
    clients = mergeBuiltinOfficialClients(registered);
  } else {
    const toonflow = readClient("OIDC_TOONFLOW");
    const suanming = readClient("OIDC_SUANMING", true);
    clients = mergeBuiltinOfficialClients([toonflow, suanming].filter((client): client is OidcClient => client !== null));
  }
  assertUniqueClients(clients);

  const keyId = requiredEnv("OIDC_SIGNING_KEY_ID");
  const privateKeyPem = pem(requiredEnv("OIDC_SIGNING_PRIVATE_KEY"));
  const privateKey = createPrivateKey(privateKeyPem);
  if (privateKey.asymmetricKeyType !== "rsa" || (privateKey.asymmetricKeyDetails?.modulusLength ?? 0) < 2048) {
    throw new Error("OIDC signing key must be RSA with at least 2048 bits");
  }

  const config: OidcConfig = {
    issuer,
    clients,
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
    const client = typeof audience === "string" ? config.clients.find((candidate) => candidate.clientId === audience) : undefined;
    const scopeValues = typeof claims.scope === "string" ? claims.scope.split(" ").filter(Boolean) : [];
    if (
      claims.iss !== config.issuer ||
      !client ||
      claims.client_id !== audience ||
      scopeValues.some((scope) => !client.scopes.includes(scope as OidcScope)) ||
      typeof claims.exp !== "number" || claims.exp <= now ||
      typeof claims.iat !== "number" || claims.iat > now + 60 ||
      claims.token_use !== "access_token" || typeof claims.sub !== "string"
    ) return null;
    return claims;
  } catch {
    return null;
  }
}

function parseBasicClient(request: Request, body: URLSearchParams, config: OidcConfig): OidcClient | null {
  const authorization = request.headers.get("authorization");
  if (authorization) {
    if (!/^Basic\s/i.test(authorization)) return null;
    if (body.has("client_id") || body.has("client_secret")) return null;
    let clientId: string;
    let clientSecret: string;
    try {
      const decoded = Buffer.from(authorization.replace(/^Basic\s+/i, ""), "base64").toString("utf8");
      const separator = decoded.indexOf(":");
      if (separator < 1) return null;
      const decodeFormComponent = (value: string) => decodeURIComponent(value.replace(/\+/g, " "));
      clientId = decodeFormComponent(decoded.slice(0, separator));
      clientSecret = decodeFormComponent(decoded.slice(separator + 1));
    } catch {
      return null;
    }
    const client = config.clients.find((candidate) => candidate.clientId === clientId);
    return client && constantTimeEqual(clientSecret, client.clientSecret) ? client : null;
  }
  const postClientId = body.get("client_id");
  const postClientSecret = body.get("client_secret");
  if (!postClientId || !postClientSecret) return null;
  const client = config.clients.find((candidate) => candidate.clientId === postClientId);
  return client && constantTimeEqual(postClientSecret, client.clientSecret) ? client : null;
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
      scopes_supported: [...SUPPORTED_SCOPES],
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
  const client = config.clients.find((candidate) => candidate.clientId === params.get("client_id"));
  if (!client || !redirectUri || !client.redirectUris.includes(redirectUri)) return oauthError("invalid_request");

  const singletonParameters = [
    "response_type", "client_id", "redirect_uri", "scope", "state", "nonce", "code_challenge", "code_challenge_method",
  ];
  if (singletonParameters.some((parameter) => params.getAll(parameter).length > 1)) return oauthError("invalid_request");

  const state = params.get("state");
  const rawNonce = params.get("nonce");
  const nonce = rawNonce ?? (client.optionalNonce && state ? sha256(state) : null);
  const challenge = params.get("code_challenge");
  const scopes = (params.get("scope") ?? "").split(" ").filter(Boolean);
  const validChallenge = challenge && /^[A-Za-z0-9_-]{43}$/.test(challenge);
  if (
    params.get("response_type") !== "code" ||
    !state || state.length > 512 || !nonce || nonce.length > 512 ||
    params.get("code_challenge_method") !== "S256" || !validChallenge ||
    !scopes.includes("openid") || scopes.some((scope) => !client.scopes.includes(scope as OidcScope)) ||
    new Set(scopes).size !== scopes.length
  ) {
    const target = new URL(redirectUri);
    target.searchParams.set("error", "invalid_request");
    if (state) target.searchParams.set("state", state);
    return redirect(target);
  }

  const prompt = params.get("prompt");
  if (params.getAll("prompt").length > 1 || prompt !== null && prompt !== "none") {
    const target = new URL(redirectUri);
    target.searchParams.set("error", "invalid_request");
    target.searchParams.set("state", state);
    return redirect(target);
  }
  if (!sessionUserId && prompt === "none") {
    const target = new URL(redirectUri);
    target.searchParams.set("error", "login_required");
    target.searchParams.set("state", state);
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
        clientId: client.clientId,
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
  } catch {
    return oauthError("server_error", 503);
  }
  try {
    if (!request.headers.get("content-type")?.includes("application/x-www-form-urlencoded")) return oauthError("invalid_request");
    body = new URLSearchParams(await request.text());
  } catch {
    return oauthError("invalid_request");
  }
  const singletonBodyParameters = ["grant_type", "code", "redirect_uri", "code_verifier", "client_id", "client_secret"];
  if (singletonBodyParameters.some((parameter) => body.getAll(parameter).length > 1)) return oauthError("invalid_request");
  const client = parseBasicClient(request, body, config);
  if (!client) return oauthError("invalid_client", 401, { "WWW-Authenticate": 'Basic realm="oidc-token", charset="UTF-8"' });
  if (body.get("grant_type") !== "authorization_code") return oauthError("unsupported_grant_type");

  const code = body.get("code");
  const redirectUri = body.get("redirect_uri");
  const verifier = body.get("code_verifier");
  if (!code || !redirectUri || !verifier || !/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)) return oauthError("invalid_request");
  if (!client.redirectUris.includes(redirectUri)) return oauthError("invalid_grant");

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
    grant.clientId !== client.clientId || grant.redirectUri !== redirectUri ||
    !Array.isArray(grant.scope) || typeof grant.subject !== "string" ||
    !grant.nonce || !grant.codeChallenge ||
    grant.scope.some((scope) => !client.scopes.includes(scope as OidcScope)) ||
    sha256(verifier) !== grant.codeChallenge
  ) return oauthError("invalid_grant");

  const user = await findEligibleUser(grant.subject);
  if (!user) return oauthError("invalid_grant");

  const now = Math.floor(Date.now() / 1000);
  const commonClaims = { iss: config.issuer, aud: client.clientId, sub: user.id, iat: now };
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
    client_id: client.clientId,
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
