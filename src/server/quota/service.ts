import type { Prisma } from "@prisma/client";
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

export async function assertAccountCanSpend(
  tx: Prisma.TransactionClient,
  userId: string,
  costPoints: number,
) {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { id: true, quotaPoints: true, flagged: true, deletedAt: true },
  });
  if (!user || user.deletedAt) throw new QuotaError("账号不可用", "ACCOUNT_UNAVAILABLE", 401);
  if (user.flagged) throw new QuotaError("账号受限，暂时无法运行", "ACCOUNT_UNAVAILABLE", 403);
  if (user.quotaPoints < costPoints) {
    throw new QuotaError(`算力不足，本次运行需要 ${costPoints} 点`);
  }
  return user;
}

/** 在事务内扣减额度并写流水，返回扣减后的余额。 */
export async function debitQuota(
  tx: Prisma.TransactionClient,
  args: { userId: string; costPoints: number; ref: QuotaRef; note: string },
): Promise<number> {
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
  return balance.quotaPoints;
}

/**
 * 在事务内退费。
 *
 * 调用方必须先把业务对象从可退费状态迁移走（例如 `updateMany` 带状态条件
 * 并且 `count === 1`），这样重复调用不会二次退费。
 */
export async function refundQuota(
  tx: Prisma.TransactionClient,
  args: { userId: string; costPoints: number; ref: QuotaRef; note: string },
) {
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
  return db.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: userId },
      data: { quotaPoints: { increment: amount } },
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
        note,
      },
    });
    return user.quotaPoints;
  });
}
