import zh from "../../messages/easel/zh.json" with { type: "json" };
import en from "../../messages/easel/en.json" with { type: "json" };
import { bootstrapScript } from "./frontend.mjs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import http from "node:http";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { pathToFileURL } from "node:url";
import { Containers } from "./containers.mjs";
import { GatewayError, origin, key, now, random, challenge, same, seal, open, cookieValue, verifyIdToken, tenantId, remoteJson } from "./auth.mjs";

export function configuration(env = process.env) {
  const development = env.EASEL_ALLOW_HTTP_DEV === "1";
  const config = { development, publicOrigin: origin(env.EASEL_PUBLIC_ORIGIN, development), issuer: origin(env.EASEL_OIDC_ISSUER, development),
    clientId: env.EASEL_OIDC_CLIENT_ID, clientSecret: env.EASEL_OIDC_CLIENT_SECRET,
    cookieKey: key(env.EASEL_COOKIE_KEY), tenantKey: key(env.EASEL_TENANT_KEY),
    frontendDirectory: env.EASEL_FRONTEND_DIR, namespace: env.EASEL_NAMESPACE ?? "ans-easel", image: env.EASEL_WORKER_IMAGE ?? "ans-easel-worker:bb3c8ff",
    egressImage: env.EASEL_EGRESS_IMAGE ?? "ans-easel-egress:1", maxActive: Number(env.EASEL_MAX_ACTIVE ?? 4), maxUsers: Number(env.EASEL_MAX_USERS ?? 30),
    idleMs: Number(env.EASEL_IDLE_SECONDS ?? 10800) * 1000, port: Number(env.EASEL_GATEWAY_PORT ?? 7871) };
  if (config.publicOrigin === config.issuer || !/^[a-z][a-z0-9-]{0,24}$/.test(config.namespace) ||
      !config.frontendDirectory || !path.isAbsolute(config.frontendDirectory) || !config.clientId || !config.clientSecret || !/^[a-zA-Z0-9][a-zA-Z0-9/_.:@-]+$/.test(config.image) || !/^[a-zA-Z0-9][a-zA-Z0-9/_.:@-]+$/.test(config.egressImage) ||
      !Number.isInteger(config.maxActive) || config.maxActive < 1 || config.maxActive > 30 || !Number.isInteger(config.maxUsers) || config.maxUsers < config.maxActive || config.maxUsers > 1000 ||
      !Number.isFinite(config.idleMs) || config.idleMs < 600000 || !Number.isInteger(config.port) || config.port < 1 || config.port > 65535) throw new GatewayError("INVALID_CONFIGURATION");
  config.sessionCookie = development ? "ans_easel_session" : "__Host-ans_easel_session";
  config.transactionCookie = development ? "ans_easel_transaction" : "__Host-ans_easel_transaction";
  return config;
}
function json(response, value, status = 200) { response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" }); response.end(JSON.stringify(value)); }
function redirect(response, location) { response.writeHead(302, { Location: location }); response.end(); }
function cookie(config, name, value, age) { return `${name}=${value}; Path=/; HttpOnly; SameSite=${config.development ? "Lax" : "None"}; Max-Age=${age}${config.development ? "" : "; Secure"}`; }
function page(response, body, status = 200) { response.writeHead(status, { "Content-Type": "text/html; charset=utf-8" }); response.end(body); }
function serialize(value) { return JSON.stringify(value).replace(/</g, "\\u003c"); }
function embedHtml(config, expected, session) {
  const ready = !!session && (!expected || same(expected, session.sub));
  const nonce = random();
  const script = `const issuer=${serialize(config.issuer)},expected=${serialize(expected)},ready=${ready},subject=${serialize(ready ? session.sub : null)};
    const signal=(type,value)=>{if(window.parent!==window)window.parent.postMessage(type==='ans:easel:error'?{type,code:value}:{type,userId:value},issuer);};
    if(ready){let workspace,workspaceReady=false,renewal,renewalTimeout,loadTimeout;
      const reconnect=()=>{signal('ans:easel:refresh',subject);renewal=document.createElement('iframe');renewal.hidden=true;renewal.src='/ans/oidc/start?silent=1&renew=1&expected='+encodeURIComponent(subject);document.body.append(renewal);renewalTimeout=setTimeout(()=>{workspace?.remove();workspace=null;renewal?.remove();signal('ans:easel:error','login_required');},45000);};
      window.addEventListener('message',event=>{if(event.origin!==${serialize(config.publicOrigin)})return;
        const data=event.data;
        if(event.source===workspace?.contentWindow&&data?.type==='ans:easel:workspace-ready'&&data.userId===subject){if(workspaceReady)return;workspaceReady=true;clearTimeout(loadTimeout);signal('ans:easel:ready',subject);setTimeout(reconnect,180000);return;}
        if(event.source!==renewal?.contentWindow)return;if(data?.type==='ans:easel:renewed'&&data.userId===subject){clearTimeout(renewalTimeout);renewal.remove();renewal=null;signal('ans:easel:ready',subject);setTimeout(reconnect,180000);}
        else if(data?.type==='ans:easel:error'){clearTimeout(renewalTimeout);workspace?.remove();workspace=null;renewal?.remove();signal('ans:easel:error',data.code||'login_required');}});
      fetch('/ans/runtime',{method:'POST',headers:{'X-ANS-Easel-Workspace':subject}}).then(async response=>{if(!response.ok)throw new Error();workspace=document.createElement('iframe');workspace.src='/?ans_owner='+encodeURIComponent(subject);workspace.title='Easel';workspace.style='border:0;width:100%;height:100dvh';document.body.append(workspace);loadTimeout=setTimeout(()=>{workspace?.remove();workspace=null;signal('ans:easel:error','runtime_unavailable');},45000);}).catch(()=>signal('ans:easel:error','runtime_unavailable'));
    }else{location.replace('/ans/oidc/start?silent=1&expected='+encodeURIComponent(expected));}`;
  return { nonce, html: `<!doctype html><html lang="zh"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Easel</title><style>body{margin:0}iframe{display:block}</style><body><script nonce="${nonce}">${script}</script></body></html>` };
}
function escapeHtml(value) { return value.replace(/[&<>"']/g, character => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[character]); }
function errorHtml(config, code, renewal = false, language = "zh") {
  const strings = language === "en" ? en : zh;
  const message = strings.connection[code] ?? strings.connection.unavailable;
  const nonce = random(); return { nonce, html: `<!doctype html><html lang="${language}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(message.title)}</title><body><main><h1>${escapeHtml(message.title)}</h1><p>${escapeHtml(message.body)}</p><a href="${escapeHtml(config.issuer + "/workflows/easel")}" target="_blank" rel="noopener noreferrer">${escapeHtml(strings.back)}</a></main><script nonce="${nonce}">if(window.parent!==window)window.parent.postMessage({type:'ans:easel:error',code:${serialize(code)}},${serialize(renewal ? config.publicOrigin : config.issuer)});</script></body></html>` };
}

export function createGateway(config, { containers = new Containers(config), remote = remoteJson } = {}) {
  const identityCache = new Map(); const transactions = new Map();
  async function session(request) {
    const stored = open(cookieValue(request.headers.cookie, config.sessionCookie), config.cookieKey, "session");
    if (!stored || typeof stored.sub !== "string" || typeof stored.accessToken !== "string") return null;
    const cached = identityCache.get(challenge(stored.accessToken));
    if (!cached || cached.expires < Date.now()) {
      try {
        const user = await remote(config.issuer + "/api/oidc/userinfo", { headers: { Authorization: "Bearer " + stored.accessToken } });
        if (!same(user.sub, stored.sub)) return null;
        identityCache.set(challenge(stored.accessToken), { expires: Date.now() + 30000 });
      } catch (error) { if (error.status === 401) return null; throw error; }
    }
    return stored;
  }
  const server = http.createServer(async (request, response) => {
    response.setHeader("Cache-Control", "no-store, private"); response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("Content-Security-Policy", `frame-ancestors 'self' ${config.issuer}; object-src 'none'; base-uri 'self'`);
    try {
      const url = new URL(request.url, config.publicOrigin);
      if (url.origin !== config.publicOrigin) throw new GatewayError("INVALID_REQUEST", 400);
      if (!["GET", "HEAD", "OPTIONS"].includes(request.method) && request.headers.origin !== config.publicOrigin) throw new GatewayError("CROSS_ORIGIN_WRITE", 403);
      if (url.pathname === "/healthz") { json(response, { ok: true, upstream: "bb3c8ff0463f36c202454d74171682ba6e470cb1" }); return; }
      if (url.pathname === "/ans/oidc/start") {
        if (request.method !== "GET") throw new GatewayError("METHOD_NOT_ALLOWED", 405);
        if (transactions.size >= 1000) throw new GatewayError("LOGIN_CAPACITY", 429);
        const expected = url.searchParams.get("expected") ?? ""; if (expected.length > 256) throw new GatewayError("INVALID_SUBJECT", 400);
        const transaction = { state: random(), nonce: random(), verifier: random(), exp: now() + 300, expected, renew: url.searchParams.get("renew") === "1", silent: url.searchParams.get("silent") === "1" };
        transactions.set(transaction.state, transaction.exp);
        response.setHeader("Set-Cookie", cookie(config, config.transactionCookie, seal(transaction, config.cookieKey, "transaction"), 300));
        const target = new URL(config.issuer + "/api/oidc/authorize");
        for (const [name, value] of Object.entries({ response_type: "code", client_id: config.clientId, redirect_uri: config.publicOrigin + "/ans/oidc/callback", scope: "openid profile", state: transaction.state, nonce: transaction.nonce, code_challenge: challenge(transaction.verifier), code_challenge_method: "S256", ...(transaction.silent ? { prompt: "none" } : {}) })) target.searchParams.set(name, value);
        redirect(response, target.href); return;
      }
      if (url.pathname === "/ans/oidc/callback") {
        if (request.method !== "GET") throw new GatewayError("METHOD_NOT_ALLOWED", 405);
        const transaction = open(cookieValue(request.headers.cookie, config.transactionCookie), config.cookieKey, "transaction");
        if (!transaction || url.searchParams.getAll("state").length !== 1 || !same(url.searchParams.get("state"), transaction.state) || !transactions.delete(transaction.state)) throw new GatewayError("INVALID_TRANSACTION", 401);
        response.setHeader("Set-Cookie", cookie(config, config.transactionCookie, "", 0));
        if (url.searchParams.has("error")) {
          response.setHeader("Set-Cookie", [cookie(config, config.transactionCookie, "", 0), cookie(config, config.sessionCookie, "", 0)]);
          const result = errorHtml(config, "login_required", transaction.renew, request.headers["accept-language"]?.startsWith("en") ? "en" : "zh"); response.setHeader("Content-Security-Policy", `default-src 'none'; script-src 'nonce-${result.nonce}'; frame-ancestors 'self' ${config.issuer}`); page(response, result.html, 200); return;
        }
        if (url.searchParams.getAll("code").length !== 1 || !url.searchParams.get("code") || url.searchParams.get("code").length > 1024) throw new GatewayError("INVALID_TRANSACTION", 401);
        const token = await remote(config.issuer + "/api/oidc/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: "Basic " + Buffer.from(encodeURIComponent(config.clientId) + ":" + encodeURIComponent(config.clientSecret)).toString("base64") },
          body: new URLSearchParams({ grant_type: "authorization_code", code: url.searchParams.get("code"), redirect_uri: config.publicOrigin + "/ans/oidc/callback", code_verifier: transaction.verifier }).toString() });
        const jwks = await remote(config.issuer + "/api/oidc/jwks");
        const claims = verifyIdToken(token.id_token, jwks.keys, { issuer: config.issuer, clientId: config.clientId, nonce: transaction.nonce });
        if (transaction.expected && !same(transaction.expected, claims.sub)) {
          response.setHeader("Set-Cookie", [cookie(config, config.transactionCookie, "", 0), cookie(config, config.sessionCookie, "", 0)]);
          const result = errorHtml(config, "account_mismatch", transaction.renew, request.headers["accept-language"]?.startsWith("en") ? "en" : "zh"); response.setHeader("Content-Security-Policy", `default-src 'none'; script-src 'nonce-${result.nonce}'; frame-ancestors 'self' ${config.issuer}`); page(response, result.html); return;
        }
        if (typeof token.access_token !== "string" || token.access_token.length > 8000 || !Number.isFinite(token.expires_in) || token.expires_in < 1) throw new GatewayError("INVALID_IDENTITY_RESPONSE");
        const expires = Math.min(claims.exp, now() + 240, now() + token.expires_in);
        const encrypted = seal({ sub: claims.sub, accessToken: token.access_token, exp: expires }, config.cookieKey, "session");
        if (encrypted.length > 3800) throw new GatewayError("SESSION_TOO_LARGE");
        response.setHeader("Set-Cookie", [cookie(config, config.transactionCookie, "", 0), cookie(config, config.sessionCookie, encrypted, expires - now())]);
        if (transaction.renew) {
          const nonce = random(); response.setHeader("Content-Security-Policy", "default-src 'none'; script-src 'nonce-" + nonce + "'; frame-ancestors 'self' " + config.issuer);
          page(response, '<!doctype html><html><body><script nonce="' + nonce + '">window.parent.postMessage({type:"ans:easel:renewed",userId:' + serialize(claims.sub) + '},' + serialize(config.publicOrigin) + ');</script></body></html>'); return;
        }
        redirect(response, "/ans/embed?expected=" + encodeURIComponent(claims.sub)); return;
      }
      const authenticated = await session(request);
      if (url.pathname === "/ans/session") { json(response, { userId: authenticated?.sub ?? null }, authenticated ? 200 : 401); return; }
      if (url.pathname === "/ans/runtime") {
        if (request.method !== "POST") throw new GatewayError("METHOD_NOT_ALLOWED", 405);
        if (!authenticated) throw new GatewayError("LOGIN_REQUIRED", 401);
        if (!same(request.headers["x-ans-easel-workspace"], authenticated.sub)) throw new GatewayError("ACCOUNT_MISMATCH", 401);
        await containers.resolve(tenantId(authenticated.sub, config.tenantKey)); json(response, { ready: true }); return;
      }
      if (url.pathname === "/ans/embed") {
        const expected = url.searchParams.get("expected") ?? "";
        const result = embedHtml(config, expected, authenticated);
        response.setHeader("Content-Security-Policy", `default-src 'none'; script-src 'nonce-${result.nonce}'; style-src 'unsafe-inline'; connect-src 'self'; frame-src 'self' ${config.issuer}; frame-ancestors ${config.issuer}`);
        page(response, result.html); return;
      }
      const media = url.pathname.match(/^\/ans\/media\/([^/]+)\/(.*)$/);
      if (media) {
        if (!["GET", "HEAD"].includes(request.method)) throw new GatewayError("METHOD_NOT_ALLOWED", 405);
        if (!authenticated || !same(decodeURIComponent(media[1]), authenticated.sub)) throw new GatewayError("ACCOUNT_MISMATCH", 401);
        url.pathname = "/api/media/" + media[2];
        // Downloaded or opened generated HTML cannot run with the gateway's origin privileges.
        response.setHeader("Content-Security-Policy", "sandbox allow-scripts allow-downloads; frame-ancestors 'self' " + config.issuer + "; object-src 'none'; base-uri 'self'");
      } else if (url.pathname.startsWith("/ans/")) throw new GatewayError("NOT_FOUND", 404);
      if (!authenticated) throw new GatewayError("LOGIN_REQUIRED", 401);
      if (!media && url.pathname.startsWith("/api/") && !same(request.headers["x-ans-easel-workspace"], authenticated.sub)) throw new GatewayError("ACCOUNT_MISMATCH", 401);
      if (url.pathname === "/" && !url.searchParams.has("ans_owner")) { redirect(response, "/ans/embed?expected=" + encodeURIComponent(authenticated.sub)); return; }
      if (url.pathname === "/" && url.searchParams.has("ans_owner") && !same(url.searchParams.get("ans_owner"), authenticated.sub)) throw new GatewayError("ACCOUNT_MISMATCH", 401);
      if (url.pathname === "/" || url.pathname.startsWith("/assets/") || url.pathname === "/static/easel-icon-transparent.png") {
        if (!["GET", "HEAD"].includes(request.method)) throw new GatewayError("METHOD_NOT_ALLOWED", 405);
        // The frontend is an immutable deployment artifact, never sourced from user workers.
        const filename = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname.slice(1));
        const full = path.resolve(config.frontendDirectory, filename);
        if (!full.startsWith(path.resolve(config.frontendDirectory) + path.sep)) throw new GatewayError("NOT_FOUND", 404);
        let content; try { content = await readFile(full); } catch { throw new GatewayError("FRONTEND_UNAVAILABLE", 503); }
        const types = {".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".woff2":"font/woff2"};
        response.setHeader("Content-Type", types[path.extname(filename)] ?? "application/octet-stream");
        if (filename === "index.html") {
          const script = bootstrapScript(authenticated.sub);
          content = Buffer.from(content.toString("utf8").replace(/<head([^>]*)>/i, match => match + script));
        }
        response.writeHead(200); response.end(request.method === "HEAD" ? undefined : content); return;
      }
      if (!url.pathname.startsWith("/api/")) throw new GatewayError("NOT_FOUND", 404);
      response.setHeader("Content-Security-Policy", "sandbox allow-scripts allow-downloads; frame-ancestors 'self' " + config.issuer + "; object-src 'none'; base-uri 'self'");
      const tenant = tenantId(authenticated.sub, config.tenantKey); const release = containers.lease(tenant);
      const controller = new AbortController(); const expiry = setTimeout(() => controller.abort(), Math.max(1, authenticated.exp - now()) * 1000);
      response.on("close", () => controller.abort());
      try {
        const target = await containers.resolve(tenant);
        const headers = new Headers();
        // Browser cookies, ANS access tokens, auth headers and forwarding identity never reach a worker.
        for (const name of ["content-type", "accept", "range", "if-range", "last-event-id"]) if (request.headers[name]) headers.set(name, request.headers[name]);
        if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) headers.set("Origin", config.publicOrigin);
        let body;
        if (!["GET", "HEAD"].includes(request.method)) {
          if (Number(request.headers["content-length"] ?? 0) > 64 * 1024 * 1024) throw new GatewayError("UPLOAD_TOO_LARGE", 413);
          let received = 0; body = request.pipe(new Transform({ transform(chunk, _encoding, callback) { received += chunk.length; callback(received > 64 * 1024 * 1024 ? new GatewayError("UPLOAD_TOO_LARGE", 413) : null, chunk); } }));
        }
        const upstream = await fetch(target + url.pathname + url.search, { method: request.method, headers, body, duplex: body ? "half" : undefined, redirect: "manual", signal: controller.signal });
        if (upstream.status >= 300 && upstream.status < 400) throw new GatewayError("UPSTREAM_REDIRECT_DENIED", 502);
        for (const name of ["content-type", "content-range", "accept-ranges", "content-disposition"]) if (upstream.headers.has(name)) response.setHeader(name, upstream.headers.get(name));
        response.setHeader("X-Accel-Buffering", "no"); response.writeHead(upstream.status);
        if (upstream.body && request.method !== "HEAD") await pipeline(Readable.fromWeb(upstream.body), response); else response.end();
      } finally { clearTimeout(expiry); release(); }
    } catch (error) {
      if (!response.headersSent) json(response, { error: error instanceof GatewayError ? error.code : "SERVICE_UNAVAILABLE" }, error instanceof GatewayError ? error.status : 503);
      else response.destroy();
      // Do not log URLs, cookies, provider responses, tokens or user inputs.
    }
  });
  server.requestTimeout = 120000; server.headersTimeout = 15000; server.maxConnections = 256;
  const maintenance = setInterval(() => {
    for (const [id, expiry] of transactions) if (expiry <= now()) transactions.delete(id);
    for (const [id, value] of identityCache) if (value.expires < Date.now()) identityCache.delete(id);
    containers.stopIdle().catch(() => {});
  }, 60000); maintenance.unref(); server.on("close", () => clearInterval(maintenance));
  return server;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { const config = configuration(); createGateway(config).listen(config.port, "127.0.0.1", () => console.log("ANS Easel gateway listening on loopback")); }
  catch { console.error("Easel gateway configuration is incomplete or invalid"); process.exitCode = 1; }
}
