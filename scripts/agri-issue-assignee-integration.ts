import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import type { AgriRulesDraft } from "../src/contracts/agri-workspace";
for (const value of [process.env.DATABASE_URL, process.env.DIRECT_URL]) {
  const endpoint = new URL(value ?? "http://invalid");
  if (endpoint.hostname !== "127.0.0.1" || endpoint.port !== "55437" || !["/ans_agri_assignment_20261013", "/ans_agri_assignment_r6_20261013"].includes(endpoint.pathname)) throw new Error("Refusing non-isolated assignment validation");
}
async function main() {
  const { db } = await import("../src/lib/db");
  const { executeAgriWorkspaceCommand: rules, readAgriWorkspaceRules: getRules } = await import("../src/server/competitions/agrihackathon/workspace");
  const { prepareAgriStage: prepare, executeAgriSubmissionCommand: submit } = await import("../src/server/competitions/agrihackathon/submissions");
  const { executeAgriIssueCommand: run, readAgriIssue: detail } = await import("../src/server/competitions/agrihackathon/issues");
  const { readAgriDecisionManagement } = await import("../src/server/competitions/agrihackathon/decisions");
  const checks: { label: string; passed: boolean }[] = [];
  const report = { passed: false, isolatedPostgres: true, productionWrites: false, providerCalls: 0, checks };
  const check = async (label: string, work: () => Promise<void>) => { await work(); checks.push({ label, passed: true }); };
  try {
    const prefix = "assignment-" + randomUUID();
    const edition = await db.competition.create({ data: { title: prefix + " LOCAL FIXTURE", status: "ONGOING" }, select: { id: true } });
    process.env.ANS_AGRIHACKATHON_COMPETITION_ID = edition.id;
    const makeUser = (suffix: string) => db.user.create({ data: { email: prefix + suffix + "@example.invalid", username: prefix + suffix, quotaPoints: 77 }, select: { id: true } });
    const [owner, member, outsider, reader, full] = await Promise.all([makeUser("owner"), makeUser("member"), makeUser("outsider"), makeUser("reader"), makeUser("full")]);
    await db.$executeRaw`INSERT INTO agri_workspaces (id,"competitionId") VALUES (${randomUUID()},${edition.id})`;
    const grant = async (userId: string, scope: string) => db.$executeRaw`INSERT INTO agri_access_grants (id,"competitionId","userId",scope,"grantedById","grantedAt") VALUES (${randomUUID()},${edition.id},${userId},${scope},${owner.id},clock_timestamp())`;
    await grant(owner.id, "RULES_CONFIRM"); await grant(reader.id, "WORKS_READ");
    for (const scope of ["WORKS_READ", "ISSUES_WRITE", "PRIVATE_MATERIALS_READ", "INTERNAL_NOTES_READ"]) await grant(full.id, scope);
    const [clock] = await db.$queryRaw<Array<{ now: Date }>>`SELECT clock_timestamp() AS now`;
    const draft: AgriRulesDraft = { schemaVersion: 1, guidanceMarkdown: "Isolated assignment check, not official rules", requirements: { schemaVersion: 1, repositoryRequired: false, repositoryRefRequired: false, demoRequired: false, materials: [] }, windows: [
      { stage: "REGISTRATION", state: "PENDING", opensAt: null, closesAt: null },
      { stage: "PRELIMINARY", state: "READY", opensAt: new Date(clock.now.getTime() - 60000).toISOString(), closesAt: new Date(clock.now.getTime() + 3600000).toISOString(), includesDeadline: false },
      { stage: "FINAL", state: "PENDING", opensAt: null, closesAt: null },
    ] };
    let revision = (await getRules(owner.id)).revision;
    await rules(owner.id, { action: "saveRulesDraft", idempotencyKey: randomUUID(), expectedRevision: revision++, draft });
    const rule = await rules(owner.id, { action: "confirmRules", idempotencyKey: randomUUID(), expectedRevision: revision++ });
    await rules(owner.id, { action: "publishRules", idempotencyKey: randomUUID(), expectedRevision: revision++, ruleVersionId: rule.resourceId });
    await rules(owner.id, { action: "setEnabled", idempotencyKey: randomUUID(), expectedRevision: revision, enabled: true });
    const team = await db.team.create({ data: { name: prefix + " TEAM", slug: prefix, ownerId: owner.id }, select: { id: true, name: true } });
    await db.teamMember.createMany({ data: [{ teamId: team.id, userId: owner.id, role: "OWNER" }, { teamId: team.id, userId: member.id, role: "MEMBER" }] });
    const otherTeam = await db.team.create({ data: { name: prefix + " OTHER", slug: prefix + "-other", ownerId: outsider.id }, select: { id: true } });
    await db.teamMember.create({ data: { teamId: otherTeam.id, userId: outsider.id, role: "OWNER" } });
    const entry = await db.teamCompetition.create({ data: { teamId: team.id, competitionId: edition.id }, select: { id: true } });
    const project = await db.project.create({ data: { title: "Isolated assignment project", ownerId: owner.id, teamId: team.id, goal: "CONTEST" }, select: { id: true } });
    const artifact = await db.artifact.create({ data: { projectId: project.id, createdById: owner.id, kind: "CONTEST_MVP", workflowId: "fixture", title: "LOCAL" }, select: { id: true } });
    const version = await db.artifactVersion.create({ data: { artifactId: artifact.id, version: 1, createdById: owner.id, contentJson: { private: "LOCAL" }, contentMarkdown: "LOCAL", factSnapshotHash: "local" }, select: { id: true } });
    const stage = await prepare(owner.id, { action: "prepareStage", teamCompetitionId: entry.id, stage: "PRELIMINARY" });
    const accepted = await submit(owner.id, { action: "submit", idempotencyKey: randomUUID(), entryStageId: stage.entryStageId, expectedRevision: 1, expectedRuleVersionId: rule.resourceId, content: { projectId: project.id, artifactVersionId: version.id, repository: null, demoUrl: null, summary: "LOCAL", materials: { schemaVersion: 1, items: [] } } });
    assert.ok(accepted.submissionId); const submissionId = accepted.submissionId;
    const create = (overrides: Record<string, unknown> = {}) => ({ action: "createIssue", idempotencyKey: randomUUID(), submissionId, title: "Actual issue", body: "Actual feedback", status: "OPEN", severity: "MEDIUM", type: "BUG", basis: "METADATA", visibility: "TEAM", reviewedForTeam: true, assigneeId: member.id, dueState: "UNKNOWN", dueAt: null, processingSummary: null, ...overrides });
    const snapshot = async () => ({
      users: (await db.user.findMany({ where: { id: { in: [owner.id, member.id, outsider.id, reader.id, full.id] } }, orderBy: { id: "asc" }, select: { id: true, xp: true, quotaPoints: true } })).map(user => ({ id: user.id, xp: user.xp, quotaPoints: user.quotaPoints.toString() })), 
      entry: await db.teamCompetition.findUniqueOrThrow({ where: { id: entry.id } }),
      publications: await db.artifactPublication.count({ where: { artifactVersionId: version.id } }),
      ledger: await db.quotaLedger.count({ where: { userId: { in: [owner.id, member.id, full.id] } } }),
    });
    const original = await snapshot();
    const mutationCounts = async () => {
      const [row] = await db.$queryRaw<Array<{ issues: number; events: number; receipts: number; logs: number }>>`SELECT (SELECT count(*)::integer FROM agri_issues WHERE "competitionId"=${edition.id}) AS issues,(SELECT count(*)::integer FROM agri_issue_events WHERE "competitionId"=${edition.id}) AS events,(SELECT count(*)::integer FROM agri_issue_receipts WHERE "competitionId"=${edition.id}) AS receipts,(SELECT count(*)::integer FROM audit_logs WHERE "resourceType"='agri_issue') AS logs`;
      return row;
    };
    await check("unrelated active member is rejected without issues/events/receipts/audit", async () => {
      const before = await mutationCounts();
      await assert.rejects(run(full.id, create({ assigneeId: outsider.id })), /AGRI_ASSIGNEE_CANNOT_READ/);
      assert.deepEqual(await mutationCounts(), before);
    });
    let assignedId = ""; let confirmedCommand: ReturnType<typeof create>;
    await check("exact active member receives and reads reviewed TEAM metadata", async () => {
      confirmedCommand = create(); const result = await run(full.id, confirmedCommand); assignedId = result.issueId;
      assert.equal((await detail(member.id, assignedId)).issue.body, "Actual feedback");
    });
    await check("team membership is not staff write permission", async () => {
      await assert.rejects(run(member.id, create()), /AGRI_SCOPE_REQUIRED/);
    });
    await check("private-basis reviewed TEAM issue is readable through exact team projection", async () => {
      const result = await run(full.id, create({ basis: "PRIVATE_MATERIALS" }));
      assert.equal((await detail(member.id, result.issueId)).issue.basis, "PRIVATE_MATERIALS");
    });
    await check("team member cannot be assigned INTERNAL without matching staff scopes", async () => {
      const before = await mutationCounts(); await assert.rejects(run(full.id, create({ visibility: "INTERNAL" })), /AGRI_ASSIGNEE_CANNOT_READ/); assert.deepEqual(await mutationCounts(), before);
    });
    await check("WORKS_READ staff receives TEAM metadata but not internal or private basis", async () => {
      const result = await run(full.id, create({ assigneeId: reader.id })); assert.equal((await detail(reader.id, result.issueId, { scope: "staff" })).issue.id, result.issueId);
      await assert.rejects(run(full.id, create({ assigneeId: reader.id, visibility: "INTERNAL" })), /AGRI_ASSIGNEE_CANNOT_READ/);
      await assert.rejects(run(full.id, create({ assigneeId: reader.id, basis: "PRIVATE_MATERIALS" })), /AGRI_ASSIGNEE_CANNOT_READ/);
    });
    await check("full existing staff scopes allow INTERNAL private-material assignment", async () => {
      const result = await run(full.id, create({ assigneeId: full.id, visibility: "INTERNAL", basis: "PRIVATE_MATERIALS" }));
      assert.equal((await detail(full.id, result.issueId, { scope: "staff" })).issue.basis, "PRIVATE_MATERIALS");
    });
    await check("LEFT member denied new assignments; confirmed receipt remains replayable", async () => {
      await db.teamMember.updateMany({ where: { teamId: team.id, userId: member.id }, data: { status: "LEFT" } });
      await assert.rejects(run(full.id, create()), /AGRI_ASSIGNEE_CANNOT_READ/);
      assert.equal((await run(full.id, confirmedCommand!)).duplicate, true);
      await db.teamMember.updateMany({ where: { teamId: team.id, userId: member.id }, data: { status: "ACTIVE" } });
    });
    await check("narrower visibility update rejects retained unreadable assignee and leaves revision", async () => {
      const fields = Object.fromEntries(Object.entries(create()).filter(([key]) => !["action", "idempotencyKey", "submissionId", "basis"].includes(key)));
      const before = await mutationCounts();
      await assert.rejects(run(full.id, { ...fields, action: "updateIssue", idempotencyKey: randomUUID(), issueId: assignedId, expectedRevision: 1, visibility: "INTERNAL" }), /AGRI_ASSIGNEE_CANNOT_READ/);
      assert.deepEqual(await mutationCounts(), before); assert.equal((await detail(full.id, assignedId, { scope: "staff" })).issue.revision, 1);
    });
    await check("disabled or nonexistent recipients fail with unavailable error", async () => {
      await assert.rejects(run(full.id, create({ assigneeId: "nonexistent-local" })), /AGRI_ASSIGNEE_UNAVAILABLE/);
      await db.user.update({ where: { id: member.id }, data: { flagged: true } });
      await assert.rejects(run(full.id, create()), /AGRI_ASSIGNEE_UNAVAILABLE/);
      await db.user.update({ where: { id: member.id }, data: { flagged: false } });
    });
    await check("unassigned issues remain valid without expanding any scopes", async () => {
      assert.equal((await run(full.id, create({ assigneeId: null }))).duplicate, false);
      assert.equal(await db.$queryRaw`SELECT id FROM agri_access_grants WHERE "competitionId"=${edition.id} AND "userId"=${member.id}`.then(rows => (rows as unknown[]).length), 0);
    });
    await check("recipient grant expiry during receipt persistence rolls back all writes", async () => {
      const before = await mutationCounts();
      await db.$executeRawUnsafe("CREATE FUNCTION agri_assignment_test_delay() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_sleep(0.6); RETURN NEW; END; $$");
      await db.$executeRawUnsafe("CREATE TRIGGER agri_assignment_test_delay BEFORE INSERT ON agri_issue_receipts FOR EACH ROW EXECUTE FUNCTION agri_assignment_test_delay()");
      try {
        await db.$executeRaw`UPDATE agri_access_grants SET "expiresAt"=clock_timestamp()+interval '0.3 seconds',revision=revision+1 WHERE "competitionId"=${edition.id} AND "userId"=${reader.id} AND scope='WORKS_READ'`;
        await assert.rejects(run(full.id, create({ assigneeId: reader.id })), /AGRI_ASSIGNEE_CANNOT_READ/);
        assert.deepEqual(await mutationCounts(), before);
      } finally {
        await db.$executeRawUnsafe("DROP TRIGGER agri_assignment_test_delay ON agri_issue_receipts");
        await db.$executeRawUnsafe("DROP FUNCTION agri_assignment_test_delay()");
        await db.$executeRaw`UPDATE agri_access_grants SET "expiresAt"=NULL,revision=revision+1 WHERE "competitionId"=${edition.id} AND "userId"=${reader.id} AND scope='WORKS_READ'`;
      }
    });
    await check("decision lookup reads real team/stage and requires RULES_CONFIRM", async () => {
      const view = await readAgriDecisionManagement(owner.id, { teamCompetitionId: entry.id, entryStageId: stage.entryStageId });
      assert.deepEqual(view.context, { teamName: team.name, stage: "PRELIMINARY" });
      await assert.rejects(readAgriDecisionManagement(reader.id, { teamCompetitionId: entry.id, entryStageId: stage.entryStageId }), /AGRI_SCOPE_REQUIRED/);
    });
    await check("no changes to submission state, public consent, XP, balances or publications", async () => {
      assert.deepEqual(await snapshot(), original);
    });
    report.passed = true;
  } finally {
    await writeFile(process.env.ANS_AGRI_ASSIGNMENT_REPORT ?? "C:/Users/lsb/.workbuddy/ans-agri-current-audit-20261012/assignee-readability-current-r1.json", JSON.stringify(report, null, 2));
    await db.$disconnect();
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Assignment integration failed"); process.exitCode = 1; });
