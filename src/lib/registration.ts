import { createHash, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getConfig } from "@/lib/config";
import { isUniqueConstraintViolation } from "@/lib/db-errors";
import { RegistrationError, registrationEnvironment, verifyRegistrationChallenge, deliverRegistrationCode } from "@/lib/registration-delivery";

const TEN_MINUTES = 10 * 60 * 1000;
const MAX_BODY = 16 * 1024;
const emailSchema = z.string().trim().max(254).email().transform(value => value.toLowerCase());
const challengeSchema = z.string().min(1).max(2048);
const codeRequestSchema = z.object({ email: emailSchema, turnstileToken: challengeSchema });
const registerSchema = z.object({
  email: emailSchema,
  name: z.string().trim().min(2).max(40),
  username: z.string().trim().min(1).max(30).regex(/^[a-z0-9_]+$/).optional(),
  password: z.string().min(6).refine(value => Buffer.byteLength(value, "utf8") <= 72),
  code: z.string().regex(/^\d{6}$/),
  inviteCode: z.string().trim().max(128).optional(),
  turnstileToken: challengeSchema,
});
type Transaction = Prisma.TransactionClient;
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const namespace = (kind: string, email: string) => `ans:registration:${kind}:${digest(email)}`;
const otpDigest = (email: string, code: string) => digest(JSON.stringify(["ans:registration:otp", email, code, registrationEnvironment().secret]));
const invalidCode = () => new RegistrationError(400, "code_invalid", "验证码错误、已过期或已使用");
const invalidInvite = () => new RegistrationError(400, "invite_invalid", "非 cau.edu.cn 邮箱需要有效邀请码（最多使用 5 次）");

export async function ensureRegistrationEnabled() {
  const config = await getConfig();
  if (!config.auth.allowRegistration) throw new RegistrationError(403, "registration_disabled", "注册暂未开放");
  return registrationEnvironment();
}

export async function readRegistrationBody(request: Request): Promise<unknown> {
  const size = request.headers.get("content-length");
  if (size && Number(size) > MAX_BODY) throw new RegistrationError(413, "request_too_large", "请求内容过大");
  const reader = request.body?.getReader();
  if (!reader) throw new RegistrationError(400, "validation_error", "请求内容无效");
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY) {
        await reader.cancel();
        throw new RegistrationError(413, "request_too_large", "请求内容过大");
      }
      chunks.push(value);
    }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)));
  } catch (error) {
    if (error instanceof RegistrationError) throw error;
    throw new RegistrationError(400, "validation_error", "请求必须是有效 JSON");
  } finally { reader.releaseLock(); }
}

