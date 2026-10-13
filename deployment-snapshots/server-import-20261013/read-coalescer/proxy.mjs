import http from "node:http";

// Coalesce only concurrent, anonymous HTML reads of the public home and project square.
// No completed response is retained. Cookie/auth/RSC/action requests pass through.
const pending = new Map();
const upstreamHost = process.env.ANS_UPSTREAM_HOST || "ans-platform-app";
const upstreamPort = Number(process.env.ANS_UPSTREAM_PORT || 3000);
const hopHeaders = new Set(["connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "te", "trailer", "transfer-encoding", "upgrade"]);
function cleanHeaders(headers) {
  const dynamicHop = new Set(String(headers.connection || "").toLowerCase().split(",").map(v => v.trim()));
  return Object.fromEntries(Object.entries(headers).filter(([key]) => !hopHeaders.has(key) && !dynamicHop.has(key)));
}
function requestUpstream(req) {
  return http.request({ host: upstreamHost, port: upstreamPort, path: req.url, method: req.method, headers: cleanHeaders(req.headers), timeout: 30000 });
}
function passThrough(req, res) {
  const upstream = requestUpstream(req);
  upstream.on("response", source => {
    res.writeHead(source.statusCode || 502, cleanHeaders(source.headers));
    source.on("error", () => res.destroy());
    source.pipe(res);
  });
  upstream.on("timeout", () => upstream.destroy(new Error("upstream timeout")));
  upstream.on("error", () => {
    if (!res.headersSent) res.writeHead(502, { "Cache-Control": "no-store" });
    res.end();
  });
  res.on("close", () => { if (!res.writableEnded) upstream.destroy(); });
  req.pipe(upstream);
}
function eligible(req) {
  return req.method === "GET" && (req.url === "/" || req.url === "/explore") &&
    !Object.keys(req.headers).some(key => key === "cookie" || key === "authorization" || key === "rsc" ||
      key === "range" || key.startsWith("if-") || key.startsWith("next-") || key.startsWith("x-middleware-") || key.startsWith("x-nextjs-"));
}
// Profile HTML and RSC responses are buffered independently, including authenticated requests.
// They never enter the shared pending map and are always returned with no-store.
function profileRequest(req) {
  return req.method === "GET" && /^\/@[^/]+\/?$/.test(new URL(req.url, "http://internal").pathname);
}
async function sendProfile(req, res) {
  try {
    const result = await load(req);
    if (!res.destroyed) {
      res.writeHead(result.status, { ...result.headers, "cache-control": "private, no-store", "content-length": result.body.length });
      res.end(result.body);
    }
  } catch {
    if (!res.destroyed) { res.writeHead(502, { "Cache-Control": "no-store" }); res.end(); }
  }
}
function load(req) {
  return new Promise((resolve, reject) => {
    const upstream = requestUpstream(req);
    upstream.on("response", source => {
      const chunks = []; let size = 0;
      source.on("data", chunk => {
        size += chunk.length;
        if (size > 2 * 1024 * 1024) upstream.destroy(new Error("response too large"));
        else chunks.push(chunk);
      });
      source.on("error", reject);
      source.on("aborted", () => reject(new Error("response aborted")));
      source.on("end", () => resolve({ status: source.statusCode || 502, headers: cleanHeaders(source.headers), body: Buffer.concat(chunks) }));
    });
    upstream.on("timeout", () => upstream.destroy(new Error("upstream timeout")));
    upstream.on("error", reject);
    upstream.end();
  });
}
const server = http.createServer(async (req, res) => {
  if (req.url === "/internal-health") {
    res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    res.end(JSON.stringify({ status: "healthy", pending: pending.size })); return;
  }
  if (profileRequest(req)) { await sendProfile(req, res); return; }
  if (!eligible(req)) { passThrough(req, res); return; }
  const key = JSON.stringify([req.url, req.headers.host, req.headers.accept, req.headers["accept-encoding"], req.headers["accept-language"], req.headers["user-agent"]]);
  let flight = pending.get(key); const leader = !flight;
  if (!flight) {
    if (pending.size >= 64) { passThrough(req, res); return; }
    flight = load(req); pending.set(key, flight);
  }
  try {
    const result = await flight;
    if (!leader && (result.status !== 200 || result.headers["set-cookie"])) { passThrough(req, res); return; }
    if (!res.destroyed) { res.writeHead(result.status, { ...result.headers, "content-length": result.body.length }); res.end(result.body); }
  } catch {
    if (!res.destroyed) { res.writeHead(502, { "Cache-Control": "no-store" }); res.end(); }
  } finally {
    if (leader && pending.get(key) === flight) pending.delete(key);
  }
});
server.requestTimeout = 35000;
server.headersTimeout = 15000;
server.listen(3010, "0.0.0.0");
