import { createHash } from "node:crypto";
import { z } from "zod";
import { ComputeBenefitError } from "@/contracts/compute-benefits";
import { db, type DbTransaction } from "@/lib/db";
import { marketTransaction } from "@/server/marketplace/shared";

export interface ArcadeClaimResult {
  grantedPoints: number;
  balanceAfter: number;
  duplicate: boolean;
  operationKey: string;
  awardedPrizeId?: string;
}

export async function getArcadeServerBalance(userId: string): Promise<{ balancePoints: number }> {
  const account = await db.user.findFirst({
    where: { id: userId, deletedAt: null, flagged: false },
    select: { quotaPoints: true },
  });
  return { balancePoints: Number(account?.quotaPoints ?? 0) };
}

/**
 * 只读：当前可用的抓娃娃币（初始 3 + 任务/彩蛋奖励 + 已购买 - 已抽取）。
 * 给"先报价后确认"用，本身不产生任何扣减。
 */
export async function getArcadeTokenBalance(userId: string): Promise<{ tokens: number; nextTokenCostPoints: number }> {
  const ops = await db.quotaOperation.findMany({
    where: { userId, operationKey: { startsWith: "arcade:" } },
    select: { operationKey: true, evidenceRef: true },
  });
  let usedDraws = 0;
  let earnedTokens = BASE_STARTER_TOKENS;
  for (const op of ops) {
    if (op.operationKey.startsWith(`arcade:draw:${userId}:`)) usedDraws += 1;
    else if (op.evidenceRef?.startsWith("arcade_quest:")) earnedTokens += ARCADE_QUEST_REWARDS[op.evidenceRef.slice("arcade_quest:".length)]?.tokens ?? 0;
    else if (op.evidenceRef?.startsWith("arcade_buy_tokens:")) {
      const bought = Number.parseInt(op.evidenceRef.slice("arcade_buy_tokens:".length), 10);
      if (Number.isFinite(bought) && bought > 0) earnedTokens += bought;
    }
  }
  return { tokens: Math.max(0, earnedTokens - usedDraws), nextTokenCostPoints: ARCADE_TOKEN_COST_POINTS };
}

export const ARCADE_QUEST_REWARDS: Readonly<
  Record<string, { points: number; tokens: number; daily: boolean; title: string }>
> = {
  daily_checkin: { points: 5, tokens: 1, daily: true, title: "Daily Compute Check-In" },
  daily_vibehub_read: { points: 5, tokens: 1, daily: true, title: "VibeHub 60s Deep Reading" },
  daily_explore_star: { points: 5, tokens: 0, daily: true, title: "Spark Support · Star a Project" },
  daily_agent_feed: { points: 3, tokens: 0, daily: true, title: "Dino Training · Feed or Chat with Agent" },
  weekly_market_workflow: { points: 12, tokens: 1, daily: false, title: "Marketplace Creator · Publish Workflow" },
  weekly_publish_project: { points: 13, tokens: 1, daily: false, title: "Launch Project · Publish to Plaza" },
  weekly_homepage_heat: { points: 10, tokens: 1, daily: false, title: "Creator Spotlight · Community Heat" },
  agri_m1_apply: { points: 12, tokens: 1, daily: false, title: "AgriHackathon M1 Application" },
  agri_m2_code_host: { points: 18, tokens: 1, daily: false, title: "AgriHackathon M2 Code Hosting" },
  agri_m3_wall_public: { points: 15, tokens: 1, daily: false, title: "AgriHackathon M3 Public Showcase" },
  agri_m4_streak_final: { points: 15, tokens: 1, daily: false, title: "AgriHackathon M4 Final Sprint" },
  secret_ssr_gpu_cookie: { points: 8, tokens: 1, daily: false, title: "Secret Easter Egg · SSR GPU Feeding" },
  secret_whip_strike: { points: 8, tokens: 1, daily: false, title: "Secret Easter Egg · Cyber Labor Law Strike" },
  secret_reverse_pua: { points: 6, tokens: 1, daily: false, title: "Secret Easter Egg · Reverse PUA Vacation" },
  secret_midnight_farmer: { points: 6, tokens: 0, daily: false, title: "Secret Easter Egg · 3 AM CAU Wheatfield" },
  secret_fashion_mudslide: { points: 5, tokens: 0, daily: false, title: "Secret Easter Egg · Fashion Mudslide" },
  secret_bug_eater: { points: 5, tokens: 0, daily: false, title: "Secret Easter Egg · Bug Devourer" },
};

