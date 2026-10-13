import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const ACTIVE_RUN_STATES = new Set(["queued", "leased", "planning", "building", "testing"]);
const ALLOWED_PROJECT_STATUSES = new Set([
  "draft", "scope_draft", "awaiting_scope_approval", "awaiting_run_approval", "queued",
  "planning", "building", "testing", "preview_ready", "awaiting_acceptance", "delivered",
  "failed", "paused", "cancelled", "archived"
]);
const applicationAttempts = new Map();

function sha256(value) { return createHash("sha256").update(String(value)).digest("hex"); }
function publicId(prefix) { return `${prefix}-${randomBytes(9).toString("hex")}`; }
function timestamp() { return new Date().toISOString(); }
function text(value, maximum = 2000) { return typeof value === "string" ? value.trim().slice(0, maximum) : ""; }
function required(value, field, maximum = 2000) {
  const output = text(value, maximum);
  if (!output) { const error = new Error(`${field}不能为空`); error.status = 400; throw error; }
  return output;
}
function clientIp(request) { return String(request.headers["x-forwarded-for"] || request.socket.remoteAddress || "unknown").split(",")[0].trim(); }
function enforceApplicationLimit(request) {
  const key = clientIp(request);
  const cutoff = Date.now() - 60 * 60 * 1000;
  const attempts = (applicationAttempts.get(key) || []).filter((entry) => entry > cutoff);
  if (attempts.length >= 5) { const error = new Error("申请提交过于频繁，请稍后再试"); error.status = 429; throw error; }
  attempts.push(Date.now());
  applicationAttempts.set(key, attempts);
}
function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
}
function assertRunWorker(run, request) {
  const workerId = text(request.headers["x-codexfast-worker-id"], 120);
  if (!workerId || !run.leaseOwner || !safeEqual(workerId, run.leaseOwner)) {
    const error = new Error("运行租约不属于当前 Worker");
    error.status = 409;
    throw error;
  }
}
function activeRun(run) {
  return run && (run.status === "leased" || ACTIVE_RUN_STATES.has(run.status));
}
function sanitizedPlanningSpec(candidate, fallback) {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return fallback;
  const strings = (value, maximumItems, maximumLength) => Array.isArray(value)
    ? value.map((entry) => text(entry, maximumLength)).filter(Boolean).slice(0, maximumItems)
    : [];
  const pages = Array.isArray(candidate.pageSpecs) ? candidate.pageSpecs.slice(0, 10).map((entry) => ({
    page: text(entry?.page, 100),
    objective: text(entry?.objective, 500),
    requiredSections: strings(entry?.requiredSections, 12, 120)
  })).filter((entry) => entry.page) : fallback.pageSpecs;
  return {
    ...fallback,
    summary: text(candidate.summary, 2000) || fallback.summary,
    sitemap: strings(candidate.sitemap, 10, 100).length ? strings(candidate.sitemap, 10, 100) : fallback.sitemap,
    pageSpecs: pages.length ? pages : fallback.pageSpecs,
    contentGaps: strings(candidate.contentGaps, 20, 300),
    technicalPlan: text(candidate.technicalPlan, 3000) || fallback.technicalPlan,
    testPlan: strings(candidate.testPlan, 30, 300),
    acceptanceCriteria: strings(candidate.acceptanceCriteria, 30, 300),
    riskReview: strings(candidate.riskReview, 30, 300)
  };
}

export function hydrateCodexFast(database) {
  database.codexfastApplications ||= [];
  database.codexfastMemberships ||= [];
  database.codexfastProjects ||= [];
  database.codexfastSpecs ||= [];
  database.codexfastRuns ||= [];
  database.codexfastRunEvents ||= [];
  database.codexfastArtifacts ||= [];
  database.codexfastApprovals ||= [];
  database.codexfastPreviewLeases ||= [];
  database.codexfastPublications ||= [];
  database.codexfastInvites ||= [];
  return database;
}

