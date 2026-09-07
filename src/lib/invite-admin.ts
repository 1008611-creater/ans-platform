// 邀请码管理（仅管理员）：生成、列表、审计核销明细。
// 独立成 lib 便于单测；审计入口由 `/api/admin/invites` 暴露。
import { randomInt } from "node:crypto";
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
  return `${head}${"*".repeat(Math.max(1, local.length - 1))}@${domain}`;
}