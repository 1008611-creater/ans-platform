import http from "node:http";

// Independent, request-local HTML transport for /hubs and /hubs/* only.
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
// Only ordinary Hub document navigations are buffered, independently per request.
// Authenticated HTML is never coalesced or retained after this response.
let hubBuffers = 0;
function hubHtmlRequest(req) {
  const acceptedTypes = String(req.headers.accept || "*/*").toLowerCase().split(",").map(value => value.split(";")[0].trim());
  if (req.method !== "GET" || !acceptedTypes.some(type => type === "text/html" || type === "*/*") ||
      acceptedTypes.includes("text/event-stream") ||
      req.headers["transfer-encoding"] || (req.headers["content-length"] && req.headers["content-length"] !== "0")) return false;
  if (Object.keys(req.headers).some(key => key === "rsc" || key === "range" || key === "upgrade" ||
      key.startsWith("if-") || key.startsWith("next-") || key.startsWith("x-middleware-") || key.startsWith("x-nextjs-"))) return false;
  try {
    const url = new URL(req.url, "http://internal");
    return (url.pathname === "/hubs" || url.pathname.startsWith("/hubs/")) && !url.searchParams.has("_rsc");
  } catch { return false; }
}
function sendHubHtml(req, res) {
  if (hubBuffers >= 32) { passThrough(req, res); return; }
  hubBuffers++;
  let released = false;
  const release = () => { if (!released) { released = true; hubBuffers--; } };
  res.once("finish", release);
  res.once("close", release);
  const upstream = requestUpstream(req);
  const fail = () => {
    release();
    if (res.destroyed || res.writableEnded) return;
    if (res.headersSent) { res.destroy(); return; }
    res.writeHead(502, { "Cache-Control": "private, no-store" }); res.end();
  };
  upstream.on("response", source => {
    source.on("error", fail);
    source.on("aborted", fail);
    const headers = cleanHeaders(source.headers);
    if (!/^text\/html(?:;|$)/i.test(String(source.headers["content-type"] || "")) ||
        source.statusCode === 204 || source.statusCode === 304 || source.headers["content-disposition"]) {
      release();
      res.writeHead(source.statusCode || 502, headers); source.pipe(res); return;
    }
    const chunks = []; let size = 0; let streaming = false;
    const collect = chunk => {
      size += chunk.length; chunks.push(chunk);
      // Larger documents keep their original stream instead of exhausting memory or returning 502.
      if (size > 2 * 1024 * 1024) {
        streaming = true; release(); source.removeListener("data", collect);
        res.writeHead(source.statusCode || 502, { ...headers, "cache-control": "private, no-store" });
        for (const part of chunks) res.write(part);
        chunks.length = 0; source.pipe(res);
      }
    };
    source.on("data", collect);
    source.on("end", () => {
      if (streaming || res.destroyed || res.writableEnded) return;
      const body = Buffer.concat(chunks, size);
      res.writeHead(source.statusCode || 502, { ...headers, "cache-control": "private, no-store", "content-length": body.length });
      res.end(body);
    });
  });
  upstream.on("timeout", () => upstream.destroy(new Error("upstream timeout")));
  upstream.on("error", fail);
  req.once("aborted", () => upstream.destroy());
  res.once("close", () => { if (!res.writableEnded) upstream.destroy(); });
  upstream.end();
}
const server = http.createServer((req, res) => {
  if (req.url === "/internal-health") {
    res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    res.end(JSON.stringify({ status: "healthy", activeBuffers: hubBuffers })); return;
  }
  if (hubHtmlRequest(req)) { sendHubHtml(req, res); return; }
  passThrough(req, res);
});
server.requestTimeout = 35000;
server.headersTimeout = 15000;
server.listen(3011, "0.0.0.0");
