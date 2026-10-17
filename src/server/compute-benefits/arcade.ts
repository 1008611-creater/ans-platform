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

export const ARCADE_PRIZE_REWARDS: Readonly<
  Record<string, { points: number; weight: number; rarity: "UR" | "SSR" | "SR" | "R"; title: string }>
> = {
  prize_ur_dragon_egg: { points: 1000, weight: 15, rarity: "UR", title: "Arcade UR · Violet-Gold Dragon Egg" },
  prize_ssr_gpu_cookie: { points: 500, weight: 65, rarity: "SSR", title: "Arcade SSR · RTX 4090 Cookie" },
  prize_sr_golden_wheat: { points: 400, weight: 220, rarity: "SR", title: "Arcade SR · CAU Golden Wheat Capsule" },
  prize_r_mint_dino: { points: 250, weight: 700, rarity: "R", title: "Arcade R · Mint Star Dino Capsule" },
};

const BASE_STARTER_TOKENS = 3;
export const ARCADE_DAILY_NON_MILESTONE_POINTS_CAP = 800;

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
 * Server-authoritative deterministic prize roll bound to (userId, drawId, drawSequence).
 * Prevents DevTools tampering where a client forces prizeId = "prize_ur_dragon_egg" on every draw.
 */
export function rollServerArcadePrize(userId: string, drawId: string, drawSequence: number): string {
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "ans-arcade-authoritative-seed-v1";
  const digest = createHash("sha256")
    .update(`${secret}:${userId}:${drawId}:${drawSequence}`)
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

    if (input.kind === "quest") {
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

    // Enforce per-user daily cap on non-milestone free arcade points to prevent script farming
    const isVerifiedMilestone = input.kind === "quest" && VERIFIED_MILESTONE_QUEST_IDS.has(input.questId);
    if (!isVerifiedMilestone) {
      const dayStartUtc = new Date(`${beijingDay}T00:00:00+08:00`);
      const todayOps = await tx.quotaOperation.findMany({
        where: {
          userId,
          operationKey: { startsWith: `arcade:` },
          createdAt: { gte: dayStartUtc },
        },
        select: { amount: true, evidenceRef: true },
      });
      let todayFreePoints = 0;
      for (const op of todayOps) {
        const qId = op.evidenceRef?.startsWith("arcade_quest:")
          ? op.evidenceRef.slice("arcade_quest:".length)
          : "";
        if (!VERIFIED_MILESTONE_QUEST_IDS.has(qId)) {
          todayFreePoints += Number(op.amount);
        }
      }
      const remainingCap = Math.max(0, ARCADE_DAILY_NON_MILESTONE_POINTS_CAP - todayFreePoints);
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
        kind: "GRANT",
        amount: points,
        balanceAfter: updated.quotaPoints,
        evidenceRef,
        note,
      },
    });

    if (points > 0) {
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

