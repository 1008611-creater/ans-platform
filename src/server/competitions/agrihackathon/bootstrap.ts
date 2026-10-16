import { randomUUID } from "node:crypto";
import type { DbTransaction } from "@/lib/db";
import { db } from "@/lib/db";

export const DEFAULT_AGRI_EDITION_ID = "agrihackathon-2026";

export const AGRI_BOOTSTRAP_SCOPES = [
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

export const DEFAULT_AGRI_GUIDANCE_MARKDOWN = [
  "### 首届中国农大 AI 创客马拉松（AgriHackathon）参赛与代码托管说明",
  "",
  "1. **战队报名与作品墙绑定**：队长创建团队并完成本届赛事报名后，可在 `/explore/agrihackathon/submit` 将已公开审核通过的 ANS 项目绑定至农客松作品墙。",
  "2. **阶段提交与平台代码托管**：初赛与决赛均在 `/competitions/agrihackathon/submissions` 提交锁定的项目产物版本（`artifactVersionId`），并在「赛事代码托管与材料存证」面板内上传参赛源码压缩包或一键拉取固定 GitHub / Gitee / GitLab 代码版本，由平台统一托管、计算 SHA-256 哈希并归档管理。",
  "3. **截止冻结与重提说明**：阶段窗口关闭后系统自动按已采用规则版本计算截止冻结；如需勘误重提，须由组委会在 `/competitions/agrihackathon/manage` 签发一次性重提许可。",
].join("\n");

export const DEFAULT_AGRI_REQUIREMENTS = {
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

interface WorkspaceBootstrapRow {
  id: string;
  competitionId: string;
  enabled: boolean;
  draftRevision: number;
  confirmedRuleVersionId: string | null;
  publishedRuleVersionId: string | null;
}

export interface AgriBootstrapOptions {
  competitionId?: string;
  draftOnly?: boolean;
  targetEmail?: string;
  silent?: boolean;
}

export type AgriRawSqlTx = Pick<DbTransaction, "$queryRaw" | "$executeRaw">;

export async function bootstrapAgriEditionInTx(
  tx: AgriRawSqlTx,
  options: AgriBootstrapOptions = {},
) {
  const competitionId = (
    options.competitionId ||
    process.env.ANS_AGRIHACKATHON_COMPETITION_ID ||
    DEFAULT_AGRI_EDITION_ID
  ).trim();
  if (!competitionId || competitionId.length > 80) {
    throw new Error("ANS_AGRIHACKATHON_COMPETITION_ID 长度必须在 1 到 80 个字符之间。");
  }
  const log = options.silent ? () => {} : (msg: string) => console.log(msg);

  const [{ now }] = await tx.$queryRaw<Array<{ now: Date }>>`SELECT clock_timestamp() AS now`;
  // 1. Ensure Competition row exists in competitions
  await tx.$executeRaw`
    INSERT INTO competitions (
      id, title, organizer, url, description, status, "startsAt", "endsAt", rules, "rewardXp", "createdAt"
    ) VALUES (
      ${competitionId},
      'AgriHackathon｜农客松',
      'CAUHub',
      'https://ans.cauai.fun/competitions/agrihackathon',
      '由 CAUHub 发起的首届 AI Hackathon，设 AI for People、AI for Discovery、AI for Action 三个方向。',
      'UPCOMING'::"CompetitionStatus",
      NULL,
      NULL,
      ${DEFAULT_AGRI_GUIDANCE_MARKDOWN},
      0,
      ${now}
    )
    ON CONFLICT (id) DO NOTHING
  `;

  // 2. Ensure agri_workspaces row exists for competitionId
  await tx.$executeRaw`
    INSERT INTO agri_workspaces (id, "competitionId")
    VALUES (${randomUUID()}, ${competitionId})
    ON CONFLICT ("competitionId") DO NOTHING
  `;

  const [workspace] = await tx.$queryRaw<WorkspaceBootstrapRow[]>`
    SELECT id, "competitionId", enabled, "draftRevision", "confirmedRuleVersionId", "publishedRuleVersionId"
    FROM agri_workspaces
    WHERE "competitionId" = ${competitionId}
    FOR UPDATE
  `;
  if (!workspace) {
    throw new Error(`Failed to lock agri_workspaces for ${competitionId}`);
  }

  // Initialization preserves existing rules and grants; publication requires organizer confirmation.
  const enabled = workspace.enabled;
  const publishedRuleVersionId = workspace.publishedRuleVersionId;
  log("[agri-bootstrap] Workspace initialized; published rules and permissions preserved.");

  return { competitionId, workspaceId: workspace.id, enabled, publishedRuleVersionId };
}

let inFlightBootstrap: Promise<void> | null = null;

export function shouldAutoBootstrapAgriEdition(competitionId: string | null | undefined): competitionId is string {
  if (!competitionId || competitionId !== DEFAULT_AGRI_EDITION_ID) return false;
  if (process.env.NODE_ENV === "test" || process.env.VITEST === "true") return false;
  if (process.env.AGRI_AUTO_BOOTSTRAP_DISABLED === "true") return false;
  return true;
}

export async function ensureDefaultAgriEditionBootstrapped(competitionId?: string | null): Promise<boolean> {
  const targetId = (competitionId ?? process.env.ANS_AGRIHACKATHON_COMPETITION_ID ?? "").trim();
  if (!shouldAutoBootstrapAgriEdition(targetId)) return false;

  if (!inFlightBootstrap) {
    inFlightBootstrap = db
      .$transaction(
        async tx => {
          await bootstrapAgriEditionInTx(tx, { competitionId: targetId, silent: true });
        },
        { maxWait: 30000, timeout: 60000 },
      )
      .catch(error => {
        console.error("[agri-bootstrap] Runtime auto-bootstrap failed:", error);
      })
      .finally(() => {
        inFlightBootstrap = null;
      });
  }

  await inFlightBootstrap;
  return true;
}
