#!/usr/bin/env node
/**
 * deepseek-vision image bridge proxy
 *
 * Codex 把图片粘贴识别为受支持输入后会向本代理发送 OpenAI Responses 请求。
 * 本代理从请求中移除图片内容，只保留图片路径文本和强制识图指令，再把
 * 纯文本请求转发给上游 Cockpit 网关，避免 DeepSeek 收到 image input。
 */

const http = require("http");
const zlib = require("zlib");
const UPSTREAM = process.env.DEEPSEEK_VISION_UPSTREAM || "http://127.0.0.1:58270";
const PORT = Number(process.env.DEEPSEEK_VISION_PROXY_PORT || 58271);
const SKILL_SCRIPT = "C:\\Users\\lsb\\.codex\\skills\\deepseek-vision\\scripts\\vision.js";

const IMAGE_PATH_RE = /(?:path\s*=\s*["']([^"']+\.(?:png|jpe?g|gif|webp|bmp))["']|##\s+[^\r\n]*?\.(?:png|jpe?g|gif|webp|bmp)\s*:\s*([^\r\n]+))/gi;

function collectImagePaths(node, paths) {
  if (Array.isArray(node)) {
    for (const item of node) collectImagePaths(item, paths);
    return paths;
  }
  if (!node || typeof node !== "object") return paths;
  if (typeof node.text === "string") {
    IMAGE_PATH_RE.lastIndex = 0;
    let match;
    while ((match = IMAGE_PATH_RE.exec(node.text))) {
      const candidate = (match[1] || match[2] || "").trim().replace(/^["']|["']$/g, "");
      if (candidate && !paths.includes(candidate)) paths.push(candidate);
    }
  }
  for (const value of Object.values(node)) collectImagePaths(value, paths);
  return paths;
}

function replaceImages(node, instruction) {
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      if (
        node[i] &&
        typeof node[i] === "object" &&
        (node[i].type === "input_image" || node[i].type === "image_url")
      ) {
        node[i] = { type: "input_text", text: instruction };
      } else {
        replaceImages(node[i], instruction);
      }
    }
    return node;
  }
  if (!node || typeof node !== "object") return node;
  for (const key of Object.keys(node)) {
    if (key === "input_image" || key === "image_url") {
      node[key] = undefined;
      delete node[key];
    } else {
      replaceImages(node[key], instruction);
    }
  }
  return node;
}

function buildInstruction(paths) {
  const pathText = paths.length
    ? paths.join("; ")
    : "上方 Files mentioned by the user 中列出的图片路径";
  return (
    "[deepseek-vision 图片桥接] 检测到用户消息包含本地图片，图片内容未发送给当前模型。\n" +
    "请先按全局 deepseek-vision 规则，对每张图片依次执行：\n" +
    `node "${SKILL_SCRIPT}" "<图片路径>" "请用中文详细描述这张图片的内容"\n` +
    `图片路径：${pathText}\n` +
    "禁止用 OCR、Read、文件信息检查或其他本地图像处理代替识图；拿到识图结果后再继续回答。"
  );
}

function normalizeToolSchemas(body) {
  if (!body || typeof body !== "object") return;
  const tools = Array.isArray(body.tools)
    ? body.tools
    : Array.isArray(body.tool_choice)
      ? body.tool_choice
      : [];
  for (const tool of tools) {
    if (!tool || typeof tool !== "object") continue;
    const schema =
      tool.inputSchema ||
      (tool.function && (tool.function.inputSchema || tool.function.parameters));
    if (
      schema &&
      typeof schema === "object" &&
      !schema.type
    ) {
      schema.type = "object";
    }
  }
}

function normalizeNestedToolSchema(tool) {
  if (!tool || typeof tool !== "object") return;
  const schema =
    tool.inputSchema ||
    tool.parameters ||
    (tool.function && (tool.function.inputSchema || tool.function.parameters));
  if (schema && typeof schema === "object" && !schema.type) {
    schema.type = "object";
  }
}

function deduplicateToolSearchOutputs(body) {
  if (!body || typeof body !== "object" || !Array.isArray(body.input)) return;
  const seen = new Set();
  for (const item of body.input) {
    if (
      !item ||
      typeof item !== "object" ||
      item.type !== "tool_search_output" ||
      !Array.isArray(item.tools)
    ) {
      continue;
    }
    for (const namespace of item.tools) {
      if (
        !namespace ||
        typeof namespace !== "object" ||
        !Array.isArray(namespace.tools)
      ) {
        continue;
      }
      const kept = [];
      for (const tool of namespace.tools) {
        normalizeNestedToolSchema(tool);
        if (!tool || typeof tool !== "object" || !tool.name) {
          kept.push(tool);
          continue;
        }
        const key = `${namespace.name || ""}\u0000${tool.name}`;
        if (!seen.has(key)) {
          seen.add(key);
          kept.push(tool);
        }
      }
      namespace.tools = kept;
    }
  }
}

function transformRequest(rawBody) {
  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return rawBody;
  }
  normalizeToolSchemas(body);
  deduplicateToolSearchOutputs(body);
  const paths = collectImagePaths(body, []);
  const instruction = buildInstruction(paths);
  replaceImages(body, instruction);
  return JSON.stringify(body);
}

function decodeRequestBody(rawBody, contentEncoding) {
  const encoding = (contentEncoding || "").toLowerCase().trim();
  if (encoding === "gzip") return zlib.gunzipSync(rawBody);
  if (encoding === "deflate") return zlib.inflateSync(rawBody);
  if (encoding === "br") return zlib.brotliDecompressSync(rawBody);
  return rawBody;
}

const server = http.createServer((req, res) => {
  const chunks = [];
  req.on("data", (chunk) => chunks.push(chunk));
  req.on("end", () => {
    const rawBody = decodeRequestBody(Buffer.concat(chunks), req.headers["content-encoding"]);
    const forwardedBody =
      req.method === "POST" && req.url && req.url.includes("/responses")
        ? transformRequest(rawBody.toString("utf8"))
        : rawBody.toString("utf8");

    const upstream = new URL(UPSTREAM + req.url);
    const headers = { ...req.headers };
    delete headers.host;
    delete headers["content-length"];
    delete headers["content-encoding"];
    headers["content-length"] = Buffer.byteLength(forwardedBody);

    const upstreamReq = http.request(
      {
        protocol: upstream.protocol,
        hostname: upstream.hostname,
        port: upstream.port,
        path: upstream.pathname + upstream.search,
        method: req.method,
        headers,
      },
      (upstreamRes) => {
        res.writeHead(upstreamRes.statusCode, upstreamRes.headers);
        upstreamRes.pipe(res);
      }
    );
    upstreamReq.on("error", (error) => {
      res.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
      res.end(`deepseek-vision proxy upstream error: ${error.message}`);
    });
    upstreamReq.end(forwardedBody);
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`deepseek-vision image bridge proxy listening on 127.0.0.1:${PORT}`);
});