function isMember(database, user) {
  return Boolean(user && (user.role === "admin" || database.codexfastMemberships.some((entry) => entry.userId === user.id && entry.status === "active")));
}
function membershipFor(database, user) {
  if (!user) return null;
  if (user.role === "admin") return { role: "admin", status: "active", projectLimit: 20, concurrentRunLimit: 2 };
  return database.codexfastMemberships.find((entry) => entry.userId === user.id && entry.status === "active") || null;
}
function projectForOwner(database, user, projectId) {
  const project = database.codexfastProjects.find((entry) => entry.id === projectId);
  if (!project || !user || user.role !== "admin" && project.ownerId !== user.id) { const error = new Error("项目不存在"); error.status = 404; throw error; }
  return project;
}
function publicApplication(entry) {
  const { email, ...rest } = entry;
  return { ...rest, emailMasked: email.replace(/^(.{1,2}).*(@.*)$/, "$1***$2") };
}
function publicArtifact(entry) {
  const { r2Key, contentBase64, localPath, ...safe } = entry;
  return { ...safe, downloadUrl: `/api/codexfast/artifacts/${encodeURIComponent(entry.id)}` };
}
function publicProject(database, project) {
  const spec = database.codexfastSpecs.find((entry) => entry.projectId === project.id && entry.version === project.currentSpecVersion) || null;
  const runs = database.codexfastRuns.filter((entry) => entry.projectId === project.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const events = database.codexfastRunEvents.filter((entry) => runs.some((run) => run.id === entry.runId)).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const currentDeliveryRun = runs.find((entry) => entry.kind !== "planning") || null;
  const artifacts = currentDeliveryRun
    ? database.codexfastArtifacts.filter((entry) => entry.projectId === project.id && entry.runId === currentDeliveryRun.id && (project.status === "delivered" || entry.type === "test-report")).map(publicArtifact)
    : [];
  const preview = currentDeliveryRun ? database.codexfastPreviewLeases.find((entry) => entry.projectId === project.id && entry.runId === currentDeliveryRun.id && !entry.revokedAt && Date.parse(entry.expiresAt) > Date.now()) : null;
  const publication = database.codexfastPublications.find((entry) => entry.projectId === project.id) || null;
  return { ...project, spec, runs, events, artifacts, preview: preview ? { url: preview.url, expiresAt: preview.expiresAt } : null, publication };
}

export function codexFastBootstrap(database, user) {
  hydrateCodexFast(database);
  const member = membershipFor(database, user);
  const projects = user ? database.codexfastProjects.filter((entry) => user.role === "admin" || entry.ownerId === user.id).map((entry) => publicProject(database, entry)) : [];
  const admin = user?.role === "admin" ? {
    applications: database.codexfastApplications.map(publicApplication),
    memberships: database.codexfastMemberships,
    projects: database.codexfastProjects.map((entry) => publicProject(database, entry)),
    queuedRuns: database.codexfastRuns.filter((entry) => ACTIVE_RUN_STATES.has(entry.status)),
    runs: database.codexfastRuns.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 100),
    publications: database.codexfastPublications.filter((entry) => entry.status === "pending")
  } : null;
  return { enabled: true, invited: Boolean(member), membership: member, projects, admin };
}

function draftSpec(brief) {
  const pages = text(brief.pages, 1200).split(/[,，\n]/).map((entry) => entry.trim()).filter(Boolean).slice(0, 8);
  const normalizedPages = pages.length ? pages : ["首页", "服务说明", "案例/证据", "联系转化"];
  return {
    summary: `${brief.brand} 将面向 ${brief.audience} 建立一套以“${brief.conversion}”为核心转化的获客官网。`,
    sitemap: normalizedPages,
    pageSpecs: normalizedPages.map((page, index) => ({ page, objective: index === 0 ? `在首屏建立价值认知并引导${brief.conversion}` : `用可验证信息支撑${page}场景`, requiredSections: index === 0 ? ["价值主张", "真实痛点", "交付机制", "行动入口"] : ["核心说明", "证据与边界", "下一步"] })),
    contentGaps: ["真实客户证据需经授权后补充", "品牌素材与正式联系方式需在执行前确认"],
    technicalPlan: "响应式静态获客站；语义化 HTML、原生 CSS/JS、无第三方运行时密钥；私有静态预览。",
    testPlan: ["桌面与移动端无横向溢出", "所有 CTA 指向有效路径", "键盘焦点可见", "表单具备必填校验", "静态资源无 404"],
    acceptanceCriteria: ["页面覆盖锁定站点地图", `主要 CTA 明确指向“${brief.conversion}”`, "1440×900 与 390×844 可用", "交付包含源码、测试报告与已知限制"],
    riskReview: ["禁止编造客户评价、营收、速度或效果数据", "不得公开用户需求、附件、签名链接或模型凭据"]
  };
}

