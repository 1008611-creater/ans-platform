import { db } from "@/lib/db";
import { agriSubmissionWindowSchema } from "@/contracts/agrihackathon";
import type { AgriCompetitionPhaseView, AgriPhaseWindow } from "@/contracts/agri-phase-view";
import { getAgriWindowState } from "@/domain/competitions/agrihackathon";
import { agriDatabaseClock } from "./workspace";
import { projectAgriStageFreeze } from "./submissions";

interface Workspace { enabled: boolean; publishedRuleVersionId: string | null }
interface Window { stage: string; state: string; opensAt: Date | null; closesAt: Date | null; includesDeadline: boolean | null }
const stages = ["REGISTRATION", "PRELIMINARY", "FINAL"] as const;
const pendingWindows = (): AgriPhaseWindow[] => stages.map(stage => ({ stage, state: "RULES_PENDING", opensAt: null, closesAt: null, includesDeadline: null }));

/** Read-only, edition-scoped projection. It never freezes stages, prepares rows, publishes or grants XP. */
export async function getAgriCompetitionPhaseView(competitionId: string, viewerId?: string | null): Promise<AgriCompetitionPhaseView | null> {
  return db.$transaction(async tx => {
    const configured = process.env.ANS_AGRIHACKATHON_COMPETITION_ID?.trim();
    const [workspace] = await tx.$queryRaw<Workspace[]>`SELECT enabled,"publishedRuleVersionId" FROM agri_workspaces WHERE "competitionId"=${competitionId}`;
    if (!workspace && configured !== competitionId) return null;
    const competition = await tx.competition.findUnique({ where: { id: competitionId }, select: { id: true, title: true, organizer: true } });
    if (!competition) return null;
    const now = await agriDatabaseClock(tx);
    let configuration: AgriCompetitionPhaseView["configuration"] = configured !== competitionId || !configured || configured.length > 80
      ? "UNBOUND" : !workspace ? "WORKSPACE_PENDING" : !workspace.enabled ? "DISABLED" : !workspace.publishedRuleVersionId ? "RULES_PENDING" : "READY";
    let publishedRule: AgriCompetitionPhaseView["rule"] = null;
    let windows = pendingWindows();
    // Never expose another edition's guidance through a stale binding.
    if (workspace?.publishedRuleVersionId && configured === competitionId) {
      const [rule] = await tx.$queryRaw<Array<{ version: number; guidanceMarkdown: string; confirmedById: string; confirmedAt: Date }>>`SELECT version,"guidanceMarkdown","confirmedById","confirmedAt" FROM agri_rule_versions WHERE id=${workspace.publishedRuleVersionId} AND "competitionId"=${competitionId}`;
      const rows = await tx.$queryRaw<Window[]>`SELECT stage,state,"opensAt","closesAt","includesDeadline" FROM agri_stage_windows WHERE "ruleVersionId"=${workspace.publishedRuleVersionId} AND "competitionId"=${competitionId}`;
      if (!rule || rows.length !== 3 || stages.some(stage => rows.filter(row => row.stage === stage).length !== 1)) configuration = "UNAVAILABLE";
      else {
        windows = stages.map(stage => {
          const row = rows.find(item => item.stage === stage)!;
          const parsed = agriSubmissionWindowSchema.safeParse(row.state === "PENDING" ? { stage, state: "PENDING", opensAt: null, closesAt: null }
            : { stage, state: row.state, opensAt: row.opensAt?.toISOString() ?? null, closesAt: row.closesAt?.toISOString() ?? null,
              includesDeadline: row.includesDeadline, confirmedById: rule.confirmedById, confirmedAt: rule.confirmedAt.toISOString() });
          if (!parsed.success) { configuration = "UNAVAILABLE"; return { stage, state: "INVALID", opensAt: null, closesAt: null, includesDeadline: null }; }
          return { stage, state: getAgriWindowState(parsed.data, now), opensAt: parsed.data.opensAt, closesAt: parsed.data.closesAt,
            includesDeadline: parsed.data.state === "CONFIRMED" ? parsed.data.includesDeadline : null };
        });
        publishedRule = { version: rule.version, guidanceMarkdown: rule.guidanceMarkdown };
      }
    }
    let viewer: AgriCompetitionPhaseView["viewer"] = null;
    if (viewerId) {
      const [account] = await tx.$queryRaw<Array<{ flagged: boolean; deletedAt: Date | null }>>`SELECT flagged,"deletedAt" FROM users WHERE id=${viewerId}`;
      const available = !!account && !account.flagged && !account.deletedAt;
      viewer = { available, teams: [], entries: [] };
      if (available && configured === competitionId && workspace) {
        const teamRows = await tx.teamMember.findMany({ where: { userId: viewerId, status: "ACTIVE", role: { in: ["OWNER", "ADMIN"] } },
          select: { role: true, team: { select: { id: true, name: true, slug: true } } }, orderBy: { joinedAt: "asc" } });
        viewer.teams = teamRows.map(row => ({ ...row.team, role: row.role }));
        const entries = await tx.teamCompetition.findMany({ where: { competitionId, entryStatus: { not: "REJECTED" }, team: { members: { some: { userId: viewerId, status: "ACTIVE" } } } },
          select: { id: true, teamId: true, team: { select: { name: true, members: { where: { userId: viewerId, status: "ACTIVE" }, select: { role: true } } } } }, orderBy: { createdAt: "asc" } });
        for (const entry of entries) {
          const [finalist] = await tx.$queryRaw<Array<{ state: "ELIGIBLE" | "INELIGIBLE" }>>`SELECT state FROM agri_final_decisions WHERE "competitionId"=${competitionId} AND "teamCompetitionId"=${entry.id} ORDER BY sequence DESC LIMIT 1`;
          const entryStages = await tx.$queryRaw<Array<{ id: string; stage: "PRELIMINARY" | "FINAL"; sequence: number | null; acceptedAt: Date | null; currentSubmissionId: string | null; frozenSubmissionId: string | null }>>`SELECT es.id,es.stage,s.sequence,s."acceptedAt",es."currentSubmissionId",es."frozenSubmissionId" FROM agri_entry_stages es
            LEFT JOIN agri_stage_submissions s ON s.id=es."currentSubmissionId" AND s."entryStageId"=es.id AND s."competitionId"=es."competitionId"
            WHERE es."competitionId"=${competitionId} AND es."teamCompetitionId"=${entry.id} ORDER BY es.stage`;
          const projectedStages = await Promise.all(entryStages.map(async row => {
            const freeze = await projectAgriStageFreeze(tx, { ...row, competitionId }, now);
            return { id: row.id, stage: row.stage, sequence: row.sequence, acceptedAt: row.acceptedAt?.toISOString() ?? null,
              frozen: freeze.frozenSubmissionId !== null };
          }));
          viewer.entries.push({ id: entry.id, teamId: entry.teamId, teamName: entry.team.name, role: entry.team.members[0]?.role ?? "MEMBER",
            finalist: finalist?.state ?? "UNKNOWN", stages: projectedStages });
        }
      }
    }
    return { competitionId: competition.id, title: competition.title, organizer: competition.organizer, configuration,
      serverNow: now.toISOString(), rule: publishedRule, windows, viewer };
  }, { isolationLevel: "RepeatableRead" });
}