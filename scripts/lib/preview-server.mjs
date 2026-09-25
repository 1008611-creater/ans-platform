/**
 * 浏览器类质量门的共享前置条件与运行环境。
 *
 * 冒烟、可访问性、性能三个脚本都要做同样一串准备动作：确认构建产物存在、
 * 找到浏览器、确认数据库可达且结构是新版、起一个临时 `next start`、跑完再收尾。
 * 这串动作如果各写一份，早晚会漂移成「一个脚本能跑、另一个脚本静默跳过」，
 * 所以集中放在这里。
 *
 * 三种退出形态（三个脚本一致）：
 *   - 通过：退出码 0。
 *   - 跳过：缺前置条件，退出码 0；`*_MODE=require` 时转成失败。
 *   - 失败：前置条件齐备却出现真实缺陷，退出码 1。
 */
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, rmSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { connect } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";

export const SEED_EMAIL = "smoke-verify@cau.edu.cn";
export const SEED_USERNAME = "smoke_verify";
export const SEED_PASSWORD = "SmokeVerify123";

/**
 * 只有「本机地址 + 库名明确是临时库」两个条件同时成立才允许写入测试数据。
 * 远程库一律不写，避免把已知密码的测试账号种到生产环境；名称含糊的库
 * （例如 ans_dev）也只读不写，需要登录流程时请用专用冒烟库。
 *
 * 冒烟账号与性能探针的固定数据都走这一个判断，避免某个脚本单独放松口径。
 */
const SEEDABLE_DB = /(smoke|test|verify|integration|ci)/i;
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);

export function seedableDatabase(databaseUrl) {
  let parsed;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    return { ok: false, reason: "DATABASE_URL 无法解析" };
  }
  const database = parsed.pathname.replace(/^\//, "");
  if (!LOOPBACK_HOSTS.has(parsed.hostname)) {
    return { ok: false, reason: `数据库主机 ${parsed.hostname} 不是本机，不写入测试数据` };
  }
  if (!SEEDABLE_DB.test(database)) {
    return { ok: false, reason: `库名 ${database || "(空)"} 不是专用冒烟库，不写入测试数据` };
  }
  return { ok: true, database };
}

/** 与核心流程无关的资源请求失败（埋点、字体、第三方脚本）不阻塞门禁。 */
export const NOISE = [
  "favicon",
  "Failed to load resource",
  "net::ERR_NAME_NOT_RESOLVED",
  "net::ERR_INTERNET_DISCONNECTED",
  "net::ERR_CONNECTION_REFUSED",
  "Download the React DevTools",
];

/** `SMOKE_MODE=require` 这类开关：require 表示前置条件缺失即失败，默认 auto 跳过。 */
export function readMode(envKey) {
  return process.env[envKey] === "require" ? "require" : "auto";
}

/**
 * 统一的通过/跳过/失败出口。
 * 跳过时把 `mode` 与 `requireMode` 一起打印，方便看日志的人知道是谁决定的。
 */
export function createReporter(label, mode, requireMode) {
  const tag = `[${label}]`;
  return {
    skipped(message) {
      console.log(`${tag} 跳过：${message}`);
      if (mode === "require") {
        console.error(`${tag} ${requireMode}=require，前置条件缺失按失败处理`);
        process.exitCode = 1;
      }
    },
    fail(message) {
      console.error(`${tag} 失败：${message}`);
      process.exitCode = 1;
    },
    info(message) {
      console.log(`${tag} ${message}`);
    },
    error(message) {
      console.error(`${tag} ${message}`);
    },
  };
}

/**
 * puppeteer 的 `executablePath()` 只认完整版 chrome。已经下载了
 * chrome-headless-shell 的环境需要手工定位，否则会被误判成「没有浏览器」。
 */
function headlessShellFromCache() {
  const cacheRoot = process.env.PUPPETEER_CACHE_DIR
    || path.join(process.env.HOME || process.env.USERPROFILE || "", ".cache", "puppeteer");
  const root = path.join(cacheRoot, "chrome-headless-shell");
  if (!existsSync(root)) return null;
  const wanted = process.platform === "win32" ? "chrome-headless-shell.exe" : "chrome-headless-shell";
  const stack = [root];
  while (stack.length) {
    const current = stack.pop();
    let entries = [];
    try {
      entries = readdirSync(current);
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(current, entry);
      let stats = null;
      try {
        stats = statSync(full);
      } catch {
        continue;
      }
      if (stats.isDirectory()) stack.push(full);
      else if (entry === wanted) return full;
    }
  }
  return null;
}

