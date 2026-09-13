// 邀请码管理（仅管理员）：生成、列表、审计核销明细、邮件发送。
// 独立成 lib 便于单测；接口由 `/api/admin/invites` 与 `/api/admin/invites/send` 暴露。
import { createHash, randomInt } from "node:crypto";
import { db } from "@/lib/db";

export class InviteError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

// 邀请码字符集：去掉易混淆的 I/L/O/0/1。
export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 8;
export const DEFAULT_MAX_USES = 5;
export const DEFAULT_EXPIRES_DAYS = 30;
// 同一邀请码发给同一邮箱的最小间隔，避免误点造成重复投递。
export const INVITE_EMAIL_COOLDOWN_SECONDS = 60;
export const INVITE_EMAIL_SUBJECT = "ANS 平台邀请码";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function generateInviteCode(length = CODE_LENGTH): string {
  let code = "";
  for (let i = 0; i < length; i += 1) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

function parseCreateInput(input: unknown) {
  const raw = (input ?? {}) as Record<string, unknown>;
  if (raw && typeof raw !== "object") throw new InviteError(400, "validation_error", "请求内容无效");
  const maxUses = raw.maxUses === undefined ? DEFAULT_MAX_USES : Number(raw.maxUses);
  const expiresDays = raw.expiresDays === undefined ? DEFAULT_EXPIRES_DAYS : Number(raw.expiresDays);
  if (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > 100) {
    throw new InviteError(400, "validation_error", "单码使用上限需为 1-100 的整数");
  }
  if (!Number.isInteger(expiresDays) || expiresDays < 1 || expiresDays > 365) {
    throw new InviteError(400, "validation_error", "有效期需为 1-365 天的整数");
  }
  return { maxUses, expiresDays };
}

export async function createInvite(creatorId: string, input: unknown) {
  const { maxUses, expiresDays } = parseCreateInput(input);
  const expiresAt = new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000);
  // 碰撞概率极低；命中唯一约束时换码重试。
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateInviteCode();
    try {
      const invite = await db.inviteCode.create({
        data: { code, creatorId, maxUses, expiresAt },
        select: { id: true, code: true, maxUses: true, expiresAt: true, createdAt: true },
      });
      return invite;
    } catch (error) {
      const isUnique = error instanceof Error && "code" in error && (error as { code?: string }).code === "P2002";
      if (!isUnique) throw error;
    }
  }
  throw new InviteError(503, "server_error", "邀请码生成失败，请重试");
}

const listSelect = {
  id: true,
  code: true,
  maxUses: true,
  usedCount: true,
  expiresAt: true,
  createdAt: true,
  creator: { select: { id: true, nickname: true, username: true, email: true } },
  emailDeliveries: {
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, email: true, createdAt: true },
  },
  redemptions: {
    orderBy: { usedAt: "desc" },
    take: 100,
    select: {
      id: true,
      usedAt: true,
      usedBy: { select: { id: true, nickname: true, username: true, email: true } },
    },
  },
} as const;

export async function listInvites(page = 1) {
  const safePage = Math.max(1, Math.min(10000, Math.floor(page || 1)));
  const [items, total] = await Promise.all([
    db.inviteCode.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      skip: (safePage - 1) * 50,
      select: listSelect,
    }),
    db.inviteCode.count(),
  ]);
  return { items, total, page: safePage, pageSize: 50, totalPages: Math.max(1, Math.ceil(total / 50)) };
}

export async function listRedemptions(page = 1) {
  const safePage = Math.max(1, Math.min(10000, Math.floor(page || 1)));
  const [items, total] = await Promise.all([
    db.inviteRedemption.findMany({
      orderBy: { usedAt: "desc" },
      take: 50,
      skip: (safePage - 1) * 50,
      select: {
        id: true,
        usedAt: true,
        usedBy: { select: { id: true, nickname: true, username: true, email: true } },
        code: { select: { id: true, code: true, creator: { select: { id: true, nickname: true, username: true } } } },
      },
    }),
    db.inviteRedemption.count(),
  ]);
  return { items, total, page: safePage, pageSize: 50, totalPages: Math.max(1, Math.ceil(total / 50)) };
}

/** 邮箱审计展示用脱敏：s***@cau.edu.cn */
export function maskEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const head = local.slice(0, Math.min(1, local.length));
  return head + "*".repeat(Math.max(1, local.length - 1)) + "@" + domain;
}

/** 收件邮箱规范化：去空格、转小写，并校验基本格式。 */
export function normalizeInviteEmail(input: unknown): string {
  const email = typeof input === "string" ? input.trim().toLowerCase() : "";
  if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) {
    throw new InviteError(400, "invalid_email", "请输入有效的收件邮箱");
  }
  return email;
}

