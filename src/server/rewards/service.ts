import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export class RewardError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
    this.name = "RewardError";
  }
}

const ruleSchema = z.object({
  key: z.string().trim().min(2).max(60).regex(/^[a-z0-9_-]+$/),
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional().nullable(),
  amount: z.number().int().min(1).max(10000),
  dailyLimit: z.number().int().min(1).max(100).default(1),
  active: z.boolean().default(true),
});
const grantSchema = z.object({
  ruleId: z.string().min(1),
  userId: z.string().min(1),
  sourceType: z.string().trim().min(2).max(80),
  sourceId: z.string().trim().min(1).max(160),
  note: z.string().trim().max(500).optional(),
});
const appealSchema = z.object({ ledgerId: z.string().min(1), message: z.string().trim().min(10).max(2000) });
const appealReviewSchema = z.object({
  appealId: z.string().min(1),
  decision: z.enum(["approve", "reject"]),
  adjustment: z.number().int().min(-10000).max(10000).default(0),
  resolution: z.string().trim().min(3).max(2000),
}).refine((value) => value.decision === "approve" || value.adjustment === 0, { path: ["adjustment"] });
const reviewOpenSchema = z.object({ ledgerId: z.string().min(1), reason: z.string().trim().min(10).max(1000) });
const reviewCloseSchema = z.object({ caseId: z.string().min(1), decision: z.enum(["clear", "reverse"]), resolution: z.string().trim().min(3).max(2000) });

async function requireAdmin(actorId: string) {
  const actor = await db.user.findUnique({ where: { id: actorId }, select: { id: true, role: true, deletedAt: true } });
  if (actor?.role !== "ADMIN" || actor.deletedAt) throw new RewardError(403, "FORBIDDEN", "只有管理员可以管理奖励规则和风险案件。");
}

export async function getRewardAdminOverview(actorId: string) {
  await requireAdmin(actorId);
  const [rules, grants, appeals, reviewCases] = await Promise.all([
    db.xpRewardRule.findMany({ orderBy: { createdAt: "desc" } }),
    db.xpRewardGrant.findMany({ take: 100, orderBy: { createdAt: "desc" }, include: { rule: { select: { title: true } }, user: { select: { id: true, username: true, name: true } } } }),
    db.xpRewardAppeal.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" }, include: { user: { select: { id: true, username: true } }, ledger: true } }),
    db.xpRewardReviewCase.findMany({ where: { status: "OPEN" }, orderBy: { createdAt: "asc" }, include: { openedBy: { select: { username: true } }, ledger: { include: { user: { select: { id: true, username: true } } } } } }),
  ]);
  return { rules, grants, appeals, reviewCases };
}

export async function saveRewardRule(actorId: string, rawInput: unknown) {
  const parsed = ruleSchema.safeParse(rawInput);
  if (!parsed.success) throw new RewardError(400, "INVALID_INPUT", "奖励规则字段无效。");
  await requireAdmin(actorId);
  const input = parsed.data;
  const rule = await db.xpRewardRule.upsert({
    where: { key: input.key },
    create: { ...input, createdById: actorId },
    update: { title: input.title, description: input.description, amount: input.amount, dailyLimit: input.dailyLimit, active: input.active },
  });
  await db.auditLog.create({ data: { actorId, action: "XP_REWARD_RULE_SAVED", resourceType: "xp_reward_rule", resourceId: rule.id, after: { key: rule.key, amount: rule.amount, dailyLimit: rule.dailyLimit, active: rule.active } } });
  return rule;
}

