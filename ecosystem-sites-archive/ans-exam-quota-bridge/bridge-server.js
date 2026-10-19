"use strict";
const http = require("node:http");
const https = require("node:https");
const fs = require("node:fs");
const { createHash, randomUUID } = require("node:crypto");
const { PrismaClient } = require("/app/node_modules/@prisma/client");
const bcrypt = require("/app/node_modules/bcryptjs");

const key = String(process.env.EXAM_ANALYSIS_QUOTA_KEY || "");
const allowedRemotes = String(process.env.ALLOWED_REMOTE_IP || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const tlsCert = String(process.env.EXAM_ANALYSIS_QUOTA_TLS_CERT || "");
const tlsKey = String(process.env.EXAM_ANALYSIS_QUOTA_TLS_KEY || "");

if (key.length < 40) throw new Error("quota bridge configuration missing");
const db = new PrismaClient();

function isAllowedIp(rawIp) {
  const ip = String(rawIp || "").replace(/^::ffff:/, "");
  if (
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip.startsWith("172.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("10.")
  ) {
    return true;
  }
  return allowedRemotes.includes(ip);
}

async function lockAccount(tx, id) {
  await tx.$queryRaw`SELECT id FROM users WHERE id=${id} FOR UPDATE`;
}

function settlementKey(input, refType) {
  return (
    refType +
    "-settle:" +
    createHash("sha256")
      .update(JSON.stringify([input.subject, input.refId]))
      .digest("hex")
  );
}

function send(res, status, data) {
  const body = Buffer.from(JSON.stringify(data));
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "content-length": body.length,
  });
  res.end(body);
}

function fail(code, message, status) {
  const e = new Error(message);
  e.code = code;
  e.status = status;
  return e;
}

function normalizeVoucher(code) {
  return String(code || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]/g, "");
}

function hashVoucher(code) {
  return createHash("sha256").update(normalizeVoucher(code)).digest("hex");
}

async function resolveSubject(input) {
  if (input && typeof input.subject === "string" && input.subject.trim()) {
    return input.subject.trim();
  }
  const email = input && typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  if (email) {
    const u = await db.user.findFirst({ where: { email, deletedAt: null }, select: { id: true } });
    if (u) {
      input.subject = u.id;
      return u.id;
    }
  }
  return "";
}

function validate(input) {
  if (
    !input ||
    typeof input.subject !== "string" ||
    !input.subject ||
    input.subject.length > 256 ||
    /[\u0000-\u001f\u007f]/.test(input.subject)
  ) {
    throw fail("INVALID", "ANS账号身份无效", 400);
  }
  if (
    typeof input.refId !== "string" ||
    !/^[A-Za-z0-9:._-]{1,160}$/.test(input.refId)
  ) {
    throw fail("INVALID", "积分幂等编号无效", 400);
  }
  if (
    !Number.isSafeInteger(input.costPoints) ||
    input.costPoints < 1 ||
    input.costPoints > 5000
  ) {
    throw fail("INVALID", "积分消耗无效", 400);
  }
}

async function getBalanceNum(tx, id) {
  const u = await tx.user.findUnique({
    where: { id },
    select: { quotaPoints: true },
  });
  return Number(u?.quotaPoints ?? 0);
}

async function queryBalance(input) {
  const subject = typeof input.subject === "string" ? input.subject.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  if (!subject && !email) throw fail("INVALID", "缺少账号标识", 400);
  const user = await db.user.findFirst({
    where: subject ? { id: subject, deletedAt: null } : { email, deletedAt: null },
    select: {
      id: true,
      email: true,
      name: true,
      username: true,
      role: true,
      quotaPoints: true,
      flagged: true,
    },
  });
  if (!user) throw fail("ACCOUNT_UNAVAILABLE", "ANS账号不存在", 404);
  const ledgers = await db.quotaLedger.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: Number.isSafeInteger(input.limit) ? Math.min(50, Math.max(1, input.limit)) : 20,
    select: {
      id: true,
      amount: true,
      balanceAfter: true,
      reason: true,
      refType: true,
      refId: true,
      note: true,
      createdAt: true,
    },
  });
  return {
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name || user.username || user.email,
      role: user.role,
      flagged: user.flagged,
    },
    balance: Number(user.quotaPoints ?? 0),
    ledger: ledgers.map((l) => ({
      id: l.id,
      delta: Number(l.amount),
      balanceAfter: Number(l.balanceAfter ?? 0),
      reason: l.reason,
      refType: l.refType,
      taskId: l.refId,
      note: l.note,
      createdAt: l.createdAt,
    })),
  };
}

