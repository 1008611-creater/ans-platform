#!/usr/bin/env node
/**
 * deepseek-vision 全局识图脚本
 * 读取本地图片或网络图片 URL，调用 qwen3.5-omni-plus（阿里云百炼国内默认节点）。
 *
 * 用法:
 *   node vision.js <图片路径> [问题]
 *   node vision.js --url <图片URL> [问题]
 *
 * 密钥:
 *   DASHSCOPE_API_KEY 环境变量
 *   或 C:\Users\lsb\.codex\secrets\deepseek-vision.env
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const https = require("https");
const http = require("http");

const BASE_URL = (
  process.env.DASHSCOPE_BASE_URL ||
  "https://dashscope.aliyuncs.com/compatible-mode/v1"
).replace(/\/+$/, "");
const MODEL = process.env.VISION_MODEL || "qwen3.5-omni-plus";
const KEY_FILE =
  process.env.DEEPSEEK_VISION_KEY_FILE ||
  path.join(os.homedir(), ".codex", "secrets", "deepseek-vision.env");

function loadApiKey() {
  if (process.env.DASHSCOPE_API_KEY) {
    return process.env.DASHSCOPE_API_KEY.trim();
  }
  try {
    const content = fs.readFileSync(KEY_FILE, "utf8");
    const line = content
      .split(/\r?\n/)
      .find((l) => /^\s*DASHSCOPE_API_KEY\s*=/.test(l));
    if (line) {
      const value = line
        .replace(/^\s*DASHSCOPE_API_KEY\s*=\s*/, "")
        .replace(/^["']|["']$/g, "")
        .trim();
      if (value) return value;
    }
  } catch {}
  return "";
}

function parseArgs() {
  const argv = process.argv.slice(2);
  let imageSource = "";
  let prompt = "";
  let isUrl = false;

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--url" && argv[i + 1]) {
      isUrl = true;
      imageSource = argv[++i];
    } else if (!imageSource && !argv[i].startsWith("--")) {
      imageSource = argv[i];
    } else if (imageSource && !argv[i].startsWith("--")) {
      prompt = prompt ? prompt + " " + argv[i] : argv[i];
    }
  }
  if (!prompt) prompt = "请详细描述这张图片的内容。";
  return { imageSource, prompt, isUrl };
}

function resolveImageUrl(source, isUrl) {
  if (isUrl) return source;
  const resolved = path.resolve(source);
  if (!fs.existsSync(resolved)) {
    throw new Error(`文件不存在: ${resolved}`);
  }
  const ext = path.extname(resolved).toLowerCase().replace(".", "");
  const mimeMap = {
    jpg: "jpeg",
    jpeg: "jpeg",
    png: "png",
    gif: "gif",
    webp: "webp",
    bmp: "bmp",
  };
  const data = fs.readFileSync(resolved);
  return `data:image/${mimeMap[ext] || "jpeg"};base64,${data.toString("base64")}`;
}

function request(payload) {
  const url = new URL(BASE_URL + "/chat/completions");
  const body = JSON.stringify(payload);
  const transport = url.protocol === "https:" ? https : http;

  return new Promise((resolve, reject) => {
    const req = transport.request(
      url,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY || loadApiKey()}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          if (res.statusCode >= 400) {
            return reject(new Error(`API ${res.statusCode}: ${data.slice(0, 300)}`));
          }
          try {
            resolve(JSON.parse(data)?.choices?.[0]?.message?.content || data);
          } catch {
            resolve(data);
          }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const apiKey = loadApiKey();
  if (!apiKey) {
    console.error("未配置密钥：请把 qwen3.5-omni-plus 的密钥发进聊天框。");
    console.error("配置位置：C:\\Users\\lsb\\.codex\\secrets\\deepseek-vision.env");
    process.exit(1);
  }

  const { imageSource, prompt, isUrl } = parseArgs();
  if (!imageSource) {
    console.error("用法: node vision.js <图片路径> [问题]");
    console.error("      node vision.js --url <图片URL> [问题]");
    process.exit(1);
  }

  try {
    const imageUrl = resolveImageUrl(imageSource, isUrl);
    const result = await request({
      model: MODEL,
      messages: [
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: imageUrl } },
            { type: "text", text: prompt },
          ],
        },
      ],
      stream: false,
      max_tokens: 1024,
    });
    console.log(result);
  } catch (err) {
    console.error("识图失败:", err.message);
    process.exit(1);
  }
}

main();
