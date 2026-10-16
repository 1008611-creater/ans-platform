import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const AGRI_SCOPES = [
  "WORKS_READ",
  "PRIVATE_MATERIALS_READ",
  "TECHNICAL_WRITE",
  "INTERNAL_NOTES_READ",
  "ISSUES_WRITE",
  "DEMO_WRITE",
  "ONSITE_READ",
  "ONSITE_WRITE",
  "ARCHIVE_WRITE",
  "EXPORT",
  "RULES_CONFIRM",
  "ACCESS_MANAGE",
  "PUBLICATIONS_REVIEW",
] as const;

const DEFAULT_GUIDANCE_MARKDOWN = [
  "### 首届中国农大 AI 创客马拉松（AgriHackathon）参赛与代码托管说明",
  "",
  "1. **战队报名与作品墙绑定**：队长创建团队并完成本届赛事报名后，可在 `/explore/agrihackathon/submit` 将已公开审核通过的 ANS 项目绑定至农客松作品墙。",
  "2. **阶段提交与平台代码托管**：初赛与决赛均在 `/competitions/agrihackathon/submissions` 提交锁定的项目产物版本（`artifactVersionId`），并在「赛事代码托管与材料存证」面板内上传参赛源码压缩包或一键拉取固定 GitHub 代码版本，由平台统一托管、计算 SHA-256 哈希并归档管理。",
  "3. **截止冻结与重提说明**：阶段窗口关闭后系统自动按已采用规则版本计算截止冻结；如需勘误重提，须由组委会在 `/competitions/agrihackathon/manage` 签发一次性重提许可。",
].join("\n");

const DEFAULT_REQUIREMENTS = {
  schemaVersion: 1 as const,
  repositoryRequired: false,
  repositoryRefRequired: false,
  demoRequired: false,
  materials: [
    { key: "pitch_deck", kind: "LINK" as const, required: false },
    { key: "demo_video", kind: "LINK" as const, required: false },
    { key: "technical_notes", kind: "TEXT" as const, required: false },
  ],
};

interface WorkspaceRow {
  id: string;
  competitionId: string;
  enabled: boolean;
  draftRevision: number;
  confirmedRuleVersionId: string | null;
  publishedRuleVersionId: string | null;
}

interface GrantRow {
  id: string;
  revokedAt: Date | null;
  expiresAt: Date | null;
  delegable: boolean;
  sourceGrantId: string | null;
  managerGrantId: string | null;
}

