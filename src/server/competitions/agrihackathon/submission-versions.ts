import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { AgriWorkspaceError } from "@/contracts/agri-workspace";
import type { AgriSubmissionVersionChoice } from "@/contracts/agri-submissions";
import { lockAgriWorkspace, agriDatabaseClock } from "./workspace";

const identifier = z.string().trim().min(1).max(80);
const createVersionBodySchema = z.object({
  title: z.string().trim().max(120).optional(),
}).strict();

const fail = (code: string, status = 409): never => {
  throw new AgriWorkspaceError(code, status);
};

export async function createAgriSubmissionVersion(
  actorId: string,
  rawStageId: string,
  rawBody: unknown = {},
): Promise<{ version: AgriSubmissionVersionChoice }> {
  const stageId = identifier.parse(rawStageId);
  const body = createVersionBodySchema.parse(rawBody ?? {});

  return db.$transaction(async tx => {
    const ctx = await lockAgriWorkspace(tx, actorId);
    if (!ctx.workspace.enabled) return fail("AGRI_WORKSPACE_DISABLED");

    const [target] = await tx.$queryRaw<Array<{
      entryId: string;
      teamId: string;
      teamName: string;
      entryStatus: string;
      stage: "PRELIMINARY" | "FINAL";
    }>>`
      SELECT tc.id AS "entryId", tc."teamId", t.name AS "teamName", tc."entryStatus", es.stage
      FROM agri_entry_stages es
      JOIN team_competitions tc ON tc.id = es."teamCompetitionId"
      JOIN teams t ON t.id = tc."teamId"
      WHERE es.id = ${stageId} AND es."competitionId" = ${ctx.workspace.competitionId}
      FOR UPDATE OF es, tc
    `;
    if (!target) return fail("AGRI_STAGE_NOT_FOUND", 404);
    if (target.entryStatus === "REJECTED") return fail("AGRI_TEAM_PERMISSION_REQUIRED", 403);

    const [member] = await tx.$queryRaw<Array<{ role: string; status: string }>>`
      SELECT role, status FROM team_members
      WHERE "teamId" = ${target.teamId} AND "userId" = ${actorId}
      FOR SHARE
    `;
    if (!member || member.status !== "ACTIVE") return fail("AGRI_TEAM_PERMISSION_REQUIRED", 403);
    if (!["OWNER", "ADMIN"].includes(member.role)) return fail("AGRI_TEAM_MANAGER_REQUIRED", 403);

    const now = await agriDatabaseClock(tx);

    const [wallBound] = await tx.$queryRaw<Array<{ projectId: string }>>`
      SELECT "projectId" FROM agri_wall_entries WHERE "teamCompetitionId" = ${target.entryId}
    `;
    const [roster] = await tx.$queryRaw<Array<{ projectId: string }>>`
      SELECT "projectId" FROM agri_official_rosters WHERE "teamCompetitionId" = ${target.entryId}
    `;
    const boundProjectId = wallBound?.projectId ?? roster?.projectId;

    let project: { id: string; title: string } | undefined;
    if (boundProjectId) {
      const [bound] = await tx.$queryRaw<Array<{ id: string; title: string; ownerId: string; teamId: string | null; status: string }>>`
        SELECT id, title, "ownerId", "teamId", status FROM projects WHERE id = ${boundProjectId} FOR UPDATE
      `;
      if (!bound || bound.ownerId !== actorId || bound.teamId !== target.teamId || bound.status !== "ACTIVE") {
        return fail("AGRI_PROJECT_UNAVAILABLE", 403);
      }
      project = { id: bound.id, title: bound.title };
    } else {
      const [existingProject] = await tx.$queryRaw<Array<{ id: string; title: string }>>`
        SELECT id, title FROM projects
        WHERE "ownerId" = ${actorId} AND "teamId" = ${target.teamId} AND status = 'ACTIVE'
        ORDER BY "updatedAt" DESC, id DESC LIMIT 1
        FOR UPDATE
      `;
      if (existingProject) {
        project = existingProject;
      } else {
        const projectId = randomUUID();
        const projectTitle = body.title?.trim() || `${target.teamName} · 农客松参赛项目`;
        await tx.$executeRaw`
          INSERT INTO projects (id, "ownerId", "teamId", title, goal, status, visibility, "createdAt", "updatedAt")
          VALUES (${projectId}, ${actorId}, ${target.teamId}, ${projectTitle}, 'CONTEST', 'ACTIVE', 'PRIVATE', ${now}, ${now})
        `;
        project = { id: projectId, title: projectTitle };
      }
    }

    let [artifact] = await tx.$queryRaw<Array<{ id: string; title: string; kind: string }>>`
      SELECT id, title, kind FROM artifacts
      WHERE "projectId" = ${project.id}
      ORDER BY "updatedAt" DESC, id DESC LIMIT 1
      FOR UPDATE
    `;
    if (!artifact) {
      const artifactId = randomUUID();
      const artifactTitle = body.title?.trim() || "赛事源码与成果版本";
      await tx.$executeRaw`
        INSERT INTO artifacts (id, "projectId", "workflowId", kind, title, visibility, "currentVersion", "createdById", "createdAt", "updatedAt")
        VALUES (${artifactId}, ${project.id}, 'agrihackathon-hosted', 'PROJECT_ONE_PAGER', ${artifactTitle}, 'PRIVATE', 0, ${actorId}, ${now}, ${now})
      `;
      artifact = { id: artifactId, title: artifactTitle, kind: "PROJECT_ONE_PAGER" };
    }

    const [lastVer] = await tx.$queryRaw<Array<{ version: number }>>`
      SELECT COALESCE(max(version), 0)::integer AS version FROM artifact_versions WHERE "artifactId" = ${artifact.id}
    `;
    const nextVersion = lastVer.version + 1;
    const versionId = randomUUID();
    const snapshotHash = createHash("sha256").update(`${artifact.id}:${nextVersion}:${now.toISOString()}`).digest("hex");
    const markdown = body.title?.trim() || `${project.title} v${nextVersion}`;

    await tx.$executeRaw`
      INSERT INTO artifact_versions (id, "artifactId", version, "contentJson", "contentMarkdown", "factSnapshotHash", "createdById", "createdAt")
      VALUES (${versionId}, ${artifact.id}, ${nextVersion}, ${JSON.stringify({ source: "agrihackathon-quick-init", stage: target.stage, version: nextVersion })}::jsonb, ${markdown}, ${snapshotHash}, ${actorId}, ${now})
    `;
    await tx.$executeRaw`
      UPDATE artifacts SET "currentVersion" = ${nextVersion}, "updatedAt" = ${now} WHERE id = ${artifact.id}
    `;
    await tx.auditLog.create({
      data: {
        actorId,
        action: "AGRI_CREATE_SUBMISSION_VERSION",
        resourceType: "agri_entry_stage",
        resourceId: stageId,
        metadata: { competitionId: ctx.workspace.competitionId, projectId: project.id, artifactId: artifact.id, artifactVersionId: versionId, version: nextVersion },
      },
    });

    return {
      version: {
        id: versionId,
        version: nextVersion,
        createdAt: now.toISOString(),
        artifactId: artifact.id,
        artifactTitle: artifact.title,
        kind: artifact.kind,
        projectId: project.id,
        projectTitle: project.title,
      },
    };
  }, { timeout: 15000 });
}
