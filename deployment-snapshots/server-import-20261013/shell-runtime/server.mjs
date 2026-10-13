import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { mkdirSync, readFileSync, renameSync, writeFileSync, createReadStream, existsSync } from "node:fs";
import { createServer } from "node:http";
import nodemailer from "nodemailer";
import { extname, join, normalize, relative, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { brotliCompressSync, constants as zlibConstants } from "node:zlib";
import { codexFastBootstrap, handleCodexFastApi, hydrateCodexFast } from "./codexfast-core.mjs";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT || 4194);
const host = process.env.HOST || (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1");
const dataBackend = process.env.DATA_BACKEND || "json";
const supabaseUrl = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const publicOrigin = String(process.env.PUBLIC_ORIGIN || "").replace(/\/$/, "");
const mimoApiKey = String(process.env.MIMO_API_KEY || "").trim();
const mimoTtsModel = String(process.env.MIMO_TTS_MODEL || "mimo-v2.5-tts").trim();
const r2AccountId = process.env.R2_ACCOUNT_ID || "";
const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID || "";
const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY || "";
const r2Bucket = process.env.R2_BUCKET || "";
const smtpHost = process.env.SMTP_HOST || "";
const smtpPort = Number(process.env.SMTP_PORT || 465);
const smtpSecure = String(process.env.SMTP_SECURE || "true").toLowerCase() !== "false";
const smtpUser = process.env.SMTP_USER || "";
const smtpPass = process.env.SMTP_PASS || "";
const smtpFrom = process.env.SMTP_FROM || smtpUser;
function sentryConfiguration(value) {
  const configured = String(value || "").trim();
  if (!configured) return null;
  let parsed;
  try { parsed = new URL(configured); } catch { throw new Error("SENTRY_DSN 必须是有效的 HTTPS DSN"); }
  const projectId = parsed.pathname.split("/").filter(Boolean).at(-1);
  if (parsed.protocol !== "https:" || !parsed.host || !parsed.username || !projectId) throw new Error("SENTRY_DSN 必须是有效的 HTTPS DSN");
  const publicKey = decodeURIComponent(parsed.username);
  const endpoint = `https://${parsed.host}/api/${encodeURIComponent(projectId)}/envelope/?sentry_version=7&sentry_key=${encodeURIComponent(publicKey)}&sentry_client=ans%2F0.1.0`;
  return { endpoint, environment: safeText(process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "production", 80), release: safeText(process.env.APP_RELEASE || "ans@0.1.0", 120) };
}
const sentry = sentryConfiguration(process.env.SENTRY_DSN);
const cfAnalyticsBeacon = (() => {
  const configured = String(process.env.CF_ANALYTICS_TOKEN || "").trim();
  if (!configured) return "";
  try {
    const token = JSON.parse(configured)?.token;
    if (!/^[a-z0-9]{16,128}$/i.test(token || "")) throw new Error("invalid token");
    return JSON.stringify({ token, spa: true });
  } catch {
    throw new Error("CF_ANALYTICS_TOKEN 必须是包含有效 token 的 JSON");
  }
})();
const cfAnalyticsSnippet = cfAnalyticsBeacon ? `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon=\'${cfAnalyticsBeacon}\'></script>` : "";
const databaseDirectory = process.env.DATA_DIR ? resolve(process.env.DATA_DIR) : join(root, "data");
const databasePath = join(databaseDirectory, "ans.json");
const scrypt = promisify(scryptCallback);
const sessionDurationMs = 1000 * 60 * 60 * 24 * 7;
const authRateWindowMs = 15 * 60 * 1000;
const authRateLimit = 12;
const authAttempts = new Map();
const submissionRateWindowMs = 60 * 60 * 1000;
const submissionRateLimit = 20;
const submissionAttempts = new Map();
const analyticsRateWindowMs = 60 * 60 * 1000;
const analyticsRateLimit = 60;
const analyticsAttempts = new Map();
const clientErrorRateLimit = 20;
const clientErrorAttempts = new Map();
const analyticsRetentionDays = 90;
const clientAnalyticsEvents = new Set(["contact_opened", "playbook_opened", "campaign_landing", "topic_viewed", "topic_response_started", "topic_response_submitted", "story_opened", "profile_opened", "challenge_joined"]);
const analyticsEventNames = ["signup_completed", "email_verified", "submission_created", "submission_approved", "contact_opened", "playbook_opened", "api_key_created", "campaign_landing", "topic_viewed", "topic_response_started", "topic_response_submitted", "story_opened", "profile_opened", "challenge_joined"];
const topicStances = new Set([
  "我也在经历",
  "我走过这段",
  "我愿意一起试",
  "我也卡在这里",
  "我已经开始做了",
  "我有不同答案",
]);
const defaultDemoIds = new Set([
  "idea-voice",
  "idea-map",
  "idea-archive",
  "project-studio",
  "project-access",
  "project-civic",
  "help-corpus",
  "help-motion",
]);
const profileTags = new Set(["图文", "视频", "设计", "开发", "研究", "策划"]);
const campaignChannels = new Set(["xhs", "wechat", "douyin", "direct"]);
const campaignSeries = new Set(["opinion", "story", "build", "challenge"]);
const uploadLimitBytes = 8 * 1024 * 1024;
const maxAttachments = 4;
const emailTokenLifetimeMs = 30 * 60 * 1000;
const allowedUploadTypes = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["application/pdf", ".pdf"]
]);
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".glb": "model/gltf-binary",
  ".wav": "audio/wav"
};

