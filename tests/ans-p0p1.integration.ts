import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { createRequire, syncBuiltinESMExports } from "node:module";
import { basename } from "node:path";
import { fileURLToPath } from "node:url";
import type { PrismaClient } from "@prisma/client";
import { test } from "vitest";

// 独立执行，不加载全局 setup 或数据库 mock：
// NODE_OPTIONS= "C:/Program Files/nodejs/node.exe" "C:/Users/lsb/.workbuddy/apps/ans-platform/node_modules/vitest/vitest.mjs" run --config "C:/Users/lsb/.workbuddy/apps/ans-platform/tests/ans-p0p1.vitest.config.ts"
// ANS_INTEGRATION_SAFETY_ONLY=1 只做只读校验；独立 Vitest 支持业务 auth 模块的顶层 await。
// 仅 Turnstile、Resend、AI HTTP 边界 stub；所有业务函数、Prisma、事务、锁、约束均真实。
// 仅创建本轮随机前缀数据，保留数据供核验，不清库、不操作 Docker、不生成报告文件。

const TARGET = "postgresql://postgres@127.0.0.1:55437/ans_integration";
const prefix = `it_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
const requireLocal = createRequire(import.meta.url);
const results: Array<{ scenario: string; status: "PASS" | "FAIL" | "SKIP"; evidence: unknown }> = [];
const codes = new Map<string, string>();
const externalCalls = { turnstile: 0, resend: 0, ai: 0, unexpected: 0 };
let db: PrismaClient;
let observer: PrismaClient;
let blockedEnvReads = 0;
let aiHandler: ((init?: RequestInit) => Promise<Response>) | undefined;

function assertTarget(value: string) {
  const url = new URL(value);
  assert.equal(url.protocol, "postgresql:", "仅允许 PostgreSQL");
  assert.equal(url.hostname, "127.0.0.1", "禁止连接其他主机");
  assert.equal(url.port, "55437", "禁止连接其他端口");
  assert.equal(url.pathname, "/ans_integration", "禁止连接其他库");
  assert.equal(url.username, "postgres");
  assert.equal(url.password, "");
  assert.equal(url.search, "", "禁止通过连接参数覆盖数据库目标");
  assert.equal(url.hash, "");
  return url;
}

function forbidEnvReads() {
  // 阻断依赖隐式 dotenv 读取，而不读取任何 .env 内容。
  const fs = requireLocal("node:fs") as typeof import("node:fs");
  const fsp = requireLocal("node:fs/promises") as typeof import("node:fs/promises");
  const check = (path: unknown) => {
    const value = path instanceof URL ? fileURLToPath(path) : Buffer.isBuffer(path) ? path.toString() : String(path);
    if (/^\.env(?:\.|$)/i.test(basename(value))) {
      blockedEnvReads++;
      throw new Error("集成测试禁止读取 .env 文件");
    }
  };
  for (const key of ["readFileSync", "readFile", "openSync", "open", "createReadStream"] as const) {
    const original = fs[key] as (...args: unknown[]) => unknown;
    Object.assign(fs, { [key]: (...args: unknown[]) => { check(args[0]); return original.apply(fs, args); } });
  }
  for (const key of ["readFile", "open"] as const) {
    const original = fsp[key] as (...args: unknown[]) => unknown;
    Object.assign(fsp, { [key]: (...args: unknown[]) => { check(args[0]); return original.apply(fsp, args); } });
  }
  Object.assign(process, { loadEnvFile: () => { blockedEnvReads++; throw new Error("集成测试禁止 loadEnvFile"); } });
  syncBuiltinESMExports();
}

function details(error: unknown) {
  const e = error as { name?: string; code?: string; status?: number; message?: string; meta?: unknown };
  return { name: e?.name, code: e?.code, httpStatus: e?.status, message: e?.message ?? String(error), meta: e?.meta };
}

function evidence(value: unknown) {
  console.log("EVIDENCE", JSON.stringify(value));
}

async function scenario(name: string, work: () => Promise<unknown>) {
  try {
    const proof = await work();
    results.push({ scenario: name, status: "PASS", evidence: proof });
    console.log("PASS", name, JSON.stringify(proof));
  } catch (error) {
    const proof = details(error);
    results.push({ scenario: name, status: "FAIL", evidence: proof });
    console.error("FAIL", name, JSON.stringify(proof));
    process.exitCode = 1;
  }
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

async function deadline<T>(promise: Promise<T>, name: string, ms = 7000) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([promise, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`等待超时：${name}`)), ms);
    })]);
  } finally { clearTimeout(timer); }
}

async function waitForLocks(table: "users" | "invite_codes" | "templates", expected: number) {
  const end = Date.now() + 7000;
  let waiting = 0;
  while (Date.now() < end) {
    const [row] = await observer.$queryRaw<Array<{ waiting: number }>>`
      SELECT count(*)::int AS waiting FROM pg_stat_activity
      WHERE datname = 'ans_integration' AND application_name = ${prefix}
        AND state = 'active' AND wait_event_type = 'Lock'
        AND query ILIKE ${`%"${table}"%`}
    `;
    waiting = row.waiting;
    if (waiting >= expected) return waiting;
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  throw new Error(`未形成真实数据库竞争：${table} 锁等待 ${waiting}/${expected}`);
}

async function lockedRace<T>(table: "users" | "invite_codes" | "templates", id: string, jobs: Array<() => Promise<T>>) {
  const ready = deferred<void>();
  const release = deferred<void>();
  const holder = observer.$transaction(async tx => {
    if (table === "users") await tx.$queryRaw`SELECT id FROM users WHERE id = ${id} FOR UPDATE`;
    if (table === "invite_codes") await tx.$queryRaw`SELECT id FROM invite_codes WHERE id = ${id} FOR UPDATE`;
    if (table === "templates") await tx.$queryRaw`SELECT id FROM templates WHERE id = ${id} FOR UPDATE`;
    ready.resolve();
    await release.promise;
  }, { timeout: 20000, maxWait: 5000 });
  void holder.catch(error => ready.reject(error));
  let settled: Promise<PromiseSettledResult<T>[]> | undefined;
  try {
    await deadline(ready.promise, "持有数据库行锁");
    settled = Promise.allSettled(jobs.map(job => job()));
    const waiting = await waitForLocks(table, jobs.length);
    release.resolve();
    await holder;
    return { waiting, outcomes: await settled };
  } finally {
    release.resolve();
    await holder;
    if (settled) await settled;
  }
}

const summarize = (outcomes: PromiseSettledResult<unknown>[]) => outcomes.map(outcome =>
  outcome.status === "fulfilled" ? { status: "fulfilled" } : { status: "rejected", ...details(outcome.reason) });
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const otpIdentifier = (email: string) => `ans:registration:otp:${hash(email)}`;

async function fixtureUser(label: string, role: "ADMIN" | "USER" = "USER") {
  return db.user.create({ data: {
    id: `${prefix}_${label}`, username: `${prefix}_${label}`.slice(0, 30),
    email: `${prefix}_${label}@example.test`, name: "集成测试用户", nickname: "集成测试用户",
    role, emailVerified: new Date(), xp: 0,
  } });
}

const passReview = (reason: string) => ({
  verdict: "PASS", source: "AI", pass: true,
  scores: { compliance: 95, quality: 94, intent: 96 }, reason,
  model: "integration-review", checkedAt: new Date().toISOString(),
});

async function fixtureTemplate(authorId: string, label: string) {
  return db.template.create({ data: {
    id: `${prefix}_${label}`, slug: `${prefix}_${label}`, authorId,
    title: "读书笔记整理模板", promptBody: "请根据提供的读书笔记整理摘要，并清晰列出要点。",
    formSchema: [], outputType: "TEXT", status: "PENDING", reviewScore: passReview("初始有效审核结果"),
  } });
}

function aiResponse(reason: string) {
  return Response.json({ choices: [{ message: { role: "assistant", content: JSON.stringify({
    pass: true, scores: { compliance: 95, quality: 94, intent: 96 }, reason,
  }) } }] });
}

function installExternalStubs() {
  globalThis.fetch = async (input, init) => {
    const url = String(input instanceof Request ? input.url : input);
    if (url === "https://challenges.cloudflare.com/turnstile/v0/siteverify") {
      externalCalls.turnstile++;
      assert.equal(init?.method, "POST");
      return Response.json({ success: true, hostname: "integration.example.test", action: "register" });
    }
    if (url === "https://api.resend.com/emails") {
      externalCalls.resend++;
      assert.equal(init?.method, "POST");
      const payload = JSON.parse(String(init?.body)) as { to: string[]; text: string };
      assert.equal(payload.to.length, 1);
      assert.ok(payload.to[0].startsWith(prefix), "只允许测试邮箱");
      const code = payload.text.match(/\b\d{6}\b/)?.[0];
      assert.ok(code, "真实发码函数应输出六位验证码");
      codes.set(payload.to[0], code);
      return Response.json({ id: `${prefix}_${externalCalls.resend}` });
    }
    if (url === "https://ai.integration.example.test/v1/chat/completions" && aiHandler) {
      externalCalls.ai++;
      return aiHandler(init);
    }
    externalCalls.unexpected++;
    throw new Error("禁止任何未声明的外部 HTTP 调用");
  };
}

async function main() {
  assert.equal(process.versions.node.split(".")[0], "24", "必须使用 Node24 绝对路径");
  assert.ok(!process.execArgv.some(arg => arg.startsWith("--env-file")), "禁止 --env-file");
  const target = assertTarget(process.env.ANS_INTEGRATION_DATABASE_URL ?? TARGET);
  // 在加载任何 Prisma 或业务模块前锁定两个数据源环境变量。
  target.searchParams.set("connection_limit", "20");
  target.searchParams.set("application_name", prefix);
  Object.assign(process.env, {
    DATABASE_URL: target.toString(), DIRECT_URL: target.toString(), NODE_ENV: "test",
    TURNSTILE_SECRET_KEY: "integration-only-secret", NEXT_PUBLIC_TURNSTILE_SITE_KEY: "integration-only-site",
    RESEND_API_KEY: "integration-only-resend", EMAIL_FROM: "ANS <noreply@integration.example.test>",
    AUTH_URL: "https://integration.example.test", AUTH_SECRET: "integration-only-auth-secret-not-for-production",
    PCHAT_ALLOW_REGISTRATION: "true", PCHAT_AUTH_PROVIDERS: "credentials",
    TEMPLATE_REVIEW_BASE_URL: "https://ai.integration.example.test", TEMPLATE_REVIEW_API_KEY: "integration-only-ai",
    TEMPLATE_REVIEW_MODEL: "integration-review",
  });
  assert.equal((globalThis as { prisma?: unknown }).prisma, undefined, "拒绝复用未知 Prisma 实例");
  forbidEnvReads();
  installExternalStubs();
  const { PrismaClient } = await import("@prisma/client");
  const businessDb = await import("../src/lib/db");
  db = businessDb.db;
  // Prisma 返回代理对象，instanceof 为 false；核对实际构造器并执行数据库身份查询。
  assert.equal(db.constructor, PrismaClient, "业务必须使用真实 PrismaClient");
  observer = new PrismaClient({ datasourceUrl: target.toString() });
  const [identity] = await observer.$queryRaw<Array<{ database: string; server_version: string; application: string; server_port: number }>>`
    SELECT current_database() AS database, current_setting('server_version') AS server_version,
      current_setting('application_name') AS application, inet_server_port() AS server_port
  `;
  assert.equal(identity.database, "ans_integration");
  assert.match(identity.server_version, /^16\./);
  assert.equal(identity.application, prefix);
  const [businessIdentity] = await db.$queryRaw<Array<{ database: string; application: string }>>`
    SELECT current_database() AS database, current_setting('application_name') AS application
  `;
  assert.equal(businessIdentity.database, "ans_integration");
  assert.equal(businessIdentity.application, prefix);
  console.log("SAFETY", JSON.stringify({ node: process.version, executable: process.execPath,
    host: "127.0.0.1", publishedPort: 55437, ...identity, prefix,
    databaseMode: "真实 Prisma/PostgreSQL，无数据库 mock", envFiles: "读取已阻断", config: "独立运行，无全局 setup" }));
  if (process.env.ANS_INTEGRATION_SAFETY_ONLY === "1") return;

  const { checkIn } = await import("../src/lib/community");
  const { sendRegistrationCode, registerWithCode, ensureRegistrationEnabled } = await import("../src/lib/registration");
  const { reviewTemplateManually, recheckTemplate } = await import("../src/lib/template-service");
  const registrationInput = (email: string, inviteCode: string, username?: string) => ({
    email, name: "注册集成测试", password: "Integration-Only-Password!", code: codes.get(email),
    inviteCode, turnstileToken: "integration-challenge", ...(username ? { username } : {}),
  });
  const requestOtp = async (email: string) => {
    await sendRegistrationCode({ email, turnstileToken: "integration-challenge" });
    const row = await db.verificationToken.findFirstOrThrow({ where: { identifier: otpIdentifier(email) } });
    assert.match(row.token, /^[a-f0-9]{64}$/);
    assert.notEqual(row.token, codes.get(email));
    return row;
  };

  // 捕获失去幂等保护、重复加 XP、重复流水和并发请求失败。
  await scenario("签到：10 个真实锁等待请求仅奖励一次", async () => {
    const user = await fixtureUser("checkin");
    const { waiting, outcomes } = await lockedRace("users", user.id, Array.from({ length: 10 }, () => () => checkIn(user.id)));
    const stored = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    const records = await db.checkIn.findMany({ where: { userId: user.id } });
    const ledger = await db.xpLedger.findMany({ where: { userId: user.id } });
    const fulfilled = outcomes.filter(outcome => outcome.status === "fulfilled");
    const awarded = fulfilled.filter(outcome => !outcome.value.alreadyCheckedIn);
    const proof = { userId: user.id, waiting, outcomes: summarize(outcomes), awarded: awarded.length,
      alreadyCheckedIn: fulfilled.length - awarded.length, xp: stored.xp, checkIns: records.length, ledger: ledger.length };
    evidence(proof);
    assert.equal(fulfilled.length, 10);
    assert.equal(awarded.length, 1);
    assert.equal(records.length, 1);
    assert.equal(ledger.length, 1);
    assert.equal(stored.xp, 5);
    assert.equal(stored.checkInStreak, 1);
    assert.ok(stored.lastCheckInAt);
    assert.equal(records[0].xpAwarded, 5);
    assert.equal(ledger[0].amount, 5);
    assert.equal(ledger[0].reason, "CHECK_IN");
    assert.equal(ledger[0].refId, records[0].id);
    assert.equal(new Set(fulfilled.map(outcome => outcome.value.checkIn.id)).size, 1);
    return proof;
  });

  // 用户 XP 接近 int32 上限，真实 UPDATE 溢出发生在签到 INSERT 之后。
  await scenario("签到：真实整数溢出回滚签到及用户状态", async () => {
    const user = await fixtureUser("overflow");
    await db.user.update({ where: { id: user.id }, data: { xp: 2147483647 } });
    const before = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    const [outcome] = await Promise.allSettled([checkIn(user.id)]);
    const after = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    const proof = { userId: user.id, outcome: summarize([outcome])[0], xp: after.xp,
      checkIns: await db.checkIn.count({ where: { userId: user.id } }),
      ledger: await db.xpLedger.count({ where: { userId: user.id } }), userUnchanged: JSON.stringify(before) === JSON.stringify(after) };
    evidence(proof);
    assert.equal(outcome.status, "rejected");
    if (outcome.status === "rejected") assert.match(JSON.stringify(details(outcome.reason)), /22003|integer out of range|out of range/i);
    assert.deepEqual(after, before);
    assert.equal(proof.checkIns, 0);
    assert.equal(proof.ledger, 0);
    await db.user.update({ where: { id: user.id }, data: { xp: 0 } });
    assert.equal((await checkIn(user.id)).alreadyCheckedIn, false);
    assert.equal((await db.user.findUniqueOrThrow({ where: { id: user.id } })).xp, 5);
    return { ...proof, retryAfterRemovingOverflow: "成功且仅加5XP" };
  });

  // 所有注册先读同一可用邀请码，再让真实条件 UPDATE 竞争最后的名额。
  await scenario("注册：真实 OTP + 邀请码跨邮箱6人竞争最多5人", async () => {
    await ensureRegistrationEnabled();
    const creator = await fixtureUser("inviter");
    const invite = await db.inviteCode.create({ data: { id: `${prefix}_invite6`, code: `${prefix}_invite6`, creatorId: creator.id, maxUses: 5 } });
    const emails = Array.from({ length: 6 }, (_, i) => `${prefix}_reg${i}@example.test`);
    const otps = await Promise.all(emails.map(requestOtp));
    const { waiting, outcomes } = await lockedRace("invite_codes", invite.id, emails.map(email => () => registerWithCode(registrationInput(email, invite.code))));
    const winners = outcomes.flatMap((outcome, i) => outcome.status === "fulfilled" ? [emails[i]] : []);
    const losers = outcomes.flatMap((outcome, i) => outcome.status === "rejected" ? [emails[i]] : []);
    const users = await db.user.findMany({ where: { email: { in: emails } } });
    const redeemed = await db.inviteRedemption.findMany({ where: { codeId: invite.id } });
    const after = await db.inviteCode.findUniqueOrThrow({ where: { id: invite.id } });
    const otpRows = await db.verificationToken.findMany({ where: { identifier: { in: emails.map(otpIdentifier) } } });
    const proof = { inviteId: invite.id, waiting, winners: winners.length, losers: losers.length, usedCount: after.usedCount,
      users: users.length, redemptions: redeemed.length, loserResidualUsers: users.filter(user => losers.includes(user.email)).length,
      remainingOtps: otpRows.length, outcomes: summarize(outcomes) };
    evidence(proof);
    assert.equal(winners.length, 5);
    assert.equal(losers.length, 1);
    for (const outcome of outcomes) if (outcome.status === "rejected") assert.equal(outcome.reason.code, "invite_invalid");
    assert.equal(after.usedCount, 5);
    assert.equal(users.length, 5);
    assert.equal(redeemed.length, 5);
    assert.equal(proof.loserResidualUsers, 0);
    assert.deepEqual(users.map(user => user.email).sort(), winners.slice().sort());
    assert.deepEqual(redeemed.map(row => row.usedById).sort(), users.map(user => user.id).sort());
    assert.ok(users.every(user => user.emailVerified !== null && user.nicknameSetAt !== null && user.password?.startsWith("$2")));
    assert.equal(otpRows.length, 1);
    const losingIndex = emails.indexOf(losers[0]);
    assert.deepEqual(otpRows[0], otps[losingIndex]);
    return proof;
  });

  // 用户唯一键失败发生在邀请码递增和 OTP 消费之后，必须全部回滚。
  await scenario("注册：真实用户名唯一冲突回滚 OTP 和邀请名额", async () => {
    const creator = await fixtureUser("collision");
    const invite = await db.inviteCode.create({ data: { code: `${prefix}_rollback`, creatorId: creator.id, maxUses: 5 } });
    const email = `${prefix}_rollback@example.test`;
    const beforeOtp = await requestOtp(email);
    const [outcome] = await Promise.allSettled([registerWithCode(registrationInput(email, invite.code, creator.username))]);
    const afterOtp = await db.verificationToken.findFirst({ where: { identifier: otpIdentifier(email) } });
    const proof = { email, outcome: summarize([outcome])[0],
      users: await db.user.count({ where: { email } }), redemptions: await db.inviteRedemption.count({ where: { codeId: invite.id } }),
      usedCount: (await db.inviteCode.findUniqueOrThrow({ where: { id: invite.id } })).usedCount,
      otpUnchanged: JSON.stringify(beforeOtp) === JSON.stringify(afterOtp) };
    evidence(proof);
    assert.equal(outcome.status, "rejected");
    if (outcome.status === "rejected") assert.equal(outcome.reason.code, "P2002");
    assert.equal(proof.users, 0);
    assert.equal(proof.redemptions, 0);
    assert.equal(proof.usedCount, 0);
    assert.deepEqual(afterOtp, beforeOtp);
    const retry = await registerWithCode(registrationInput(email, invite.code));
    assert.equal(await db.user.count({ where: { email } }), 1);
    assert.equal((await db.inviteCode.findUniqueOrThrow({ where: { id: invite.id } })).usedCount, 1);
    assert.equal(await db.inviteRedemption.count({ where: { codeId: invite.id, usedById: retry.id } }), 1);
    assert.equal(await db.verificationToken.count({ where: { identifier: otpIdentifier(email) } }), 0);
    return { ...proof, sameOtpRetry: "成功，仅消费1名额和1验证码" };
  });

  await scenario("注册：同一邮箱 OTP 并发仅建号一次且不可重放", async () => {
    const creator = await fixtureUser("otpowner");
    const invite = await db.inviteCode.create({ data: { code: `${prefix}_otp`, creatorId: creator.id } });
    const email = `${prefix}_same@example.test`;
    await requestOtp(email);
    const input = registrationInput(email, invite.code);
    const outcomes = await Promise.allSettled([registerWithCode(input), registerWithCode(input)]);
    const proof = { outcomes: summarize(outcomes), users: await db.user.count({ where: { email } }),
      usedCount: (await db.inviteCode.findUniqueOrThrow({ where: { id: invite.id } })).usedCount,
      redemptions: await db.inviteRedemption.count({ where: { codeId: invite.id } }),
      otps: await db.verificationToken.count({ where: { identifier: otpIdentifier(email) } }) };
    evidence(proof);
    assert.equal(outcomes.filter(outcome => outcome.status === "fulfilled").length, 1);
    assert.equal(proof.users, 1);
    assert.equal(proof.usedCount, 1);
    assert.equal(proof.redemptions, 1);
    assert.equal(proof.otps, 0);
    const rejected = outcomes.find(outcome => outcome.status === "rejected");
    assert.ok(rejected && rejected.status === "rejected");
    assert.equal(rejected.reason.code, "code_invalid");
    await assert.rejects(registerWithCode(input), (error: unknown) => (error as { code: string }).code === "code_invalid");
    assert.equal((await db.inviteCode.findUniqueOrThrow({ where: { id: invite.id } })).usedCount, 1);
    return { ...proof, replay: "code_invalid" };
  });

  await scenario("模板：两管理员同时发布同一PASS待审仅1成功1审计", async () => {
    const author = await fixtureUser("author");
    const admins = await Promise.all([fixtureUser("admin1", "ADMIN"), fixtureUser("admin2", "ADMIN")]);
    const template = await fixtureTemplate(author.id, "publish");
    const { waiting, outcomes } = await lockedRace("templates", template.id, admins.map(admin => () =>
      reviewTemplateManually(template.id, admin.id, { action: "publish", note: `人工复核 ${admin.id}` })));
    const after = await db.template.findUniqueOrThrow({ where: { id: template.id } });
    const audits = await db.auditLog.findMany({ where: { resourceType: "template", resourceId: template.id } });
    const proof = { templateId: template.id, waiting, outcomes: summarize(outcomes), status: after.status, audits: audits.length, actions: audits.map(row => row.action) };
    evidence(proof);
    assert.equal(outcomes.filter(outcome => outcome.status === "fulfilled").length, 1);
    const winner = outcomes.findIndex(outcome => outcome.status === "fulfilled");
    for (const outcome of outcomes) if (outcome.status === "rejected") assert.equal(outcome.reason.status, 409);
    assert.equal(after.status, "PUBLISHED");
    assert.equal(audits.length, 1);
    assert.equal(audits[0].action, "TEMPLATE_PUBLISHED");
    assert.equal(audits[0].actorId, admins[winner].id);
    assert.equal((audits[0].before as { status: string }).status, "PENDING");
    assert.equal((audits[0].after as { status: string }).status, "PUBLISHED");
    assert.equal(after.reviewNote, `人工复核 ${admins[winner].id}`);
    return proof;
  });

  await scenario("模板：真实审计外键失败回滚发布状态", async () => {
    const author = await fixtureUser("auditowner");
    const template = await fixtureTemplate(author.id, "auditrollback");
    const [outcome] = await Promise.allSettled([reviewTemplateManually(template.id, `${prefix}_missing_actor`, { action: "publish", note: "触发真实审计外键错误" })]);
    const after = await db.template.findUniqueOrThrow({ where: { id: template.id } });
    const proof = { templateId: template.id, outcome: summarize([outcome])[0], status: after.status,
      audits: await db.auditLog.count({ where: { resourceType: "template", resourceId: template.id } }),
      templateUnchanged: JSON.stringify(after) === JSON.stringify(template) };
    evidence(proof);
    assert.equal(outcome.status, "rejected");
    if (outcome.status === "rejected") assert.equal(outcome.reason.code, "P2003");
    assert.deepEqual(after, template);
    assert.equal(proof.audits, 0);
    return proof;
  });

  // 两次复查都保持 PENDING；只改变版本而不改变状态，专门捕获缺失 updatedAt CAS。
  await scenario("模板：AI复查撤销旧PASS且迟到版本不能覆盖新结果", async () => {
    const author = await fixtureUser("aiowner");
    const admins = await Promise.all([fixtureUser("aiadmin1", "ADMIN"), fixtureUser("aiadmin2", "ADMIN")]);
    const template = await fixtureTemplate(author.id, "cas");
    const entered = [deferred<void>(), deferred<void>()];
    const replies = [deferred<Response>(), deferred<Response>()];
    const requests: Promise<PromiseSettledResult<unknown>[]>[] = [];
    let requestIndex = 0;
    aiHandler = async init => {
      const index = requestIndex++;
      assert.ok(index < 2, "仅预期两次 AI 复查");
      const body = JSON.parse(String(init?.body));
      assert.equal(body.model, "integration-review");
      assert.equal(JSON.parse(body.messages[1].content).template.title, template.title);
      entered[index].resolve();
      return replies[index].promise;
    };
    try {
      requests.push(Promise.allSettled([recheckTemplate(template.id, admins[0].id)]));
      await deadline(entered[0].promise, "第一版AI请求到达外部边界");
      const frozen1 = await db.template.findUniqueOrThrow({ where: { id: template.id } });
      assert.equal(frozen1.status, "PENDING");
      assert.equal(frozen1.reviewScore, null);
      assert.ok(frozen1.updatedAt > template.updatedAt);
      await assert.rejects(reviewTemplateManually(template.id, admins[1].id, { action: "publish", note: "不得使用已撤销PASS" }),
        (error: unknown) => (error as { status: number }).status === 409);
      requests.push(Promise.allSettled([recheckTemplate(template.id, admins[1].id)]));
      await deadline(entered[1].promise, "第二版AI请求到达外部边界");
      const frozen2 = await db.template.findUniqueOrThrow({ where: { id: template.id } });
      assert.equal(frozen2.status, "PENDING");
      assert.equal(frozen2.reviewScore, null);
      assert.ok(frozen2.updatedAt > frozen1.updatedAt);
      replies[1].resolve(aiResponse("第二版新结果"));
      const [newOutcome] = await requests[1];
      assert.equal(newOutcome.status, "fulfilled");
      const newest = await db.template.findUniqueOrThrow({ where: { id: template.id } });
      assert.equal((newest.reviewScore as { reason: string }).reason, "第二版新结果");
      replies[0].resolve(aiResponse("第一版迟到旧结果"));
      const [oldOutcome] = await requests[0];
      const after = await db.template.findUniqueOrThrow({ where: { id: template.id } });
      const audits = await db.auditLog.findMany({ where: { resourceType: "template", resourceId: template.id } });
      const proof = { templateId: template.id, oldOutcome: summarize([oldOutcome])[0], newOutcome: summarize([newOutcome])[0],
        versions: [template, frozen1, frozen2, newest, after].map(row => row.updatedAt.toISOString()),
        finalReason: (after.reviewScore as { reason: string }).reason, status: after.status,
        requestedAudits: audits.filter(row => row.action === "TEMPLATE_AI_RECHECK_REQUESTED").length,
        completedAudits: audits.filter(row => row.action === "TEMPLATE_AI_REVIEWED").length,
        publishedAudits: audits.filter(row => row.action === "TEMPLATE_PUBLISHED").length };
      evidence(proof);
      assert.equal(oldOutcome.status, "rejected");
      if (oldOutcome.status === "rejected") assert.equal(oldOutcome.reason.status, 409);
      assert.deepEqual(after, newest);
      assert.equal(after.status, "PENDING");
      assert.equal(proof.requestedAudits, 2);
      assert.equal(proof.completedAudits, 1);
      assert.equal(proof.publishedAudits, 0);
      assert.equal(audits.length, 3);
      assert.equal(audits.find(row => row.action === "TEMPLATE_AI_REVIEWED")?.actorId, admins[1].id);
      return proof;
    } finally {
      replies.forEach(reply => reply.resolve(aiResponse("测试收尾结果")));
      await Promise.all(requests);
      aiHandler = undefined;
    }
  });

  results.push({ scenario: "Profile 昵称锁", status: "SKIP", evidence: "路由依赖 NextAuth/Next.js 请求上下文；本轮不引入内部 auth mock，不将手写SQL等价测试冒充路由集成测试" });
  console.log("SKIP", "Profile 昵称锁：需完整认证请求上下文，本轮未覆盖");
  await scenario("隔离检查：无.env读取、无未声明外部请求、DB真实", async () => {
    assert.equal(blockedEnvReads, 0, "依赖曾尝试读取.env（已阻断）");
    assert.equal(externalCalls.unexpected, 0);
    const fs = requireLocal("node:fs") as typeof import("node:fs");
    const fsPromises = requireLocal("node:fs/promises") as typeof import("node:fs/promises");
    assert.throws(() => fs.readFileSync(".env"), /禁止读取/);
    await assert.rejects(async () => fsPromises.readFile(".env.local"), /禁止读取/);
    assert.equal(blockedEnvReads, 2);
    return { businessEnvReadAttempts: blockedEnvReads - 2, explicitGuardProbesBlocked: 2, externalCalls,
      fixturePrefix: prefix, cleanup: "保留本轮fixtures；未清空任何表、未停止或删除容器" };
  });
}

async function run() {
  try { await main(); }
  catch (error) {
    results.push({ scenario: "启动或数据库安全校验", status: "FAIL", evidence: details(error) });
    console.error("FATAL", JSON.stringify(details(error)));
    process.exitCode = 1;
  } finally {
    try { await Promise.all([db?.$disconnect(), observer?.$disconnect()]); }
    catch (error) {
      results.push({ scenario: "断开测试连接", status: "FAIL", evidence: details(error) });
      process.exitCode = 1;
    }
    console.log("SUMMARY", JSON.stringify({ prefix, pass: results.filter(row => row.status === "PASS").length,
      fail: results.filter(row => row.status === "FAIL").length, skip: results.filter(row => row.status === "SKIP").length,
      scenarios: results, exitCode: process.exitCode ?? 0 }));
  }
  assert.equal(results.filter(row => row.status === "FAIL").length, 0, "存在失败场景，参见控制台实际证据");
}

test("ANS P0/P1：白名单真实 PostgreSQL 集成场景", run, 120000);