function inviteEmailEnvironment() {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!resendKey || !from) {
    throw new InviteError(503, "email_unavailable", "邮件服务暂不可用，请稍后重试");
  }
  return { resendKey, from };
}

/**
 * 幂等键按「邀请码 + 邮箱 + 分钟」生成：同一分钟内重复点击不会重复投递，
 * 间隔一分钟后仍可正常重发。
 */
export function inviteEmailIdempotencyKey(inviteId: string, email: string, now = Date.now()) {
  const bucket = Math.floor(now / 60000);
  const digest = createHash("sha256").update(inviteId + ":" + email + ":" + bucket).digest("hex").slice(0, 32);
  return "invite-" + digest;
}

export type InviteEmailTarget = {
  code: string;
  maxUses: number;
  usedCount: number;
  expiresAt: Date | null;
};

/** 邀请码邮件正文（纯文本）。 */
export function inviteEmailText(invite: InviteEmailTarget, siteUrl?: string) {
  const lines = [
    "你的 ANS 平台邀请码是：" + invite.code,
    "",
    "该邀请码最多可使用 " + invite.maxUses + " 次（当前已使用 " + invite.usedCount + " 次）。",
  ];
  if (invite.expiresAt) {
    lines.push("有效期至 " + invite.expiresAt.toLocaleDateString("zh-CN", { timeZone: "Asia/Shanghai" }) + "。");
  }
  const base = (siteUrl ?? process.env.AUTH_URL ?? "").trim().replace(/\/+$/, "");
  if (/^https?:\/\//.test(base)) lines.push("注册地址：" + base + "/register");
  lines.push("", "请勿向他人转发此邮件。若并非本人预期收到，请忽略。");
  return lines.join("\n");
}

/**
 * 把某个邀请码通过邮件发给指定邮箱（仅管理员）。
 * 校验顺序：邮箱格式 → 邀请码存在 → 未过期未用尽 → 60 秒重发冷却 → 实际投递 → 落审计记录。
 */
export async function sendInviteEmail(input: unknown, actorId: string) {
  if (input !== null && input !== undefined && typeof input !== "object") {
    throw new InviteError(400, "validation_error", "请求内容无效");
  }
  const raw = (input ?? {}) as Record<string, unknown>;
  const inviteId = typeof raw.inviteId === "string" ? raw.inviteId.trim() : "";
  if (!inviteId) throw new InviteError(400, "validation_error", "请选择要发送的邀请码");
  const email = normalizeInviteEmail(raw.email);
  const env = inviteEmailEnvironment();

  const now = new Date();
  const invite = await db.inviteCode.findUnique({
    where: { id: inviteId },
    select: { id: true, code: true, maxUses: true, usedCount: true, expiresAt: true },
  });
  if (!invite) throw new InviteError(404, "invite_not_found", "邀请码不存在");
  if (invite.expiresAt && invite.expiresAt <= now) {
    throw new InviteError(400, "invite_expired", "该邀请码已过期，请重新生成");
  }
  if (invite.usedCount >= invite.maxUses) {
    throw new InviteError(400, "invite_exhausted", "该邀请码已用尽，请重新生成");
  }

  const recent = await db.inviteEmailDelivery.findFirst({
    where: {
      codeId: invite.id,
      email,
      createdAt: { gt: new Date(now.getTime() - INVITE_EMAIL_COOLDOWN_SECONDS * 1000) },
    },
    select: { id: true },
  });
  if (recent) {
    throw new InviteError(429, "resend_cooldown", "该邀请码刚刚已发送给此邮箱，请 " + INVITE_EMAIL_COOLDOWN_SECONDS + " 秒后再试");
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + env.resendKey,
        "Content-Type": "application/json",
        "Idempotency-Key": inviteEmailIdempotencyKey(invite.id, email),
      },
      body: JSON.stringify({
        from: env.from,
        to: [email],
        subject: INVITE_EMAIL_SUBJECT,
        text: inviteEmailText(invite),
      }),
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error("delivery failed");
  } catch {
    // 不记录供应商响应、邀请码、邮箱或密钥。
    throw new InviteError(503, "email_unavailable", "邀请码邮件暂时无法发送，请稍后重试");
  }

  const delivery = await db.inviteEmailDelivery.create({
    data: { codeId: invite.id, actorId, email },
    select: { id: true, email: true, createdAt: true },
  });
  return { inviteId: invite.id, code: invite.code, email, delivery };
}