export const ARCADE_PRIZE_REWARDS: Readonly<
  Record<string, { points: number; weight: number; rarity: "SP" | "UR" | "SSR" | "SR" | "R"; title: string }>
> = {
  prize_sp_mythic_jackpot: { points: 1000, weight: 1, rarity: "SP", title: "Arcade SP · Mythic CAU Koi 1,000 Pts Jackpot" },
  prize_ur_dragon_egg: { points: 300, weight: 9, rarity: "UR", title: "Arcade UR · Violet-Gold Dragon Egg 300 Pts" },
  prize_ssr_gpu_cookie: { points: 80, weight: 40, rarity: "SSR", title: "Arcade SSR · RTX 4090 Cookie 80 Pts" },
  prize_sr_golden_wheat: { points: 15, weight: 300, rarity: "SR", title: "Arcade SR · CAU Golden Wheat Capsule" },
  prize_r_mint_dino: { points: 10, weight: 650, rarity: "R", title: "Arcade R · Mint Star Dino Capsule" },
};

const BASE_STARTER_TOKENS = 3;
export const ARCADE_BASE_ONBOARDING_POINTS = 50; // $5 Onboarding Questionnaire / Base Vault Unlock
export const ARCADE_DAILY_NON_MILESTONE_POINTS_CAP = 150; // All-ANS 90% Normal-Distribution Total Upper Bound

/**
 * Deterministic All-ANS Lifetime Gaussian + Low-Probability Jackpot allocation curve per user:
 * - Includes the 50-point ($5) Onboarding Base + Lifetime Arcade/Quest/Easter-Egg rewards:
 * - 90.0% of users land in the normal band [100, 150] TOTAL ANS points (mean μ = 120, σ ≈ 15.2),
 *   corresponding to [50, 100] incremental points from Arcade/Quests/Easter Eggs on top of the 50-pt base.
 * - 9.0% of users land in the active/SSR right tail [155, 230] TOTAL ANS points ([105, 180] incremental).
 * - 0.9% of users land in the UR Legend Jackpot tier [350, 420] TOTAL ANS points ([300, 370] incremental).
 * - 0.1% of users land in the SP Mythic Koi Grand Jackpot tier [1050, 1150] TOTAL ANS points ([1000, 1100] incremental).
 */
export function computeUserGaussianArcadeCap(userId: string): {
  targetPoints: number;
  arcadeLifetimeCapPoints: number;
  isTopTail: boolean;
  zScore: number;
} {
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "ans-arcade-authoritative-seed-v1";
  const digest = createHash("sha256")
    .update(`${secret}:gaussian-cap-v2:${userId}`)
    .digest();

  const uTail = (digest.readUInt32BE(0) + 0.5) / 4294967296;
  const u1 = Math.max(1e-7, (digest.readUInt32BE(4) + 0.5) / 4294967296);
  const u2 = (digest.readUInt32BE(8) + 0.5) / 4294967296;
  const zScore = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

  if (uTail < 0.9) {
    const clampedZ = Math.max(-1.645, Math.min(1.645, zScore));
    const targetPoints = Math.min(150, Math.max(100, Math.round(120 + clampedZ * 15.19)));
    return {
      targetPoints,
      arcadeLifetimeCapPoints: Math.max(50, targetPoints - ARCADE_BASE_ONBOARDING_POINTS),
      isTopTail: false,
      zScore,
    };
  }

  if (uTail < 0.99) {
    const tailBonus = Math.min(75, Math.round(Math.abs(zScore) * 28));
    const targetPoints = Math.min(230, 155 + tailBonus);
    return {
      targetPoints,
      arcadeLifetimeCapPoints: Math.max(105, targetPoints - ARCADE_BASE_ONBOARDING_POINTS),
      isTopTail: true,
      zScore,
    };
  }

  if (uTail < 0.999) {
    const urBonus = Math.min(70, Math.round(Math.abs(zScore) * 25));
    const targetPoints = Math.min(420, 350 + urBonus);
    return {
      targetPoints,
      arcadeLifetimeCapPoints: targetPoints - ARCADE_BASE_ONBOARDING_POINTS,
      isTopTail: true,
      zScore,
    };
  }

  const spBonus = Math.min(100, Math.round(Math.abs(zScore) * 35));
  const targetPoints = Math.min(1150, 1050 + spBonus);
  return {
    targetPoints,
    arcadeLifetimeCapPoints: targetPoints - ARCADE_BASE_ONBOARDING_POINTS,
    isTopTail: true,
    zScore,
  };
}

