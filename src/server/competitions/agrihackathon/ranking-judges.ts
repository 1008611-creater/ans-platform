import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { AgriWorkspaceError } from "@/contracts/agri-workspace";
import { agriRankingStageSchema } from "@/contracts/agri-rankings";
import { lockAgriWorkspace, requireAgriScope, assertAgriAuthorityCurrent, agriDatabaseClock } from "./workspace";
import { executeAgriRankingCommand } from "./rankings";

const identifier = z.string().trim().min(1).max(80);

export interface AgriJudgeCandidate {
  id: string;
  username: string;
  name: string | null;
  role: string;
  hasTechnicalWrite: boolean;
  hasWorksRead: boolean;
  isCompeting: boolean;
  eligible: boolean;
}

export interface AgriJudgeCandidateList {
  competitionId: string;
  stage: "PRELIMINARY" | "FINAL";
  requiredJudges: number;
  canAutoGrant: boolean;
  candidates: AgriJudgeCandidate[];
}

const configureWithGrantsSchema = z.object({
  stage: agriRankingStageSchema,
  idempotencyKey: z.string().uuid(),
  judgeIds: z.array(identifier).min(3).max(7),
  autoGrant: z.boolean().default(true),
}).strict();

export async function listAgriJudgeCandidates(
  actorId: string,
  rawStage: unknown,
): Promise<AgriJudgeCandidateList> {
  const stage = agriRankingStageSchema.parse(rawStage ?? "PRELIMINARY");
  return db.$transaction(async tx => {
    const ctx = await lockAgriWorkspace(tx, actorId);
    const pubAuth = await requireAgriScope(tx, ctx, "PUBLICATIONS_REVIEW");
    let accessAuth = null;
    try {
      accessAuth = await requireAgriScope(tx, ctx, "ACCESS_MANAGE");
    } catch (error) {
      if (!(error instanceof AgriWorkspaceError) || error.code !== "AGRI_SCOPE_REQUIRED") throw error;
    }

    const competitionId = ctx.workspace.competitionId;
    const rows = await tx.$queryRaw<Array<{
      id: string;
      username: string;
      name: string | null;
      role: string;
      hasTechnicalWrite: boolean;
      hasWorksRead: boolean;
      isCompeting: boolean;
    }>>`
      SELECT
        u.id,
        u.username,
        u.name,
        u.role::text AS role,
        EXISTS (
          SELECT 1 FROM agri_access_grants g
          WHERE g."competitionId" = ${competitionId}
            AND g."userId" = u.id
            AND g.scope = 'TECHNICAL_WRITE'
            AND g."revokedAt" IS NULL
            AND (g."expiresAt" IS NULL OR g."expiresAt" > clock_timestamp())
        ) AS "hasTechnicalWrite",
        EXISTS (
          SELECT 1 FROM agri_access_grants g
          WHERE g."competitionId" = ${competitionId}
            AND g."userId" = u.id
            AND g.scope = 'WORKS_READ'
            AND g."revokedAt" IS NULL
            AND (g."expiresAt" IS NULL OR g."expiresAt" > clock_timestamp())
        ) AS "hasWorksRead",
        (
          EXISTS (
            SELECT 1 FROM team_competitions tc
            JOIN team_members tm ON tm."teamId" = tc."teamId"
            WHERE tc."competitionId" = ${competitionId}
              AND tc."entryStatus" <> 'REJECTED'
              AND tm."userId" = u.id
              AND tm.status = 'ACTIVE'
          )
          OR EXISTS (
            SELECT 1 FROM agri_official_roster_members m
            JOIN agri_official_rosters r ON r.id = m."rosterId"
            WHERE r."competitionId" = ${competitionId}
              AND m."userId" = u.id
          )
        ) AS "isCompeting"
      FROM users u
      WHERE NOT u.flagged AND u."deletedAt" IS NULL
      ORDER BY
        (u.role IN ('ADMIN', 'MODERATOR')) DESC,
        u.username ASC,
        u.id ASC
      LIMIT 120
    `;

    await assertAgriAuthorityCurrent(tx, pubAuth, accessAuth);

    const candidates: AgriJudgeCandidate[] = rows
      .map(r => ({
        id: r.id,
        username: r.username,
        name: r.name,
        role: r.role,
        hasTechnicalWrite: Boolean(r.hasTechnicalWrite),
        hasWorksRead: Boolean(r.hasWorksRead),
        isCompeting: Boolean(r.isCompeting),
        eligible: !r.isCompeting && (Boolean(r.hasTechnicalWrite && r.hasWorksRead) || Boolean(accessAuth)),
      }))
      .sort((a, b) => {
        const aReady = !a.isCompeting && a.hasTechnicalWrite && a.hasWorksRead ? 1 : 0;
        const bReady = !b.isCompeting && b.hasTechnicalWrite && b.hasWorksRead ? 1 : 0;
        if (aReady !== bReady) return bReady - aReady;
        if (a.isCompeting !== b.isCompeting) return a.isCompeting ? 1 : -1;
        return a.username.localeCompare(b.username);
      });

    return {
      competitionId,
      stage,
      requiredJudges: stage === "PRELIMINARY" ? 3 : 7,
      canAutoGrant: Boolean(accessAuth),
      candidates,
    };
  }, { timeout: 15000 });
}

export async function authorizeAndConfigureAgriJudgePanel(actorId: string, rawBody: unknown) {
  const command = configureWithGrantsSchema.parse(rawBody);
  if (command.autoGrant) {
    await db.$transaction(async tx => {
      const ctx = await lockAgriWorkspace(tx, actorId);
      const accessAuth = await requireAgriScope(tx, ctx, "ACCESS_MANAGE");
      const pubAuth = await requireAgriScope(tx, ctx, "PUBLICATIONS_REVIEW");
      const now = await agriDatabaseClock(tx);
      const competitionId = ctx.workspace.competitionId;

      for (const judgeId of [...new Set(command.judgeIds)]) {
        for (const scope of ["TECHNICAL_WRITE", "WORKS_READ"] as const) {
          const [existing] = await tx.$queryRaw<Array<{ id: string }>>`
            SELECT id FROM agri_access_grants
            WHERE "competitionId" = ${competitionId}
              AND "userId" = ${judgeId}
              AND scope = ${scope}
              AND "revokedAt" IS NULL
              AND ("expiresAt" IS NULL OR "expiresAt" > ${now})
            LIMIT 1
          `;
          if (!existing) {
            const grantId = randomUUID();
            await tx.$executeRaw`
              INSERT INTO agri_access_grants (id, "competitionId", "userId", scope, delegable, "grantedById", "managerGrantId", "grantedAt")
              VALUES (${grantId}, ${competitionId}, ${judgeId}, ${scope}, false, ${actorId}, ${accessAuth.id}, ${now})
            `;
            await tx.auditLog.create({
              data: {
                actorId,
                action: "AGRI_JUDGE_AUTO_GRANT",
                resourceType: "agri_access_grant",
                resourceId: grantId,
                metadata: { competitionId, judgeId, scope, stage: command.stage },
              },
            });
          }
        }
      }
      await assertAgriAuthorityCurrent(tx, accessAuth, pubAuth);
    }, { timeout: 15000 });
  }

  return executeAgriRankingCommand(actorId, {
    action: "configurePanel",
    stage: command.stage,
    judgeIds: command.judgeIds,
    idempotencyKey: command.idempotencyKey,
  });
}
