import { createHash } from "node:crypto";
import { z } from "zod";
import { ComputeBenefitError } from "@/contracts/compute-benefits";
import { db } from "@/lib/db";
import { marketTransaction } from "@/server/marketplace/shared";

export interface ArcadeClaimResult {
  grantedPoints: number;
  balanceAfter: number;
  duplicate: boolean;
  operationKey: string;
}

export async function getArcadeServerBalance(userId: string): Promise<{ balancePoints: number }> {
  const account = await db.user.findFirst({
    where: { id: userId, deletedAt: null, flagged: false },
    select: { quotaPoints: true },
  });
  return { balancePoints: Number(account?.quotaPoints ?? 0) };
}

export const ARCADE_QUEST_REWARDS: Readonly<
  Record<string, { points: number; tokens: number; daily: boolean; title: string }>
> = {
  daily_checkin: { points: 100, tokens: 1, daily: true, title: "Daily Compute Check-In" },
  daily_vibehub_read: { points: 150, tokens: 1, daily: true, title: "VibeHub 60s Deep Reading" },
  daily_explore_star: { points: 150, tokens: 1, daily: true, title: "Spark Support · Star a Project" },
  daily_agent_feed: { points: 100, tokens: 1, daily: true, title: "Dino Training · Feed or Chat with Agent" },
  weekly_market_workflow: { points: 400, tokens: 5, daily: false, title: "Marketplace Creator · Publish Workflow" },
  weekly_publish_project: { points: 800, tokens: 3, daily: false, title: "Launch Project · Publish to Plaza" },
  weekly_homepage_heat: { points: 500, tokens: 3, daily: false, title: "Creator Spotlight · Community Heat" },
  agri_m1_apply: { points: 1200, tokens: 3, daily: false, title: "AgriHackathon M1 Application" },
  agri_m2_code_host: { points: 1800, tokens: 3, daily: false, title: "AgriHackathon M2 Code Hosting" },
  agri_m3_wall_public: { points: 1500, tokens: 3, daily: false, title: "AgriHackathon M3 Public Showcase" },
  agri_m4_streak_final: { points: 1500, tokens: 5, daily: false, title: "AgriHackathon M4 Final Sprint" },
  secret_ssr_gpu_cookie: { points: 250, tokens: 2, daily: false, title: "Secret Easter Egg · SSR GPU Feeding" },
  secret_whip_strike: { points: 300, tokens: 2, daily: false, title: "Secret Easter Egg · Cyber Labor Law Strike" },
  secret_reverse_pua: { points: 200, tokens: 2, daily: false, title: "Secret Easter Egg · Reverse PUA Vacation" },
  secret_midnight_farmer: { points: 300, tokens: 1, daily: false, title: "Secret Easter Egg · 3 AM CAU Wheatfield" },
  secret_fashion_mudslide: { points: 200, tokens: 2, daily: false, title: "Secret Easter Egg · Fashion Mudslide" },
  secret_bug_eater: { points: 150, tokens: 1, daily: false, title: "Secret Easter Egg · Bug Devourer" },
};

export const ARCADE_PRIZE_REWARDS: Readonly<Record<string, { points: number; title: string }>> = {
  prize_ur_dragon_egg: { points: 1000, title: "Arcade UR · Violet-Gold Dragon Egg" },
  prize_ssr_gpu_cookie: { points: 500, title: "Arcade SSR · RTX 4090 Cookie" },
  prize_sr_golden_wheat: { points: 400, title: "Arcade SR · CAU Golden Wheat Capsule" },
  prize_r_mint_dino: { points: 250, title: "Arcade R · Mint Star Dino Capsule" },
};

const BASE_STARTER_TOKENS = 3;

const arcadeClaimSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("quest"),
      questId: z.string().trim().min(3).max(64),
    })
    .strict(),
  z
    .object({
      kind: z.literal("draw"),
      prizeId: z.string().trim().min(3).max(64),
      drawId: z
        .string()
        .trim()
        .regex(/^[A-Za-z0-9_-]{6,64}$/),
      mode: z.enum(["claw", "roulette"]),
    })
    .strict(),
]);

function getBeijingDayString(now = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

export async function claimArcadeReward(userId: string, raw: unknown): Promise<ArcadeClaimResult> {
  const input = arcadeClaimSchema.parse(raw);
  const beijingDay = getBeijingDayString();

  let points = 0;
  let operationKey = "";
  let evidenceRef = "";
  let note = "";

  if (input.kind === "quest") {
    const quest = ARCADE_QUEST_REWARDS[input.questId];
    if (!quest) throw new ComputeBenefitError("INVALID_INPUT", 400);
    points = quest.points;
    operationKey = quest.daily
      ? `arcade:quest:${userId}:${input.questId}:${beijingDay}`
      : `arcade:quest:${userId}:${input.questId}`;
    evidenceRef = `arcade_quest:${input.questId}`;
    note = `Quest Arcade reward (${quest.title})`;
  } else {
    const prize = ARCADE_PRIZE_REWARDS[input.prizeId];
    if (!prize) throw new ComputeBenefitError("INVALID_INPUT", 400);
    points = prize.points;
    operationKey = `arcade:draw:${userId}:${input.drawId}`;
    evidenceRef = `arcade_draw:${input.mode}:${input.prizeId}`;
    note = `Arcade ${input.mode} prize (${prize.title})`;
  }

  const requestHash = createHash("sha256")
    .update(JSON.stringify({ userId, operationKey, points }))
    .digest("hex");

  return marketTransaction(async tx => {
    const account = await tx.user.findFirst({
      where: { id: userId, deletedAt: null, flagged: false },
      select: { quotaPoints: true },
    });
    if (!account) throw new ComputeBenefitError("ACCOUNT_UNAVAILABLE", 403);

    const existing = await tx.quotaOperation.findUnique({
      where: { operationKey },
    });
    if (existing) {
      return {
        grantedPoints: Number(existing.amount),
        balanceAfter: Number(account.quotaPoints),
        duplicate: true,
        operationKey,
      };
    }

    if (input.kind === "draw") {
      const priorOps = await tx.quotaOperation.findMany({
        where: {
          userId,
          operationKey: { startsWith: `arcade:` },
        },
        select: { operationKey: true, evidenceRef: true },
      });

      let usedDraws = 0;
      let earnedTokens = BASE_STARTER_TOKENS;
      for (const op of priorOps) {
        if (op.operationKey.startsWith(`arcade:draw:${userId}:`)) {
          usedDraws += 1;
        } else if (op.evidenceRef?.startsWith("arcade_quest:")) {
          const qId = op.evidenceRef.slice("arcade_quest:".length);
          earnedTokens += ARCADE_QUEST_REWARDS[qId]?.tokens ?? 0;
        }
      }
      if (usedDraws >= earnedTokens) {
        throw new ComputeBenefitError("ARCADE_TOKENS_EXHAUSTED", 409);
      }
    }

    const updated = await tx.user.update({
      where: { id: userId },
      data: { quotaPoints: { increment: points } },
      select: { quotaPoints: true },
    });

    const op = await tx.quotaOperation.create({
      data: {
        operationKey,
        requestHash,
        userId,
        actorId: userId,
        kind: "GRANT",
        amount: points,
        balanceAfter: updated.quotaPoints,
        evidenceRef,
        note,
      },
    });

    await tx.quotaLedger.create({
      data: {
        userId,
        amount: points,
        balanceAfter: updated.quotaPoints,
        reason: "GRANT",
        refType: "quest_arcade",
        refId: op.id,
        note,
      },
    });

    return {
      grantedPoints: points,
      balanceAfter: Number(updated.quotaPoints),
      duplicate: false,
      operationKey,
    };
  });
}