const VERIFIED_MILESTONE_QUEST_IDS = new Set([
  "agri_m1_apply",
  "agri_m2_code_host",
  "agri_m3_wall_public",
  "agri_m4_streak_final",
  "weekly_market_workflow",
  "weekly_publish_project",
  "weekly_homepage_heat",
]);

/**
 * Server-authoritative deterministic prize roll bound to (userId, drawSequence).
 * Prevents DevTools tampering where a client forces prizeId or brute-forces drawId.
 */
export function rollServerArcadePrize(userId: string, _drawId: string, drawSequence: number): string {
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "ans-arcade-authoritative-seed-v1";
  const digest = createHash("sha256")
    .update(`${secret}:server-roll-v3:${userId}:${drawSequence}`)
    .digest();
  const rawInt = digest.readUInt32BE(0);

  const isPityTen = drawSequence > 0 && drawSequence % 10 === 0;
  const entries = Object.entries(ARCADE_PRIZE_REWARDS).filter(([, p]) =>
    isPityTen ? p.rarity !== "R" : true,
  );
  const totalWeight = entries.reduce((acc, [, p]) => acc + p.weight, 0);
  let cursor = rawInt % totalWeight;
  for (const [id, prize] of entries) {
    if (cursor < prize.weight) {
      return id;
    }
    cursor -= prize.weight;
  }
  return entries[entries.length - 1][0];
}