function validateBrief(body) {
  return {
    brand: required(body.brand, "品牌/业务", 120),
    audience: required(body.audience, "目标用户", 500),
    conversion: required(body.conversion, "核心转化", 300),
    pages: required(body.pages, "页面范围", 1200),
    assets: text(body.assets, 1200), references: text(body.references, 1200), constraints: text(body.constraints, 1600),
    forbidden: text(body.forbidden, 1200), privacy: ["private", "case_eligible"].includes(body.privacy) ? body.privacy : "private"
  };
}
function appendEvent(database, run, type, message, stage = run.kind) {
  const sequence = database.codexfastRunEvents.filter((entry) => entry.runId === run.id).length + 1;
  const event = { id: publicId("cfevent"), runId: run.id, projectId: run.projectId, sequence, type: text(type, 50) || "progress", stage: text(stage, 50), message: text(message, 1000), createdAt: timestamp() };
  database.codexfastRunEvents.push(event);
  return event;
}
function queueRun(database, project, user, kind, costCap) {
  if (database.codexfastRuns.some((entry) => entry.ownerId === project.ownerId && ACTIVE_RUN_STATES.has(entry.status))) { const error = new Error("当前账号已有运行中的任务"); error.status = 409; throw error; }
  const run = { id: publicId("cfrun"), projectId: project.id, ownerId: project.ownerId, requestedBy: user.id, kind, status: "queued", costCap: Number(costCap || 0), revision: kind === "revision" ? Number(project.revisionCount || 0) + 1 : 0, leaseOwner: null, leaseExpiresAt: null, createdAt: timestamp(), updatedAt: timestamp() };
  database.codexfastRuns.push(run);
  project.status = "queued";
  project.updatedAt = timestamp();
  appendEvent(database, run, "queued", kind === "planning" ? "规格规划已进入队列" : "受控构建已进入队列", "queue");
  return run;
}
function requireWorker(request) {
  const configured = text(process.env.CODEXFAST_WORKER_TOKEN, 500);
  if (configured.length < 32) { const error = new Error("Worker 服务身份尚未安全配置"); error.status = 503; throw error; }
  const allowedIps = text(process.env.CODEXFAST_WORKER_IP_ALLOWLIST, 2000).split(",").map((entry) => entry.trim()).filter(Boolean);
  if (process.env.NODE_ENV === "production" && !allowedIps.length) { const error = new Error("Worker 私网来源白名单尚未配置"); error.status = 503; throw error; }
  if (allowedIps.length && !allowedIps.includes(clientIp(request))) { const error = new Error("Worker 来源网络不受信任"); error.status = 403; throw error; }
  const supplied = String(request.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!supplied || !safeEqual(supplied, configured)) { const error = new Error("Worker 身份无效"); error.status = 401; throw error; }
}
function projectRun(database, runId) {
  const run = database.codexfastRuns.find((entry) => entry.id === runId);
  if (!run) { const error = new Error("运行不存在"); error.status = 404; throw error; }
  const project = database.codexfastProjects.find((entry) => entry.id === run.projectId);
  if (!project) { const error = new Error("运行对应项目不存在"); error.status = 409; throw error; }
  return { run, project };
}
function planningPayload(database, project) {
  const spec = database.codexfastSpecs.find((entry) => entry.projectId === project.id && entry.version === project.currentSpecVersion);
  return { project: { id: project.id, title: project.title, template: project.template, brief: project.brief }, spec };
}