async function main() {
  const draftOnly = process.argv.includes("--draft-only") || process.env.AGRI_BOOTSTRAP_DRAFT_ONLY === "true";
  const competitionId = (process.env.ANS_AGRIHACKATHON_COMPETITION_ID || "agrihackathon-2026").trim();
  if (!competitionId || competitionId.length > 80) {
    throw new Error("ANS_AGRIHACKATHON_COMPETITION_ID 长度必须在 1 到 80 个字符之间。");
  }

  console.log(`[agri-bootstrap] Target competitionId: ${competitionId}`);

  await prisma.$transaction(async (tx) => {
    const [{ now }] = await tx.$queryRaw<Array<{ now: Date }>>`SELECT clock_timestamp() AS now`;
    const opensAt = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const prelimClosesAt = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    const finalClosesAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    // 1. Ensure Competition row exists in competitions
    const existingCompetition = await tx.competition.findUnique({ where: { id: competitionId } });
    if (!existingCompetition) {
      await tx.competition.create({
        data: {
          id: competitionId,
          title: "AgriHackathon｜首届中国农大 AI 创客马拉松",
          organizer: "CAUHub",
          url: "https://ans.cauai.fun/competitions/agrihackathon",
          description: "聚焦涉农真实痛点、学科科研探索与智能体自动执行，提供 AI 原生创作工具、算力补贴与全流程线上提交评审。",
          status: "ONGOING",
          startsAt: opensAt,
          endsAt: finalClosesAt,
          rules: DEFAULT_GUIDANCE_MARKDOWN,
          rewardXp: 500,
        },
      });
      console.log(`[agri-bootstrap] Created Competition row (${competitionId})`);
    } else {
      console.log(`[agri-bootstrap] Competition row already exists (${existingCompetition.title})`);
    }

    // 2. Ensure agri_workspaces row exists for competitionId
    await tx.$executeRaw`
      INSERT INTO agri_workspaces (id, "competitionId")
      VALUES (${randomUUID()}, ${competitionId})
      ON CONFLICT ("competitionId") DO NOTHING
    `;

    const [workspace] = await tx.$queryRaw<WorkspaceRow[]>`
      SELECT id, "competitionId", enabled, "draftRevision", "confirmedRuleVersionId", "publishedRuleVersionId"
      FROM agri_workspaces
      WHERE "competitionId" = ${competitionId}
      FOR UPDATE
    `;
    if (!workspace) {
      throw new Error(`Failed to lock agri_workspaces for ${competitionId}`);
    }

    // 3. Find target organizer / admin accounts for root scope grants
    const targetEmail = (process.env.AGRI_ORGANIZER_EMAIL || process.env.ADMIN_EMAIL || "").trim().toLowerCase();
    const admins = await tx.$queryRaw<Array<{ id: string; email: string | null; username: string }>>`
      SELECT id, email, username
      FROM users
      WHERE (role = 'ADMIN' OR (${targetEmail} <> '' AND lower(email) = ${targetEmail}))
        AND flagged = false
        AND "deletedAt" IS NULL
      ORDER BY "createdAt" ASC
    `;

    if (admins.length === 0) {
      console.warn(
        "[agri-bootstrap] No active ADMIN user found yet. Competition and workspace rows are ready; run `npm run db:resetadmin` and re-run `npm run db:bootstrap-agri` to grant root scopes and publish initial rules."
      );
      return;
    }

    for (const admin of admins) {
      let grantedCount = 0;
      for (const scope of AGRI_SCOPES) {
        const [existingGrant] = await tx.$queryRaw<GrantRow[]>`
          SELECT id, "revokedAt", "expiresAt", delegable, "sourceGrantId", "managerGrantId"
          FROM agri_access_grants
          WHERE "competitionId" = ${competitionId}
            AND "userId" = ${admin.id}
            AND scope = ${scope}
          FOR UPDATE
        `;
        if (!existingGrant) {
          await tx.$executeRaw`
            INSERT INTO agri_access_grants (
              id, "competitionId", "userId", scope, "grantedById", "grantedAt",
              "revokedAt", "expiresAt", delegable, revision,
              "sourceGrantId", "sourceRevision", "managerGrantId", "managerRevision"
            ) VALUES (
              ${randomUUID()}, ${competitionId}, ${admin.id}, ${scope}, ${admin.id}, ${now},
              NULL, NULL, true, 1,
              NULL, NULL, NULL, NULL
            )
          `;
          grantedCount++;
        } else if (
          existingGrant.revokedAt !== null ||
          (existingGrant.expiresAt !== null && existingGrant.expiresAt <= now) ||
          !existingGrant.delegable ||
          existingGrant.sourceGrantId !== null ||
          existingGrant.managerGrantId !== null
        ) {
          await tx.$executeRaw`
            UPDATE agri_access_grants
            SET "grantedById" = ${admin.id},
                "grantedAt" = ${now},
                "revokedAt" = NULL,
                "expiresAt" = NULL,
                delegable = true,
                revision = revision + 1,
                "sourceGrantId" = NULL,
                "sourceRevision" = NULL,
                "managerGrantId" = NULL,
                "managerRevision" = NULL
            WHERE id = ${existingGrant.id}
          `;
          grantedCount++;
        }
      }
      console.log(
        `[agri-bootstrap] Ensured 13 root delegable scopes for ${admin.email || admin.username} (${grantedCount} updated/inserted)`
      );
    }

    // 4. Seed & publish initial Rule Version 1 if no published rule exists yet
    if (!workspace.publishedRuleVersionId && !draftOnly) {
      const actorId = admins[0].id;
      const draftPayload = {
        schemaVersion: 1 as const,
        guidanceMarkdown: DEFAULT_GUIDANCE_MARKDOWN,
        requirements: DEFAULT_REQUIREMENTS,
        windows: [
          {
            stage: "REGISTRATION" as const,
            state: "READY" as const,
            opensAt: opensAt.toISOString(),
            closesAt: prelimClosesAt.toISOString(),
            includesDeadline: true,
          },
          {
            stage: "PRELIMINARY" as const,
            state: "READY" as const,
            opensAt: opensAt.toISOString(),
            closesAt: prelimClosesAt.toISOString(),
            includesDeadline: true,
          },
          {
            stage: "FINAL" as const,
            state: "READY" as const,
            opensAt: opensAt.toISOString(),
            closesAt: finalClosesAt.toISOString(),
            includesDeadline: true,
          },
        ],
      };

      const [latest] = await tx.$queryRaw<Array<{ version: number }>>`
        SELECT COALESCE(max(version), 0)::integer AS version
        FROM agri_rule_versions
        WHERE "competitionId" = ${competitionId}
      `;
      const ruleId = randomUUID();
      const nextVersion = latest.version + 1;

      await tx.$executeRaw`
        INSERT INTO agri_rule_versions (
          id, "competitionId", version, requirements, "guidanceMarkdown", "confirmedById", "confirmedAt", "createdAt"
        ) VALUES (
          ${ruleId}, ${competitionId}, ${nextVersion}, ${JSON.stringify(DEFAULT_REQUIREMENTS)}::jsonb,
          ${DEFAULT_GUIDANCE_MARKDOWN}, ${actorId}, ${now}, ${now}
        )
      `;

      for (const item of draftPayload.windows) {
        await tx.$executeRaw`
          INSERT INTO agri_stage_windows (
            id, "competitionId", "ruleVersionId", stage, state, "opensAt", "closesAt", "includesDeadline"
          ) VALUES (
            ${randomUUID()}, ${competitionId}, ${ruleId}, ${item.stage}, 'CONFIRMED',
            ${new Date(item.opensAt)}, ${new Date(item.closesAt)}, ${item.includesDeadline}
          )
        `;
      }

      const nextRevision = workspace.draftRevision + 1;
      await tx.$executeRaw`
        UPDATE agri_workspaces
        SET "rulesDraft" = ${JSON.stringify(draftPayload)}::jsonb,
            "confirmedRuleVersionId" = ${ruleId},
            "publishedRuleVersionId" = ${ruleId},
            enabled = true,
            "draftRevision" = ${nextRevision},
            "updatedById" = ${actorId},
            "updatedAt" = ${now}
        WHERE id = ${workspace.id}
      `;

      await tx.$executeRaw`
        INSERT INTO agri_workspace_events (
          id, "competitionId", revision, action, "ruleVersionId", "actorId", "createdAt"
        ) VALUES (
          ${randomUUID()}, ${competitionId}, ${nextRevision}, 'publishRules', ${ruleId}, ${actorId}, ${now}
        )
      `;

      console.log(
        `[agri-bootstrap] Published initial Rule v${nextVersion} (${ruleId}) and enabled workspace for ${competitionId}`
      );
    } else {
      console.log(
        `[agri-bootstrap] Workspace rule state preserved (enabled=${workspace.enabled}, publishedRuleVersionId=${workspace.publishedRuleVersionId ?? "none"})`
      );
    }
  });

  console.log("[agri-bootstrap] Done.");
}

main()
  .catch((error) => {
    console.error("[agri-bootstrap] Failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