async function verifyQuestPrerequisiteInTx(tx: DbTransaction, userId: string, questId: string): Promise<void> {
  if (!VERIFIED_MILESTONE_QUEST_IDS.has(questId)) return;

  if (questId === "agri_m1_apply") {
    const [row] = await tx.$queryRaw<Array<{ ok: boolean }>>`
      SELECT (
        EXISTS (
          SELECT 1 FROM compute_benefit_applications
          WHERE "userId" = ${userId} AND status = 'APPROVED'
        )
        OR EXISTS (
          SELECT 1 FROM team_members tm
          JOIN team_competitions tc ON tc."teamId" = tm."teamId"
          WHERE tm."userId" = ${userId}
        )
      ) AS ok
    `;
    if (!row?.ok) throw new ComputeBenefitError("QUEST_PREREQUISITE_NOT_MET", 409);
    return;
  }

  if (questId === "agri_m2_code_host") {
    const [row] = await tx.$queryRaw<Array<{ ok: boolean }>>`
      SELECT (
        EXISTS (
          SELECT 1 FROM agri_submission_receipts WHERE "actorId" = ${userId}
        )
        OR EXISTS (
          SELECT 1 FROM agri_evidence_requests er
          JOIN projects p ON p.id = er."projectId"
          LEFT JOIN team_members tm ON tm."teamId" = p."teamId" AND tm."userId" = ${userId}
          WHERE p."ownerId" = ${userId} OR tm."userId" IS NOT NULL
        )
      ) AS ok
    `;
    if (!row?.ok) throw new ComputeBenefitError("QUEST_PREREQUISITE_NOT_MET", 409);
    return;
  }

  if (questId === "agri_m3_wall_public") {
    const [row] = await tx.$queryRaw<Array<{ ok: boolean }>>`
      SELECT EXISTS (
        SELECT 1 FROM agri_wall_entries awe
        JOIN projects p ON p.id = awe."projectId"
        LEFT JOIN team_members tm ON tm."teamId" = p."teamId" AND tm."userId" = ${userId}
        WHERE p."ownerId" = ${userId} OR tm."userId" IS NOT NULL
      ) AS ok
    `;
    if (!row?.ok) throw new ComputeBenefitError("QUEST_PREREQUISITE_NOT_MET", 409);
    return;
  }

  if (questId === "agri_m4_streak_final") {
    const checkinCount = await tx.quotaOperation.count({
      where: {
        userId,
        operationKey: { startsWith: `arcade:quest:${userId}:daily_checkin:` },
      },
    });
    if (checkinCount >= 5) return;
    const [row] = await tx.$queryRaw<Array<{ ok: boolean }>>`
      SELECT EXISTS (
        SELECT 1 FROM agri_entry_stages aes
        JOIN team_competitions tc ON tc.id = aes."teamCompetitionId"
        JOIN team_members tm ON tm."teamId" = tc."teamId"
        WHERE tm."userId" = ${userId} AND aes.stage = 'FINAL'
      ) AS ok
    `;
    if (!row?.ok) throw new ComputeBenefitError("QUEST_PREREQUISITE_NOT_MET", 409);
    return;
  }

  if (questId === "weekly_market_workflow") {
    const listingCount = await tx.marketListing.count({
      where: { sellerId: userId, status: "PUBLISHED" },
    });
    if (listingCount < 1) throw new ComputeBenefitError("QUEST_PREREQUISITE_NOT_MET", 409);
    return;
  }

  if (questId === "weekly_publish_project") {
    const projectCount = await tx.project.count({
      where: { ownerId: userId, visibility: "PUBLIC" },
    });
    if (projectCount < 1) throw new ComputeBenefitError("QUEST_PREREQUISITE_NOT_MET", 409);
    return;
  }

  if (questId === "weekly_homepage_heat") {
    const [row] = await tx.$queryRaw<Array<{ total: bigint }>>`
      SELECT (
        (SELECT COUNT(*) FROM market_listing_stars mls JOIN market_listings ml ON ml.id = mls."listingId" WHERE ml."sellerId" = ${userId} AND mls."userId" <> ${userId})
        +
        (SELECT COUNT(*) FROM agri_popularity_votes apv JOIN agri_wall_entries awe ON awe.id = apv."wallEntryId" AND awe."competitionId" = apv."competitionId" JOIN projects p ON p.id = awe."projectId" WHERE p."ownerId" = ${userId} AND apv."userId" <> ${userId})
      ) AS total
    `;
    if (Number(row?.total ?? 0) < 10) throw new ComputeBenefitError("QUEST_PREREQUISITE_NOT_MET", 409);
  }
}

export const ARCADE_TOKEN_COST_POINTS = 10;