function now() { return new Date().toISOString(); }
function id(prefix) { return `${prefix}-${randomBytes(9).toString("hex")}`; }
function dateLabel() { return new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric" }).format(new Date()); }
function safeText(value, maxLength = 2000) { return typeof value === "string" ? value.trim().slice(0, maxLength) : ""; }
function redactTelemetry(value, maxLength = 2000) {
  return safeText(value, maxLength)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/(https?:\/\/[^\s?#]+)\?[^\s)]+/gi, "$1?[redacted]")
    .replace(/\b(authorization|password|token|secret|cookie)\s*[:=]\s*[^\s,;]+/gi, "$1=[redacted]");
}
function telemetryContext(context = {}) {
  return Object.fromEntries(Object.entries(context)
    .filter(([, value]) => typeof value === "string" || typeof value === "number" || typeof value === "boolean")
    .map(([key, value]) => [safeText(key, 80), redactTelemetry(String(value), 1000)]));
}
async function captureException(error, context = {}) {
  if (!sentry) return false;
  const eventId = randomBytes(16).toString("hex");
  const exception = error instanceof Error ? error : new Error(redactTelemetry(String(error), 1000));
  const event = {
    event_id: eventId,
    timestamp: new Date().toISOString(),
    platform: "node",
    level: "error",
    environment: sentry.environment,
    release: sentry.release,
    logger: "ans",
    tags: { source: "ans-server" },
    extra: telemetryContext(context),
    exception: {
      values: [{
        type: redactTelemetry(exception.name || "Error", 160),
        value: redactTelemetry(exception.message || "Unknown error", 1500),
        stacktrace: exception.stack ? { raw_stacktrace: redactTelemetry(exception.stack, 7000) } : undefined
      }]
    }
  };
  const envelope = `${JSON.stringify({ event_id: eventId, sent_at: now(), sdk: { name: "ans-node", version: "0.1.0" } })}\n${JSON.stringify({ type: "event", content_type: "application/json" })}\n${JSON.stringify(event)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);
  try {
    const response = await fetch(sentry.endpoint, { method: "POST", headers: { "Content-Type": "application/x-sentry-envelope" }, body: envelope, signal: controller.signal });
    if (!response.ok) console.error("Sentry delivery failed", { status: response.status });
    return response.ok;
  } catch (deliveryError) {
    console.error("Sentry delivery failed", { name: deliveryError?.name });
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
function requiredText(value, field, maxLength = 2000) {
  const text = safeText(value, maxLength);
  if (!text) throw new HttpError(400, `${field}不能为空`);
  return text;
}
function boolean(value) { return value === true; }
function hashToken(token) { return createHash("sha256").update(token).digest("hex"); }
function publicUser(user) { return { id: user.id, displayName: user.displayName, role: user.role }; }
function clientIp(request) { return String(request.headers["x-forwarded-for"] || request.socket.remoteAddress || "unknown").split(",")[0].trim(); }
function enforceRateLimit(request, namespace, pathname, limit, windowMs, store) {
  const key = `${clientIp(request)}:${namespace}:${pathname}`;
  const current = Date.now();
  const attempts = (store.get(key) || []).filter((timestamp) => current - timestamp < windowMs);
  if (attempts.length >= limit) throw new HttpError(429, "请求次数过多，请稍后再试");
  attempts.push(current);
  store.set(key, attempts);
  if (store.size > 10000) for (const [entry, values] of store) if (!values.length || current - values.at(-1) >= windowMs) store.delete(entry);
}
function enforceAuthRateLimit(request, pathname) {
  enforceRateLimit(request, "auth", pathname, authRateLimit, authRateWindowMs, authAttempts);
}
function enforceSubmissionRateLimit(request, pathname) {
  enforceRateLimit(request, "submission", pathname, submissionRateLimit, submissionRateWindowMs, submissionAttempts);
}
function enforceClientErrorRateLimit(request, pathname) {
  enforceRateLimit(request, "client-error", pathname, clientErrorRateLimit, analyticsRateWindowMs, clientErrorAttempts);
}
function assertTrustedOrigin(request) {
  const origin = request.headers.origin;
  const bearer = /^Bearer\s+/i.test(String(request.headers.authorization || ""));
  if (bearer) return;
  if (origin && publicOrigin && origin === publicOrigin) return;
  if (request.headers["x-ans-request"] === "browser") return;
  throw new HttpError(403, "请求来源不受信任");
}
function r2Configured() { return Boolean(r2AccountId && r2AccessKeyId && r2SecretAccessKey && r2Bucket); }
function smtpConfigured() { return Boolean(smtpHost && smtpUser && smtpPass && smtpFrom); }
const r2Client = r2Configured() ? new S3Client({
  region: "auto",
  endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
  forcePathStyle: true,
  credentials: { accessKeyId: r2AccessKeyId, secretAccessKey: r2SecretAccessKey }
}) : null;
const smtpTransport = smtpConfigured() ? nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpSecure,
  auth: { user: smtpUser, pass: smtpPass }
}) : null;
async function r2Request(method, key, body, contentType = "") {
  if (!r2Client) throw new HttpError(503, "附件服务尚未配置");
  try {
    if (method === "PUT") return await r2Client.send(new PutObjectCommand({ Bucket: r2Bucket, Key: key, Body: body, ContentType: contentType || undefined }));
    if (method === "GET") return await r2Client.send(new GetObjectCommand({ Bucket: r2Bucket, Key: key }));
  } catch (error) {
    console.error("R2 object request failed", { method, key, name: error?.name, statusCode: error?.$metadata?.httpStatusCode });
    throw new HttpError(502, "附件存储暂时不可用");
  }
  throw new HttpError(500, "不支持的附件存储操作");
}

function createInitialDatabase() {
  return hydrateCodexFast({
    version: 4,
    users: [],
    sessions: [],
    apiKeys: [],
    ideas: [
      { id: "idea-voice", title: "让每个人都有一支 AI 纪录片小队", body: "把采访、分镜、剪辑和发布拆成可接力的公开协作。先从一个真实的人开始。", author: "Lin", color: "butter", contact: "hello@ans.network", openContact: true, date: "今天", createdAt: now() },
      { id: "idea-map", title: "为城市留下一张 AI 能力地图", body: "标出愿意分享方法、工具和时间的人。不是通讯录，是正在发生的连接。", author: "Mina", color: "sky", contact: "微信：ans-mina", openContact: false, date: "昨天", createdAt: now() },
      { id: "idea-archive", title: "把失败的提示词也整理出来", body: "失败案例常常比漂亮结果更有用。想做一个可检索的实验档案。", author: "Cody", color: "rose", contact: "archive@ans.network", openContact: true, date: "2 天前", createdAt: now() }
    ],
    projects: [
      { id: "project-studio", title: "一人 AI 内容工作室", summary: "把选题、视觉草图、短片和分发串成一套可复用的个人生产线。", progress: "完成第一版内容生产看板，正在收集真实工作流。", status: "推进中", recruiting: true, offer: "开源一套项目看板和复盘模板", author: "North Studio", contact: "studio@ans.network", openContact: true, createdAt: now() },
      { id: "project-access", title: "让工具说明真正能被新手用起来", summary: "把复杂的 AI 工具配置转换成一条条可以照着走的行动手册。", progress: "已完成首批三篇新手手册与可用性测试。", status: "推进中", recruiting: false, offer: "持续公开测试与改写过程", author: "Relay", contact: "relay@ans.network", openContact: true, createdAt: now() },
      { id: "project-civic", title: "公共议题的 AI 资料协作", summary: "为小型公共议题建立可信、可查、可更新的资料协作空间。", progress: "正在验证一条从采访到资料卡的协作路径。", status: "刚开始", recruiting: true, offer: "一套可复制的资料卡规范", author: "Horizon", contact: "horizon@ans.network", openContact: false, createdAt: now() }
    ],
    help: [
      { id: "help-corpus", title: "想找人一起测试中文提示词语料", need: "需要 3 到 5 位愿意用真实任务测试提示词的人。", give: "共同整理一份可公开复用的语料与对比记录。", author: "Ava", contact: "ava@ans.network", openContact: true, profile: true, createdAt: now() },
      { id: "help-motion", title: "需要一位动效设计师给开源工具做 30 秒演示", need: "一个已完成的浏览器工具需要更清楚的上手演示。", give: "可以交换产品策略复盘，或按阶段付费。", author: "Kite", contact: "kite@ans.network", openContact: false, profile: true, createdAt: now() }
    ],
    tutorials: [
      { id: "tutorial-start", title: "从一个真实问题开始搭建 AI 工作流", summary: "用问题、输入、验证和复盘四个步骤，把 AI 的一次性尝试沉淀为可复用流程。", author: "ANS 编辑部", dependencies: 3, tests: 4, content: ["先选一个会重复发生的问题", "列出输入、期望输出与不可接受的结果", "为每一次执行留下可比较的记录", "把有效部分整理成下一位可以接手的步骤"], createdAt: now() },
      { id: "tutorial-research", title: "把公开研究做成一张可更新的资料卡", summary: "从来源记录、观点标记到更新日志，建立一条别人能复查的研究路径。", author: "Yuki", dependencies: 4, tests: 3, content: ["先定义资料卡要回答的一个问题", "为每一个结论保留来源和日期", "区分事实、推测和待验证内容", "每次更新都留下变化原因"], createdAt: now() },
      { id: "tutorial-ship", title: "从草图到公开测试：小工具发布清单", summary: "用最小公开页、真实用户任务和反馈记录完成一次有边界的发布。", author: "North Studio", dependencies: 5, tests: 5, content: ["明确这次发布不解决什么", "准备一个可完成的真实任务", "邀请少量用户观察完成过程", "根据反馈写下下一版的唯一重点"], createdAt: now() }
    ],
    topics: [
      { slug: "make-work-not-just-use-ai", title: "今天又有新模型，你真的需要立刻学会吗？", statement: "工具还会继续出现。你可以先说说，眼下真正困扰你的是什么。", challenge: "不用证明自己跟得上。说说最近哪一次更新让你兴奋、疲惫，或者不知道该怎么选。", status: "公开", order: 1, createdAt: now() },
      { slug: "faster-or-more-alike", title: "AI 进步得太快时，你有没有怀疑过自己的价值？", statement: "能力边界一直变化，但你的经验、判断和在意的事不会因此自动失效。", challenge: "如果你愿意，写下最近一次怀疑，以及后来怎样理解它。", status: "排期中", order: 2, createdAt: now() },
      { slug: "publish-before-ready", title: "当所有人都在展示成果，能不能公开说自己没跟上？", statement: "这里不要求成功包装。迷茫、失败和暂时停下，也是真实经历的一部分。", challenge: "说说一件你还没想明白，但希望有人一起聊聊的事。", status: "排期中", order: 3, createdAt: now() },
      { slug: "repeatable-problem", title: "我们是在使用 AI，还是被它安排了每天的注意力？", statement: "每一次更新都在争夺注意力。也许真正重要的是重新决定，什么值得你花时间。", challenge: "写下你想继续投入的一件事，以及准备暂时不追的一件事。", status: "排期中", order: 4, createdAt: now() }
    ],
    topicResponses: [],
    creatorStories: [],
    publicProfiles: [],
    campaigns: [],
    submissions: [],
    drafts: [],
    emailTokens: [],
    uploads: [],
    reports: [],
    auditLog: [],
    workflowTemplates: [],
    workflowRuns: [],
    workflowNodes: [],
    workflowArtifacts: [],
    workflowEvents: [],
    workflowApprovals: [],
    analytics: { days: {} }
  });
}

function validDatabase(candidate) {
  return candidate && Array.isArray(candidate.users) && Array.isArray(candidate.sessions) && Array.isArray(candidate.apiKeys) && Array.isArray(candidate.ideas) && Array.isArray(candidate.projects) && Array.isArray(candidate.help) && Array.isArray(candidate.tutorials) && Array.isArray(candidate.submissions) && Array.isArray(candidate.drafts);
}
function hydrateDatabase(candidate) {
  candidate.version = Math.max(Number(candidate.version || 1), 4);
  candidate.topics ||= createInitialDatabase().topics;
  const topicMigrations = new Map(createInitialDatabase().topics.map((topic) => [topic.slug, topic]));
  const legacyDefaultTitles = new Map([
    ["make-work-not-just-use-ai", new Set(["会用 AI，不等于做出了作品。", "会用 AI 的人越来越多，为什么能拿出来的作品还是那么少？"])],
    ["faster-or-more-alike", new Set(["AI 让你更快，但会不会让作品更像？"])],
    ["publish-before-ready", new Set(["没有准备好之前，要不要公开未完成？"])],
    ["repeatable-problem", new Set(["别先学提示词，先找到你重复发生的问题。"])],
  ]);
  for (const topic of candidate.topics) {
    const replacement = topicMigrations.get(topic.slug);
    if (replacement && legacyDefaultTitles.get(topic.slug)?.has(topic.title)) {
      Object.assign(topic, {
        title: replacement.title,
        statement: replacement.statement,
        challenge: replacement.challenge,
      });
    }
  }
  candidate.topicResponses ||= [];
  candidate.creatorStories ||= [];
  candidate.publicProfiles ||= [];
  candidate.campaigns ||= [];
  candidate.emailTokens ||= [];
  candidate.uploads ||= [];
  candidate.reports ||= [];
  candidate.auditLog ||= [];
  candidate.workflowTemplates ||= [];
  candidate.workflowRuns ||= [];
  candidate.workflowNodes ||= [];
  candidate.workflowArtifacts ||= [];
  candidate.workflowEvents ||= [];
  candidate.workflowApprovals ||= [];
  candidate.analytics ||= { days: {} };
  candidate.analytics.days ||= {};
  return hydrateCodexFast(candidate);
}

function readLocalDatabase() {
  mkdirSync(databaseDirectory, { recursive: true });
  if (!existsSync(databasePath)) {
    const initial = createInitialDatabase();
    writeFileSync(databasePath, `${JSON.stringify(initial, null, 2)}\n`, "utf8");
    return initial;
  }
  try {
    const parsed = JSON.parse(readFileSync(databasePath, "utf8"));
    if (!validDatabase(parsed)) throw new Error("invalid database");
    return hydrateDatabase(parsed);
  } catch {
    throw new Error(`Unable to read ${databasePath}. Restore the JSON database from a backup before starting ANS.`);
  }
}

async function supabaseRequest(path, options = {}) {
  if (!supabaseUrl || !supabaseServiceRoleKey) throw new Error("SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY 必须同时配置");
  const response = await fetch(`${supabaseUrl}/rest/v1${path}`, {
    ...options,
    headers: {
      apikey: supabaseServiceRoleKey,
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers || {})
    }
  });
  if (!response.ok) throw new Error(`Supabase 请求失败 (${response.status})`);
  return response.status === 204 ? null : response.json();
}

async function initializeDatabase() {
  const local = readLocalDatabase();
  if (dataBackend === "json") return local;
  if (dataBackend !== "supabase") throw new Error(`不支持的数据后端: ${dataBackend}`);
  const rows = await supabaseRequest("/app_state?id=eq.primary&select=data");
  if (rows.length) {
    if (!validDatabase(rows[0].data)) throw new Error("Supabase 中的 ANS 数据格式无效");
    return hydrateDatabase(rows[0].data);
  }
  await supabaseRequest("/app_state", { method: "POST", body: JSON.stringify({ id: "primary", data: local }) });
  return local;
}

let database = await initializeDatabase();
async function syncCodexFastProjections() {
  const projections = [
    ["codexfast_applications", database.codexfastApplications, (entry) => ({ id: entry.id, status: entry.status, email: entry.email, data: entry, updated_at: entry.updatedAt || entry.createdAt })],
    ["codexfast_memberships", database.codexfastMemberships, (entry) => ({ id: entry.id, user_id: entry.userId, status: entry.status, data: entry, updated_at: entry.updatedAt || entry.createdAt })],
    ["codexfast_projects", database.codexfastProjects, (entry) => ({ id: entry.id, owner_id: entry.ownerId, status: entry.status, data: entry, updated_at: entry.updatedAt || entry.createdAt })],
    ["codexfast_specs", database.codexfastSpecs, (entry) => ({ id: entry.id, project_id: entry.projectId, status: entry.status, data: entry, updated_at: entry.updatedAt || entry.createdAt })],
    ["codexfast_runs", database.codexfastRuns, (entry) => ({ id: entry.id, project_id: entry.projectId, owner_id: entry.ownerId, status: entry.status, data: entry, updated_at: entry.updatedAt || entry.createdAt })],
    ["codexfast_run_events", database.codexfastRunEvents, (entry) => ({ id: entry.id, run_id: entry.runId, project_id: entry.projectId, sequence: entry.sequence, data: entry, created_at: entry.createdAt })],
    ["codexfast_artifacts", database.codexfastArtifacts, (entry) => ({ id: entry.id, run_id: entry.runId, project_id: entry.projectId, data: entry, created_at: entry.createdAt })],
    ["codexfast_approvals", database.codexfastApprovals, (entry) => ({ id: entry.id, project_id: entry.projectId, data: entry, created_at: entry.approvedAt || entry.createdAt })],
    ["codexfast_preview_leases", database.codexfastPreviewLeases, (entry) => ({ id: entry.id, project_id: entry.projectId, run_id: entry.runId, expires_at: entry.expiresAt, data: entry, created_at: entry.createdAt })],
    ["codexfast_publications", database.codexfastPublications, (entry) => ({ id: entry.id, project_id: entry.projectId, owner_id: entry.ownerId, status: entry.status, data: entry, updated_at: entry.updatedAt || entry.createdAt })]
  ];
  await Promise.all(projections.filter(([, values]) => values.length).map(([table, values, map]) => supabaseRequest(`/${table}?on_conflict=id`, { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(values.map(map)) })));
}
async function persist() {
  if (dataBackend === "supabase") {
    const rows = await supabaseRequest("/app_state?id=eq.primary", { method: "PATCH", body: JSON.stringify({ data: database, updated_at: now() }) });
    if (!rows?.length) await supabaseRequest("/app_state", { method: "POST", body: JSON.stringify({ id: "primary", data: database }) });
    await syncCodexFastProjections();
    return;
  }
  const temporaryPath = `${databasePath}.tmp`;
  writeFileSync(temporaryPath, `${JSON.stringify(database, null, 2)}\n`, "utf8");
  renameSync(temporaryPath, databasePath);
}

const SOP_MAX_CONCURRENCY = Math.max(1, Math.min(3, Number(process.env.SOP_MAX_CONCURRENCY || 3)));

// ?? Provider ??????????????????????????
function voiceProviderConfig() {
  const configured = (name) => Boolean(process.env[name] && String(process.env[name]).trim());
  return {
    stt: { configured: configured("VOICE_STT_URL"), mode: configured("VOICE_STT_URL") ? "provider" : "browser-fallback" },
    tts: { configured: configured("VOICE_TTS_URL"), mode: configured("VOICE_TTS_URL") ? "provider" : "browser-fallback" },
    realtime: { configured: configured("VOICE_REALTIME_URL"), mode: configured("VOICE_REALTIME_URL") ? "provider" : "text-agent" },
    viseme: { configured: configured("VOICE_VISEME_URL"), mode: configured("VOICE_VISEME_URL") ? "provider" : "client-mapping" }
  };
}

const workflowRuntime = { running: new Set(), ticking: false };

function ensureWorkflowCollections() {
  database.workflowTemplates ||= [];
  database.workflowRuns ||= [];
  database.workflowNodes ||= [];
  database.workflowArtifacts ||= [];
  database.workflowEvents ||= [];
  database.workflowApprovals ||= [];
  if (!database.workflowTemplates.some((entry) => entry.id === "sci-fi-film-production")) {
    database.workflowTemplates.push({ id: "sci-fi-film-production", name: "鲸歌计划科幻电影 SOP", version: 1, maxConcurrency: SOP_MAX_CONCURRENCY, nodes: ["collect_context", "asset_audit", "prompt_audit", "compile_delivery", "persist_sop"], createdAt: now(), updatedAt: now() });
  }
}
ensureWorkflowCollections();
function workflowRunFor(user, runId) { const run = database.workflowRuns.find((entry) => entry.id === runId && entry.ownerId === user.id); if (!run) throw new HttpError(404, "工作流运行不存在"); return run; }
function workflowNodesFor(runId) { return database.workflowNodes.filter((entry) => entry.runId === runId); }
function workflowArtifactsFor(runId) { return database.workflowArtifacts.filter((entry) => entry.runId === runId); }
function workflowEventsFor(runId) { return database.workflowEvents.filter((entry) => entry.runId === runId).sort((a, b) => a.sequence - b.sequence); }
function appendWorkflowEvent(run, type, payload = {}) { const events = workflowEventsFor(run.id); const event = { id: id("wf-event"), runId: run.id, sequence: events.length + 1, type, payload, createdAt: now() }; database.workflowEvents.push(event); run.updatedAt = event.createdAt; return event; }
function workflowPublicNode(node) { return { id: node.id, runId: node.runId, type: node.type, title: node.title, status: node.status, dependsOn: node.dependsOn, attempt: node.attempt, maxAttempts: node.maxAttempts, input: node.input, output: node.output || null, error: node.error || null, cost: node.cost || 0, startedAt: node.startedAt || null, completedAt: node.completedAt || null }; }
function workflowPublicRun(run) { return { id: run.id, ownerId: run.ownerId, projectId: run.projectId, title: run.title, goal: run.goal, templateId: run.templateId, status: run.status, approvalRequired: run.approvalRequired, approvedAt: run.approvedAt || null, createdAt: run.createdAt, updatedAt: run.updatedAt, nodes: workflowNodesFor(run.id).map(workflowPublicNode), artifacts: workflowArtifactsFor(run.id).map((artifact) => ({ id: artifact.id, nodeId: artifact.nodeId, type: artifact.type, name: artifact.name, mimeType: artifact.mimeType, content: artifact.content, createdAt: artifact.createdAt })), cost: run.cost || 0 }; }
function planNodes(goal) { const input = { goal: safeText(goal, 4000), project: "鲸歌计划", version: "R7" }; return [
  { type: "collect_context", title: "读取项目事实", dependsOn: [], input, maxAttempts: 2 },
  { type: "asset_audit", title: "权威参考图审查", dependsOn: ["collect_context"], input, maxAttempts: 2 },
  { type: "prompt_audit", title: "提示词反套话质检", dependsOn: ["collect_context"], input, maxAttempts: 2 },
  { type: "compile_delivery", title: "编制可执行交付物", dependsOn: ["asset_audit", "prompt_audit"], input, maxAttempts: 2 },
  { type: "persist_sop", title: "写入可复用 SOP", dependsOn: ["compile_delivery"], input, maxAttempts: 2 }
]; }
function createWorkflowRun(user, goal, projectId = "whale-project") { const createdAt = now(); const run = { id: id("wf-run"), ownerId: user.id, projectId: safeText(projectId, 120) || "whale-project", title: "鲸歌计划 R7 生产闭环", goal: safeText(goal, 4000), templateId: "sci-fi-film-production", status: "awaiting_approval", approvalRequired: true, createdAt, updatedAt: createdAt, cost: 0 }; database.workflowRuns.unshift(run); for (const spec of planNodes(goal)) database.workflowNodes.push({ id: id("wf-node"), runId: run.id, type: spec.type, title: spec.title, dependsOn: spec.dependsOn, status: "queued", attempt: 0, maxAttempts: spec.maxAttempts, input: spec.input, output: null, error: null, cost: 0, startedAt: null, completedAt: null }); appendWorkflowEvent(run, "run.created", { goal: run.goal, nodeCount: planNodes(goal).length }); appendWorkflowEvent(run, "run.approval_required", {}); return run; }
function depsCompleted(node, nodes) { return node.dependsOn.every((dep) => nodes.some((entry) => entry.type === dep && entry.status === "completed")); }
function runStatusFromNodes(run, nodes) { if (run.status === "paused" || run.status === "cancelled") return run.status; if (nodes.some((node) => node.status === "failed")) return "failed"; if (nodes.length && nodes.every((node) => node.status === "completed")) return "completed"; if (nodes.some((node) => node.status === "running" || node.status === "retrying")) return "running"; return run.status === "awaiting_approval" ? "awaiting_approval" : "queued"; }
function createWorkflowArtifact(run, node, type, name, content, mimeType = "application/json") { const artifact = { id: id("wf-artifact"), runId: run.id, nodeId: node.id, type, name, content, mimeType, createdAt: now() }; database.workflowArtifacts.unshift(artifact); appendWorkflowEvent(run, "artifact.created", { artifactId: artifact.id, nodeId: node.id, name }); return artifact; }
async function executeWorkflowNode(run, node) { await new Promise((resolveDelay) => setTimeout(resolveDelay, 260)); const state = sopStatePayload(); if (node.type === "collect_context") { node.output = { project: state.project, version: state.version, stages: state.stages.length, checks: state.checks.length, capturedAt: now() }; createWorkflowArtifact(run, node, "context", "project-context.json", JSON.stringify(node.output, null, 2)); } else if (node.type === "asset_audit") { node.output = { accepted: state.assets.filter((asset) => asset.status === "已验收").map((asset) => asset.name), pending: state.assets.filter((asset) => asset.status !== "已验收").map((asset) => asset.name), evidenceRule: "候选资产必须完成验收后才能进入正式生成" }; createWorkflowArtifact(run, node, "audit", "asset-audit.json", JSON.stringify(node.output, null, 2)); } else if (node.type === "prompt_audit") { node.output = { checked: true, forbiddenTerms: ["电影感", "高级感", "氛围感", "保持一致", "动作自然"], rule: "每句提示词都必须改变可见主体、位置、动作、镜头、光线、声音或文字", status: "通过" }; createWorkflowArtifact(run, node, "audit", "prompt-audit.json", JSON.stringify(node.output, null, 2)); } else if (node.type === "compile_delivery") { node.output = { deliverables: ["剧本与分镜", "四段30秒生视频提示词", "权威参考图职责表", "生成与验收清单"], nextAction: "确认计划后进入三并发执行队列", compiledAt: now() }; createWorkflowArtifact(run, node, "plan", "delivery-plan.json", JSON.stringify(node.output, null, 2)); } else if (node.type === "persist_sop") { node.output = { templateId: run.templateId, reusable: true, savedAt: now() }; const template = database.workflowTemplates.find((entry) => entry.id === run.templateId); if (template) template.updatedAt = now(); createWorkflowArtifact(run, node, "sop", "reusable-sop.json", JSON.stringify(node.output, null, 2)); } else throw new Error("未知工作流节点"); }
async function runWorkflowNode(run, node) { const key = `${run.id}:${node.id}`; workflowRuntime.running.add(key); node.status = "running"; node.attempt += 1; node.startedAt = now(); node.error = null; appendWorkflowEvent(run, "node.started", { nodeId: node.id, type: node.type, attempt: node.attempt }); await persist(); try { await executeWorkflowNode(run, node); node.status = run.status === "cancelled" ? "cancelled" : "completed"; node.completedAt = now(); appendWorkflowEvent(run, "node.completed", { nodeId: node.id, type: node.type }); } catch (error) { node.error = redactTelemetry(error?.message || String(error), 500); node.status = node.attempt < node.maxAttempts ? "queued" : "failed"; appendWorkflowEvent(run, node.status === "queued" ? "node.retrying" : "node.failed", { nodeId: node.id, error: node.error, attempt: node.attempt }); } finally { workflowRuntime.running.delete(key); const nodes = workflowNodesFor(run.id); if (run.status !== "paused" && run.status !== "cancelled") run.status = runStatusFromNodes(run, nodes); run.updatedAt = now(); await persist(); void workflowTick(); } }
async function workflowTick() { if (workflowRuntime.ticking) return; workflowRuntime.ticking = true; try { for (const run of database.workflowRuns) { if (!["queued", "running"].includes(run.status)) continue; const nodes = workflowNodesFor(run.id); const available = nodes.filter((node) => node.status === "queued" && depsCompleted(node, nodes)); for (const node of available) { if (workflowRuntime.running.size >= SOP_MAX_CONCURRENCY) break; void runWorkflowNode(run, node); } if (run.status === "queued" && available.length) run.status = "running"; } await persist(); } finally { workflowRuntime.ticking = false; } }
function startWorkflowRun(run) { if (!run.approvedAt) throw new HttpError(409, "请先确认执行计划"); if (["completed", "cancelled"].includes(run.status)) throw new HttpError(409, "当前运行不能再次启动"); run.status = "queued"; appendWorkflowEvent(run, "run.started", { maxConcurrency: SOP_MAX_CONCURRENCY }); void workflowTick(); }
function workflowPlanFromMessage(message, user) { const text = safeText(message, 4000); if (!text) return null; const statusOnly = /^(现在最该做什么|下一步|参考图|哪些图还不能作为权威参考|准入检查|帮我检查生产准入|当前进度|进度|做到了哪里|多少图|帮助|你好|hi|hello)[？?!。!！\s]*$/i; if (statusOnly.test(text)) return null; return createWorkflowRun(user, text); }

function emailActionUrl(parameter, token) {
  const base = publicOrigin || `http://127.0.0.1:${port}`;
  return `${base}/auth?${parameter}=${encodeURIComponent(token)}`;
}
function discardExpiredEmailTokens() {
  const current = Date.now();
  database.emailTokens = database.emailTokens.filter((entry) => entry.expiresAt > current);
}
function createEmailToken(type, user) {
  discardExpiredEmailTokens();
  const token = randomBytes(32).toString("base64url");
  database.emailTokens = database.emailTokens.filter((entry) => !(entry.type === type && entry.userId === user.id));
  database.emailTokens.push({ id: id("email"), type, userId: user.id, tokenHash: hashToken(token), expiresAt: Date.now() + emailTokenLifetimeMs, createdAt: now() });
  return token;
}
function emailTokenFor(type, token) {
  discardExpiredEmailTokens();
  return database.emailTokens.find((entry) => entry.type === type && entry.tokenHash === hashToken(token));
}
async function deliverEmail({ to, subject, text }) {
  if (!smtpTransport) throw new HttpError(503, "邮件服务尚未配置");
  try {
    await smtpTransport.sendMail({ from: smtpFrom, to, subject, text });
  } catch (error) {
    console.error("SMTP delivery failed", { name: error?.name, code: error?.code, responseCode: error?.responseCode });
    throw new HttpError(502, "邮件暂时无法发送，请稍后重试");
  }
}
async function deliverEmailAction(type, user) {
  const token = createEmailToken(type, user);
  await persist();
  const verification = type === "verify";
  await deliverEmail({
    to: user.email,
    subject: verification ? "验证你的 ANS 邮箱" : "重设你的 ANS 密码",
    text: verification
      ? `请在 30 分钟内打开以下链接完成邮箱验证：\n${emailActionUrl("verify", token)}`
      : `请在 30 分钟内打开以下链接重设密码：\n${emailActionUrl("reset", token)}`
  });
}
async function cleanSessions() {
  const before = database.sessions.length;
  const current = Date.now();
  database.sessions = database.sessions.filter((session) => session.expiresAt > current);
  if (database.sessions.length !== before) await persist();
}

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
function sendJson(response, status, payload, headers = {}) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "same-origin", "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY", ...(process.env.NODE_ENV === "production" ? { "Strict-Transport-Security": "max-age=31536000; includeSubDomains" } : {}), ...headers });
  response.end(JSON.stringify(payload));
}
function parseCookies(request) {
  return Object.fromEntries((request.headers.cookie || "").split(";").map((entry) => entry.trim()).filter(Boolean).map((entry) => {
    const index = entry.indexOf("=");
    return [entry.slice(0, index), decodeURIComponent(entry.slice(index + 1))];
  }));
}
async function sessionFor(request) {
  await cleanSessions();
  const token = parseCookies(request).ans_session;
  if (!token) return null;
  const session = database.sessions.find((entry) => entry.tokenHash === hashToken(token));
  if (!session) return null;
  return database.users.find((user) => user.id === session.userId) || null;
}
function sessionCookie(token, expiresAt) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `ans_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor((expiresAt - Date.now()) / 1000)}${secure}`;
}
function clearedSessionCookie() { return "ans_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"; }
async function createSession(user) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = Date.now() + sessionDurationMs;
  database.sessions.push({ id: id("session"), userId: user.id, tokenHash: hashToken(token), expiresAt, createdAt: now() });
  await persist();
  return { token, expiresAt };
}
async function passwordHash(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64);
  return `scrypt$${salt}$${Buffer.from(derived).toString("hex")}`;
}
async function passwordMatches(password, encoded) {
  const [algorithm, salt, expected] = String(encoded).split("$");
  if (algorithm !== "scrypt" || !salt || !expected) return false;
  const derived = Buffer.from(await scrypt(password, salt, 64));
  const expectedBuffer = Buffer.from(expected, "hex");
  return expectedBuffer.length === derived.length && timingSafeEqual(expectedBuffer, derived);
}
async function requestBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 64 * 1024) throw new HttpError(413, "请求内容过大");
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { throw new HttpError(400, "请求不是有效 JSON"); }
}
async function requestBuffer(request, maximumSize = uploadLimitBytes) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maximumSize) throw new HttpError(413, "文件超过 8 MB 限制");
    chunks.push(chunk);
  }
  if (!chunks.length) throw new HttpError(400, "没有收到文件");
  return Buffer.concat(chunks);
}
function safeFilename(value) {
  const decoded = (() => { try { return decodeURIComponent(String(value || "")); } catch { return ""; } })();
  const cleaned = decoded.replace(/[\\/:*?"<>|\x00-\x1f]/g, "-").replace(/\s+/g, " ").trim();
  return cleaned.slice(0, 120) || "attachment";
}
function requireUser(user) { if (!user) throw new HttpError(401, "请先登录"); return user; }
function requireAdmin(user) { if (!user || user.role !== "admin") throw new HttpError(403, "需要管理员权限"); return user; }
function hasAdmin() { return database.users.some((user) => user.role === "admin"); }
function userDrafts(user) { return database.drafts.filter((draft) => draft.authorId === user.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)); }
function userSubmissions(user) { return database.submissions.filter((submission) => submission.authorId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
function recordAudit(action, user, details = {}) {
  database.auditLog.unshift({ id: id("audit"), action, actorId: user?.id || null, actor: user?.displayName || "system", details, createdAt: now() });
  database.auditLog.length = Math.min(database.auditLog.length, 1000);
}
function recordAnalyticsEvent(event, type = "", campaign = "") {
  if (!analyticsEventNames.includes(event)) return;
  const day = new Date().toISOString().slice(0, 10);
  const metrics = database.analytics.days[day] ||= { events: {}, submissionTypes: {} };
  metrics.events[event] = Number(metrics.events[event] || 0) + 1;
  if ((event === "submission_created" || event === "submission_approved") && ["idea", "project", "help", "tutorial"].includes(type)) {
    metrics.submissionTypes[type] = Number(metrics.submissionTypes[type] || 0) + 1;
  }
  if (event === "campaign_landing" && campaign) {
    metrics.campaigns ||= {};
    metrics.campaigns[campaign] = Number(metrics.campaigns[campaign] || 0) + 1;
    const campaignRecord = database.campaigns.find((entry) => entry.name === campaign);
    if (campaignRecord) { campaignRecord.landings = Number(campaignRecord.landings || 0) + 1; campaignRecord.updatedAt = now(); }
    else database.campaigns.push({ id: id("campaign"), name: campaign, landings: 1, createdAt: now(), updatedAt: now() });
  }
  const earliest = Date.now() - analyticsRetentionDays * 24 * 60 * 60 * 1000;
  for (const date of Object.keys(database.analytics.days)) if (Date.parse(`${date}T00:00:00.000Z`) < earliest) delete database.analytics.days[date];
}
function analyticsSummary(days = 7) {
  const events = Object.fromEntries(analyticsEventNames.map((event) => [event, 0]));
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  for (const [date, metrics] of Object.entries(database.analytics.days)) {
    if (Date.parse(`${date}T00:00:00.000Z`) < cutoff) continue;
    for (const event of analyticsEventNames) events[event] += Number(metrics.events?.[event] || 0);
  }
  return { days, events };
}
function uploadMetadata(upload) {
  return { id: upload.id, name: upload.name, contentType: upload.contentType, size: upload.size, url: `/media/${encodeURIComponent(upload.id)}` };
}
function attachmentsForIds(uploadIds) {
  return (uploadIds || []).map((uploadId) => database.uploads.find((upload) => upload.id === uploadId)).filter(Boolean).map(uploadMetadata);
}
function uploadIdsFor(body, user) {
  const values = Array.isArray(body.uploadIds) ? body.uploadIds : [];
  const ids = [...new Set(values.map((value) => safeText(value, 100)).filter(Boolean))].slice(0, maxAttachments);
  const uploads = ids.map((uploadId) => database.uploads.find((upload) => upload.id === uploadId && upload.ownerId === user.id));
  if (uploads.some((upload) => !upload)) throw new HttpError(400, "附件不存在或不属于当前账号");
  return ids;
}
function uploadIsPublic(upload) {
  const publishedRecords = [database.ideas, database.projects, database.help, database.tutorials];
  const moderatedRecords = [database.topicResponses, database.creatorStories];
  return publishedRecords.some((items) => items.some((item) => item.uploadIds?.includes(upload.id))) ||
    moderatedRecords.some((items) => items.some((item) => item.status === "已通过" && item.uploadIds?.includes(upload.id)));
}
function apiKeyFor(request) {
  const value = String(request.headers.authorization || "");
  const token = value.startsWith("Bearer ") ? value.slice(7) : "";
  if (!token.startsWith("ans_live_")) return null;
  const key = database.apiKeys.find((entry) => entry.tokenHash === hashToken(token));
  if (!key || key.revokedAt) return null;
  key.lastUsedAt = now();
  return { key, user: database.users.find((entry) => entry.id === key.userId) || null };
}
function requireApiKey(request) {
  const result = apiKeyFor(request);
  if (!result?.user) throw new HttpError(401, "需要有效的 ANS API Key");
  return result;
}
function publicData() {
  const profiles = database.publicProfiles.filter((profile) => profile.isPublic).map(({ userId, ...profile }) => profile);
  const publicProfilesByUserId = new Map(database.publicProfiles.filter((profile) => profile.isPublic).map((profile) => [profile.userId, profile]));
  const stories = database.creatorStories
    .filter((story) => story.status === "已通过")
    .map(({ uploadIds, authorId, ...story }) => ({
      ...story,
      profileSlug: story.profileSlug || publicProfilesByUserId.get(authorId)?.slug || "",
      attachments: attachmentsForIds(uploadIds)
    }));
  const responses = database.topicResponses.filter((response) => response.status === "已通过").map(({ authorId, uploadIds, ...response }) => ({ ...response, attachments: attachmentsForIds(uploadIds) }));
  return {
    ideas: database.ideas.filter((idea) => !defaultDemoIds.has(idea.id)).map(({ contact, uploadIds, ...idea }) => ({ ...idea, contact: idea.openContact ? contact : "", attachments: attachmentsForIds(uploadIds) })),
    projects: database.projects.filter((project) => !defaultDemoIds.has(project.id)).map(({ contact, uploadIds, ...project }) => ({ ...project, contact: project.openContact ? contact : "", attachments: attachmentsForIds(uploadIds) })),
    help: database.help.filter((request) => !defaultDemoIds.has(request.id)).map(({ contact, uploadIds, ...request }) => ({ ...request, contact: request.openContact ? contact : "", attachments: attachmentsForIds(uploadIds) })),
    tutorials: database.tutorials.map(({ uploadIds, ...tutorial }) => ({ ...tutorial, attachments: attachmentsForIds(uploadIds) })),
    topics: database.topics.filter((topic) => topic.status !== "归档"),
    topicResponses: responses,
    creatorStories: stories,
    publicProfiles: profiles
  };
}
function xmlEscape(value = "") { return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[character])); }
function sitemapEntries() {
  const base = publicOrigin || `http://${host}:${port}`;
  const entries = ["/", "/wall", "/projects", "/help", "/tutorials", "/about"].map((pathname) => ({ location: `${base}${pathname}` }));
  for (const idea of database.ideas) entries.push({ location: `${base}/ideas/${encodeURIComponent(idea.id)}`, lastModified: idea.createdAt });
  for (const project of database.projects) entries.push({ location: `${base}/projects/${encodeURIComponent(project.id)}`, lastModified: project.createdAt });
  for (const tutorial of database.tutorials) entries.push({ location: `${base}/tutorials/${encodeURIComponent(tutorial.id)}`, lastModified: tutorial.createdAt });
  for (const topic of database.topics.filter((entry) => entry.status === "公开")) entries.push({ location: `${base}/topics/${encodeURIComponent(topic.slug)}`, lastModified: topic.createdAt });
  for (const story of database.creatorStories.filter((entry) => entry.status === "已通过")) entries.push({ location: `${base}/stories/${encodeURIComponent(story.id)}`, lastModified: story.createdAt });
  for (const profile of database.publicProfiles.filter((entry) => entry.isPublic)) entries.push({ location: `${base}/people/${encodeURIComponent(profile.slug)}`, lastModified: profile.updatedAt });
  return entries;
}
function sendSitemap(response) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries().map((entry) => `  <url><loc>${xmlEscape(entry.location)}</loc>${entry.lastModified ? `<lastmod>${xmlEscape(entry.lastModified)}</lastmod>` : ""}</url>`).join("\n")}\n</urlset>\n`;
  response.writeHead(200, { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "same-origin", "X-Frame-Options": "DENY", ...(process.env.NODE_ENV === "production" ? { "Strict-Transport-Security": "max-age=31536000; includeSubDomains" } : {}) });
  response.end(xml);
}
function sanitizeSubmission(body, user) {
  const type = safeText(body.type, 30);
  const base = { id: id("submission"), type, authorId: user.id, author: user.displayName, status: "待审核", createdAt: now(), created: dateLabel(), uploadIds: uploadIdsFor(body, user) };
  if (type === "idea") return { ...base, typeLabel: "想象力墙", title: requiredText(body.title, "一句话", 120), body: requiredText(body.body, "展开说明"), contact: requiredText(body.contact, "联系方式", 300), openContact: boolean(body.openContact), color: ["butter", "mint", "sky", "rose", "paper"].includes(body.color) ? body.color : "butter", preview: requiredText(body.body, "展开说明") };
  if (type === "project") return { ...base, typeLabel: "项目", title: requiredText(body.title, "项目名", 120), summary: requiredText(body.summary, "项目说明"), progress: requiredText(body.progress, "最近进展"), statusName: ["刚开始", "推进中", "已结束"].includes(body.status) ? body.status : "刚开始", recruiting: boolean(body.recruiting), offer: safeText(body.offer), contact: requiredText(body.contact, "联系方式", 300), openContact: boolean(body.openContact), preview: requiredText(body.summary, "项目说明") };
  if (type === "help") return { ...base, typeLabel: "能力交换", title: requiredText(body.title, "标题", 120), need: requiredText(body.need, "需要说明"), give: requiredText(body.give, "回报说明"), contact: requiredText(body.contact, "联系方式", 300), openContact: boolean(body.openContact), profile: boolean(body.profile), preview: requiredText(body.need, "需要说明") };
  if (type === "tutorial") return { ...base, typeLabel: "行动手册", title: requiredText(body.title, "手册标题", 160), summary: requiredText(body.summary, "手册说明"), steps: requiredText(body.steps, "实现流程", 8000), draftId: safeText(body.draftId, 100), preview: requiredText(body.summary, "手册说明") };
  throw new HttpError(400, "不支持的提交类型");
}
function publishSubmission(submission) {
  let publicUrl;
  if (submission.type === "idea") {
    const record = { id: id("idea"), title: submission.title, body: submission.body, author: submission.author, color: submission.color, contact: submission.contact, openContact: submission.openContact, uploadIds: submission.uploadIds, date: "刚刚", createdAt: now() };
    database.ideas.unshift(record); publicUrl = `/ideas/${record.id}`;
  }
  if (submission.type === "project") {
    const record = { id: id("project"), title: submission.title, summary: submission.summary, progress: submission.progress, status: submission.statusName, recruiting: submission.recruiting, offer: submission.offer, author: submission.author, contact: submission.contact, openContact: submission.openContact, uploadIds: submission.uploadIds, createdAt: now() };
    database.projects.unshift(record); publicUrl = `/projects/${record.id}`;
  }
  if (submission.type === "help") {
    const record = { id: id("help"), title: submission.title, need: submission.need, give: submission.give, author: submission.author, contact: submission.contact, openContact: submission.openContact, profile: submission.profile, uploadIds: submission.uploadIds, createdAt: now() };
    database.help.unshift(record); publicUrl = "/help";
  }
  if (submission.type === "tutorial") {
    const record = { id: id("tutorial"), title: submission.title, summary: submission.summary, content: submission.steps.split("\n").map((step) => step.trim()).filter(Boolean), author: submission.author, dependencies: 3, tests: 2, uploadIds: submission.uploadIds, createdAt: now() };
    database.tutorials.unshift(record); publicUrl = `/tutorials/${record.id}`;
    const draft = database.drafts.find((item) => item.id === submission.draftId && item.authorId === submission.authorId);
    if (draft) { draft.status = "已通过"; draft.updatedAt = now(); }
  }
  submission.status = "已通过";
  submission.publicUrl = publicUrl;
}

function publicProfileFor(userId) {
  const profile = database.publicProfiles.find((entry) => entry.userId === userId && entry.isPublic);
  if (!profile) return null;
  const { userId: ignored, ...publicProfile } = profile;
  return publicProfile;
}
function ownerProfileFor(userId) {
  const profile = database.publicProfiles.find((entry) => entry.userId === userId);
  if (!profile) return null;
  const { userId: ignored, ...ownerProfile } = profile;
  return ownerProfile;
}
function profilePayload(body, user) {
  const slug = safeText(body.slug, 40).toLowerCase();
  if (!/^[a-z0-9-]{3,40}$/.test(slug)) throw new HttpError(400, "公开主页地址需为 3 至 40 位小写字母、数字或连字符");
  const duplicate = database.publicProfiles.find((entry) => entry.slug === slug && entry.userId !== user.id);
  if (duplicate) throw new HttpError(409, "这个公开主页地址已被使用");
  const tags = [...new Set((Array.isArray(body.tags) ? body.tags : []).map((tag) => safeText(tag, 12)).filter((tag) => profileTags.has(tag)))].slice(0, 3);
  return { slug, displayName: user.displayName, bio: safeText(body.bio, 180), tags, isPublic: boolean(body.isPublic), updatedAt: now() };
}
function campaignName(value) {
  const [channel, series] = safeText(value, 80).split(":");
  if (!campaignChannels.has(channel) || !campaignSeries.has(series)) throw new HttpError(400, "来源标记无效");
  return `${channel}:${series}`;
}
function currentTopic() { return database.topics.find((topic) => topic.status === "公开") || null; }
function publicTopic(topic) {
  if (!topic) return null;
  const responses = database.topicResponses.filter((entry) => entry.topicSlug === topic.slug && entry.status === "已通过").map(({ authorId, uploadIds, ...entry }) => ({ ...entry, attachments: attachmentsForIds(uploadIds) }));
  return { ...topic, responses };
}
function storyPayload(body, user) {
  if (!boolean(body.consent)) throw new HttpError(400, "发布实录前必须确认已取得内容授权");
  const authorName = requiredText(body.authorName, "公开署名", 60);
  const requestedProfileSlug = safeText(body.profileSlug, 40).toLowerCase();
  const ownerProfile = database.publicProfiles.find((profile) => profile.userId === user.id && profile.isPublic);
  const profileSlug = requestedProfileSlug || (ownerProfile && authorName === user.displayName ? ownerProfile.slug : "");
  if (profileSlug && !database.publicProfiles.some((profile) => profile.slug === profileSlug && profile.isPublic)) throw new HttpError(400, "关联的公开主页不存在或尚未公开");
  return {
    id: id("story"), status: "待审核", authorId: user.id, authorName, profileSlug,
    role: requiredText(body.role, "身份与正在做的事", 120), hook: requiredText(body.hook, "实录标题", 120), problem: requiredText(body.problem, "真实卡点", 1000),
    aiSteps: requiredText(body.aiSteps, "AI 参与步骤", 1800), humanJudgement: requiredText(body.humanJudgement, "人类判断", 1200), outcome: requiredText(body.outcome, "可验证结果", 1200),
    nextStep: requiredText(body.nextStep, "此刻需要什么", 600), consent: true, uploadIds: uploadIdsFor(body, user), createdAt: now(), updatedAt: now()
  };
}


const sopStages = [
  { name: "\u5267\u672c\u4e0e\u5206\u955c\u4e8b\u5b9e", status: "\u5df2\u5b8c\u6210", progress: 100, owner: "\u5bfc\u6f14\u53f0", detail: "R7 \u56db\u6bb5 30s \u5355\u5143\u5df2\u62c6\u6210\u53ef\u9a8c\u8bc1\u7684\u573a\u666f\u4e8b\u5b9e\u3002" },
  { name: "\u6743\u5a01\u53c2\u8003\u56fe", status: "\u8fdb\u884c\u4e2d", progress: 82, owner: "\u8d44\u4ea7\u53f0", detail: "\u89d2\u8272\u3001\u573a\u666f\u3001\u63a2\u6d4b\u4eea\u57fa\u51c6\u56fe\u5df2\u9a8c\u6536\uff1b\u56db\u6bb5\u9996\u5e27\u4ecd\u9700\u786e\u8ba4\u3002" },
  { name: "\u751f\u56fe\u62bd\u5361", status: "\u8fdb\u884c\u4e2d", progress: 68, owner: "\u56fe\u50cf\u53f0", detail: "\u6bcf\u6bb5\u4fdd\u7559\u6700\u4f18\u5019\u9009\uff0c\u6e05\u7406\u91cd\u590d\u683c\u5f0f\u4e0e\u672a\u9a8c\u6536\u56fe\u3002" },
  { name: "\u751f\u89c6\u9891\u63d0\u793a\u8bcd", status: "\u8fdb\u884c\u4e2d", progress: 76, owner: "\u63d0\u793a\u8bcd\u53f0", detail: "\u6309\u53ef\u89c1\u8bc1\u636e\u7f16\u8bd1\uff0c\u573a\u666f\u8868\u8fbe\u955c\u5934\u53d8\u5316\uff0c\u4e0d\u5199\u65f6\u95f4\u8f74\u3002" },
  { name: "Seedance \u89c6\u9891\u751f\u6210", status: "\u8fdb\u884c\u4e2d", progress: 42, owner: "\u751f\u6210\u961f\u5217", detail: "\u56db\u4e2a 30s \u5355\u5143\u5df2\u5efa\u7acb\u961f\u5217\uff0c\u7b49\u5f85\u6743\u5a01\u9996\u5e27\u786e\u8ba4\u3002" },
  { name: "\u58f0\u97f3\u4e0e\u526a\u8f91", status: "\u5f85\u5904\u7406", progress: 18, owner: "\u540e\u671f\u53f0", detail: "\u5bf9\u767d\u3001\u73af\u5883\u58f0\u548c\u6700\u7ec8\u526a\u8f91\u5c06\u5728\u89c6\u9891\u901a\u8fc7\u521d\u5ba1\u540e\u8fdb\u5165\u3002" }
];
const sopAssets = [
  { name: "\u89d2\u8272\u57fa\u51c6\u56fe", role: "\u9501\u5b9a\u8138\u3001\u53d1\u578b\u3001\u5e74\u9f84\u611f\u3001\u670d\u88c5\u4e0e\u8eab\u4f53\u72b6\u6001", status: "\u5df2\u9a8c\u6536", kind: "character", icon: "\u4eba" },
  { name: "\u6df1\u6d77\u8231\u5ba4\u573a\u666f\u56fe", role: "\u9501\u5b9a\u7a7a\u95f4\u51e0\u4f55\u3001\u5730\u6807\u3001\u5149\u7ebf\u65b9\u5411\u4e0e\u8272\u5f69", status: "\u5df2\u9a8c\u6536", kind: "scene", icon: "\u666f" },
  { name: "\u63a2\u6d4b\u4eea\u9053\u5177\u56fe", role: "\u9501\u5b9a\u5f62\u72b6\u3001\u6750\u8d28\u3001\u4f4d\u7f6e\u4e0e\u5de5\u4f5c\u72b6\u6001", status: "\u5df2\u9a8c\u6536", kind: "prop", icon: "\u5668" },
  { name: "R7 \u56db\u6bb5\u9996\u5e27", role: "\u9501\u5b9a\u4e3b\u4f53\u4f4d\u7f6e\u3001\u5f53\u524d\u6784\u56fe\u4e0e\u52a8\u4f5c\u8d77\u70b9", status: "\u5019\u9009\u5f85\u9a8c\u6536", kind: "frame", icon: "\u5e27" },
  { name: "\u751f\u89c6\u9891\u53c2\u8003\u804c\u8d23\u8868", role: "\u9010\u6bb5\u7ed1\u5b9a @\u56fe \u4e0e\u7981\u6b62\u7ee7\u627f\u9879", status: "\u5f85\u8865", kind: "evidence", icon: "\u8bc1" }
];
const sopChecks = [
  { label: "\u5267\u672c\u4e8b\u5b9e\u5df2\u9501\u5b9a", detail: "\u901a\u8fc7", ok: true },
  { label: "\u5206\u955c\u7f16\u53f7\u8fde\u7eed", detail: "\u901a\u8fc7", ok: true },
  { label: "\u89d2\u8272\u6743\u5a01\u56fe", detail: "\u901a\u8fc7", ok: true },
  { label: "\u573a\u666f\u6743\u5a01\u56fe", detail: "\u901a\u8fc7", ok: true },
  { label: "\u9053\u5177\u6743\u5a01\u56fe", detail: "\u901a\u8fc7", ok: true },
  { label: "\u9996\u5e27\u56fe\u9a8c\u6536", detail: "\u5f85\u5904\u7406", pending: true },
  { label: "\u53c2\u8003\u56fe\u804c\u8d23\u6620\u5c04", detail: "\u901a\u8fc7", ok: true },
  { label: "\u63d0\u793a\u8bcd\u65e0\u81c6\u9020\u4e8b\u5b9e", detail: "\u901a\u8fc7", ok: true },
  { label: "30 \u79d2\u5355\u5143\u7ed3\u6784", detail: "\u901a\u8fc7", ok: true },
  { label: "\u89c6\u9891\u751f\u6210\u961f\u5217", detail: "\u8fdb\u884c\u4e2d", pending: true }
];
function sopStatePayload(user = null) {
  const pending = sopChecks.filter((item) => item.pending).length;
  return {
    project: "\u9cb8\u6b4c\u8ba1\u5212",
    version: "R7",
    generatedAt: now(),
    overall: 64,
    runCount: database.workflowRuns.filter((run) => !user || run.ownerId === user.id).length,
    gate: { ok: false, label: "\u5f85\u5904\u7406", detail: `${pending} \u9879\u9700\u8981\u786e\u8ba4\u540e\u518d\u653e\u884c` },
    nextAction: { label: "\u9a8c\u6536\u56db\u6bb5\u9996\u5e27", owner: "\u8d1f\u8d23\u4eba\uff1a\u8d44\u4ea7\u53f0" },
    stages: sopStages,
    assets: sopAssets,
    checks: sopChecks,
    activity: [
      { title: "\u63d0\u793a\u8bcd\u7f16\u8bd1\u5b8c\u6210", detail: "\u56db\u6bb5 30s \u751f\u89c6\u9891\u5355\u5143\u5df2\u66f4\u65b0", when: "\u521a\u521a", status: "\u5df2\u5b8c\u6210" },
      { title: "\u9996\u5e27\u5019\u9009\u5df2\u5165\u5e93", detail: "\u7b49\u5f85\u5bfc\u6f14\u786e\u8ba4\u6743\u5a01\u7248\u672c", when: "12 \u5206\u949f\u524d", status: "\u8fdb\u884c\u4e2d" },
      { title: "\u751f\u6210\u961f\u5217\u5df2\u5efa\u7acb", detail: "\u4fdd\u6301 3 \u5e76\u53d1\uff0c\u5931\u8d25\u81ea\u52a8\u91cd\u8bd5", when: "\u4eca\u5929", status: "\u8fdb\u884c\u4e2d" },
      { title: "\u58f0\u97f3\u9636\u6bb5\u5df2\u9884\u7559", detail: "\u7b49\u5f85\u753b\u9762\u521d\u5ba1\u901a\u8fc7", when: "\u6628\u5929", status: "\u5f85\u5904\u7406" }
    ],
    concurrency: { limit: SOP_MAX_CONCURRENCY, active: workflowRuntime.running.size },
    runs: database.workflowRuns.filter((run) => !user || run.ownerId === user.id).slice(0, 20).map(workflowPublicRun)
  };
}
function sopAgentResponse(message, user, plan = null) {
  const text = safeText(message, 600);
  const intent = plan ? "plan" : /\u6682\u505c/.test(text) ? "pause" : /\u6062\u590d|\u7ee7\u7eed/.test(text) ? "resume" : /\u53d6\u6d88|\u505c\u6b62/.test(text) ? "cancel" : /\u91cd\u8bd5|\u91cd\u8dd1/.test(text) ? "retry" : /\u5bfc\u51fa|\u4fdd\u5b58.*SOP/.test(text) ? "export" : /\u8fdb\u5ea6|\u505a\u5230\u54ea|\u591a\u5c11/.test(text) ? "inspect" : "review";
  const messageText = plan ? "\u6211\u5df2\u7ecf\u628a\u76ee\u6807\u62c6\u6210\u53ef\u6267\u884c\u8ba1\u5212\u3002\u8bf7\u5148\u68c0\u67e5\u8282\u70b9\u548c\u53c2\u8003\u8d44\u4ea7\uff0c\u518d\u786e\u8ba4\u6267\u884c\u3002" : sopAgentReply(text, user);
  return {
    message: messageText,
    intent,
    needs_user_input: [],
    plan,
    tool_calls: plan ? [{ tool_id: "sop.plan.create", status: "completed" }] : [],
    risk_flags: plan ? ["\u8ba1\u5212\u786e\u8ba4\u524d\u4e0d\u4f1a\u542f\u52a8\u5916\u90e8\u751f\u6210\u6216\u4ea7\u751f\u4e0d\u53ef\u9006\u526f\u4f5c\u7528"] : [],
    next_action: plan ? "\u68c0\u67e5\u8282\u70b9\u548c\u6743\u5a01\u53c2\u8003\u8d44\u4ea7\uff0c\u7136\u540e\u786e\u8ba4\u5e76\u542f\u52a8" : "\u53ef\u7ee7\u7eed\u8be2\u95ee\u5f53\u524d\u8fdb\u5ea6\u3001\u53c2\u8003\u56fe\u3001\u51c6\u5165\u68c0\u67e5\u6216\u6267\u884c\u63a7\u5236",
    evidence: ["\u5f53\u524d\u7528\u6237\u4f1a\u8bdd", "\u9cb8\u6b4c\u8ba1\u5212 R7 \u9879\u76ee\u72b6\u6001"]
  };
}

function sopAgentReply(message, user) {
  const text = safeText(message, 600);
  if (/\u53c2\u8003\u56fe|\u6743\u5a01\u56fe|\u9996\u5e27|\u8d44\u4ea7/.test(text)) return "\u5f53\u524d\u6700\u5173\u952e\u7684\u662f\u9a8c\u6536 R7 \u56db\u6bb5\u9996\u5e27\u3002\u89d2\u8272\u56fe\u53ea\u9501\u4eba\u7269\u8eab\u4efd\u4e0e\u670d\u88c5\uff0c\u573a\u666f\u56fe\u53ea\u9501\u7a7a\u95f4\u51e0\u4f55\u548c\u5149\u7ebf\u65b9\u5411\uff0c\u9053\u5177\u56fe\u53ea\u9501\u5f62\u72b6\u3001\u6750\u8d28\u4e0e\u72b6\u6001\uff0c\u9996\u5e27\u56fe\u53ea\u9501\u5f53\u524d\u6784\u56fe\u548c\u52a8\u4f5c\u8d77\u70b9\u3002\u5019\u9009\u56fe\u5728\u9a8c\u6536\u524d\u4e0d\u80fd\u4f5c\u4e3a\u6b63\u5f0f\u53c2\u8003\u3002";
  if (/\u51c6\u5165|\u68c0\u67e5|\u653e\u884c/.test(text)) return "\u5f53\u524d\u51c6\u5165\u672a\u901a\u8fc7\uff1a10 \u9879\u68c0\u67e5\u4e2d 8 \u9879\u901a\u8fc7\uff0c\u9996\u5e27\u56fe\u9a8c\u6536\u548c\u89c6\u9891\u751f\u6210\u961f\u5217\u4ecd\u662f\u5f85\u5904\u7406/\u8fdb\u884c\u4e2d\u3002\u5148\u786e\u8ba4\u56db\u6bb5\u9996\u5e27\u7684\u4e3b\u4f53\u4f4d\u7f6e\u3001\u5de6\u53f3\u5173\u7cfb\u548c\u52a8\u4f5c\u8d77\u70b9\uff0c\u518d\u653e\u884c Seedance \u961f\u5217\u3002";
  if (/\u4e0b\u4e00\u6b65|\u63a5\u4e0b\u6765|\u8be5\u505a\u4ec0\u4e48|\u600e\u4e48\u505a/.test(text)) return "\u4e0b\u4e00\u6b65\u53ea\u505a\u4e00\u4ef6\u4e8b\uff1a\u9a8c\u6536\u56db\u6bb5\u9996\u5e27\uff0c\u5e76\u4e3a\u6bcf\u6bb5\u5199\u6e05 @\u56fe \u7684\u804c\u8d23\u548c\u7981\u6b62\u7ee7\u627f\u9879\u3002\u5b8c\u6210\u540e\u91cd\u65b0\u8fd0\u884c\u751f\u4ea7\u51c6\u5165\u68c0\u67e5\uff0c\u518d\u542f\u52a8\u4e09\u5e76\u53d1\u89c6\u9891\u751f\u6210\u3002";
  if (/\u8fdb\u5ea6|\u505a\u5230\u54ea|\u591a\u5c11/.test(text)) return "\u300a\u9cb8\u6b4c\u8ba1\u5212\u300b R7 \u5f53\u524d\u603b\u8fdb\u5ea6 64%\u3002\u5267\u672c\u5206\u955c\u5df2\u9501\u5b9a\uff0c\u53c2\u8003\u56fe 82%\uff0c\u62bd\u5361 68%\uff0c\u89c6\u9891\u63d0\u793a\u8bcd 76%\uff0cSeedance 42%\uff0c\u58f0\u97f3\u526a\u8f91 18%\u3002";
  if (/\u63d0\u793a\u8bcd|\u751f\u89c6\u9891|seedance/.test(text)) return "\u63d0\u793a\u8bcd\u6309\u56db\u6bb5\u72ec\u7acb 30 \u79d2\u5355\u5143\u7f16\u8bd1\uff1a\u53ea\u5199\u6709\u6765\u6e90\u3001\u80fd\u88ab\u6444\u5f71\u673a\u770b\u5230\u7684\u4e8b\u5b9e\uff1b\u955c\u5934\u53d8\u5316\u7528\u201c\u573a\u666f\u4e00\u3001\u573a\u666f\u4e8c\u201d\u8868\u8fbe\uff1b\u5bf9\u767d\u9010\u5b57\u9501\u5b9a\uff1b\u4e0d\u8865\u9020\u89d2\u8272\u3001\u9053\u5177\u3001\u5730\u70b9\u6216\u5b57\u5e55\u3002";
  return `\u6211\u5df2\u8bfb\u5230\u4f60\u7684\u95ee\u9898\u3002${user?.displayName ? `${user.displayName}\uff0c` : ""}\u5f53\u524d\u9879\u76ee\u7684\u6700\u77ed\u8def\u5f84\u662f\u5148\u9a8c\u6536\u56db\u6bb5\u9996\u5e27\uff0c\u518d\u505a\u51c6\u5165\u68c0\u67e5\uff0c\u6700\u540e\u4fdd\u6301\u4e09\u5e76\u53d1\u8fdb\u5165\u89c6\u9891\u751f\u6210\u3002\u4f60\u53ef\u4ee5\u76f4\u63a5\u95ee\u6211\u201c\u4e0b\u4e00\u6b65\u201d\u201c\u53c2\u8003\u56fe\u201d\u201c\u51c6\u5165\u68c0\u67e5\u201d\u6216\u201c\u5f53\u524d\u8fdb\u5ea6\u201d\u3002`;
}

async function mascotTts(request, response) {
  if (!mimoApiKey) throw new HttpError(503, "Mimo TTS ????");
  const body = await requestBody(request);
  const text = safeText(body.text, 1200);
  const voice = safeText(body.voice || "Chloe", 80) || "Chloe";
  if (!text) throw new HttpError(400, "?????????");
  const upstream = await fetch("https://api.xiaomimimo.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${mimoApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: mimoTtsModel, messages: [
      { role: "user", content: "????????????????????????????" },
      { role: "assistant", content: text }
    ], audio: { format: "wav", voice } })
  });
  let result = null;
  try { result = await upstream.json(); } catch { result = null; }
  if (!upstream.ok) {
    console.error("Mascot TTS upstream failed", { status: upstream.status });
    throw new HttpError(502, "Mimo TTS ?????");
  }
  const encoded = result?.choices?.[0]?.message?.audio?.data;
  if (!encoded) throw new HttpError(502, "Mimo ?????");
  const audio = Buffer.from(encoded, "base64");
  response.writeHead(200, { "Content-Type": "audio/wav", "Content-Length": String(audio.length), "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
  response.end(audio);
}

async function api(request, response, pathname) {
  if (request.method === "POST" && pathname === "/api/mascot/tts") return mascotTts(request, response);
  const user = await sessionFor(request);
  if (pathname.startsWith("/api/codexfast/") || pathname.startsWith("/api/internal/codexfast/")) {
    try {
      return await handleCodexFastApi({
        request, response, pathname, user, database, requestBody, sendJson, persist, recordAudit,
        loadObject: async (key) => {
          const object = await r2Request("GET", key);
          return Buffer.from(await object.Body.transformToByteArray());
        }
      });
    } catch (error) {
      if (error?.status) throw new HttpError(error.status, error.message);
      throw error;
    }
  }
  if (request.method === "GET" && pathname === "/api/sop/voice/capabilities") {
    requireUser(user);
    return sendJson(response, 200, {
      input: { browserSpeechRecognition: true, upload: false, provider: voiceProviderConfig().stt.mode, configured: voiceProviderConfig().stt.configured },
      output: { browserSpeechSynthesis: true, streaming: voiceProviderConfig().tts.configured, provider: voiceProviderConfig().tts.mode, configured: voiceProviderConfig().tts.configured },
      realtime: { streaming: voiceProviderConfig().realtime.configured, provider: voiceProviderConfig().realtime.mode, configured: voiceProviderConfig().realtime.configured },
      viseme: { mode: voiceProviderConfig().viseme.mode === "provider" ? "provider-timeline" : "approximate", provider: voiceProviderConfig().viseme.mode, supported: true, configured: voiceProviderConfig().viseme.configured },
      interruption: { supported: true, mode: voiceProviderConfig().realtime.configured ? "provider-interrupt" : "client-cancel" },
      fallback: "text"
    });
  }
  if (request.method === "GET" && pathname === "/api/sop/state") {
    requireUser(user);
    return sendJson(response, 200, sopStatePayload(user));
  }
  if (request.method === "POST" && pathname === "/api/sop/agent") {
    const account = requireUser(user);
    const body = await requestBody(request);
    const message = requiredText(body.message, "\u95ee\u9898", 4000);
    const planRun = workflowPlanFromMessage(message, account);
    if (planRun) {
      await persist();
      return sendJson(response, 200, { ...sopAgentResponse(message, account, workflowPublicRun(planRun)), generatedAt: now() });
    }
    return sendJson(response, 200, { ...sopAgentResponse(message, account), generatedAt: now() });
  }
  if (request.method === "POST" && pathname === "/api/sop/runs/plan") {
    const account = requireUser(user);
    const body = await requestBody(request);
    const goal = requiredText(body.goal, "??", 4000);
    const run = createWorkflowRun(account, goal, body.projectId);
    await persist();
    return sendJson(response, 201, { run: workflowPublicRun(run) });
  }
  const workflowRunMatch = pathname.match(/^\/api\/sop\/runs\/([^/]+)$/);
  if (request.method === "GET" && workflowRunMatch) {
    const account = requireUser(user);
    const run = workflowRunFor(account, workflowRunMatch[1]);
    return sendJson(response, 200, { run: workflowPublicRun(run), events: workflowEventsFor(run.id) });
  }
  const workflowEventsMatch = pathname.match(/^\/api\/sop\/runs\/([^/]+)\/events$/);
  if (request.method === "GET" && workflowEventsMatch) {
    const account = requireUser(user);
    const run = workflowRunFor(account, workflowEventsMatch[1]);
    return sendJson(response, 200, { events: workflowEventsFor(run.id) });
  }
  const workflowArtifactsMatch = pathname.match(/^\/api\/sop\/runs\/([^/]+)\/artifacts$/);
  if (request.method === "GET" && workflowArtifactsMatch) {
    const account = requireUser(user);
    const run = workflowRunFor(account, workflowArtifactsMatch[1]);
    return sendJson(response, 200, { artifacts: workflowArtifactsFor(run.id) });
  }
  const workflowActionMatch = pathname.match(/^\/api\/sop\/runs\/([^/]+)\/(approve|start|pause|resume|cancel|retry)$/);
  if (request.method === "POST" && workflowActionMatch) {
    const account = requireUser(user);
    const run = workflowRunFor(account, workflowActionMatch[1]);
    const action = workflowActionMatch[2];
    if (action === "approve") { run.approvedAt = now(); run.status = "queued"; database.workflowApprovals.unshift({ id: id("wf-approval"), runId: run.id, userId: account.id, approvedAt: run.approvedAt }); appendWorkflowEvent(run, "run.approved", { userId: account.id }); startWorkflowRun(run); }
    else if (action === "start") startWorkflowRun(run);
    else if (action === "pause") { if (["completed", "cancelled"].includes(run.status)) throw new HttpError(409, "当前运行不能再次启动"); run.status = "paused"; appendWorkflowEvent(run, "run.paused", {}); }
    else if (action === "resume") { if (run.status !== "paused") throw new HttpError(409, "当前运行不在暂停状态"); run.status = "queued"; appendWorkflowEvent(run, "run.resumed", {}); void workflowTick(); }
    else if (action === "cancel") { run.status = "cancelled"; for (const node of workflowNodesFor(run.id)) if (["queued", "retrying"].includes(node.status)) node.status = "cancelled"; appendWorkflowEvent(run, "run.cancelled", {}); }
    else if (action === "retry") { if (!["failed", "cancelled"].includes(run.status)) throw new HttpError(409, "当前运行不能重试"); for (const node of workflowNodesFor(run.id)) if (["failed", "cancelled"].includes(node.status)) { node.status = "queued"; node.error = null; } run.status = "queued"; appendWorkflowEvent(run, "run.retrying", {}); void workflowTick(); }
    run.updatedAt = now(); await persist(); void workflowTick();
    return sendJson(response, 200, { run: workflowPublicRun(run) });
  }
  const workflowNodeActionMatch = pathname.match(/^\/api\/sop\/runs\/([^/]+)\/nodes\/([^/]+)\/(retry|rerun)$/);
  if (request.method === "POST" && workflowNodeActionMatch) {
    const account = requireUser(user);
    const run = workflowRunFor(account, workflowNodeActionMatch[1]);
    const node = workflowNodesFor(run.id).find((entry) => entry.id === workflowNodeActionMatch[2]);
    if (!node) throw new HttpError(404, "工作流节点不存在");
    node.status = "queued"; node.error = null; node.output = null; node.completedAt = null; run.status = "queued"; appendWorkflowEvent(run, "node.rerun", { nodeId: node.id }); await persist(); void workflowTick();
    return sendJson(response, 200, { run: workflowPublicRun(run) });
  }
  if (request.method === "GET" && pathname === "/api/bootstrap") {
    const admin = user?.role === "admin" ? {
      submissions: database.submissions.filter((submission) => submission.status === "待审核").sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      reports: database.reports.filter((report) => report.status === "待处理").sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 100),
      audit: database.auditLog.slice(0, 20),
      analytics: analyticsSummary(),
      topicResponses: database.topicResponses.filter((entry) => entry.status === "待审核"),
      creatorStories: database.creatorStories.filter((entry) => entry.status === "待审核"),
      publishedCreatorStories: database.creatorStories.filter((entry) => entry.status === "已通过").slice(0, 100),
      hiddenCreatorStories: database.creatorStories.filter((entry) => entry.status === "已隐藏").slice(0, 100)
    } : null;
    return sendJson(response, 200, { data: publicData(), capabilities: { uploads: r2Configured(), emailDelivery: smtpConfigured(), analytics: true, errorMonitoring: Boolean(sentry) }, user: user ? publicUser(user) : null, setupRequired: false, authNotice: !hasAdmin() ? "当前临时 SOP 不开放管理员初始化，请使用正式 ANS 账户系统。" : "", me: user ? { email: user.email, emailVerified: Boolean(user.emailVerifiedAt), profile: ownerProfileFor(user.id), drafts: userDrafts(user), submissions: userSubmissions(user), apiKeys: database.apiKeys.filter((key) => key.userId === user.id && !key.revokedAt).map(({ id: keyId, label, createdAt, lastUsedAt }) => ({ id: keyId, label, createdAt, lastUsedAt })) } : null, admin, codexfast: codexFastBootstrap(database, user) });
  }
  if (request.method === "GET" && pathname === "/api/public/playbooks") return sendJson(response, 200, { tutorials: database.tutorials });
  if (request.method === "GET" && pathname === "/api/topics/current") return sendJson(response, 200, { topic: publicTopic(currentTopic()) });
  const topicMatch = pathname.match(/^\/api\/topics\/([^/]+)$/);
  if (request.method === "GET" && topicMatch) {
    const topic = database.topics.find((entry) => entry.slug === topicMatch[1] && entry.status !== "归档");
    if (!topic) throw new HttpError(404, "话题不存在");
    return sendJson(response, 200, { topic: publicTopic(topic) });
  }
  const topicResponseMatch = pathname.match(/^\/api\/topics\/([^/]+)\/responses$/);
  if (request.method === "POST" && topicResponseMatch) {
    const account = requireUser(user);
    enforceSubmissionRateLimit(request, pathname);
    const topic = database.topics.find((entry) => entry.slug === topicResponseMatch[1] && entry.status === "公开");
    if (!topic) throw new HttpError(404, "当前话题不存在或未开放");
    const body = await requestBody(request);
    const stance = requiredText(body.stance, "回应立场", 20);
    if (!topicStances.has(stance)) throw new HttpError(400, "回应立场无效");
    const rawResponse = typeof body.body === "string" ? body.body.trim() : "";
    if (Array.from(rawResponse).length > 280) throw new HttpError(400, "回应不能超过 280 字");
    const responseBody = requiredText(rawResponse, "回应内容", 280);
    const existing = database.topicResponses.find((entry) => entry.topicSlug === topic.slug && entry.authorId === account.id);
    const payload = { stance, body: responseBody, uploadIds: uploadIdsFor(body, account), status: "待审核", updatedAt: now() };
    if (existing) Object.assign(existing, payload);
    else database.topicResponses.unshift({ id: id("topic-response"), topicSlug: topic.slug, authorId: account.id, author: account.displayName, createdAt: now(), ...payload });
    recordAudit(existing ? "topic_response.updated" : "topic_response.created", account, { topicSlug: topic.slug, responseId: existing?.id || database.topicResponses[0].id });
    recordAnalyticsEvent("topic_response_submitted");
    await persist();
    return sendJson(response, existing ? 200 : 201, { response: existing || database.topicResponses[0] });
  }
  if (request.method === "POST" && pathname === "/api/profiles/me") {
    const account = requireUser(user);
    const body = await requestBody(request);
    const payload = profilePayload(body, account);
    const existing = database.publicProfiles.find((entry) => entry.userId === account.id);
    if (existing) Object.assign(existing, payload);
    else database.publicProfiles.push({ id: id("profile"), userId: account.id, createdAt: now(), ...payload });
    recordAudit(existing ? "profile.updated" : "profile.created", account, { slug: payload.slug, isPublic: payload.isPublic });
    await persist();
    return sendJson(response, 200, { profile: publicProfileFor(account.id) || { ...payload, isPublic: false } });
  }
  if (request.method === "POST" && pathname === "/api/analytics/events") {
    enforceRateLimit(request, "analytics", pathname, analyticsRateLimit, analyticsRateWindowMs, analyticsAttempts);
    const body = await requestBody(request);
    const event = requiredText(body.event, "统计事件", 80);
    if (!clientAnalyticsEvents.has(event)) throw new HttpError(400, "不支持的统计事件");
    const campaign = event === "campaign_landing" ? campaignName(body.campaign) : "";
    recordAnalyticsEvent(event, "", campaign);
    await persist();
    return sendJson(response, 202, { ok: true });
  }
  if (request.method === "POST" && pathname === "/api/client-errors") {
    enforceClientErrorRateLimit(request, pathname);
    const body = await requestBody(request);
    const type = requiredText(body.type, "错误类型", 40);
    if (!new Set(["error", "unhandledrejection"]).has(type)) throw new HttpError(400, "不支持的错误类型");
    const message = requiredText(body.message, "错误信息", 1000);
    const browserError = new Error(redactTelemetry(message, 1000));
    browserError.name = type === "unhandledrejection" ? "UnhandledPromiseRejection" : "BrowserError";
    const stack = safeText(body.stack, 7000);
    if (stack) browserError.stack = redactTelemetry(stack, 7000);
    void captureException(browserError, { source: "browser", pathname: safeText(body.pathname, 300), client_type: type });
    return sendJson(response, 202, { ok: true, delivered: Boolean(sentry) });
  }
  if (request.method === "POST" && pathname === "/api/uploads") {
    const account = requireUser(user);
    enforceSubmissionRateLimit(request, pathname);
    const contentType = String(request.headers["content-type"] || "").split(";", 1)[0].trim().toLowerCase();
    const extension = allowedUploadTypes.get(contentType);
    if (!extension) throw new HttpError(415, "仅支持 JPG、PNG、WebP 或 PDF 文件");
    const content = await requestBuffer(request);
    const upload = { id: id("upload"), ownerId: account.id, name: safeFilename(request.headers["x-ans-filename"]), contentType, size: content.length, key: "", createdAt: now() };
    upload.key = `uploads/${account.id}/${upload.id}${extension}`;
    await r2Request("PUT", upload.key, content, contentType);
    database.uploads.unshift(upload);
    recordAudit("upload.created", account, { uploadId: upload.id, contentType, size: upload.size });
    await persist();
    return sendJson(response, 201, { upload: uploadMetadata(upload) });
  }
  if (request.method === "POST" && pathname === "/api/auth/setup") {
    throw new HttpError(410, "临时 SOP 不提供管理员初始化，请使用正式 ANS 账户系统");
  }
  if (request.method === "POST" && pathname === "/api/auth/register") {
    const body = await requestBody(request);
    const displayName = requiredText(body.displayName, "公开名称", 60);
    const email = requiredText(body.email, "邮箱", 160).toLowerCase();
    const password = requiredText(body.password, "密码", 200);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "请输入有效邮箱");
    if (password.length < 10) throw new HttpError(400, "密码至少需要 10 位");
    if (database.users.some((entry) => entry.email === email)) throw new HttpError(409, "这个邮箱已经注册");
    const userRecord = { id: id("user"), displayName, email, passwordHash: await passwordHash(password), role: "member", emailVerifiedAt: smtpConfigured() ? null : now(), createdAt: now() };
    database.users.push(userRecord);
    recordAudit("member.registered", userRecord);
    recordAnalyticsEvent("signup_completed");
    const session = await createSession(userRecord);
    if (smtpConfigured()) {
      try { await deliverEmailAction("verify", userRecord); } catch (error) { console.error("Registration verification email failed", { userId: userRecord.id, name: error?.name }); }
    }
    return sendJson(response, 201, { user: publicUser(userRecord), verificationEmailSent: smtpConfigured() }, { "Set-Cookie": sessionCookie(session.token, session.expiresAt) });
  }
  if (request.method === "POST" && pathname === "/api/auth/request-email-verification") {
    const account = requireUser(user);
    if (account.emailVerifiedAt) return sendJson(response, 200, { ok: true, alreadyVerified: true });
    await deliverEmailAction("verify", account);
    recordAudit("email_verification.requested", account);
    await persist();
    return sendJson(response, 200, { ok: true });
  }
  if (request.method === "POST" && pathname === "/api/auth/verify-email") {
    const body = await requestBody(request);
    const token = requiredText(body.token, "验证令牌", 200);
    const record = emailTokenFor("verify", token);
    if (!record) throw new HttpError(400, "验证链接无效或已过期");
    const account = database.users.find((entry) => entry.id === record.userId);
    if (!account) throw new HttpError(400, "验证链接无效或已过期");
    account.emailVerifiedAt = now();
    database.emailTokens = database.emailTokens.filter((entry) => entry.id !== record.id);
    recordAudit("email_verification.completed", account);
    recordAnalyticsEvent("email_verified");
    await persist();
    const session = await createSession(account);
    return sendJson(response, 200, { user: publicUser(account) }, { "Set-Cookie": sessionCookie(session.token, session.expiresAt) });
  }
  if (request.method === "POST" && pathname === "/api/auth/request-password-reset") {
    if (!smtpConfigured()) throw new HttpError(503, "邮件服务尚未配置");
    const body = await requestBody(request);
    const email = requiredText(body.email, "邮箱", 160).toLowerCase();
    const account = database.users.find((entry) => entry.email === email);
    if (account) {
      await deliverEmailAction("reset", account);
      recordAudit("password_reset.requested", account);
      await persist();
    }
    return sendJson(response, 200, { ok: true });
  }
  if (request.method === "POST" && pathname === "/api/auth/reset-password") {
    const body = await requestBody(request);
    const token = requiredText(body.token, "重设令牌", 200);
    const password = requiredText(body.password, "密码", 200);
    if (password.length < 10) throw new HttpError(400, "密码至少需要 10 位");
    const record = emailTokenFor("reset", token);
    if (!record) throw new HttpError(400, "重设链接无效或已过期");
    const account = database.users.find((entry) => entry.id === record.userId);
    if (!account) throw new HttpError(400, "重设链接无效或已过期");
    account.passwordHash = await passwordHash(password);
    database.sessions = database.sessions.filter((entry) => entry.userId !== account.id);
    database.emailTokens = database.emailTokens.filter((entry) => entry.id !== record.id);
    recordAudit("password_reset.completed", account);
    await persist();
    const session = await createSession(account);
    return sendJson(response, 200, { user: publicUser(account) }, { "Set-Cookie": sessionCookie(session.token, session.expiresAt) });
  }
  if (request.method === "POST" && pathname === "/api/auth/login") {
    const body = await requestBody(request);
    const email = requiredText(body.email, "邮箱", 160).toLowerCase();
    const password = requiredText(body.password, "密码", 200);
    const userRecord = database.users.find((entry) => entry.email === email);
    if (!userRecord || !(await passwordMatches(password, userRecord.passwordHash))) throw new HttpError(401, "邮箱或密码不正确");
    const session = await createSession(userRecord);
    return sendJson(response, 200, { user: publicUser(userRecord) }, { "Set-Cookie": sessionCookie(session.token, session.expiresAt) });
  }
  if (request.method === "POST" && pathname === "/api/auth/logout") {
    const token = parseCookies(request).ans_session;
    if (token) { database.sessions = database.sessions.filter((session) => session.tokenHash !== hashToken(token)); await persist(); }
    return sendJson(response, 200, { ok: true }, { "Set-Cookie": clearedSessionCookie() });
  }
  if (request.method === "POST" && pathname === "/api/keys") {
    const account = requireUser(user);
    const body = await requestBody(request);
    const token = `ans_live_${randomBytes(24).toString("base64url")}`;
    database.apiKeys.push({ id: id("key"), userId: account.id, label: safeText(body.label, 80) || "ANS integration", tokenHash: hashToken(token), createdAt: now(), lastUsedAt: null, revokedAt: null });
    recordAudit("api_key.created", account);
    recordAnalyticsEvent("api_key_created");
    await persist();
    return sendJson(response, 201, { key: token });
  }
  const revokeKeyMatch = pathname.match(/^\/api\/keys\/([^/]+)$/);
  if (request.method === "DELETE" && revokeKeyMatch) {
    const account = requireUser(user);
    const key = database.apiKeys.find((entry) => entry.id === revokeKeyMatch[1] && entry.userId === account.id && !entry.revokedAt);
    if (!key) throw new HttpError(404, "可撤销的 Key 不存在");
    key.revokedAt = now();
    recordAudit("api_key.revoked", account, { keyId: key.id });
    await persist();
    return sendJson(response, 200, { ok: true });
  }
  if (request.method === "POST" && pathname === "/api/integrations/tutorial-drafts") {
    const { key, user: account } = requireApiKey(request);
    const body = await requestBody(request);
    const draft = { id: id("draft"), authorId: account.id, status: "草稿", title: requiredText(body.title, "手册标题", 160), summary: requiredText(body.summary, "手册说明"), steps: requiredText(body.steps, "实现流程", 8000), updatedAt: now(), updated: "刚刚", integrationKeyId: key.id };
    database.drafts.unshift(draft);
    recordAudit("integration.draft_created", account, { draftId: draft.id, keyId: key.id });
    await persist();
    return sendJson(response, 201, { draft });
  }
  if (request.method === "POST" && pathname === "/api/submissions") {
    const account = requireUser(user);
    enforceSubmissionRateLimit(request, pathname);
    const submission = sanitizeSubmission(await requestBody(request), account);
    database.submissions.unshift(submission);
    recordAudit("submission.created", account, { submissionId: submission.id, type: submission.type });
    recordAnalyticsEvent("submission_created", submission.type);
    await persist();
    return sendJson(response, 201, { submission });
  }
  if (request.method === "POST" && pathname === "/api/admin/creator-stories") {
    const account = requireAdmin(user);
    enforceSubmissionRateLimit(request, pathname);
    const story = storyPayload(await requestBody(request), account);
    database.creatorStories.unshift(story);
    recordAudit("creator_story.created", account, { storyId: story.id });
    await persist();
    return sendJson(response, 201, { story });
  }
  const storyReviewMatch = pathname.match(/^\/api\/admin\/creator-stories\/([^/]+)\/review$/);
  if (request.method === "POST" && storyReviewMatch) {
    const account = requireAdmin(user);
    const body = await requestBody(request);
    const story = database.creatorStories.find((entry) => entry.id === storyReviewMatch[1]);
    if (!story || story.status !== "待审核") throw new HttpError(404, "待审核实录不存在");
    if (body.result === "approve") story.status = "已通过";
    else if (body.result === "reject") { story.status = "未通过"; story.reviewNote = requiredText(body.reason, "拒绝原因", 500); }
    else throw new HttpError(400, "审核结果无效");
    story.updatedAt = now();
    recordAudit(body.result === "approve" ? "creator_story.approved" : "creator_story.rejected", account, { storyId: story.id });
    await persist();
    return sendJson(response, 200, { story });
  }
  const storyVisibilityMatch = pathname.match(/^\/api\/admin\/creator-stories\/([^/]+)\/visibility$/);
  if (request.method === "POST" && storyVisibilityMatch) {
    const account = requireAdmin(user);
    const body = await requestBody(request);
    const story = database.creatorStories.find((entry) => entry.id === storyVisibilityMatch[1]);
    if (!story) throw new HttpError(404, "创作者实录不存在");
    if (body.action === "hide") {
      if (story.status !== "已通过") throw new HttpError(409, "只有已公开实录可以隐藏");
      story.status = "已隐藏";
      story.reviewNote = safeText(body.reason, 500) || "编辑去重或下线";
      story.hiddenAt = now();
      story.hiddenBy = account.id;
      recordAudit("creator_story.hidden", account, { storyId: story.id });
    } else if (body.action === "restore") {
      if (story.status !== "已隐藏") throw new HttpError(409, "只有已隐藏实录可以恢复");
      story.status = "已通过";
      story.reviewNote = "";
      story.hiddenAt = "";
      story.hiddenBy = "";
      recordAudit("creator_story.restored", account, { storyId: story.id });
    } else {
      throw new HttpError(400, "实录可见性操作无效");
    }
    story.updatedAt = now();
    await persist();
    return sendJson(response, 200, { story });
  }
  const topicResponseReviewMatch = pathname.match(/^\/api\/admin\/topic-responses\/([^/]+)\/review$/);
  if (request.method === "POST" && topicResponseReviewMatch) {
    const account = requireAdmin(user);
    const body = await requestBody(request);
    const topicResponse = database.topicResponses.find((entry) => entry.id === topicResponseReviewMatch[1]);
    if (!topicResponse || topicResponse.status !== "待审核") throw new HttpError(404, "待审核回应不存在");
    if (body.result === "approve") topicResponse.status = "已通过";
    else if (body.result === "reject") { topicResponse.status = "未通过"; topicResponse.reviewNote = requiredText(body.reason, "拒绝原因", 500); }
    else throw new HttpError(400, "审核结果无效");
    topicResponse.updatedAt = now();
    recordAudit(body.result === "approve" ? "topic_response.approved" : "topic_response.rejected", account, { responseId: topicResponse.id, topicSlug: topicResponse.topicSlug });
    await persist();
    return sendJson(response, 200, { response: topicResponse });
  }
  if (request.method === "POST" && pathname === "/api/drafts") {
    const account = requireUser(user);
    const body = await requestBody(request);
    const draftId = safeText(body.id, 100);
    const draft = draftId ? database.drafts.find((entry) => entry.id === draftId && entry.authorId === account.id) : null;
    const payload = { title: requiredText(body.title, "手册标题", 160), summary: requiredText(body.summary, "手册说明"), steps: requiredText(body.steps, "实现流程", 8000), updatedAt: now(), updated: "刚刚" };
    if (draft) Object.assign(draft, payload);
    else database.drafts.unshift({ id: id("draft"), authorId: account.id, status: "草稿", ...payload });
    recordAudit(draft ? "draft.updated" : "draft.created", account, { draftId: draft?.id || database.drafts[0].id });
    await persist();
    return sendJson(response, 200, { draft: draft || database.drafts[0] });
  }
  const reviewMatch = pathname.match(/^\/api\/admin\/submissions\/([^/]+)\/review$/);
  if (request.method === "POST" && reviewMatch) {
    requireAdmin(user);
    const body = await requestBody(request);
    const submission = database.submissions.find((entry) => entry.id === reviewMatch[1]);
    if (!submission || submission.status !== "待审核") throw new HttpError(404, "待审核内容不存在");
    if (body.result === "approve") { publishSubmission(submission); recordAnalyticsEvent("submission_approved", submission.type); }
    else if (body.result === "reject") { submission.status = "未通过"; submission.reviewNote = requiredText(body.reason, "拒绝原因", 500); }
    else throw new HttpError(400, "审核结果无效");
    recordAudit(body.result === "approve" ? "submission.approved" : "submission.rejected", user, { submissionId: submission.id, type: submission.type });
    await persist();
    return sendJson(response, 200, { submission });
  }
  if (request.method === "POST" && pathname === "/api/reports") {
    const account = requireUser(user);
    const body = await requestBody(request);
    const type = safeText(body.type, 30);
    const targetId = safeText(body.targetId, 100);
    const target = ({ idea: database.ideas, project: database.projects, help: database.help, tutorial: database.tutorials })[type]?.find((entry) => entry.id === targetId);
    if (!target) throw new HttpError(404, "要举报的公开内容不存在");
    if (database.reports.some((report) => report.reporterId === account.id && report.type === type && report.targetId === targetId && report.status === "待处理")) throw new HttpError(409, "你已经提交过这条举报");
    const report = { id: id("report"), reporterId: account.id, reporter: account.displayName, type, targetId, targetTitle: target.title, reason: requiredText(body.reason, "举报原因", 600), status: "待处理", createdAt: now() };
    database.reports.unshift(report);
    recordAudit("report.created", account, { reportId: report.id, type, targetId });
    await persist();
    return sendJson(response, 201, { report: { id: report.id, status: report.status } });
  }
  const resolveReportMatch = pathname.match(/^\/api\/admin\/reports\/([^/]+)\/resolve$/);
  if (request.method === "POST" && resolveReportMatch) {
    const account = requireAdmin(user);
    const report = database.reports.find((entry) => entry.id === resolveReportMatch[1] && entry.status === "待处理");
    if (!report) throw new HttpError(404, "待处理举报不存在");
    report.status = "已处理";
    report.resolvedAt = now();
    report.resolvedBy = account.id;
    recordAudit("report.resolved", account, { reportId: report.id });
    await persist();
    return sendJson(response, 200, { report });
  }
  throw new HttpError(404, "接口不存在");
}

async function serveMedia(request, response, uploadId) {
  const upload = database.uploads.find((entry) => entry.id === uploadId);
  if (!upload || !uploadIsPublic(upload)) throw new HttpError(404, "附件不存在");
  const object = await r2Request("GET", upload.key);
  const content = Buffer.from(await object.Body.transformToByteArray());
  response.writeHead(200, {
    "Content-Type": upload.contentType,
    "Content-Length": content.length,
    "Cache-Control": "public, max-age=86400",
    "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(upload.name)}`,
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "same-origin"
  });
  response.end(content);
}