export async function handleCodexFastApi(context) {
  const { request, response, pathname, user, database, requestBody, sendJson, persist, recordAudit, loadObject } = context;
  hydrateCodexFast(database);
  if (!pathname.startsWith("/api/codexfast/") && !pathname.startsWith("/api/internal/codexfast/")) return false;

  if (request.method === "GET" && pathname === "/api/codexfast/bootstrap") return sendJson(response, 200, codexFastBootstrap(database, user));
  if (request.method === "POST" && pathname === "/api/codexfast/applications") {
    enforceApplicationLimit(request);
    const body = await requestBody(request);
    const email = required(body.email, "邮箱", 160).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { const error = new Error("请输入有效邮箱"); error.status = 400; throw error; }
    if (!body.privacyConsent) { const error = new Error("提交前需要确认隐私说明"); error.status = 400; throw error; }
    const duplicate = database.codexfastApplications.find((entry) => entry.email === email && ["submitted", "approved"].includes(entry.status));
    if (duplicate) { const error = new Error("这个邮箱已有待处理申请"); error.status = 409; throw error; }
    const application = { id: publicId("cfapp"), name: required(body.name, "姓名", 80), email, goal: required(body.goal, "项目目标", 1200), audience: required(body.audience, "目标用户", 600), deliverable: required(body.deliverable, "预期交付", 600), assets: text(body.assets, 1000), constraints: text(body.constraints, 1200), privacyConsent: true, status: "submitted", createdAt: timestamp(), updatedAt: timestamp() };
    database.codexfastApplications.unshift(application);
    recordAudit("codexfast.application_created", user, { applicationId: application.id });
    await persist();
    return sendJson(response, 201, { application: publicApplication(application) });
  }

  const applicationReview = pathname.match(/^\/api\/codexfast\/admin\/applications\/([^/]+)\/review$/);
  if (request.method === "POST" && applicationReview) {
    if (!user || user.role !== "admin") { const error = new Error("需要管理员权限"); error.status = 403; throw error; }
    const body = await requestBody(request);
    const application = database.codexfastApplications.find((entry) => entry.id === applicationReview[1] && entry.status === "submitted");
    if (!application) { const error = new Error("待审核申请不存在"); error.status = 404; throw error; }
    if (body.result === "reject") { application.status = "rejected"; application.reviewNote = required(body.reason, "拒绝原因", 500); application.updatedAt = timestamp(); recordAudit("codexfast.application_rejected", user, { applicationId: application.id }); await persist(); return sendJson(response, 200, { application: publicApplication(application) }); }
    if (body.result !== "approve") { const error = new Error("审核结果无效"); error.status = 400; throw error; }
    const invite = `anscf_${randomBytes(24).toString("base64url")}`;
    database.codexfastInvites.push({ id: publicId("cfinvite"), applicationId: application.id, email: application.email, tokenHash: sha256(invite), status: "active", expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), createdBy: user.id, createdAt: timestamp() });
    application.status = "approved"; application.updatedAt = timestamp();
    recordAudit("codexfast.application_approved", user, { applicationId: application.id });
    await persist();
    return sendJson(response, 200, { application: publicApplication(application), invite });
  }

  if (request.method === "POST" && pathname === "/api/codexfast/invites/accept") {
    if (!user) { const error = new Error("请先登录"); error.status = 401; throw error; }
    if (!user.emailVerifiedAt) { const error = new Error("请先验证邮箱"); error.status = 403; throw error; }
    const body = await requestBody(request);
    const tokenHash = sha256(required(body.invite, "邀请码", 500));
    const invite = database.codexfastInvites.find((entry) => entry.tokenHash === tokenHash && entry.status === "active" && Date.parse(entry.expiresAt) > Date.now());
    if (!invite || invite.email !== user.email) { const error = new Error("邀请码无效、已过期或与当前邮箱不匹配"); error.status = 400; throw error; }
    invite.status = "used"; invite.usedBy = user.id; invite.usedAt = timestamp();
    if (!database.codexfastMemberships.some((entry) => entry.userId === user.id)) database.codexfastMemberships.push({ id: publicId("cfmember"), userId: user.id, role: "beta", status: "active", projectLimit: 2, concurrentRunLimit: 1, createdAt: timestamp() });
    recordAudit("codexfast.invite_accepted", user, { inviteId: invite.id });
    await persist();
    return sendJson(response, 200, codexFastBootstrap(database, user));
  }

  if (request.method === "POST" && pathname === "/api/codexfast/projects") {
    if (!isMember(database, user)) { const error = new Error("需要 CodexFast 内测资格"); error.status = 403; throw error; }
    const membership = membershipFor(database, user);
    const owned = database.codexfastProjects.filter((entry) => entry.ownerId === user.id && entry.status !== "archived");
    if (owned.length >= Number(membership.projectLimit || 1)) { const error = new Error("已达到内测项目上限"); error.status = 409; throw error; }
    const body = await requestBody(request); const brief = validateBrief(body);
    const project = { id: publicId("cfproject"), ownerId: user.id, title: brief.brand, template: "lead-generation-site", status: "scope_draft", brief, currentSpecVersion: 1, revisionCount: 0, costCap: 0, previewTtlHours: 72, createdAt: timestamp(), updatedAt: timestamp() };
    database.codexfastProjects.unshift(project);
    database.codexfastSpecs.push({ id: publicId("cfspec"), projectId: project.id, version: 1, status: "draft", source: "structured-default", document: draftSpec(brief), createdAt: timestamp(), updatedAt: timestamp() });
    recordAudit("codexfast.project_created", user, { projectId: project.id }); await persist();
    return sendJson(response, 201, { project: publicProject(database, project) });
  }
  const projectMatch = pathname.match(/^\/api\/codexfast\/projects\/([^/]+)$/);
  if (request.method === "GET" && projectMatch) { if (!isMember(database, user)) { const error = new Error("需要 CodexFast 内测资格"); error.status = 403; throw error; } return sendJson(response, 200, { project: publicProject(database, projectForOwner(database, user, projectMatch[1])) }); }
  if (request.method === "DELETE" && projectMatch) {
    const project = projectForOwner(database, user, projectMatch[1]);
    if (database.codexfastRuns.some((entry) => entry.projectId === project.id && ACTIVE_RUN_STATES.has(entry.status))) { const error = new Error("运行中的项目不能归档"); error.status = 409; throw error; }
    project.status = "archived"; project.archivedAt = timestamp(); project.updatedAt = timestamp();
    database.codexfastPreviewLeases.filter((entry) => entry.projectId === project.id && !entry.revokedAt).forEach((entry) => { entry.revokedAt = timestamp(); });
    recordAudit("codexfast.project_archived", user, { projectId: project.id }); await persist(); return sendJson(response, 200, { project: publicProject(database, project) });
  }

  const specUpdate = pathname.match(/^\/api\/codexfast\/projects\/([^/]+)\/spec$/);
  if (request.method === "PATCH" && specUpdate) {
    const project = projectForOwner(database, user, specUpdate[1]);
    if (project.status !== "scope_draft") { const error = new Error("只有规格草稿阶段可以编辑"); error.status = 409; throw error; }
    const body = await requestBody(request);
    const spec = database.codexfastSpecs.find((entry) => entry.projectId === project.id && entry.version === project.currentSpecVersion);
    spec.document = { ...spec.document, summary: required(body.summary, "项目摘要", 2000), sitemap: Array.isArray(body.sitemap) ? body.sitemap.map((entry) => text(entry, 100)).filter(Boolean).slice(0, 10) : spec.document.sitemap, acceptanceCriteria: Array.isArray(body.acceptanceCriteria) ? body.acceptanceCriteria.map((entry) => text(entry, 300)).filter(Boolean).slice(0, 20) : spec.document.acceptanceCriteria };
    spec.updatedAt = timestamp(); project.updatedAt = timestamp(); recordAudit("codexfast.spec_updated", user, { projectId: project.id, version: spec.version }); await persist();
    return sendJson(response, 200, { project: publicProject(database, project) });
  }
  const planRun = pathname.match(/^\/api\/codexfast\/projects\/([^/]+)\/plan$/);
  if (request.method === "POST" && planRun) {
    const project = projectForOwner(database, user, planRun[1]);
    if (project.status !== "scope_draft") { const error = new Error("当前项目不能重新规划"); error.status = 409; throw error; }
    const run = queueRun(database, project, user, "planning", 0); recordAudit("codexfast.planning_queued", user, { projectId: project.id, runId: run.id }); await persist();
    return sendJson(response, 202, { run, project: publicProject(database, project) });
  }
  const lockScope = pathname.match(/^\/api\/codexfast\/projects\/([^/]+)\/lock-scope$/);
  if (request.method === "POST" && lockScope) {
    const project = projectForOwner(database, user, lockScope[1]);
    if (project.status !== "scope_draft") { const error = new Error("当前项目不能锁定范围"); error.status = 409; throw error; }
    const spec = database.codexfastSpecs.find((entry) => entry.projectId === project.id && entry.version === project.currentSpecVersion); spec.status = "locked"; spec.lockedAt = timestamp();
    project.status = "awaiting_run_approval"; project.updatedAt = timestamp(); database.codexfastApprovals.push({ id: publicId("cfapproval"), projectId: project.id, type: "scope", approvedBy: user.id, approvedAt: timestamp(), specVersion: spec.version }); recordAudit("codexfast.scope_locked", user, { projectId: project.id }); await persist();
    return sendJson(response, 200, { project: publicProject(database, project) });
  }
  const buildRun = pathname.match(/^\/api\/codexfast\/projects\/([^/]+)\/runs$/);
  if (request.method === "POST" && buildRun) {
    const project = projectForOwner(database, user, buildRun[1]);
    if (project.status !== "awaiting_run_approval") { const error = new Error("需要先锁定项目范围"); error.status = 409; throw error; }
    const body = await requestBody(request); if (!body.confirmed) { const error = new Error("需要确认本次受控构建"); error.status = 400; throw error; }
    const configuredCap = Number(process.env.CODEXFAST_DEFAULT_COST_CAP || 25); project.costCap = Math.max(1, Math.min(configuredCap, Number(body.costCap || configuredCap))); project.previewTtlHours = Math.max(1, Math.min(168, Number(body.previewTtlHours || 72)));
    const run = queueRun(database, project, user, "build", project.costCap); database.codexfastApprovals.push({ id: publicId("cfapproval"), projectId: project.id, runId: run.id, type: "run", approvedBy: user.id, approvedAt: timestamp(), costCap: project.costCap }); recordAudit("codexfast.build_queued", user, { projectId: project.id, runId: run.id, costCap: project.costCap }); await persist();
    return sendJson(response, 202, { run, project: publicProject(database, project) });
  }
  const acceptance = pathname.match(/^\/api\/codexfast\/projects\/([^/]+)\/accept$/);
  if (request.method === "POST" && acceptance) {
    const project = projectForOwner(database, user, acceptance[1]);
    if (!new Set(["preview_ready", "awaiting_acceptance"]).has(project.status)) { const error = new Error("项目尚未进入验收阶段"); error.status = 409; throw error; }
    project.status = "delivered"; project.deliveredAt = timestamp(); project.updatedAt = timestamp(); database.codexfastApprovals.push({ id: publicId("cfapproval"), projectId: project.id, type: "acceptance", approvedBy: user.id, approvedAt: timestamp() }); recordAudit("codexfast.project_accepted", user, { projectId: project.id }); await persist();
    return sendJson(response, 200, { project: publicProject(database, project) });
  }
  const previewRevoke = pathname.match(/^\/api\/codexfast\/projects\/([^/]+)\/preview$/);
  if (request.method === "DELETE" && previewRevoke) {
    const project = projectForOwner(database, user, previewRevoke[1]); const leases = database.codexfastPreviewLeases.filter((entry) => entry.projectId === project.id && !entry.revokedAt);
    if (!leases.length) { const error = new Error("当前没有可撤销预览"); error.status = 404; throw error; }
    leases.forEach((entry) => { entry.revokedAt = timestamp(); }); recordAudit("codexfast.preview_revoked", user, { projectId: project.id, leases: leases.map((entry) => entry.id) }); await persist(); return sendJson(response, 200, { project: publicProject(database, project) });
  }
  const revision = pathname.match(/^\/api\/codexfast\/projects\/([^/]+)\/revision$/);
  if (request.method === "POST" && revision) {
    const project = projectForOwner(database, user, revision[1]);
    if (!new Set(["preview_ready", "awaiting_acceptance"]).has(project.status) || project.revisionCount >= 1) { const error = new Error("当前项目不能再请求同范围修订"); error.status = 409; throw error; }
    const body = await requestBody(request); project.revisionNote = required(body.note, "修订说明", 1200); project.revisionCount += 1;
    database.codexfastPreviewLeases.filter((entry) => entry.projectId === project.id && !entry.revokedAt).forEach((entry) => { entry.revokedAt = timestamp(); });
    const run = queueRun(database, project, user, "revision", project.costCap); recordAudit("codexfast.revision_queued", user, { projectId: project.id, runId: run.id }); await persist();
    return sendJson(response, 202, { run, project: publicProject(database, project) });
  }
  const publication = pathname.match(/^\/api\/codexfast\/projects\/([^/]+)\/publication$/);
  if (request.method === "POST" && publication) {
    const project = projectForOwner(database, user, publication[1]); if (project.status !== "delivered") { const error = new Error("只有已验收项目可以申请公开"); error.status = 409; throw error; }
    const body = await requestBody(request); if (!body.consent) { const error = new Error("需要逐项目明确授权"); error.status = 400; throw error; }
    let entry = database.codexfastPublications.find((candidate) => candidate.projectId === project.id);
    const values = { title: required(body.title, "公开标题", 120), summary: required(body.summary, "脱敏摘要", 1400), method: required(body.method, "公开方法", 1800), includePreview: Boolean(body.includePreview), consent: true, status: "pending", updatedAt: timestamp() };
    if (entry) Object.assign(entry, values); else { entry = { id: publicId("cfpublication"), projectId: project.id, ownerId: user.id, createdAt: timestamp(), ...values }; database.codexfastPublications.push(entry); }
    recordAudit("codexfast.publication_requested", user, { projectId: project.id, publicationId: entry.id }); await persist(); return sendJson(response, 201, { publication: entry });
  }
  const publicationReview = pathname.match(/^\/api\/codexfast\/admin\/publications\/([^/]+)\/review$/);
  if (request.method === "POST" && publicationReview) {
    if (!user || user.role !== "admin") { const error = new Error("需要管理员权限"); error.status = 403; throw error; }
    const body = await requestBody(request); const entry = database.codexfastPublications.find((candidate) => candidate.id === publicationReview[1] && candidate.status === "pending"); if (!entry) { const error = new Error("待审核案例不存在"); error.status = 404; throw error; }
    if (body.result === "reject") { entry.status = "rejected"; entry.reviewNote = required(body.reason, "拒绝原因", 500); }
    else if (body.result === "approve") { entry.status = "approved"; const owner = database.users.find((candidate) => candidate.id === entry.ownerId); database.creatorStories.unshift({ id: publicId("story"), status: "已通过", authorId: entry.ownerId, authorName: owner?.displayName || "ANS Maker", profileSlug: "", role: "ANS CodexFast 内测创作者", hook: entry.title, problem: entry.summary, aiSteps: entry.method, humanJudgement: "范围、成本、预览与公开内容均由项目所有者逐步确认。", outcome: "项目完成私有预览、测试与交付验收。", nextStep: "继续验证真实访问与转化结果。", consent: true, uploadIds: [], createdAt: timestamp(), updatedAt: timestamp() }); }
    else { const error = new Error("审核结果无效"); error.status = 400; throw error; }
    entry.reviewedAt = timestamp(); entry.reviewedBy = user.id; recordAudit(`codexfast.publication_${entry.status}`, user, { publicationId: entry.id }); await persist(); return sendJson(response, 200, { publication: entry });
  }

  const runControl = pathname.match(/^\/api\/codexfast\/admin\/runs\/([^/]+)\/action$/);
  if (request.method === "POST" && runControl) {
    if (!user || user.role !== "admin") { const error = new Error("需要管理员权限"); error.status = 403; throw error; }
    const body = await requestBody(request); const { run, project } = projectRun(database, runControl[1]);
    if (body.action === "pause" || body.action === "cancel") {
      if (!activeRun(run)) { const error = new Error("只有运行中的任务可以暂停或取消"); error.status = 409; throw error; }
      run.status = body.action === "pause" ? "paused" : "cancelled"; run.completedAt = timestamp(); run.updatedAt = timestamp(); project.status = run.status; project.updatedAt = timestamp();
      appendEvent(database, run, run.status, body.action === "pause" ? "管理员已暂停运行并进入人工接管" : "管理员已取消运行", run.status);
      recordAudit(`codexfast.run_${run.status}`, user, { projectId: project.id, runId: run.id }); await persist();
      return sendJson(response, 200, { run, project: publicProject(database, project) });
    }
    if (body.action === "requeue") {
      if (!["failed", "paused", "cancelled"].includes(run.status)) { const error = new Error("只有失败、暂停或取消的任务可以重新排队"); error.status = 409; throw error; }
      const replacement = queueRun(database, project, user, run.kind, run.costCap); replacement.replacesRunId = run.id;
      recordAudit("codexfast.run_requeued", user, { projectId: project.id, runId: replacement.id, replacesRunId: run.id }); await persist();
      return sendJson(response, 202, { run: replacement, project: publicProject(database, project) });
    }
    const error = new Error("运行控制动作无效"); error.status = 400; throw error;
  }

  const artifactDownload = pathname.match(/^\/api\/codexfast\/artifacts\/([^/]+)$/);
  if (request.method === "GET" && artifactDownload) {
    if (!user) { const error = new Error("请先登录"); error.status = 401; throw error; }
    const artifact = database.codexfastArtifacts.find((entry) => entry.id === artifactDownload[1]); if (!artifact) { const error = new Error("交付物不存在"); error.status = 404; throw error; }
    const project = projectForOwner(database, user, artifact.projectId);
    if (project.status !== "delivered" && artifact.type !== "test-report") { const error = new Error("项目验收后才能下载最终交付物"); error.status = 409; throw error; }
    let content;
    if (artifact.contentBase64) content = Buffer.from(artifact.contentBase64, "base64");
    else if (artifact.r2Key && loadObject) content = await loadObject(artifact.r2Key);
    else { const error = new Error("交付物存储尚未就绪"); error.status = 503; throw error; }
    if (content.length !== artifact.size || sha256(content) !== artifact.checksum) { const error = new Error("交付物完整性校验失败"); error.status = 502; throw error; }
    response.writeHead(200, { "Content-Type": artifact.contentType || "application/octet-stream", "Content-Length": content.length, "Cache-Control": "private, no-store", "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(artifact.name)}`, "X-Content-Type-Options": "nosniff" }); response.end(content); return true;
  }

  if (pathname.startsWith("/api/internal/codexfast/")) requireWorker(request);
  if (request.method === "POST" && pathname === "/api/internal/codexfast/runs/lease") {
    const body = await requestBody(request); const workerId = required(body.workerId, "Worker ID", 120); const current = Date.now();
    for (const run of database.codexfastRuns) if (run.status === "leased" && Number(run.leaseExpiresAt || 0) < current) { run.status = "queued"; run.leaseOwner = null; run.leaseExpiresAt = null; }
    const run = database.codexfastRuns.filter((entry) => entry.status === "queued").sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
    if (!run) return sendJson(response, 204, {});
    const { project } = projectRun(database, run.id); run.status = "leased"; run.leaseOwner = workerId; run.leaseExpiresAt = current + 60_000; run.updatedAt = timestamp(); project.status = run.kind === "planning" ? "planning" : "building"; appendEvent(database, run, "leased", `任务已由 ${workerId} 领取`, project.status); await persist();
    return sendJson(response, 200, { run, payload: planningPayload(database, project), revisionNote: project.revisionNote || "" });
  }
  const heartbeat = pathname.match(/^\/api\/internal\/codexfast\/runs\/([^/]+)\/heartbeat$/);
  if (request.method === "POST" && heartbeat) {
    const { run } = projectRun(database, heartbeat[1]);
    assertRunWorker(run, request);
    if (!activeRun(run)) { const error = new Error("运行已不接受心跳"); error.status = 409; throw error; }
    run.leaseExpiresAt = Date.now() + 60_000; run.updatedAt = timestamp(); await persist();
    return sendJson(response, 200, { ok: true });
  }
  const runEvent = pathname.match(/^\/api\/internal\/codexfast\/runs\/([^/]+)\/events$/);
  if (request.method === "POST" && runEvent) {
    const { run, project } = projectRun(database, runEvent[1]);
    assertRunWorker(run, request);
    if (!activeRun(run)) { const error = new Error("运行已结束，不能追加事件"); error.status = 409; throw error; }
    const body = await requestBody(request);
    const stage = ["planning", "building", "testing"].includes(body.stage) ? body.stage : project.status;
    project.status = stage; run.status = stage; run.updatedAt = timestamp();
    const event = appendEvent(database, run, body.type, body.message, stage); await persist();
    return sendJson(response, 201, { event });
  }
  const complete = pathname.match(/^\/api\/internal\/codexfast\/runs\/([^/]+)\/complete$/);
  if (request.method === "POST" && complete) {
    const { run, project } = projectRun(database, complete[1]); const body = await requestBody(request);
    assertRunWorker(run, request);
    if (run.status === "completed") return sendJson(response, 200, { run, project: publicProject(database, project), idempotent: true });
    if (run.status === "failed") return sendJson(response, 200, { run, project: publicProject(database, project), idempotent: true });
    if (!activeRun(run)) { const error = new Error("运行当前不能完成"); error.status = 409; throw error; }
    if (!body.success) { run.status = "failed"; run.failureCode = text(body.failureCode, 120) || "worker_failure"; run.failureMessage = text(body.message, 1200); run.completedAt = timestamp(); project.status = "failed"; appendEvent(database, run, "failed", run.failureMessage || "Worker 未能完成当前运行", "failed"); await persist(); return sendJson(response, 200, { run, project: publicProject(database, project) }); }
    if (run.kind === "planning") {
      const currentSpec = database.codexfastSpecs.find((entry) => entry.projectId === project.id && entry.version === project.currentSpecVersion);
      currentSpec.document = sanitizedPlanningSpec(body.spec, currentSpec.document);
      currentSpec.source = "planning-model"; currentSpec.updatedAt = timestamp();
      run.status = "completed"; run.completedAt = timestamp(); project.status = "scope_draft";
      appendEvent(database, run, "completed", "规格规划已完成，等待人工编辑与锁定", "planning"); await persist();
      return sendJson(response, 200, { run, project: publicProject(database, project) });
    }
    if (!body.testsPassed) { const error = new Error("Worker 未提供通过的质量门禁"); error.status = 422; throw error; }
    const artifacts = Array.isArray(body.artifacts) ? body.artifacts.slice(0, 20) : [];
    const requiredArtifactTypes = new Set(["source-code", "test-report", "delivery-manifest", "commit-history"]);
    const receivedArtifactTypes = new Set(artifacts.map((item) => text(item?.type, 80)));
    if ([...requiredArtifactTypes].some((type) => !receivedArtifactTypes.has(type))) { const error = new Error("当前运行缺少源码、测试、版本或交付清单证据"); error.status = 422; throw error; }
    const previewTarget = text(body.previewTarget, 300);
    if (!new RegExp(`^${run.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\/(?:repo|site)(?:\/.*)?$`).test(previewTarget) || previewTarget.includes("..") || previewTarget.includes("\\")) { const error = new Error("预览目标不属于当前运行"); error.status = 422; throw error; }
    const actualCost = Number(body.actualCost || 0);
    if (!Number.isFinite(actualCost) || actualCost < 0 || actualCost > Number(run.costCap || 0)) { const error = new Error("运行成本超过已确认上限"); error.status = 422; throw error; }
    const r2Prefix = `codexfast/${run.ownerId}/${run.projectId}/${run.id}/`;
    const validatedArtifacts = artifacts.map((item) => {
      const name = required(item?.name, "交付物名称", 160);
      const contentBase64 = text(item?.contentBase64, 1_500_000);
      const r2Key = text(item?.r2Key, 500);
      if (Boolean(contentBase64) === Boolean(r2Key)) { const error = new Error(`交付物 ${name} 的存储引用无效`); error.status = 422; throw error; }
      if (r2Key && (!r2Key.startsWith(r2Prefix) || r2Key.includes("..") || r2Key.includes("\\"))) { const error = new Error(`交付物 ${name} 不属于当前运行存储前缀`); error.status = 422; throw error; }
      const checksum = text(item?.checksum, 128).toLowerCase();
      if (!/^[a-f0-9]{64}$/.test(checksum)) { const error = new Error(`交付物 ${name} 缺少有效 SHA-256`); error.status = 422; throw error; }
      const size = Number(item?.size || 0);
      if (!Number.isSafeInteger(size) || size <= 0 || size > 100 * 1024 * 1024) { const error = new Error(`交付物 ${name} 大小无效`); error.status = 422; throw error; }
      if (contentBase64) {
        const content = Buffer.from(contentBase64, "base64");
        if (content.length !== size || sha256(content) !== checksum) { const error = new Error(`交付物 ${name} 完整性校验失败`); error.status = 422; throw error; }
      }
      return { type: text(item?.type, 80) || "file", name, contentType: text(item?.contentType, 120) || "application/octet-stream", size, checksum, r2Key, contentBase64 };
    });
    for (const item of validatedArtifacts) database.codexfastArtifacts.push({ id: publicId("cfartifact"), projectId: project.id, runId: run.id, ...item, createdAt: timestamp() });
    const token = randomBytes(24).toString("base64url"); const expiresAt = new Date(Date.now() + Number(project.previewTtlHours || 72) * 60 * 60 * 1000).toISOString(); const previewOrigin = text(process.env.CODEXFAST_PREVIEW_ORIGIN, 500) || "https://preview.ans.cauai.fun";
    database.codexfastPreviewLeases.filter((entry) => entry.projectId === project.id && !entry.revokedAt).forEach((entry) => { entry.revokedAt = timestamp(); });
    database.codexfastPreviewLeases.push({ id: publicId("cfpreview"), projectId: project.id, runId: run.id, tokenHash: sha256(token), url: `${previewOrigin}/p/${token}/`, target: previewTarget, expiresAt, createdAt: timestamp() });
    run.status = "completed"; run.completedAt = timestamp(); run.actualCost = actualCost; project.status = "preview_ready"; project.updatedAt = timestamp(); appendEvent(database, run, "completed", "构建、测试与私有预览均已就绪", "preview"); await persist(); return sendJson(response, 200, { run, project: publicProject(database, project) });
  }
  const previewResolve = pathname.match(/^\/api\/internal\/codexfast\/previews\/([^/]+)$/);
  if (request.method === "GET" && previewResolve) { const tokenHash = sha256(previewResolve[1]); const lease = database.codexfastPreviewLeases.find((entry) => entry.tokenHash === tokenHash && !entry.revokedAt && Date.parse(entry.expiresAt) > Date.now()); if (!lease) { const error = new Error("预览不存在或已过期"); error.status = 404; throw error; } return sendJson(response, 200, { target: lease.target, expiresAt: lease.expiresAt }); }

  const error = new Error("CodexFast 接口不存在"); error.status = 404; throw error;
}
