import type { DbTransaction } from "@/lib/db";
import { hasAdminPermission } from "@/lib/admin-permission-values";
import { db } from "@/lib/db";

/**
 * 算力点扣减与退费。
 *
 * 扣减使用条件更新（quotaPoints >= cost 且账号可用），因此并发请求不会
 * 把余额扣成负数；退费只在状态机允许的窗口内执行一次，避免重复退费。
 */

export class QuotaError extends Error {
  constructor(
    message: string,
    public readonly code: "INSUFFICIENT_QUOTA" | "ACCOUNT_UNAVAILABLE" = "INSUFFICIENT_QUOTA",
    public readonly status = 402,
  ) {
    super(message);
    this.name = "QuotaError";
  }
}

export type QuotaRef = { type: string; id: string };

/** Amounts are stored to six decimal places; reject values outside JS safe units. */
export function normalizeQuotaAmount(amount: number): number {
  if (!Number.isFinite(amount) || !Number.isSafeInteger(Math.round(amount * 1e6))) {
    throw new QuotaError("INVALID_CREDIT_AMOUNT", "ACCOUNT_UNAVAILABLE", 400);
  }
  return Math.round(amount * 1e6) / 1e6;
}


export async function assertAccountCanSpend(
  tx: DbTransaction,
  userId: string,
  costPoints: number,
) {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { id: true, quotaPoints: true, flagged: true, deletedAt: true },
  });
  if (!user || user.deletedAt) throw new QuotaError("账号不可用", "ACCOUNT_UNAVAILABLE", 401);
  if (user.flagged) throw new QuotaError("账号受限，暂时无法运行", "ACCOUNT_UNAVAILABLE", 403);
  if (Number(user.quotaPoints) < costPoints) {
    throw new QuotaError(`算力不足，本次运行需要 ${costPoints} 点`);
  }
  return user;
}

/** 在事务内扣减额度并写流水，返回扣减后的余额。 */
export async function debitQuota(
  tx: DbTransaction,
  args: { userId: string; costPoints: number; ref: QuotaRef; note: string },
): Promise<number> {
  if (!Number.isFinite(args.costPoints) || args.costPoints < 0) throw new QuotaError("INVALID_CREDIT_AMOUNT");
  args = { ...args, costPoints: normalizeQuotaAmount(args.costPoints) };
  await assertAccountCanSpend(tx, args.userId, args.costPoints);
  const debited = await tx.user.updateMany({
    where: { id: args.userId, quotaPoints: { gte: args.costPoints }, flagged: false, deletedAt: null },
    data: { quotaPoints: { decrement: args.costPoints } },
  });
  if (debited.count !== 1) throw new QuotaError("算力余额不足或账号不可用");
  const balance = await tx.user.findUniqueOrThrow({
    where: { id: args.userId },
    select: { quotaPoints: true },
  });
  await tx.quotaLedger.create({
    data: {
      userId: args.userId,
      amount: -args.costPoints,
      balanceAfter: balance.quotaPoints,
      reason: "RUN_COST",
      refType: args.ref.type,
      refId: args.ref.id,
      note: args.note,
    },
  });
  return Number(balance.quotaPoints);
}

/**
 * 在事务内退费。
 *
 * 调用方必须先把业务对象从可退费状态迁移走（例如 `updateMany` 带状态条件
 * 并且 `count === 1`），这样重复调用不会二次退费。
 */
export async function refundQuota(
  tx: DbTransaction,
  args: { userId: string; costPoints: number; ref: QuotaRef; note: string },
) {
  if (!Number.isFinite(args.costPoints) || args.costPoints < 0) throw new QuotaError("INVALID_CREDIT_AMOUNT");
  args = { ...args, costPoints: normalizeQuotaAmount(args.costPoints) };
  if (args.costPoints <= 0) return;
  const user = await tx.user.update({
    where: { id: args.userId },
    data: { quotaPoints: { increment: args.costPoints } },
    select: { quotaPoints: true },
  });
  await tx.quotaLedger.create({
    data: {
      userId: args.userId,
      amount: args.costPoints,
      balanceAfter: user.quotaPoints,
      reason: "REFUND",
      refType: args.ref.type,
      refId: args.ref.id,
      note: args.note,
    },
  });
}

/** 管理端调整余额，用于补偿与人工处理。 */
export async function adjustQuota(actorId: string, userId: string, amount: number, note: string) {
  amount = normalizeQuotaAmount(amount);
  if (amount === 0 || typeof note !== "string" || !note.trim() || note.length > 1000) {
    throw new QuotaError("INVALID_CREDIT_ADJUSTMENT", "ACCOUNT_UNAVAILABLE", 400);
  }
  return db.$transaction(async (tx) => {
    const actor = await tx.user.findUnique({
      where: { id: actorId },
      select: { role: true, flagged: true, deletedAt: true, adminPermissions: true },
    });
    if (!actor || actor.role !== "ADMIN" || actor.flagged || actor.deletedAt
      || !hasAdminPermission(actor.adminPermissions, "USERS_MANAGE")) {
      throw new QuotaError("ADMIN_PERMISSION_REQUIRED", "ACCOUNT_UNAVAILABLE", 403);
    }
    const changed = await tx.user.updateMany({
      where: { id: userId, deletedAt: null, ...(amount < 0 ? { quotaPoints: { gte: -amount } } : {}) },
      data: { quotaPoints: { increment: amount } },
    });
    if (changed.count !== 1) throw new QuotaError("INSUFFICIENT_QUOTA_OR_ACCOUNT_UNAVAILABLE");
    const user = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { quotaPoints: true },
    });
    await tx.quotaLedger.create({
      data: {
        userId,
        amount,
        balanceAfter: user.quotaPoints,
        reason: "ADMIN_ADJUST",
        refType: "admin",
        refId: actorId,
        note: note.trim(),
      },
    });
    return user.quotaPoints;
  });
}