async function handleAuth(input) {
  const mode = String(input.mode || "login");
  const email = String(input.email || "").trim().toLowerCase();
  const oidcSubject = String(input.subject || "").trim();

  if (mode === "lookup" || mode === "oidc") {
    const user = await db.user.findFirst({
      where: oidcSubject
        ? { id: oidcSubject, deletedAt: null }
        : { email, deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        role: true,
        quotaPoints: true,
        flagged: true,
      },
    });
    if (!user) throw fail("ACCOUNT_UNAVAILABLE", "ANS账号不存在", 404);
    if (user.flagged) throw fail("ACCOUNT_UNAVAILABLE", "ANS账号当前受限", 403);
    return {
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name || user.username || user.email,
        role: user.role,
      },
      balance: Number(user.quotaPoints ?? 0),
    };
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw fail("INVALID_EMAIL", "邮箱格式不正确", 400);
  }
  const password = String(input.password || "");

  if (mode === "register") {
    if (password.length < 8) throw fail("WEAK_PASSWORD", "密码至少 8 位", 400);
    const existing = await db.user.findFirst({
      where: { email },
      select: { id: true },
    });
    if (existing) throw fail("EMAIL_TAKEN", "该邮箱已在 ANS 注册，请直接登录", 409);
    const passwordHash = await bcrypt.hash(password, 12);
    const baseName =
      String(input.displayName || "").trim().slice(0, 40) ||
      email.split("@")[0].slice(0, 30);
    const uniqueUsername =
      email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").slice(0, 16) +
      "_" +
      randomUUID().slice(0, 6);
    const created = await db.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          email,
          name: baseName,
          username: uniqueUsername,
          password: passwordHash,
          quotaPoints: 10,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          quotaPoints: true,
        },
      });
      await tx.quotaLedger.create({
        data: {
          userId: u.id,
          amount: 10,
          balanceAfter: 10,
          reason: "CLAIM",
          refType: "welcome",
          refId: "ans-welcome:" + u.id,
          note: "ANS 新用户注册赠送 10 积分",
        },
      });
      return u;
    });
    return {
      ok: true,
      user: {
        id: created.id,
        email: created.email,
        name: created.name,
        role: created.role,
      },
      balance: Number(created.quotaPoints ?? 0),
    };
  }

  // mode === "login"
  const user = await db.user.findFirst({
    where: { email, deletedAt: null },
    select: {
      id: true,
      email: true,
      name: true,
      username: true,
      role: true,
      password: true,
      quotaPoints: true,
      flagged: true,
    },
  });
  if (!user || !user.password) {
    throw fail("INVALID_CREDENTIALS", "ANS 邮箱或密码错误", 401);
  }
  if (user.flagged) throw fail("ACCOUNT_UNAVAILABLE", "ANS账号当前受限", 403);
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw fail("INVALID_CREDENTIALS", "ANS 邮箱或密码错误", 401);
  return {
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name || user.username || user.email,
      role: user.role,
    },
    balance: Number(user.quotaPoints ?? 0),
  };
}

async function handleRedeem(input) {
  const userId = await resolveSubject(input);
  const normalized = normalizeVoucher(input.code);
  if (!userId) throw fail("INVALID", "缺少 ANS 账号标识", 400);
  if (!/^ANS[0-9A-F]{40}$/.test(normalized)) {
    throw fail(
      "VOUCHER_INVALID",
      "请输入有效的 ANS 算力兑换码（ANS-XXXX-...）",
      400
    );
  }
  return db.$transaction(async (tx) => {
    await lockAccount(tx, userId);
    const v = await tx.creditVoucher.findUnique({
      where: { codeHash: hashVoucher(normalized) },
    });
    if (!v) throw fail("VOUCHER_INVALID", "兑换码无效或不存在", 400);
    const account = await tx.user.findFirst({
      where: { id: userId, deletedAt: null, flagged: false },
      select: { quotaPoints: true },
    });
    if (!account) throw fail("ACCOUNT_UNAVAILABLE", "ANS账号不可用", 403);
    if (v.redeemedBy) {
      if (v.redeemedBy !== userId) {
        throw fail("VOUCHER_USED", "该兑换码已被使用", 409);
      }
      return {
        ok: true,
        pointsAdded: Number(v.points),
        balance: Number(account.quotaPoints),
        duplicate: true,
      };
    }
    if (v.revokedAt || (v.expiresAt && v.expiresAt <= new Date())) {
      throw fail("VOUCHER_INVALID", "兑换码已过期或已作废", 400);
    }
    const c = await tx.creditVoucher.updateMany({
      where: { id: v.id, redeemedAt: null, revokedAt: null },
      data: { redeemedBy: userId, redeemedAt: new Date() },
    });
    if (c.count !== 1) throw fail("VOUCHER_USED", "该兑换码已被使用", 409);
    await tx.user.update({
      where: { id: userId },
      data: { quotaPoints: { increment: v.points } },
    });
    const u = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { quotaPoints: true },
    });
    const op = await tx.quotaOperation.create({
      data: {
        operationKey: "voucher:" + v.id,
        requestHash: v.codeHash,
        userId,
        actorId: userId,
        kind: "TOP_UP",
        amount: v.points,
        balanceAfter: u.quotaPoints,
        evidenceRef: "voucher:" + v.id,
        note: "ANS 算力兑换码核销",
      },
    });
    await tx.quotaLedger.create({
      data: {
        userId,
        amount: v.points,
        balanceAfter: u.quotaPoints,
        reason: "RECHARGE",
        refType: "recharge",
        refId: op.id,
        note: "ANS 算力兑换码核销",
      },
    });
    return {
      ok: true,
      pointsAdded: Number(v.points),
      balance: Number(u.quotaPoints),
      duplicate: false,
    };
  });
}