async function withEmailLock<T>(email: string, work: (tx: Transaction) => Promise<T>): Promise<T> {
  // PostgreSQL 事务级锁覆盖发码/重发/尝试次数/建号；不依赖单进程内存锁。
  const key = BigInt.asIntN(64, BigInt(`0x${digest(namespace("lock", email)).slice(0, 16)}`));
  return db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${key}::bigint)`;
    return work(tx);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, maxWait: 5000, timeout: 10000 });
}

async function counter(tx: Transaction, kind: string, email: string, now: Date) {
  const prefix = namespace(kind, email);
  const token = digest(prefix);
  const row = await tx.verificationToken.findUnique({ where: { token } });
  if (row && row.expires > now) {
    const count = Number(row.identifier.slice(prefix.length + 1));
    if (!row.identifier.startsWith(`${prefix}:`) || !Number.isInteger(count) || count < 0) {
      throw new RegistrationError(503, "registration_unavailable", "注册状态异常，请稍后重试");
    }
    return { prefix, token, count, expires: row.expires, exists: true };
  }
  if (row) await tx.verificationToken.deleteMany({ where: { token } });
  return { prefix, token, count: 0, expires: new Date(now.getTime() + TEN_MINUTES), exists: false };
}
async function increment(tx: Transaction, state: Awaited<ReturnType<typeof counter>>, expires = state.expires) {
  const data = { identifier: `${state.prefix}:${state.count + 1}`, expires };
  if (state.exists) await tx.verificationToken.update({ where: { token: state.token }, data });
  else await tx.verificationToken.create({ data: { ...data, token: state.token } });
}
function checkLimit(state: Awaited<ReturnType<typeof counter>>, now: Date) {
  if (state.count >= 5) throw new RegistrationError(429, "rate_limited", "尝试次数过多，请稍后再试", Math.max(1, Math.ceil((state.expires.getTime() - now.getTime()) / 1000)));
}

export async function sendRegistrationCode(body: unknown) {
  const parsed = codeRequestSchema.safeParse(body);
  if (!parsed.success) throw new RegistrationError(400, "validation_error", "请填写有效邮箱并完成人机验证");
  const { email, turnstileToken } = parsed.data;
  await verifyRegistrationChallenge(turnstileToken);
  const reservation = await withEmailLock(email, async tx => {
    const now = new Date();
    const attempts = await counter(tx, "attempts", email, now);
    checkLimit(attempts, now);
    const sends = await counter(tx, "sends", email, now);
    checkLimit(sends, now);
    const cooldown = digest(namespace("cooldown", email));
    const previous = await tx.verificationToken.findUnique({ where: { token: cooldown } });
    if (previous && previous.expires > now) throw new RegistrationError(429, "resend_cooldown", "请等待 60 秒后再发送", Math.ceil((previous.expires.getTime() - now.getTime()) / 1000));
    await tx.verificationToken.deleteMany({ where: { token: cooldown } });
    await tx.verificationToken.create({ data: { identifier: namespace("cooldown", email), token: cooldown, expires: new Date(now.getTime() + 60000) } });
    await increment(tx, sends);
    // 重发不能使仍有效的新码在旧错误窗口结束时获得额外尝试。
    if (attempts.exists) await tx.verificationToken.update({ where: { token: attempts.token }, data: { expires: new Date(now.getTime() + TEN_MINUTES) } });
    const identifier = namespace("otp", email);
    const old = await tx.verificationToken.findFirst({ where: { identifier } });
    let code: string, token: string;
    do { code = randomInt(0, 1000000).toString().padStart(6, "0"); token = otpDigest(email, code); } while (token === old?.token);
    await tx.verificationToken.deleteMany({ where: { identifier } });
    await tx.verificationToken.create({ data: { identifier, token, expires: new Date(now.getTime() + TEN_MINUTES) } });
    return { code, token, identifier };
  });
  try {
    await deliverRegistrationCode(email, reservation.code, randomUUID());
  } catch (error) {
    // 精确删除本次摘要，不能删除已被并发重发替换的新码；冷却和计数保留。
    await withEmailLock(email, tx => tx.verificationToken.deleteMany({ where: { identifier: reservation.identifier, token: reservation.token } }));
    throw error;
  }
  return { success: true, retryAfter: 60, expiresIn: 600 };
}

export async function registerWithCode(body: unknown) {
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) throw new RegistrationError(400, "validation_error", "请检查昵称、邮箱、密码（6 位以上且不超过 72 字节）和验证码");
  const { email, name, password, code, inviteCode, turnstileToken } = parsed.data;
  await verifyRegistrationChallenge(turnstileToken);
  const username = parsed.data.username ?? `u_${randomUUID().replaceAll("-", "").slice(0, 24)}`;
  const passwordHash = await bcrypt.hash(password, 12);
  const outcome = await withEmailLock(email, async tx => {
    const now = new Date();
    const attempts = await counter(tx, "attempts", email, now);
    checkLimit(attempts, now);
    const identifier = namespace("otp", email);
    const stored = await tx.verificationToken.findFirst({ where: { identifier } });
    const expected = otpDigest(email, code);
    if (!stored || stored.expires <= now || !/^[a-f0-9]{64}$/.test(stored.token) || !timingSafeEqual(Buffer.from(stored.token, "hex"), Buffer.from(expected, "hex"))) {
      // 返回错误而非抛出，确保失败计数提交，不能随事务回滚。
      await increment(tx, attempts, attempts.count === 4 ? new Date(now.getTime() + TEN_MINUTES) : attempts.expires);
      return { error: attempts.count >= 4 ? new RegistrationError(429, "rate_limited", "验证码错误次数已达 5 次，请 10 分钟后重试", 600) : invalidCode() };
    }
    const existing = await tx.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { id: true } });
    if (existing) throw new RegistrationError(409, "email_taken", "该邮箱已注册，请使用原账号登录");
    let codeId: string | undefined;
    if (email.split("@")[1] !== "cau.edu.cn") {
      if (!inviteCode) throw invalidInvite();
      const invite = await tx.inviteCode.findUnique({ where: { code: inviteCode } });
      const inviteNow = new Date();
      if (!invite || invite.maxUses <= 0 || invite.usedCount >= Math.min(5, invite.maxUses) || (invite.expiresAt && invite.expiresAt <= inviteNow)) throw invalidInvite();
      const updated = await tx.inviteCode.updateMany({
        where: { id: invite.id, maxUses: invite.maxUses, usedCount: { lt: Math.min(5, invite.maxUses) }, OR: [{ expiresAt: null }, { expiresAt: { gt: inviteNow } }] },
        data: { usedCount: { increment: 1 } },
      });
      if (updated.count !== 1) throw invalidInvite();
      codeId = invite.id;
    }
    const verifiedAt = new Date();
    const consumed = await tx.verificationToken.deleteMany({ where: { identifier, token: expected, expires: { gt: verifiedAt } } });
    if (consumed.count !== 1) throw invalidCode();
    const user = await tx.user.create({ data: { email, username, name, nickname: name, nicknameSetAt: now, password: passwordHash, locale: "zh", emailVerified: now }, select: { id: true, name: true, username: true, email: true } });
    if (codeId) await tx.inviteRedemption.create({ data: { codeId, usedById: user.id } });
    await tx.verificationToken.deleteMany({ where: { token: attempts.token } });
    return { user };
  });
  if (outcome.error) throw outcome.error;
  return { id: outcome.user.id, name: outcome.user.name, username: outcome.user.username, email: outcome.user.email };
}

export function registrationErrorResponse(error: unknown) {
  let failure = error instanceof RegistrationError ? error : undefined;
  if (isUniqueConstraintViolation(error, "email")) failure = new RegistrationError(409, "email_taken", "该邮箱已注册，请使用原账号登录");
  if (isUniqueConstraintViolation(error, "username")) failure = new RegistrationError(409, "username_taken", "用户名已被使用，请更换");
  // 不输出异常对象，避免数据库错误携带请求数据或凭据。
  return Response.json({ error: failure?.code ?? "server_error", message: failure?.message ?? "注册服务出现异常，请稍后再试" }, {
    status: failure?.status ?? 500,
    headers: { "Cache-Control": "no-store", ...(failure?.retryAfter ? { "Retry-After": String(failure.retryAfter) } : {}) },
  });
}
