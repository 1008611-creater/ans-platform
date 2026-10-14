/** PostgreSQL integrity checks. Never run against a shared or production database. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { agriOfficialMemberIdsSchema } from "../src/contracts/agri-submissions";
import type { AgriRulesDraft } from "../src/contracts/agri-workspace";
if (process.env.ANS_AGRI_ROSTER_VERIFY !== "true") throw new Error("Dedicated fixture authorization required");
for (const value of [process.env.DATABASE_URL, process.env.DIRECT_URL]) {
  const url = new URL(value ?? "http://invalid");
  if (url.hostname !== "ans-agri-roster-db" || url.port !== "5432" || url.pathname !== "/ans_agri_roster_verify_20261014") throw new Error("Non-isolated database refused");
}
async function main() {
  const { db } = await import("../src/lib/db");
  const { prepareAgriStage: prepare, executeAgriSubmissionCommand: submit, readAgriStage: read } = await import("../src/server/competitions/agrihackathon/submissions");
  const { executeAgriWorkspaceCommand: rules, readAgriWorkspaceRules: readRules } = await import("../src/server/competitions/agrihackathon/workspace");
  const { executeAgriDecisionCommand: decide } = await import("../src/server/competitions/agrihackathon/decisions");
  const checks: string[] = [];
  const check = async (label: string, run: () => Promise<void>) => { await run(); checks.push(label); console.log("PASS " + label); };
  const prefix = "agri-roster-" + randomUUID();
  const edition = await db.competition.create({ data: { title: prefix + " ISOLATED", status: "ONGOING" }, select: { id: true } });
  await db.$executeRaw`INSERT INTO agri_workspaces (id,"competitionId") VALUES (${randomUUID()},${edition.id})`;
  process.env.ANS_AGRIHACKATHON_COMPETITION_ID = edition.id;
  const user = (suffix: string) => db.user.create({ data: { email: prefix + suffix + "@example.invalid", username: prefix + suffix }, select: { id: true } });
  const [owner, teammate, outsider, managerB, managerC, shared, invalid] = await Promise.all(["owner", "member", "outsider", "managerB", "managerC", "shared", "invalid"].map(user));
  for (const scope of ["RULES_CONFIRM"]) await db.$executeRaw`INSERT INTO agri_access_grants (id,"competitionId","userId",scope,"grantedById","grantedAt") VALUES (${randomUUID()},${edition.id},${owner.id},${scope},${owner.id},clock_timestamp())`;
  const publish = async (closesAt: Date) => {
    const now = new Date();
    const draft: AgriRulesDraft = { schemaVersion: 1, guidanceMarkdown: "Isolated rule fixture",
      requirements: { schemaVersion: 1, repositoryRequired: false, repositoryRefRequired: false, demoRequired: false, materials: [] },
      windows: ["REGISTRATION", "PRELIMINARY", "FINAL"].map(stage => ({ stage: stage as "REGISTRATION" | "PRELIMINARY" | "FINAL", state: "READY" as const,
        opensAt: new Date(now.getTime() - 60000).toISOString(), closesAt: closesAt.toISOString(), includesDeadline: false })) };
    let revision = (await readRules(owner.id)).revision;
    await rules(owner.id, { action: "saveRulesDraft", idempotencyKey: randomUUID(), expectedRevision: revision++, draft });
    const confirmed = await rules(owner.id, { action: "confirmRules", idempotencyKey: randomUUID(), expectedRevision: revision++ });
    await rules(owner.id, { action: "publishRules", idempotencyKey: randomUUID(), expectedRevision: revision, ruleVersionId: confirmed.resourceId });
    return confirmed.resourceId;
  };
  const close = new Date(Date.now() + 25000); let ruleId = await publish(close);
  await rules(owner.id, { action: "setEnabled", idempotencyKey: randomUUID(), expectedRevision: (await readRules(owner.id)).revision, enabled: true });
  const makeEntry = async (actorId: string, memberIds: string[]) => {
    const key = randomUUID(); const team = await db.team.create({ data: { name: prefix + key, slug: prefix + key, ownerId: actorId }, select: { id: true } });
    await db.teamMember.createMany({ data: [{ teamId: team.id, userId: actorId, role: "OWNER" }, ...memberIds.map(userId => ({ teamId: team.id, userId, role: "MEMBER" as const }))] });
    const entry = await db.teamCompetition.create({ data: { teamId: team.id, competitionId: edition.id }, select: { id: true } });
    const project = await db.project.create({ data: { ownerId: actorId, teamId: team.id, title: "Fixture project", goal: "CONTEST" }, select: { id: true } });
    const artifact = await db.artifact.create({ data: { projectId: project.id, workflowId: "fixture", kind: "CONTEST_MVP", title: "Fixture", createdById: actorId }, select: { id: true } });
    const version = await db.artifactVersion.create({ data: { artifactId: artifact.id, version: 1, createdById: actorId, contentJson: {}, contentMarkdown: "Isolated fixture", factSnapshotHash: "fixture" }, select: { id: true } });
    const stage = await prepare(actorId, { action: "prepareStage", teamCompetitionId: entry.id, stage: "PRELIMINARY" });
    const content = { projectId: project.id, artifactVersionId: version.id, summary: "ISOLATED PRIVATE", repository: null, demoUrl: null, materials: { schemaVersion: 1 as const, items: [] } };
    return { actorId, teamId: team.id, entryId: entry.id, stageId: stage.entryStageId, artifactId: artifact.id, content };
  };
  const a = await makeEntry(owner.id, [teammate.id, invalid.id]);
  const b = await makeEntry(managerB.id, [shared.id]); const c = await makeEntry(managerC.id, [shared.id]);
  const command = (target: typeof a, ids?: string[], extra: Record<string, unknown> = {}) => ({ action: "submit", idempotencyKey: randomUUID(), entryStageId: target.stageId,
    expectedRevision: 1, expectedRuleVersionId: ruleId, content: target.content, ...(ids ? { officialMemberIds: ids } : {}), ...extra });
  await check("roster rejects empty, duplicate, six, unknown, outsider, flagged and absent actor", async () => {
    for (const ids of [[], [owner.id, owner.id], Array.from({ length: 6 }, (_, i) => "user" + i)]) assert.equal(agriOfficialMemberIdsSchema.safeParse(ids).success, false);
    await assert.rejects(submit(owner.id, command(a)), /AGRI_ROSTER_REQUIRED/);
    for (const ids of [[owner.id, "unknown"], [owner.id, outsider.id]]) await assert.rejects(submit(owner.id, command(a, ids)), /AGRI_ROSTER_MEMBER_UNAVAILABLE/);
    await db.user.update({ where: { id: invalid.id }, data: { flagged: true } });
    await assert.rejects(submit(owner.id, command(a, [owner.id, invalid.id])), /AGRI_ROSTER_MEMBER_UNAVAILABLE/);
    await assert.rejects(submit(owner.id, command(a, [teammate.id])), /AGRI_ROSTER_ACTOR_REQUIRED/);
  });
  let initialId = "", rosterId = "";
  await check("same-key concurrent first submit creates one immutable shared roster and submission", async () => {
    const first = command(a, [owner.id, teammate.id]); const result = await Promise.all([submit(owner.id, first), submit(owner.id, first)]);
    assert.equal(result[0].submissionId, result[1].submissionId); initialId = result[0].submissionId!;
    const view = await read(owner.id, a.stageId); rosterId = view.officialRoster!.id;
    assert.equal(view.officialRoster!.members.length, 2); assert.equal(view.current!.officialRosterId, rosterId);
    await assert.rejects(submit(owner.id, command(a, [owner.id], { expectedRevision: 2 })), /AGRI_ROSTER_CHANGE_FORBIDDEN/);
    await assert.rejects(db.$executeRaw`UPDATE agri_official_rosters SET "memberUserIds"='[]'::jsonb WHERE id=${rosterId}`, /AGRI_FOUNDATION_IMMUTABLE/);
    await assert.rejects(db.$executeRaw`DELETE FROM agri_official_roster_members WHERE "rosterId"=${rosterId}`, /AGRI_FOUNDATION_IMMUTABLE/);
  });
  await check("two entries racing for same account: one accepted, one conflict, database uniqueness enforced", async () => {
    const outcomes = await Promise.allSettled([submit(managerB.id, command(b, [managerB.id, shared.id])), submit(managerC.id, command(c, [managerC.id, shared.id]))]);
    assert.equal(outcomes.filter(row => row.status === "fulfilled").length, 1);
    assert.match(String((outcomes.find(row => row.status === "rejected") as PromiseRejectedResult).reason), /AGRI_ROSTER_MEMBER_CONFLICT/);
    const rows = await db.$queryRaw<Array<{ count: bigint }>>`SELECT count(*) FROM agri_official_roster_members WHERE "competitionId"=${edition.id} AND "userId"=${shared.id}`;
    assert.equal(rows[0].count, BigInt(1));
  });
  await check("later username/member changes preserve snapshot; flagged roster account blocks new submissions", async () => {
    const before = (await read(owner.id, a.stageId)).officialRoster!.members;
    await db.user.update({ where: { id: teammate.id }, data: { name: "Changed fixture name" } });
    await db.teamMember.update({ where: { teamId_userId: { teamId: a.teamId, userId: teammate.id } }, data: { status: "LEFT" } });
    assert.deepEqual((await read(owner.id, a.stageId)).officialRoster!.members, before);
    await db.user.update({ where: { id: teammate.id }, data: { flagged: true } });
    await assert.rejects(submit(owner.id, command(a, undefined, { expectedRevision: 2 })), /AGRI_ROSTER_MEMBER_UNAVAILABLE/);
    await db.user.update({ where: { id: teammate.id }, data: { flagged: false } });
  });
  const final = await prepare(owner.id, { action: "prepareStage", teamCompetitionId: a.entryId, stage: "FINAL" });
  await decide(owner.id, { action: "recordFinalEligibility", teamCompetitionId: a.entryId, expectedSequence: 0, state: "ELIGIBLE", reason: "Fixture eligibility", sourceReference: "Fixture jury decision", idempotencyKey: randomUUID() });
  await check("eligible final refuses open preliminary baseline", async () => {
    await assert.rejects(submit(owner.id, command(a, undefined, { entryStageId: final.entryStageId })), /AGRI_PRELIMINARY_BASELINE_REQUIRED/);
  });
  // Real server-clock freeze, not a fixture update to immutable windows/history.
  await new Promise(resolve => setTimeout(resolve, Math.max(0, close.getTime() - Date.now() + 150)));
  ruleId = await publish(new Date(Date.now() + 120000));
  await check("deadline freeze binds final to preliminary ID and same project, even after replacement rules", async () => {
    const view = await read(owner.id, final.entryStageId);
    assert.equal(view.preliminaryBaseline!.submissionId, initialId);
    const other = await db.project.create({ data: { ownerId: owner.id, teamId: a.teamId, goal: "CONTEST", title: "Other fixture" }, select: { id: true } });
    const artifact = await db.artifact.create({ data: { projectId: other.id, workflowId: "fixture", kind: "CONTEST_MVP", title: "Other", createdById: owner.id }, select: { id: true } });
    const version = await db.artifactVersion.create({ data: { artifactId: artifact.id, version: 1, createdById: owner.id, contentJson: {}, contentMarkdown: "Isolated fixture", factSnapshotHash: "fixture" }, select: { id: true } });
    await assert.rejects(submit(owner.id, command(a, undefined, { entryStageId: final.entryStageId, content: { ...a.content, projectId: other.id, artifactVersionId: version.id } })), /AGRI_ROSTER_PROJECT_MISMATCH|AGRI_FINAL_PROJECT_MISMATCH/);
    const upgraded = await db.artifactVersion.create({ data: { artifactId: a.artifactId, version: 2, createdById: owner.id, contentJson: {}, contentMarkdown: "Isolated fixture", factSnapshotHash: "fixture" }, select: { id: true } });
    await submit(owner.id, command(a, undefined, { entryStageId: final.entryStageId, content: { ...a.content, artifactVersionId: upgraded.id } }));
    const result = await read(owner.id, final.entryStageId); assert.equal(result.current!.preliminarySubmissionId, initialId);
    assert.equal(result.current!.officialRosterId, rosterId); assert.equal(result.current!.content!.artifactVersionId, upgraded.id);
    assert.equal((await read(owner.id, a.stageId)).history.length, 1);
  });
  await check("raw SQL cannot bypass missing/wrong roster or preliminary binding", async () => {
    const insert = (officialId: string | null, baseline: string | null) => db.$executeRaw`INSERT INTO agri_stage_submissions
      (id,"competitionId","entryStageId",sequence,"ruleVersionId","projectId","artifactVersionId",summary,materials,"submittedById","acceptedAt","officialRosterId","preliminarySubmissionId")
      VALUES (${randomUUID()},${edition.id},${final.entryStageId},2,${ruleId},${a.content.projectId},${a.content.artifactVersionId},'Fixture','{"schemaVersion":1,"items":[]}'::jsonb,${owner.id},clock_timestamp(),${officialId},${baseline})`;
    await assert.rejects(insert(null, initialId), /AGRI_ROSTER_REQUIRED/);
    await assert.rejects(insert(rosterId, null), /AGRI_PRELIMINARY_BASELINE_REQUIRED/);
    const finalId = (await read(owner.id, final.entryStageId)).current!.id;
    await assert.rejects(insert(rosterId, finalId), /AGRI_PRELIMINARY_BASELINE_REQUIRED/);
  });
  await check("metadata-only staff projection contains no official identities or project baseline", async () => {
    await db.$executeRaw`INSERT INTO agri_access_grants (id,"competitionId","userId",scope,"grantedById","grantedAt") VALUES (${randomUUID()},${edition.id},${outsider.id},'WORKS_READ',${owner.id},clock_timestamp())`;
    const view = await read(outsider.id, final.entryStageId);
    assert.equal("officialRoster" in view, false); assert.equal("preliminaryBaseline" in view, false); assert.equal("officialRosterId" in view.current!, false);
  });
  await check("database unique constraint rejects cross-entry identity reuse independently of service", async () => {
    const loser = (await read(managerB.id, b.stageId)).officialRoster ? c : b;
    const roster = randomUUID(); const ids = [loser.actorId, shared.id];
    await assert.rejects(db.$transaction(async tx => {
      await tx.$executeRaw`INSERT INTO agri_official_rosters(id,"competitionId","teamCompetitionId","projectId","memberUserIds","confirmedById","confirmedAt")
        VALUES (${roster},${edition.id},${loser.entryId},${loser.content.projectId},${JSON.stringify(ids)}::jsonb,${loser.actorId},clock_timestamp())`;
      const account = await tx.user.findUniqueOrThrow({ where: { id: shared.id }, select: { username: true, name: true } });
      await tx.$executeRaw`INSERT INTO agri_official_roster_members("rosterId","competitionId","userId",username,name)
        VALUES (${roster},${edition.id},${shared.id},${account.username},${account.name})`;
    }), /23505|duplicate key|unique constraint/i);
  });
  await check("five real members accepted; incomplete raw rosters fail deferred validation", async () => {
    const accounts = await Promise.all(["five-owner", "five-a", "five-b", "five-c", "five-d"].map(user));
    const target = await makeEntry(accounts[0].id, accounts.slice(1).map(row => row.id));
    await submit(target.actorId, command(target, accounts.map(row => row.id)));
    assert.equal((await read(target.actorId, target.stageId)).officialRoster!.members.length, 5);
    const sixth = await user("incomplete"); const incomplete = await makeEntry(sixth.id, []);
    await assert.rejects(db.$transaction(async tx => {
      await tx.$executeRaw`INSERT INTO agri_official_rosters(id,"competitionId","teamCompetitionId","projectId","memberUserIds","confirmedById","confirmedAt")
        VALUES (${randomUUID()},${edition.id},${incomplete.entryId},${incomplete.content.projectId},${JSON.stringify([sixth.id])}::jsonb,${sixth.id},clock_timestamp())`;
    }), /AGRI_ROSTER_INCOMPLETE/);
  });
  await check("historical records remain readable without invented roster; new formal operations refuse backfill", async () => {
    const legacyUser = await user("legacy"); const legacy = await makeEntry(legacyUser.id, []);
    const id = randomUUID();
    // Simulate a row that existed before this additive migration, only inside the dedicated fixture database.
    await db.$transaction(async tx => {
      await tx.$executeRawUnsafe('ALTER TABLE agri_stage_submissions DISABLE TRIGGER agri_submission_official_guard');
      await tx.$executeRaw`INSERT INTO agri_stage_submissions
        (id,"competitionId","entryStageId",sequence,"ruleVersionId","projectId","artifactVersionId",summary,materials,"submittedById","acceptedAt")
        VALUES (${id},${edition.id},${legacy.stageId},1,${ruleId},${legacy.content.projectId},${legacy.content.artifactVersionId},'Legacy fixture','{"schemaVersion":1,"items":[]}'::jsonb,${legacyUser.id},clock_timestamp())`;
      await tx.$executeRaw`UPDATE agri_entry_stages SET "currentSubmissionId"=${id},revision=revision+1 WHERE id=${legacy.stageId}`;
      await tx.$executeRawUnsafe('ALTER TABLE agri_stage_submissions ENABLE TRIGGER agri_submission_official_guard');
    });
    const view = await read(legacyUser.id, legacy.stageId);
    assert.equal(view.legacyRosterRequired, true); assert.equal(view.officialRoster, null); assert.equal(view.current!.id, id);
    await assert.rejects(submit(legacyUser.id, command(legacy, [legacyUser.id], { expectedRevision: 2 })), /AGRI_LEGACY_ROSTER_REQUIRED/);
    assert.equal((await read(legacyUser.id, legacy.stageId)).history.length, 1);
  });
  await mkdir(".workbuddy/evidence/agri-roster", { recursive: true });
  await writeFile(".workbuddy/evidence/agri-roster/postgres.json", JSON.stringify({ passed: true, checks, fixturesOnly: true, productionWrites: false, providerCalls: 0 }, null, 2));
  await db.$disconnect();
}
main().catch(error => { console.error(error); process.exitCode = 1; });