async function reserve(input) {
  await resolveSubject(input);
  validate(input);
  const refType =
    typeof input.refType === "string" && /^[a-z0-9_-]{2,40}$/.test(input.refType)
      ? input.refType
      : "exam-analysis";
  const note =
    typeof input.note === "string" && input.note.trim()
      ? input.note.trim().slice(0, 120)
      : refType === "exam-analysis"
      ? "考公错题分析调用"
      : `ANS 算力预占 (${refType})`;
  return db.$transaction(async (tx) => {
    await lockAccount(tx, input.subject);
    const old = await tx.quotaLedger.findFirst({
      where: {
        userId: input.subject,
        reason: "RUN_COST",
        refType,
        refId: input.refId,
      },
      select: { amount: true, balanceAfter: true },
    });
    if (old) {
      if (Number(old.amount) !== -input.costPoints) {
        throw fail("CONFLICT", "同一任务的积分消耗不一致", 409);
      }
      return {
        ok: true,
        duplicate: true,
        balance: Number(
          old.balanceAfter ?? (await getBalanceNum(tx, input.subject))
        ),
      };
    }
    const user = await tx.user.findUnique({
      where: { id: input.subject },
      select: { id: true, quotaPoints: true, flagged: true, deletedAt: true },
    });
    if (!user || user.deletedAt) {
      throw fail("ACCOUNT_UNAVAILABLE", "ANS账号不可用", 401);
    }
    if (user.flagged) {
      throw fail("ACCOUNT_UNAVAILABLE", "ANS账号当前受限", 403);
    }
    const updated = await tx.user.updateMany({
      where: {
        id: input.subject,
        quotaPoints: { gte: input.costPoints },
        flagged: false,
        deletedAt: null,
      },
      data: { quotaPoints: { decrement: input.costPoints } },
    });
    if (updated.count !== 1) {
      throw fail(
        "INSUFFICIENT_QUOTA",
        `ANS积分不足，本次需要${input.costPoints}点（请前往 ans.cauai.fun/workspace/credits 充值或领福利）`,
        402
      );
    }
    const after = await getBalanceNum(tx, input.subject);
    await tx.quotaLedger.create({
      data: {
        userId: input.subject,
        amount: -input.costPoints,
        balanceAfter: after,
        reason: "RUN_COST",
        refType,
        refId: input.refId,
        note,
      },
    });
    return { ok: true, duplicate: false, balance: after };
  });
}