export async function grantCommunityReward(actorId: string, rawInput: unknown) {
  const parsed = grantSchema.safeParse(rawInput);
  if (!parsed.success) throw new RewardError(400, "INVALID_INPUT", "请填写用户、奖励规则和可追溯的贡献来源。");
  await requireAdmin(actorId);
  const input = parsed.data;
  try {
    return await db.$transaction(async (tx) => {
      const [rule, user] = await Promise.all([
        tx.xpRewardRule.findUnique({ where: { id: input.ruleId } }),
        tx.user.findUnique({ where: { id: input.userId }, select: { id: true, deletedAt: true } }),
      ]);
      if (!rule?.active) throw new RewardError(404, "RULE_UNAVAILABLE", "奖励规则不存在或已停用。");
      if (!user || user.deletedAt) throw new RewardError(404, "USER_UNAVAILABLE", "找不到可发奖的用户。");
      const now = new Date();
      const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      const dailyCount = await tx.xpRewardGrant.count({ where: { ruleId: rule.id, userId: user.id, createdAt: { gte: dayStart } } });
      if (dailyCount >= rule.dailyLimit) throw new RewardError(409, "DAILY_LIMIT_REACHED", "该用户今天已达到此奖励规则的发放次数上限。");
      const ledger = await tx.xpLedger.create({ data: { userId: user.id, amount: rule.amount, reason: "COMMUNITY_REWARD", refType: input.sourceType, refId: input.sourceId, note: input.note ?? rule.title } });
      const grant = await tx.xpRewardGrant.create({ data: { ruleId: rule.id, userId: user.id, sourceType: input.sourceType, sourceId: input.sourceId, amount: rule.amount, ledgerId: ledger.id } });
      await tx.user.update({ where: { id: user.id }, data: { xp: { increment: rule.amount } } });
      await tx.auditLog.create({ data: { actorId, action: "COMMUNITY_REWARD_GRANTED", resourceType: "xp_reward_grant", resourceId: grant.id, after: { userId: user.id, ruleId: rule.id, amount: rule.amount, sourceType: input.sourceType, sourceId: input.sourceId } } });
      return grant;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2002" || error.code === "P2034")) {
      throw new RewardError(409, "DUPLICATE_OR_CONCURRENT_GRANT", "相同贡献已发奖或并发发奖发生冲突，请刷新账目确认后再试。");
    }
    throw error;
  }
}

export async function createRewardAppeal(actorId: string, rawInput: unknown) {
  const parsed = appealSchema.safeParse(rawInput);
  if (!parsed.success) throw new RewardError(400, "INVALID_INPUT", "申诉说明至少需要 10 个字。");
  const ledger = await db.xpLedger.findUnique({ where: { id: parsed.data.ledgerId } });
  if (!ledger || ledger.userId !== actorId || !["COMMUNITY_REWARD", "COMPETITION_AWARD"].includes(ledger.reason)) {
    throw new RewardError(404, "REWARD_NOT_APPEALABLE", "找不到可申诉的本人奖励记录。");
  }
  try {
    const appeal = await db.xpRewardAppeal.create({ data: { ledgerId: ledger.id, userId: actorId, message: parsed.data.message } });
    await db.auditLog.create({ data: { actorId, action: "XP_REWARD_APPEAL_CREATED", resourceType: "xp_reward_appeal", resourceId: appeal.id, metadata: { ledgerId: ledger.id } } });
    return appeal;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new RewardError(409, "APPEAL_EXISTS", "这条奖励记录已有申诉。");
    throw error;
  }
}

export async function reviewRewardAppeal(actorId: string, rawInput: unknown) {
  const parsed = appealReviewSchema.safeParse(rawInput);
  if (!parsed.success) throw new RewardError(400, "INVALID_INPUT", "申诉处理信息无效。");
  await requireAdmin(actorId);
  const input = parsed.data;
  return db.$transaction(async (tx) => {
    const appeal = await tx.xpRewardAppeal.findUnique({ where: { id: input.appealId }, include: { ledger: true } });
    if (!appeal || appeal.status !== "PENDING") throw new RewardError(409, "APPEAL_ALREADY_HANDLED", "申诉已处理或不存在。");
    if (input.adjustment < 0 && appeal.ledger.amount + input.adjustment < 0) throw new RewardError(400, "INVALID_ADJUSTMENT", "\u8c03\u6574\u540e\u5956\u52b1\u4e0d\u80fd\u4f4e\u4e8e\u96f6\u3002");
    if (input.decision === "approve" && input.adjustment < 0) {
      const user = await tx.user.findUnique({ where: { id: appeal.userId }, select: { xp: true } });
      if (!user || user.xp < Math.abs(input.adjustment)) throw new RewardError(409, "XP_BALANCE_TOO_LOW", "\u5f53\u524d XP \u4f59\u989d\u4e0d\u8db3\uff0c\u4e0d\u80fd\u6267\u884c\u8fd9\u9879\u8d1f\u5411\u8c03\u6574\u3002");
    }
    const status = input.decision === "approve" ? "APPROVED" : "REJECTED";
    const changed = await tx.xpRewardAppeal.updateMany({ where: { id: appeal.id, status: "PENDING" }, data: { status, reviewedById: actorId, reviewedAt: new Date(), resolution: input.resolution, adjustment: input.adjustment } });
    if (changed.count !== 1) throw new RewardError(409, "APPEAL_ALREADY_HANDLED", "申诉刚刚被其他管理员处理。");
    if (status === "APPROVED" && input.adjustment !== 0) {
      await tx.user.update({ where: { id: appeal.userId }, data: { xp: { increment: input.adjustment } } });
      await tx.xpLedger.create({ data: { userId: appeal.userId, amount: input.adjustment, reason: input.adjustment > 0 ? "MANUAL_ADJUST" : "REWARD_REVERSAL", refType: "xp_reward_appeal", refId: appeal.id, note: input.resolution } });
    }
    await tx.auditLog.create({ data: { actorId, action: "XP_REWARD_APPEAL_REVIEWED", resourceType: "xp_reward_appeal", resourceId: appeal.id, before: { status: "PENDING" }, after: { status, adjustment: status === "APPROVED" ? input.adjustment : 0 }, metadata: { resolution: input.resolution, ledgerId: appeal.ledgerId } } });
    return { id: appeal.id, status, adjustment: status === "APPROVED" ? input.adjustment : 0 };
  });
}

export async function openRewardReviewCase(actorId: string, rawInput: unknown) {
  const parsed = reviewOpenSchema.safeParse(rawInput);
  if (!parsed.success) throw new RewardError(400, "INVALID_INPUT", "请提供 XP 流水和风险原因。");
  await requireAdmin(actorId);
  const ledger = await db.xpLedger.findUnique({ where: { id: parsed.data.ledgerId } });
  if (!ledger || ledger.amount <= 0 || !["COMMUNITY_REWARD", "COMPETITION_AWARD"].includes(ledger.reason)) throw new RewardError(404, "REWARD_NOT_REVIEWABLE", "找不到可复核的正向创作者奖励。");
  try {
    const reviewCase = await db.xpRewardReviewCase.create({ data: { ledgerId: ledger.id, openedById: actorId, reason: parsed.data.reason } });
    await db.auditLog.create({ data: { actorId, action: "XP_REWARD_REVIEW_OPENED", resourceType: "xp_reward_review_case", resourceId: reviewCase.id, metadata: { ledgerId: ledger.id } } });
    return reviewCase;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new RewardError(409, "REVIEW_EXISTS", "这条奖励记录已有反作弊复核案件。");
    throw error;
  }
}

export async function resolveRewardReviewCase(actorId: string, rawInput: unknown) {
  const parsed = reviewCloseSchema.safeParse(rawInput);
  if (!parsed.success) throw new RewardError(400, "INVALID_INPUT", "复核处理信息无效。");
  await requireAdmin(actorId);
  const input = parsed.data;
  return db.$transaction(async (tx) => {
    const reviewCase = await tx.xpRewardReviewCase.findUnique({ where: { id: input.caseId }, include: { ledger: true } });
    if (!reviewCase || reviewCase.status !== "OPEN") throw new RewardError(409, "REVIEW_ALREADY_HANDLED", "复核案件已处理或不存在。");
    const status = input.decision === "clear" ? "CLEARED" : "REVERSED";
    const changed = await tx.xpRewardReviewCase.updateMany({ where: { id: reviewCase.id, status: "OPEN" }, data: { status, resolvedById: actorId, resolvedAt: new Date(), resolution: input.resolution } });
    if (changed.count !== 1) throw new RewardError(409, "REVIEW_ALREADY_HANDLED", "复核案件刚刚被其他管理员处理。");
    if (status === "REVERSED") {
      const user = await tx.user.findUnique({ where: { id: reviewCase.ledger.userId }, select: { xp: true } });
      if (!user || user.xp < reviewCase.ledger.amount) throw new RewardError(409, "XP_BALANCE_TOO_LOW", "\u5f53\u524d XP \u4f59\u989d\u4e0d\u8db3\uff0c\u6848\u4ef6\u4fdd\u6301\u5f85\u5904\u7406\uff0c\u8bf7\u5148\u5b8c\u6210\u4eba\u5de5 XP \u8c03\u6574\u540e\u518d\u89e3\u51b3\u3002");
      const reversal = await tx.xpLedger.create({ data: { userId: reviewCase.ledger.userId, amount: -reviewCase.ledger.amount, reason: "REWARD_REVERSAL", refType: "xp_reward_review", refId: reviewCase.id, note: input.resolution } });
      await tx.user.update({ where: { id: reviewCase.ledger.userId }, data: { xp: { decrement: reviewCase.ledger.amount } } });
      await tx.xpRewardReviewCase.update({ where: { id: reviewCase.id }, data: { reversalLedgerId: reversal.id } });
    }
    await tx.auditLog.create({ data: { actorId, action: "XP_REWARD_REVIEW_RESOLVED", resourceType: "xp_reward_review_case", resourceId: reviewCase.id, before: { status: "OPEN" }, after: { status }, metadata: { resolution: input.resolution, ledgerId: reviewCase.ledgerId } } });
    return { id: reviewCase.id, status };
  });
}

export function isRewardError(error: unknown): error is RewardError | z.ZodError {
  return error instanceof RewardError || error instanceof z.ZodError;
}