function htmlEscape(value = "") { return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character])); }
function publicPageMetadata(pathname) {
  const defaultMetadata = { title: "ANS · AI Never Stop", description: "AI 原生创作者公开记录作品、判断与协作机会的地方。", indexable: true, type: "website" };
  const pages = {
    "/wall": { title: "今天，有人在用 AI 做什么？", description: "不刷工具新闻，只看 AI 创作者的作品、卡点、失败过程和协作机会。" },
    "/projects": { title: "共创项目", description: "公开记录正在推进的 AI 项目、协作邀请与下一步。" },
    "/help": { title: "能力交换", description: "把需要与能提供的能力写清楚，让 AI 协作从具体的边界开始。" },
    "/tutorials": { title: "行动手册", description: "阅读经过实践的 AI 工作流、验证方法与可复用的行动路径。" },
    "/about": { title: "关于 ANS", description: "了解 AI Never Stop 如何让想法、方法和协作在公开网络中持续流动。" },
    "/privacy": { title: "隐私说明", description: "了解 ANS 如何以最小化方式处理账号、公开内容与聚合访问统计。" },
    "/codexfast": { title: "ANS CodexFast", description: "从真实需求到可验证预览：规格、受控实现、测试与人工验收进入同一条项目交付链。" },
    "/codexfast/apply": { title: "申请 ANS CodexFast 内测", description: "提交一个真实的获客官网项目，获得有边界的项目诊断。" }
  };
  if (pages[pathname]) return { ...defaultMetadata, ...pages[pathname] };
  const segments = pathname.split("/").filter(Boolean);
  const itemFor = (collection, key) => collection.find((entry) => entry.id === key);
  if (segments[0] === "ideas" && segments[1]) {
    const item = itemFor(database.ideas, segments[1]);
    return item ? { title: item.title, description: item.body, indexable: true, type: "article" } : { ...defaultMetadata, indexable: false };
  }
  if (segments[0] === "projects" && segments[1]) {
    const item = itemFor(database.projects, segments[1]);
    return item ? { title: item.title, description: item.summary, indexable: true, type: "article" } : { ...defaultMetadata, indexable: false };
  }
  if (segments[0] === "tutorials" && segments[1]) {
    const item = itemFor(database.tutorials, segments[1]);
    return item ? { title: item.title, description: item.summary, indexable: true, type: "article" } : { ...defaultMetadata, indexable: false };
  }
  if (segments[0] === "topics" && segments[1]) {
    const topic = database.topics.find((entry) => entry.slug === segments[1] && entry.status === "公开");
    return topic ? { title: topic.title, description: topic.statement, indexable: true, type: "article" } : { ...defaultMetadata, indexable: false };
  }
  if (segments[0] === "stories" && segments[1]) {
    const story = database.creatorStories.find((entry) => entry.id === segments[1] && entry.status === "已通过");
    return story ? { title: story.hook, description: story.problem, indexable: true, type: "article" } : { ...defaultMetadata, indexable: false };
  }
  if (segments[0] === "people" && segments[1]) {
    const profile = database.publicProfiles.find((entry) => entry.slug === segments[1] && entry.isPublic);
    return profile ? { title: profile.displayName, description: profile.bio || "ANS 创作者的公开记录。", indexable: true, type: "profile" } : { ...defaultMetadata, indexable: false };
  }
  if (["/auth", "/me", "/admin", "/skill-distribution"].includes(pathname) || segments[0] === "submit" || segments[0] === "from" || pathname.startsWith("/codexfast/studio") || pathname.startsWith("/admin/codexfast")) return { ...defaultMetadata, indexable: false };
  return pathname === "/" ? defaultMetadata : { ...defaultMetadata, indexable: false };
}
function replaceMetaContent(html, id, value) {
  const expression = new RegExp(`(<meta\\b[^>]*\\bid="${id}"[^>]*\\bcontent=")[^"]*(")`, "i");
  return html.replace(expression, `$1${htmlEscape(value)}$2`);
}
function renderIndexHtml(request, pathname) {
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";
  const metadata = publicPageMetadata(normalizedPath);
  const title = metadata.title === "ANS · AI Never Stop" ? metadata.title : `${metadata.title} | ANS`;
  const origin = publicOrigin || `http://${request.headers.host || `${host}:${port}`}`;
  const canonical = `${origin}${normalizedPath}`;
  let html = readFileSync(join(root, "index.html"), "utf8")
    .replace(/<title>[^<]*<\/title>/i, `<title>${htmlEscape(title)}</title>`)
    .replace(/(<link\b[^>]*\bid="meta-canonical"[^>]*\bhref=")[^"]*(")/i, `$1${htmlEscape(canonical)}$2`);
  html = replaceMetaContent(html, "meta-description", metadata.description);
  html = replaceMetaContent(html, "meta-robots", metadata.indexable ? "index,follow" : "noindex,nofollow");
  html = replaceMetaContent(html, "meta-og-title", title);
  html = replaceMetaContent(html, "meta-og-description", metadata.description);
  html = replaceMetaContent(html, "meta-og-url", canonical);
  html = replaceMetaContent(html, "meta-og-image", `${origin}/og-ans.png`);
  html = replaceMetaContent(html, "meta-twitter-title", title);
  html = replaceMetaContent(html, "meta-twitter-description", metadata.description);
  return html.replace("<!-- cloudflare-web-analytics -->", cfAnalyticsSnippet);
}

function staticFile(request, response, pathname) {
  let decoded;
  try { decoded = decodeURIComponent(pathname); } catch { response.writeHead(400).end("Bad request"); return; }
  const requestedPath = decoded === "/" ? "index.html" : decoded.replace(/^[/\\]+/, "");
  const requestedFile = join(root, normalize(requestedPath));
  const isInsideRoot = !relative(root, requestedFile).startsWith("..");
  const filePath = isInsideRoot && !extname(requestedFile) && !existsSync(requestedFile) ? join(root, "index.html") : requestedFile;
  if (!isInsideRoot || !existsSync(filePath)) { response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); response.end("Not found"); return; }
  const extension = extname(filePath);
  const compressible = new Set([".html", ".css", ".js", ".svg", ".txt", ".xml"]).has(extension);
  const useBrotli = compressible && /(?:^|,|\s)br(?:,|\s|$)/i.test(String(request.headers["accept-encoding"] || ""));
  const headers = { "Cache-Control": "no-store", "Content-Security-Policy": "default-src 'self'; script-src 'self' https://static.cloudflareinsights.com; connect-src 'self' https://cloudflareinsights.com; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'", "Referrer-Policy": "same-origin", "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY", ...(process.env.NODE_ENV === "production" ? { "Strict-Transport-Security": "max-age=31536000; includeSubDomains" } : {}), "Content-Type": mimeTypes[extension] || "application/octet-stream" };
  if (!compressible) {
    response.writeHead(200, headers);
    createReadStream(filePath).pipe(response);
    return;
  }
  const body = filePath === join(root, "index.html")
    ? Buffer.from(renderIndexHtml(request, pathname), "utf8")
    : readFileSync(filePath);
  const payload = useBrotli
    ? brotliCompressSync(body, { params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 5 } })
    : body;
  response.writeHead(200, { ...headers, "Content-Length": String(payload.length), ...(useBrotli ? { "Content-Encoding": "br", "Vary": "Accept-Encoding" } : {}) });
  response.end(payload);
}

createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "127.0.0.1"}`);
  try {
    if (request.method === "GET" && url.pathname === "/healthz") sendJson(response, 200, { ok: true });
    else if (request.method === "GET" && url.pathname === "/readyz") sendJson(response, 200, { ok: true, backend: dataBackend, objectStorage: r2Configured() ? "configured" : "not-configured", analytics: cfAnalyticsBeacon ? "configured" : "not-configured", errorMonitoring: sentry ? "configured" : "not-configured", codexfastWorker: String(process.env.CODEXFAST_WORKER_TOKEN || "").length >= 32 && process.env.CODEXFAST_WORKER_IP_ALLOWLIST ? "configured" : "not-configured", codexfastPreview: process.env.CODEXFAST_PREVIEW_ORIGIN ? "configured" : "not-configured" });
    else if (request.method === "GET" && url.pathname === "/sitemap.xml") sendSitemap(response);
    else if (request.method === "GET" && (url.pathname === "/sop" || url.pathname === "/sop/")) {
      const user = await sessionFor(request);
      if (!user) {
        response.writeHead(302, { Location: "/auth?next=/sop", "Cache-Control": "no-store" });
        response.end();
      } else {
        const body = readFileSync(join(root, "sop.html"));
        response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Content-Security-Policy": "default-src 'self'; script-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'", "Referrer-Policy": "same-origin", "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY" });
        response.end(body);
      }
    }
    else if (url.pathname.startsWith("/api/")) {
      if (!/^(GET|HEAD|OPTIONS)$/.test(request.method || "GET")) assertTrustedOrigin(request);
      if (request.method === "POST" && url.pathname.startsWith("/api/auth/")) enforceAuthRateLimit(request, url.pathname);
      await api(request, response, url.pathname);
    }
    else if (request.method === "GET" && url.pathname.startsWith("/media/")) await serveMedia(request, response, safeText(url.pathname.slice("/media/".length), 100));
    else staticFile(request, response, url.pathname);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    if (status === 500) {
      console.error(error);
      void captureException(error, { source: "server", method: request.method || "GET", pathname: url.pathname });
    }
    sendJson(response, status, { error: status === 500 ? "服务暂时不可用，请稍后再试" : error instanceof Error ? error.message : "服务器错误" });
  }
}).listen(port, host, () => {
  console.log(`ANS server running at http://${host}:${port}`);
});