async function settle(input) {
  await resolveSubject(input);
  validate(input);
  if (typeof input.success !== "boolean") {
    throw fail("INVALID", "success must be boolean", 400);
  }
  const refType =
    typeof input.refType === "string" && /^[a-z0-9_-]{2,40}$/.test(input.refType)
      ? input.refType
      : "exam-analysis";
  const actualCost =
    input.success &&
    Number.isSafeInteger(input.actualCostPoints) &&
    input.actualCostPoints >= 0 &&
    input.actualCostPoints <= input.costPoints
      ? input.actualCostPoints
      : input.success
      ? input.costPoints
      : 0;
  const refundAmount = Math.max(0, input.costPoints - actualCost);

  return db.$transaction(async (tx) => {
    await lockAccount(tx, input.subject);
    const debit = await tx.quotaLedger.findFirst({
      where: {
        userId: input.subject,
        reason: "RUN_COST",
        refType,
        refId: input.refId,
      },
      select: { amount: true },
    });
    if (!debit) throw fail("NOT_FOUND", "missing debit", 404);
    const reservedAmt = Math.abs(Number(debit.amount));
    const operationKey = settlementKey(input, refType);
    const requestHash = createHash("sha256")
      .update(JSON.stringify([input.costPoints, input.success, actualCost]))
      .digest("hex");
    const previous = await tx.auditLog.findFirst({
      where: {
        actorId: input.subject,
        action: "EXAM_ANALYSIS_SETTLED",
        resourceType: refType,
        resourceId: operationKey,
      },
    });
    if (previous) {
      return {
        ok: true,
        duplicate: true,
        refunded: refundAmount > 0,
        refundAmount,
        balance: await getBalanceNum(tx, input.subject),
      };
    }
    const refund = await tx.quotaLedger.findFirst({
      where: {
        userId: input.subject,
        reason: "REFUND",
        refType,
        refId: input.refId,
      },
    });
    if (!refund && refundAmount > 0) {
      const user = await tx.user.update({
        where: { id: input.subject },
        data: { quotaPoints: { increment: refundAmount } },
        select: { quotaPoints: true },
      });
      await tx.quotaLedger.create({
        data: {
          userId: input.subject,
          amount: refundAmount,
          balanceAfter: user.quotaPoints,
          reason: "REFUND",
          refType,
          refId: input.refId,
          note: input.success
            ? `ANS 算力差额退回 (${refType})`
            : `ANS 算力失败全额退回 (${refType})`,
        },
      });
    }
    const after = await getBalanceNum(tx, input.subject);
    await tx.auditLog.create({
      data: {
        actorId: input.subject,
        action: "EXAM_ANALYSIS_SETTLED",
        resourceType: refType,
        resourceId: operationKey,
        metadata: {
          requestHash,
          costPoints: input.costPoints,
          actualCostPoints: actualCost,
          refundAmount,
          success: input.success,
          refId: input.refId,
        },
      },
    });
    return {
      ok: true,
      duplicate: !!refund,
      refunded: refundAmount > 0,
      refundAmount,
      balance: after,
    };
  });
}

function read(req) {
  return new Promise((resolve, reject) => {
    let n = 0;
    const parts = [];
    req.on("data", (b) => {
      n += b.length;
      if (n > 65536) reject(fail("INVALID", "请求过大", 413));
      else parts.push(b);
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(parts).toString("utf8")));
      } catch {
        reject(fail("INVALID", "请求格式不正确", 400));
      }
    });
    req.on("error", () => reject(fail("INVALID", "请求读取失败", 400)));
  });
}

const handler = async (req, res) => {
  if (
    req.method === "GET" &&
    (req.url === "/health" || req.url === "/api/health") &&
    isAllowedIp(req.socket.remoteAddress)
  ) {
    try {
      await db.$queryRaw`SELECT 1`;
      return send(res, 200, { status: "healthy" });
    } catch {
      return send(res, 503, { status: "unavailable" });
    }
  }
  if (!isAllowedIp(req.socket.remoteAddress)) {
    return send(res, 404, { error: "not_found" });
  }
  if (req.method !== "POST" || req.url !== "/quota") {
    return send(res, 404, { error: "not_found" });
  }
  if (req.headers.authorization !== "Bearer " + key) {
    return send(res, 404, { error: "not_found" });
  }
  try {
    const b = await read(req);
    let result;
    if (b.operation === "reserve") result = await reserve(b);
    else if (b.operation === "settle") result = await settle(b);
    else if (b.operation === "balance") result = await queryBalance(b);
    else if (b.operation === "auth") result = await handleAuth(b);
    else if (b.operation === "redeem") result = await handleRedeem(b);
    else throw fail("INVALID", "积分操作无效", 400);
    return send(res, 200, result);
  } catch (e) {
    if (e.code) {
      return send(res, e.status || 503, {
        error: String(e.code).toLowerCase(),
        message: e.message,
      });
    }
    console.error("[ans-quota-bridge] error:", e);
    return send(res, 503, {
      error: "server_error",
      message: "ANS 积分结算服务暂时不可用",
    });
  }
};

const server = tlsCert
  ? https.createServer(
      { cert: fs.readFileSync(tlsCert), key: fs.readFileSync(tlsKey) },
      handler
    )
  : http.createServer(handler);
server.requestTimeout = 15000;
server.headersTimeout = 10000;
server.listen(Number(process.env.EXAM_ANALYSIS_QUOTA_PORT || 8160), "0.0.0.0");

// Plain HTTP listener on 3000 (0.0.0.0 inside container) for internal Docker network + healthcheck
const internalServer = http.createServer(handler);
internalServer.requestTimeout = 15000;
internalServer.headersTimeout = 10000;
internalServer.listen(3000, "0.0.0.0");

process.once("SIGTERM", async () => {
  internalServer.close();
  await db.$disconnect();
  server.close(() => process.exit(0));
});