export async function resolveBrowser() {
  const candidates = [process.env.PUPPETEER_EXECUTABLE_PATH];
  try {
    // puppeteer 25 起 `executablePath()` 返回 Promise；旧版本返回字符串。
    // 两种形态都要兼容，否则会把 Promise 当路径传给 existsSync（DEP0187）。
    candidates.push(await createRequire(import.meta.url)("puppeteer").executablePath());
  } catch { /* 未下载完整版 chrome 时忽略，继续找系统浏览器。 */ }
  candidates.push(
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  );
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate && existsSync(candidate)) return candidate;
  }
  return headlessShellFromCache();
}

/** 先探一次端口，避免数据库没起时白等一分钟才跳过。 */
export function portReachable(host, port, timeoutMs = 1500) {
  return new Promise(resolve => {
    const socket = connect({ host, port });
    const done = reachable => {
      socket.destroy();
      resolve(reachable);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
  });
}

export async function waitForHealth(baseUrl, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let last = "尚未响应";
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/health`, { cache: "no-store" });
      const body = await response.json().catch(() => ({}));
      if (response.ok) return { ok: true };
      last = `HTTP ${response.status}（${body?.database ?? "unknown"}）`;
    } catch (error) {
      last = error instanceof Error ? error.message : String(error);
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  return { ok: false, reason: last };
}

/** 冒烟账号是幂等写入的：本地反复跑不会累积垃圾数据。 */
export async function ensureSmokeUser(databaseUrl) {
  const guard = seedableDatabase(databaseUrl);
  if (!guard.ok) return { created: false, reason: guard.reason };

  const { PrismaClient } = await import("@prisma/client");
  const bcrypt = (await import("bcryptjs")).default;
  const prisma = new PrismaClient({ datasourceUrl: databaseUrl });
  try {
    const password = await bcrypt.hash(SEED_PASSWORD, 10);
    await prisma.user.upsert({
      where: { email: SEED_EMAIL },
      update: { password, role: "USER", deletedAt: null, flagged: false },
      create: {
        email: SEED_EMAIL,
        username: SEED_USERNAME,
        name: "冒烟验证账号",
        password,
        role: "USER",
        locale: "zh",
        emailVerified: new Date(),
      },
    });
    return { created: true };
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * 冒烟跑在真实构建产物上，所以库结构必须已经是新版本。缺表时页面会大面积
 * 500，那是「环境没准备好」而不是代码缺陷，应当明确跳过并提示怎么修。
 */
export async function schemaReady(databaseUrl) {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient({ datasourceUrl: databaseUrl });
  try {
    await prisma.$queryRaw`SELECT 1 FROM content_favorites LIMIT 0`;
    await prisma.$queryRaw`SELECT 1 FROM workflows LIMIT 0`;
    return { ready: true };
  } catch (error) {
    const raw = error instanceof Error ? error.message : String(error);
    // Prisma 的第一行只是 "Invalid `prisma.$queryRaw()` invocation:" 这种包装，
    // 真正有用的信息在后面的「表不存在」那一行，再配合错误码一起给出。
    const lines = raw.split("\n").map(line => line.trim()).filter(Boolean);
    const detail = lines.find(line => /does not exist|不存在/.test(line)) ?? lines[0] ?? "未知原因";
    const code = error && typeof error === "object" ? error.code : undefined;
    return { ready: false, reason: code ? `${code} ${detail}` : detail };
  } finally {
    await prisma.$disconnect();
  }
}

export async function stopServer(child) {
  if (!child || child.exitCode !== null) return;
  child.kill("SIGTERM");
  const deadline = Date.now() + 5000;
  while (child.exitCode === null && Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  if (child.exitCode === null && process.platform === "win32") {
    spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  }
}

/**
 * 注册流程依赖 Turnstile 与邮件服务，本地和 CI 通常都不配。
 * 这时 `/api/auth/register/config` 返回 503 是设计中的 fail-closed 行为，
 * 页面应当显示「注册服务暂不可用」而不是崩溃——这本身就是一条要验证的路径。
 */
export function registrationConfigured() {
  return Boolean(
    process.env.TURNSTILE_SECRET_KEY
    && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    && process.env.RESEND_API_KEY
    && process.env.EMAIL_FROM,
  );
}

/**
 * 起一个临时生产服务并启动浏览器，把准备好的上下文交给调用方，结束后统一收尾。
 *
 * 前置条件不满足时返回 `{ ran: false }` 并已按 mode 处理跳过；调用方不需要再判断。
 */
export async function withPreview(options, run) {
  const {
    mode,
    requireMode,
    reporter,
    port = Number(process.env.SMOKE_PORT || 3100),
    databaseUrl = process.env.SMOKE_DATABASE_URL || process.env.DATABASE_URL || "",
    seedUser = true,
    launchArgs = [],
  } = options;
  const baseUrl = `http://127.0.0.1:${port}`;

  if (!existsSync(path.join(process.cwd(), ".next", "BUILD_ID"))) {
    reporter.skipped("缺少 .next 构建产物，请先执行 npm run build");
    return { ran: false };
  }

  let puppeteer;
  try {
    puppeteer = (await import("puppeteer")).default;
  } catch {
    reporter.skipped("未安装 puppeteer");
    return { ran: false };
  }

  const executablePath = await resolveBrowser();
  if (!executablePath) {
    reporter.skipped("未找到可用浏览器（可用 PUPPETEER_EXECUTABLE_PATH 指定）");
    return { ran: false };
  }

  if (!databaseUrl) {
    reporter.skipped("未配置 DATABASE_URL，该检查需要可用的数据库");
    return { ran: false };
  }

  // 数据库不可达时直接跳过：本地默认没起 Docker，等 60 秒再失败没有意义。
  let dbTarget;
  try {
    dbTarget = new URL(databaseUrl);
  } catch {
    reporter.skipped("DATABASE_URL 无法解析");
    return { ran: false };
  }
  const reachable = await portReachable(dbTarget.hostname, Number(dbTarget.port || 5432));
  if (!reachable) {
    reporter.skipped(`数据库 ${dbTarget.hostname}:${dbTarget.port || 5432} 不可达`);
    return { ran: false };
  }

  const schema = await schemaReady(databaseUrl);
  if (!schema.ready) {
    reporter.skipped(`数据库缺少本次重构的表，请先执行 npx prisma migrate deploy（${schema.reason}）`);
    return { ran: false };
  }

  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "smoke-only-secret-0000000000000000";
  const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port)], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: "production",
      DATABASE_URL: databaseUrl,
      AUTH_SECRET: secret,
      NEXTAUTH_SECRET: secret,
      AUTH_URL: baseUrl,
      NEXTAUTH_URL: baseUrl,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const serverLog = [];
  server.stdout.on("data", chunk => serverLog.push(String(chunk)));
  server.stderr.on("data", chunk => serverLog.push(String(chunk)));

  const profileDir = mkdtempSync(path.join(tmpdir(), "ans-preview-"));
  let browser;
  try {
    const health = await waitForHealth(baseUrl, 60_000);
    if (!health.ok) {
      const tail = serverLog.join("").trim().split(/\r?\n/).slice(-8).join(" | ");
      reporter.skipped(`服务未能就绪：${health.reason}${tail ? `（服务日志：${tail}）` : ""}`);
      return { ran: false };
    }

    let seed = { created: false, reason: "本次不需要写入账号" };
    if (seedUser) {
      seed = await ensureSmokeUser(databaseUrl);
      if (!seed.created) reporter.info(`不写冒烟账号：${seed.reason}`);
    }

    browser = await puppeteer.launch({
      executablePath,
      // chrome-headless-shell 只认 `--headless`，完整版 Chrome 才认 `--headless=new`；
      // 传错会让浏览器直接拒绝启动，所以按二进制名切换模式。
      headless: /headless-shell/.test(executablePath) ? "shell" : true,
      userDataDir: profileDir,
      args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu", ...launchArgs],
    });

    reporter.info(`浏览器：${executablePath}`);
    await run({ browser, baseUrl, databaseUrl, executablePath, seed, serverLog });
    return { ran: true };
  } finally {
    if (browser) await browser.close().catch(() => {});
    await stopServer(server);
    rmSync(profileDir, { recursive: true, force: true });
  }
}