export const arcadeClaimSchema = z.discriminatedUnion("kind", [
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
  z
    .object({
      kind: z.literal("buy_tokens"),
      count: z.number().int().min(1).max(10).default(1),
      orderId: z
        .string()
        .trim()
        .regex(/^[A-Za-z0-9_-]{6,64}$/),
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

  if (input.kind === "quest" && !ARCADE_QUEST_REWARDS[input.questId]) {
    throw new ComputeBenefitError("INVALID_INPUT", 400);
  }
  if (input.kind === "draw" && !ARCADE_PRIZE_REWARDS[input.prizeId]) {
    throw new ComputeBenefitError("INVALID_INPUT", 400);
  }

  const operationKey =
    input.kind === "quest"
      ? ARCADE_QUEST_REWARDS[input.questId].daily
        ? `arcade:quest:${userId}:${input.questId}:${beijingDay}`
        : `arcade:quest:${userId}:${input.questId}`
      : input.kind === "buy_tokens"
        ? `arcade:buy_tokens:${userId}:${input.orderId}`
        : `arcade:draw:${userId}:${input.drawId}`;

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

    let points = 0;
    let evidenceRef = "";
    let note = "";
    let awardedPrizeId: string | undefined;

    if (input.kind === "buy_tokens") {
      const costPoints = input.count * ARCADE_TOKEN_COST_POINTS;
      if (Number(account.quotaPoints) < costPoints) {
        throw new ComputeBenefitError("INSUFFICIENT_POINTS", 409);
      }
      points = -costPoints;
      evidenceRef = `arcade_buy_tokens:${input.count}`;
      note = `Arcade token exchange (${input.count} token(s) for ${costPoints} pts)`;
    } else if (input.kind === "quest") {
      await verifyQuestPrerequisiteInTx(tx, userId, input.questId);
      const quest = ARCADE_QUEST_REWARDS[input.questId];
      points = quest.points;
      evidenceRef = `arcade_quest:${input.questId}`;
      note = `Quest Arcade reward (${quest.title})`;
    } else {
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
        } else if (op.evidenceRef?.startsWith("arcade_buy_tokens:")) {
          const bought = Number.parseInt(op.evidenceRef.slice("arcade_buy_tokens:".length), 10);
          if (Number.isFinite(bought) && bought > 0) {
            earnedTokens += bought;
          }
        }
      }
      if (usedDraws >= earnedTokens) {
        throw new ComputeBenefitError("ARCADE_TOKENS_EXHAUSTED", 409);
      }

      awardedPrizeId = rollServerArcadePrize(userId, input.drawId, usedDraws + 1);
      const prize = ARCADE_PRIZE_REWARDS[awardedPrizeId];
      points = prize.points;
      evidenceRef = `arcade_draw:${input.mode}:${awardedPrizeId}`;
      note = `Arcade ${input.mode} prize (${prize.title})`;
    }

    // Enforce per-user LIFETIME Gaussian normal-distribution cap across all ANS non-milestone free points,
    // while allowing genuine server-rolled low-probability jackpots (SP 0.1% / UR 0.9% / SSR 4%) to be credited in full!
    const isVerifiedMilestone = input.kind === "quest" && VERIFIED_MILESTONE_QUEST_IDS.has(input.questId);
    const isServerJackpotHit =
      awardedPrizeId === "prize_sp_mythic_jackpot" ||
      awardedPrizeId === "prize_ur_dragon_egg" ||
      awardedPrizeId === "prize_ssr_gpu_cookie";
    if (input.kind !== "buy_tokens" && !isVerifiedMilestone && !isServerJackpotHit) {
      const lifetimeOps = await tx.quotaOperation.findMany({
        where: {
          userId,
          operationKey: { startsWith: `arcade:` },
        },
        select: { amount: true, evidenceRef: true },
      });
      let lifetimeFreePoints = 0;
      for (const op of lifetimeOps) {
        const qId = op.evidenceRef?.startsWith("arcade_quest:")
          ? op.evidenceRef.slice("arcade_quest:".length)
          : "";
        if (!VERIFIED_MILESTONE_QUEST_IDS.has(qId)) {
          lifetimeFreePoints += Number(op.amount);
        }
      }
      const userArcadeCap = computeUserGaussianArcadeCap(userId).arcadeLifetimeCapPoints;
      const remainingCap = Math.max(0, userArcadeCap - lifetimeFreePoints);
      points = Math.min(points, remainingCap);
    }

    const requestHash = createHash("sha256")
      .update(JSON.stringify({ userId, operationKey, points, evidenceRef }))
      .digest("hex");

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
        kind: points < 0 ? "SPEND" : "GRANT",
        amount: points,
        balanceAfter: updated.quotaPoints,
        evidenceRef,
        note,
      },
    });

    if (points !== 0) {
      await tx.quotaLedger.create({
        data: {
          userId,
          amount: points,
          balanceAfter: updated.quotaPoints,
          reason: points < 0 ? "RUN_COST" : "GRANT",
          refType: "quest_arcade",
          refId: op.id,
          note,
        },
      });
    }

    return {
      grantedPoints: points,
      balanceAfter: Number(updated.quotaPoints),
      duplicate: false,
      operationKey,
      ...(awardedPrizeId ? { awardedPrizeId } : {}),
    };
  });
}

