import http from "node:http";
import https from "node:https";
import net from "node:net";
import { lookup } from "node:dns/promises";
import { pathToFileURL } from "node:url";

export function publicAddress(address) {
  if (net.isIP(address) === 4) {
    const [a, b, c] = address.split(".").map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || a === 100 && b >= 64 && b <= 127 ||
      a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31 || a === 192 && (b === 168 || b === 0 || b === 88 && c === 99) ||
      a === 198 && (b === 18 || b === 19 || b === 51 && c === 100) || a === 203 && b === 0 && c === 113);
  }
  // Permit ordinary global unicast only; mapped IPv4, private, link-local and transition ranges are denied.
  return net.isIP(address) === 6 && /^[23]/.test(address) && !/^2001:(?:0:|db8:|10:|20:)/i.test(address) && !/^2002:/i.test(address);
}
export async function destination(host, resolver = lookup) {
  const hostname = host.replace(/^\[|\]$/g, "");
  const addresses = net.isIP(hostname) ? [{ address: hostname, family: net.isIP(hostname) }] : await resolver(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(item => !publicAddress(item.address))) throw new Error("PRIVATE_DESTINATION");
  return addresses.find(item => item.family === 4) ?? addresses[0]; // Pin the checked address instead of resolving again during connection.
}
export function createEgressServer(resolve = destination) {
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url);
      if (url.username || url.password || !["http:", "https:"].includes(url.protocol) || url.port && url.port !== (url.protocol === "https:" ? "443" : "80")) throw new Error();
      const ip = await resolve(url.hostname);
      const headers = { ...request.headers, host: url.host }; delete headers["proxy-authorization"]; delete headers["proxy-connection"];
      const upstream = (url.protocol === "https:" ? https : http).request(url, { headers, method: request.method, lookup: (_host, _options, callback) => callback(null, ip.address, ip.family) }, result => {
        response.writeHead(result.statusCode, result.headers); result.pipe(response);
      });
      upstream.setTimeout(120000, () => upstream.destroy());
      upstream.on("error", () => { if (!response.headersSent) response.writeHead(502); response.end(); });
      response.on("close", () => upstream.destroy()); request.pipe(upstream);
    } catch { response.writeHead(403); response.end("Destination denied"); }
  });
  server.on("connect", async (request, socket, head) => {
    try {
      const url = new URL("https://" + request.url);
      if (url.port && url.port !== "443" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error();
      const ip = await resolve(url.hostname);
      const remote = net.connect({ host: ip.address, family: ip.family, port: 443 }, () => {
        socket.write("HTTP/1.1 200 Connection Established\r\n\r\n"); if (head.length) remote.write(head); socket.pipe(remote); remote.pipe(socket);
      });
      socket.setTimeout(120000, () => socket.destroy()); remote.setTimeout(120000, () => remote.destroy());
      remote.on("error", () => socket.destroy()); socket.on("error", () => remote.destroy()); socket.on("close", () => remote.destroy());
    } catch { socket.end("HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\n\r\n"); }
  });
  server.maxConnections = 128; server.requestTimeout = 120000; server.headersTimeout = 10000;
  return server;
}
export function createRelayServer(connect = http.request) {
  const server = http.createServer((request, response) => {
    // The relay has one fixed destination. Request URLs and Host cannot select another tenant.
    if (!request.url.startsWith("/") || request.url.startsWith("//")) { response.writeHead(400); response.end(); return; }
    const upstream = connect({ hostname: "worker", port: 7860, path: request.url, method: request.method,
      headers: { ...request.headers, host: "127.0.0.1:7860" } }, result => {
      response.writeHead(result.statusCode, result.headers); result.pipe(response);
    });
    upstream.on("error", () => { if (!response.headersSent) response.writeHead(502); response.end(); });
    response.on("close", () => upstream.destroy()); request.pipe(upstream);
  });
  server.maxConnections = 128; server.requestTimeout = 120000; server.headersTimeout = 10000;
  return server;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  createEgressServer().listen(8090, "0.0.0.0");
  createRelayServer().listen(8091, "0.0.0.0");
}
