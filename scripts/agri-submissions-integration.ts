/** Real services and PostgreSQL; all accounts, editions and private content are isolated fixtures. */
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import type { AgriRulesDraft } from "../src/contracts/agri-workspace";
import type { AgriStageSubmissionContent } from "../src/contracts/agri-submissions";
for (const value of [process.env.DATABASE_URL, process.env.DIRECT_URL]) {
  const url = new URL(value ?? "http://invalid");
  if (url.hostname !== "127.0.0.1" || url.port !== "55438" || url.pathname !== "/ans_product_verify_agri_submissions_r1") throw new Error("Non-isolated submission writes refused");
}
const dir = process.env.AGRI_SUBMISSIONS_EVIDENCE_DIR ?? ".workbuddy/evidence/agri-submissions";
async function main() {
  const { db } = await import("../src/lib/db");
  await mkdir(dir, { recursive: true });
  const { prepareAgriStage: prepare, executeAgriSubmissionCommand: run, readAgriStage: get, listAgriStages: list, listAgriTeamEntries: entries, listAgriSubmissionVersions: versions, exportAgriWorks: exportWorks } = await import("../src/server/competitions/agrihackathon/submissions");
  const { getAgriCompetitionPhaseView: phaseView } = await import("../src/server/competitions/agrihackathon/phase-view");
  const { readAgriRecordSummary: summary } = await import("../src/server/competitions/agrihackathon/record-summary");
  const { executeAgriDecisionCommand: decide } = await import("../src/server/competitions/agrihackathon/decisions");
  const { executeAgriWorkspaceCommand: rules, readAgriWorkspaceRules: getRules } = await import("../src/server/competitions/agrihackathon/workspace");
  const { submitCompetitionEntry: legacySubmit, reviewCompetitionEntry: legacyReview } = await import("../src/server/competitions/service");
  const checks: Array<{ label: string; passed: boolean }> = [];
  const persistence = process.argv.includes("--persistence");
  const report = { checks, passed: false, isolatedPostgres: true, productionWrites: false, modelCalls: 0, privateContent: "synthetic fixtures", failures: [] as string[], readonlySnapshots: [] as Array<{ before: unknown; after: unknown }> };
  const check = async (label: string, fn: () => Promise<void>) => { await fn(); checks.push({ label, passed: true }); console.log("[submissions] PASS " + label); };
  const clock = async () => (await db.$queryRaw<Array<{ now: Date }>>`SELECT clock_timestamp() AS now`)[0].now;
  const databaseSnapshot = async () => {
    const tables = await db.$queryRaw<Array<{ tablename: string }>>`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`;
    return Promise.all(tables.map(async ({ tablename }) => {
      assert.match(tablename, /^[A-Za-z0-9_]+$/);
      const [row] = await db.$queryRawUnsafe<Array<{ count: bigint; content: string }>>(`SELECT count(*) AS count, COALESCE(jsonb_agg(to_jsonb(r) ORDER BY to_jsonb(r)::text),'[]'::jsonb)::text AS content FROM public."${tablename}" r`);
      return { table: tablename, rows: Number(row.count), sha256: createHash("sha256").update(row.content).digest("hex") };
    }));
  };
  try {
    if (persistence) {
      const fixture = JSON.parse(await readFile(dir + "/persistence-fixture.json", "utf8")) as { actorId: string; competitionId: string; stageId: string; submissionId: string; expectedHistory: number };
      process.env.ANS_AGRIHACKATHON_COMPETITION_ID = fixture.competitionId;
      await check("fresh Node process reads the same persisted stage, current and immutable submission history", async () => {
        const view = await get(fixture.actorId, fixture.stageId); assert.equal(view.current?.id, fixture.submissionId); assert.equal(view.history.length, fixture.expectedHistory);
        assert.equal(view.hasPrivateMaterials, true); assert.ok(JSON.stringify(view.current).includes("PRIVATE_FIXTURE"));
      });
      report.passed = true; return;
    }
    const prefix = "agri-submit-" + randomUUID();
    const edition = await db.competition.create({ data: { title: prefix + " LOCAL FIXTURE", status: "ONGOING" }, select: { id: true } });
    const otherEdition = await db.competition.create({ data: { title: prefix + " OTHER FIXTURE" }, select: { id: true } });
    const makeUser = (suffix: string, role: "USER" | "ADMIN" = "USER") => db.user.create({ data: { email: prefix + suffix + "@example.invalid", username: prefix + suffix, role, quotaPoints: 111 }, select: { id: true, xp: true, quotaPoints: true } });
    const [owner, teammate, outsider, admin, staff, fullStaff] = await Promise.all([makeUser("owner"), makeUser("teammate"), makeUser("outsider"), makeUser("admin", "ADMIN"), makeUser("staff"), makeUser("full")]);
    await db.$executeRaw`INSERT INTO agri_workspaces (id,"competitionId") VALUES (${randomUUID()},${edition.id}),(${randomUUID()},${otherEdition.id})`;
    process.env.ANS_AGRIHACKATHON_COMPETITION_ID = edition.id;
    const root = async (userId: string, scope: string) => db.$executeRaw`INSERT INTO agri_access_grants (id,"competitionId","userId",scope,"grantedById","grantedAt") VALUES (${randomUUID()},${edition.id},${userId},${scope},${owner.id},clock_timestamp())`;
    await root(owner.id, "RULES_CONFIRM"); await root(staff.id, "WORKS_READ"); await root(fullStaff.id, "WORKS_READ"); await root(fullStaff.id, "PRIVATE_MATERIALS_READ"); await root(fullStaff.id, "EXPORT");
    const publish = async (closeOffset = 120000, finalReady = false) => {
      const now = await clock();
      const draft: AgriRulesDraft = { schemaVersion: 1, guidanceMarkdown: "LOCAL FIXTURE guidance " + randomUUID(),
        requirements: { schemaVersion: 1, repositoryRequired: true, repositoryRefRequired: true, demoRequired: true,
          materials: [{ key: "proof", kind: "ARTIFACT", required: true }] },
        windows: ["REGISTRATION", "PRELIMINARY", "FINAL"].map(stage => stage === "PRELIMINARY" || finalReady && stage === "FINAL"
          ? { stage: stage as "PRELIMINARY" | "FINAL", state: "READY" as const, opensAt: new Date(now.getTime() - 60000).toISOString(), closesAt: new Date(now.getTime() + closeOffset).toISOString(), includesDeadline: false }
          : { stage: stage as "REGISTRATION" | "FINAL", state: "PENDING" as const, opensAt: null, closesAt: null }) };
      let rev = (await getRules(owner.id)).revision;
      await rules(owner.id, { action: "saveRulesDraft", idempotencyKey: randomUUID(), expectedRevision: rev++, draft });
      const confirmed = await rules(owner.id, { action: "confirmRules", idempotencyKey: randomUUID(), expectedRevision: rev++ });
      await rules(owner.id, { action: "publishRules", idempotencyKey: randomUUID(), expectedRevision: rev, ruleVersionId: confirmed.resourceId });
      return confirmed.resourceId;
    };
    const team = await db.team.create({ data: { name: prefix + " A", slug: prefix + "-a", ownerId: owner.id }, select: { id: true } });
    const otherTeam = await db.team.create({ data: { name: prefix + " B", slug: prefix + "-b", ownerId: outsider.id }, select: { id: true } });
    await db.teamMember.createMany({ data: [{ teamId: team.id, userId: owner.id, role: "OWNER" }, { teamId: team.id, userId: teammate.id, role: "MEMBER" }, { teamId: otherTeam.id, userId: outsider.id, role: "OWNER" }] });
    const entry = await db.teamCompetition.create({ data: { teamId: team.id, competitionId: edition.id }, select: { id: true } });
    const otherEntry = await db.teamCompetition.create({ data: { teamId: otherTeam.id, competitionId: edition.id }, select: { id: true } });
    const ordinaryEntry = await db.teamCompetition.create({ data: { teamId: team.id, competitionId: otherEdition.id }, select: { id: true } });
    const makeVersion = async (userId: string, teamId: string) => {
      const project = await db.project.create({ data: { title: prefix + " PRIVATE PROJECT", ownerId: userId, teamId, goal: "CONTEST" }, select: { id: true } });
      const artifact = await db.artifact.create({ data: { projectId: project.id, workflowId: "local-fixture", kind: "CONTEST_MVP", title: "LOCAL FIXTURE", createdById: userId }, select: { id: true } });
      const version = await db.artifactVersion.create({ data: { artifactId: artifact.id, version: 1, contentJson: {}, contentMarkdown: "PRIVATE_FACT_NOT_PROJECTED", factSnapshotHash: "fixture", createdById: userId }, select: { id: true } });
      return { projectId: project.id, artifactVersionId: version.id };
    };
    const [own, privateTeammate, foreign] = await Promise.all([makeVersion(owner.id, team.id), makeVersion(teammate.id, team.id), makeVersion(outsider.id, otherTeam.id)]);
    const content: AgriStageSubmissionContent = { ...own, repository: { url: "https://example.invalid/PRIVATE_FIXTURE", ref: { kind: "COMMIT_SHA", value: "a".repeat(40) } },
      demoUrl: "https://example.invalid/PRIVATE_FIXTURE/demo", summary: "PRIVATE_FIXTURE submission", materials: { schemaVersion: 1, items: [{ key: "proof", kind: "ARTIFACT", artifactVersionId: own.artifactVersionId }] } };
    let stageId = "", ruleId = "", revision = 1, currentId = "";
    const command = (extra: Record<string, unknown> = {}) => ({ action: "submit", entryStageId: stageId, expectedRevision: revision, expectedRuleVersionId: ruleId, idempotencyKey: randomUUID(), content, ...extra });
    await check("disabled workspace refuses preparation; enabled edition requires confirmed published rules", async () => {
      await assert.rejects(prepare(owner.id, { action: "prepareStage", teamCompetitionId: entry.id, stage: "PRELIMINARY" }), /AGRI_WORKSPACE_DISABLED/);
      ruleId = await publish(); const rev = (await getRules(owner.id)).revision;
      await rules(owner.id, { action: "setEnabled", idempotencyKey: randomUUID(), expectedRevision: rev, enabled: true });
    });
    await check("concurrent preparation is naturally idempotent with one stage and one audit", async () => {
      const cmd = { action: "prepareStage", teamCompetitionId: entry.id, stage: "PRELIMINARY" };
      const results = await Promise.all(Array.from({ length: 5 }, () => prepare(owner.id, cmd)));
      assert.equal(results.filter(row => !row.duplicate).length, 1); stageId = results[0].entryStageId;
      assert.ok(results.every(row => row.entryStageId === stageId));
      assert.equal(await db.auditLog.count({ where: { resourceId: stageId, action: "AGRI_PREPARESTAGE" } }), 1);
      await assert.rejects(prepare(owner.id, { ...cmd, teamCompetitionId: ordinaryEntry.id }), /AGRI_ENTRY_NOT_FOUND/);
    });
    await check("team members read; only OWNER/ADMIN write; global ADMIN and other teams cannot read private materials", async () => {
      assert.equal((await get(teammate.id, stageId)).hasPrivateMaterials, true);
      await assert.rejects(run(teammate.id, command()), /AGRI_TEAM_MANAGER_REQUIRED/);
      for (const actor of [outsider.id, admin.id]) await assert.rejects(get(actor, stageId), /AGRI_SCOPE_REQUIRED/);
      await assert.rejects(prepare(outsider.id, { action: "prepareStage", teamCompetitionId: entry.id, stage: "FINAL" }), /AGRI_TEAM_PERMISSION_REQUIRED/);
      assert.equal((await entries(owner.id)).entries.length, 1); assert.equal((await list(outsider.id)).stages.length, 0);
    });
    await check("published PENDING final window reads as rules pending and refuses formal submission", async () => {
      const final = await prepare(owner.id, { action: "prepareStage", teamCompetitionId: entry.id, stage: "FINAL" });
      const view = await get(owner.id, final.entryStageId);
      assert.equal(view.windowState, "RULES_PENDING");
      assert.deepEqual(view.publishedRule?.window, { stage: "FINAL", state: "PENDING", opensAt: null, closesAt: null });
      await assert.rejects(run(owner.id, command({ entryStageId: final.entryStageId })), /AGRI_FINAL_ELIGIBILITY_REQUIRED/);
      assert.equal((await get(owner.id, final.entryStageId)).history.length, 0);
    });
    await check("candidate versions expose only metadata from own active projects on this team, never private bodies", async () => {
      const page = await versions(owner.id, stageId);
      assert.deepEqual(page.versions.map(row => row.id), [own.artifactVersionId]);
      assert.equal(page.versions[0].projectId, own.projectId);
      assert.ok(!JSON.stringify(page).includes("PRIVATE_FACT_NOT_PROJECTED"));
      assert.ok(!JSON.stringify(page).includes(privateTeammate.projectId));
      assert.equal((await versions(owner.id, stageId, { projectId: foreign.projectId })).versions.length, 0);
      for (const actor of [teammate.id, admin.id, staff.id]) await assert.rejects(versions(actor, stageId), /AGRI_TEAM_MANAGER_REQUIRED|AGRI_TEAM_PERMISSION_REQUIRED/);
      await db.project.update({ where: { id: own.projectId }, data: { status: "ARCHIVED" } });
      try { assert.equal((await versions(owner.id, stageId)).versions.length, 0); }
      finally { await db.project.update({ where: { id: own.projectId }, data: { status: "ACTIVE" } }); }
      const artifact = await db.artifactVersion.findUniqueOrThrow({ where: { id: own.artifactVersionId }, select: { artifactId: true } });
      for (let index = 2; index <= 33; index++) await db.artifactVersion.create({ data: { artifactId: artifact.artifactId, version: index,
        contentJson: { fixture: "PRIVATE_BODY" }, contentMarkdown: "PRIVATE_FACT_NOT_PROJECTED", factSnapshotHash: "fixture", createdById: owner.id } });
      const first = await versions(owner.id, stageId); assert.equal(first.versions.length, 30); assert.ok(first.nextCursor);
      const second = await versions(owner.id, stageId, { cursor: first.nextCursor }); assert.equal(second.versions.length, 3);
      assert.equal(new Set([...first.versions, ...second.versions].map(row => row.id)).size, 33);
      await assert.rejects(versions(owner.id, stageId, { cursor: first.nextCursor, projectId: own.projectId }), /INVALID_CURSOR/);
      await assert.rejects(versions(owner.id, stageId, { cursor: "invalid" }), /INVALID_CURSOR/);
    });
    await check("draft persists without formal submission and concurrent duplicate saves apply once", async () => {
      const cmd = { action: "saveDraft", entryStageId: stageId, expectedRevision: revision, idempotencyKey: randomUUID(), draft: content };
      const results = await Promise.all(Array.from({ length: 4 }, () => run(owner.id, cmd)));
      assert.equal(results.filter(row => !row.duplicate).length, 1); revision = 2;
      const view = await get(owner.id, stageId); assert.deepEqual(view.draft, content); assert.equal(view.current, null);
      await assert.rejects(run(owner.id, { ...cmd, draft: { ...content, summary: "changed" } }), /AGRI_IDEMPOTENCY_CONFLICT/);
    });
    await check("owner boundary, cross-team main/artifact materials and archived projects are enforced", async () => {
      await assert.rejects(run(owner.id, command({ content: { ...content, ...privateTeammate } })), /AGRI_PROJECT_UNAVAILABLE/);
      await assert.rejects(run(owner.id, command({ content: { ...content, artifactVersionId: foreign.artifactVersionId } })), /AGRI_ARTIFACT_UNAVAILABLE/);
      await assert.rejects(run(owner.id, command({ content: { ...content, materials: { schemaVersion: 1, items: [{ key: "proof", kind: "ARTIFACT", artifactVersionId: foreign.artifactVersionId }] } } })), /AGRI_ARTIFACT_UNAVAILABLE/);
      await db.project.update({ where: { id: own.projectId }, data: { status: "ARCHIVED" } });
      await assert.rejects(run(owner.id, command()), /AGRI_PROJECT_UNAVAILABLE/); await db.project.update({ where: { id: own.projectId }, data: { status: "ACTIVE" } });
    });
    await check("fixed-version required materials and stale published version reject without state changes", async () => {
      await assert.rejects(run(owner.id, command({ content: { ...content, repository: null } })), /AGRI_REPOSITORY_REQUIRED/);
      await assert.rejects(run(owner.id, command({ content: { ...content, demoUrl: null } })), /AGRI_DEMO_REQUIRED/);
      await assert.rejects(run(owner.id, command({ expectedRuleVersionId: "stale" })), /AGRI_RULE_VERSION_CONFLICT/);
      assert.equal((await get(owner.id, stageId)).revision, revision);
    });
    let firstCommand: ReturnType<typeof command>;
    await check("same-key parallel formal submissions append exactly one immutable accepted record", async () => {
      firstCommand = command(); const rows = await Promise.all(Array.from({ length: 6 }, () => run(owner.id, firstCommand)));
      assert.equal(rows.filter(row => !row.duplicate).length, 1); currentId = rows[0].submissionId!; revision++;
      const view = await get(owner.id, stageId); assert.equal(view.current?.id, currentId); assert.equal(view.history.length, 1); assert.equal(view.frozenSubmissionId, null); assert.equal(view.draft, null);
      await assert.rejects(run(owner.id, { ...firstCommand, content: { ...content, summary: "changed" } }), /AGRI_IDEMPOTENCY_CONFLICT/);
    });
    await check("different concurrent keys use CAS: one accepted new sequence and one conflict; old record retained", async () => {
      const outcomes = await Promise.allSettled([run(owner.id, command()), run(owner.id, command())]);
      assert.equal(outcomes.filter(row => row.status === "fulfilled").length, 1);
      assert.match(String((outcomes.find(row => row.status === "rejected") as PromiseRejectedResult).reason), /AGRI_REVISION_CONFLICT/);
      const view = await get(owner.id, stageId); revision = view.revision; currentId = view.current!.id;
      assert.deepEqual(view.history.map(row => row.sequence), [2, 1]); assert.equal(view.frozenSubmissionId, null);
    });
    await check("staff basic projection omits private fields and drafts; dual scopes permit exact snapshot only", async () => {
      const basic = await get(staff.id, stageId), full = await get(fullStaff.id, stageId);
      assert.equal(basic.hasPrivateMaterials, false); assert.ok(!JSON.stringify(basic).includes("PRIVATE_FIXTURE")); assert.equal(full.hasPrivateMaterials, true);
      assert.ok(JSON.stringify(full.current).includes("PRIVATE_FIXTURE")); assert.ok(!JSON.stringify(full).includes("PRIVATE_FACT_NOT_PROJECTED"));
      assert.ok(!(JSON.stringify(await list(fullStaff.id, { scope: "staff" }))).includes("PRIVATE_FIXTURE"));
      await db.$executeRaw`UPDATE agri_access_grants SET "revokedAt"=clock_timestamp(),revision=revision+1 WHERE "userId"=${fullStaff.id} AND scope='PRIVATE_MATERIALS_READ' AND "competitionId"=${edition.id}`;
      assert.equal((await get(fullStaff.id, stageId)).hasPrivateMaterials, false);
    });
    await check("accepted history/material FK/events/receipts cannot be rewritten, deleted or pointed across teams", async () => {
      await assert.rejects(db.$executeRaw`UPDATE agri_stage_submissions SET summary='tamper' WHERE id=${currentId}`, /AGRI_FOUNDATION_IMMUTABLE/);
      await assert.rejects(db.$executeRaw`DELETE FROM agri_submission_material_refs WHERE "submissionId"=${currentId}`, /AGRI_FOUNDATION_IMMUTABLE/);
      await assert.rejects(db.$executeRaw`DELETE FROM agri_submission_events WHERE "entryStageId"=${stageId}`, /AGRI_FOUNDATION_IMMUTABLE/);
      await assert.rejects(db.$executeRaw`UPDATE agri_submission_receipts SET "appliedRevision"=999 WHERE "entryStageId"=${stageId}`, /AGRI_FOUNDATION_IMMUTABLE/);
      const other = await prepare(outsider.id, { action: "prepareStage", teamCompetitionId: otherEntry.id, stage: "PRELIMINARY" });
      await assert.rejects(db.$executeRaw`UPDATE agri_entry_stages SET "currentSubmissionId"=${currentId},revision=revision+1 WHERE id=${other.entryStageId}`);
      await assert.rejects(db.$executeRaw`INSERT INTO agri_submission_material_refs (id,"competitionId","entryStageId","submissionId",key,"artifactVersionId") VALUES (${randomUUID()},${edition.id},${stageId},${currentId},'foreign',${foreign.artifactVersionId})`, /AGRI_MATERIAL_PROJECT_MISMATCH/);
    });
    await check("old submission/review/move/delete paths fail closed; other editions and quota fields stay usable", async () => {
      await assert.rejects(db.teamCompetition.update({ where: { id: entry.id }, data: { entryStatus: "SUBMITTED" } }), /AGRI_STAGE_WORKSPACE_REQUIRED/);
      await assert.rejects(db.teamCompetition.update({ where: { id: entry.id }, data: { awardedXp: 10 } }), /AGRI_STAGE_WORKSPACE_REQUIRED/);
      await assert.rejects(db.teamCompetition.update({ where: { id: ordinaryEntry.id }, data: { competitionId: edition.id } }), /AGRI_STAGE_WORKSPACE_REQUIRED/);
      await assert.rejects(db.teamCompetition.delete({ where: { id: otherEntry.id } }), /AGRI_STAGE_WORKSPACE_REQUIRED/);
      await db.teamCompetition.update({ where: { id: ordinaryEntry.id }, data: { entryStatus: "SUBMITTED" } });
      await db.teamCompetition.update({ where: { id: entry.id }, data: { quotaGranted: 15 } });
    });
    await check("legacy application services return stable stage error before project access or rewards", async () => {
      await assert.rejects(legacySubmit(owner.id, edition.id, { ...own, teamId: team.id, summary: content.summary, publicConsent: true }), error => {
        assert.equal((error as { code: string }).code, "AGRI_STAGE_WORKSPACE_REQUIRED"); return true;
      });
      await assert.rejects(legacyReview(admin.id, { teamCompetitionId: entry.id, decision: "approve", note: "LOCAL REVIEW", awardedXp: 10 }), error => {
        assert.equal((error as { code: string }).code, "AGRI_STAGE_WORKSPACE_REQUIRED"); return true;
      });
    });
    await check("legacy SQL entry-first update refuses workspace lock contention without deadlocking", async () => {
      let release!: () => void, locked!: () => void;
      const gate = new Promise<void>(resolve => { release = resolve; }), ready = new Promise<void>(resolve => { locked = resolve; });
      const holder = db.$transaction(async tx => { await tx.$queryRaw`SELECT id FROM agri_workspaces WHERE "competitionId"=${edition.id} FOR UPDATE`; locked(); await gate; }, { timeout: 15000 });
      await ready;
      try {
        await assert.rejects(db.$transaction(async tx => {
          await tx.$executeRaw`SET LOCAL statement_timeout='1500ms'`;
          await tx.teamCompetition.update({ where: { id: entry.id }, data: { publicConsent: true } });
        }), /AGRI_STAGE_WORKSPACE_REQUIRED/);
      } finally { release(); await holder; }
      assert.equal((await db.teamCompetition.findUniqueOrThrow({ where: { id: entry.id } })).publicConsent, false);
    });
    await check("membership revoked while a detail read waits is rechecked under the member lock", async () => {
      let release!: () => void, locked!: () => void;
      const gate = new Promise<void>(resolve => { release = resolve; }), ready = new Promise<void>(resolve => { locked = resolve; });
      const holder = db.$transaction(async tx => {
        await tx.teamMember.update({ where: { teamId_userId: { teamId: team.id, userId: teammate.id } }, data: { status: "LEFT" } });
        locked(); await gate;
      }, { timeout: 15000 });
      await ready;
      const pending = assert.rejects(get(teammate.id, stageId), /AGRI_TEAM_PERMISSION_REQUIRED|AGRI_SCOPE_REQUIRED/);
      await new Promise(resolve => setTimeout(resolve, 150)); release(); await holder; await pending;
      await db.teamMember.update({ where: { teamId_userId: { teamId: team.id, userId: teammate.id } }, data: { status: "ACTIVE" } });
    });
    await check("FINAL submission and unissued corrections remain closed without changing preliminary history", async () => {
      const final = await prepare(owner.id, { action: "prepareStage", teamCompetitionId: entry.id, stage: "FINAL" });
      ruleId = await publish(120000, true);
      await assert.rejects(run(owner.id, command({ entryStageId: final.entryStageId, expectedRevision: 1 })), /AGRI_FINAL_ELIGIBILITY_REQUIRED/);
      await assert.rejects(run(owner.id, { ...command(), action: "correctSubmission", previousSubmissionId: currentId, correctionPermitId: "unissued" }), /AGRI_PERMIT_MISMATCH/);
      assert.equal((await get(owner.id, stageId)).history.length, 2);
    });
    await check("account and membership rechecked on replays; withdrawn members cannot replay accepted commands", async () => {
      await db.user.update({ where: { id: owner.id }, data: { flagged: true } }); await assert.rejects(run(owner.id, firstCommand!), /ACCOUNT_UNAVAILABLE/);
      await db.user.update({ where: { id: owner.id }, data: { flagged: false } });
      await db.teamMember.update({ where: { teamId_userId: { teamId: team.id, userId: owner.id } }, data: { status: "LEFT" } });
      await assert.rejects(run(owner.id, firstCommand!), /AGRI_TEAM_PERMISSION_REQUIRED/);
      await db.teamMember.update({ where: { teamId_userId: { teamId: team.id, userId: owner.id } }, data: { status: "ACTIVE" } });
    });
    // Dedicated second stage with no previous adopted window allows deterministic deadline races.
    const raceTeam = await db.team.create({ data: { name: prefix + " RACE", slug: prefix + "-race", ownerId: owner.id }, select: { id: true } });
    await db.teamMember.create({ data: { teamId: raceTeam.id, userId: owner.id, role: "OWNER" } });
    const raceEntry = await db.teamCompetition.create({ data: { teamId: raceTeam.id, competitionId: edition.id }, select: { id: true } });
    const raceStage = await prepare(owner.id, { action: "prepareStage", teamCompetitionId: raceEntry.id, stage: "PRELIMINARY" });
    const raceVersion = await makeVersion(owner.id, raceTeam.id);
    const raceContent = { ...content, ...raceVersion, materials: { schemaVersion: 1, items: [{ key: "proof", kind: "ARTIFACT", artifactVersionId: raceVersion.artifactVersionId }] } };
    await check("lock wait across deadline uses the post-lock database clock, not click or transaction-start time", async () => {
      const raceRule = await publish(850);
      let release!: () => void, locked!: () => void;
      const gate = new Promise<void>(resolve => { release = resolve; }), ready = new Promise<void>(resolve => { locked = resolve; });
      const holder = db.$transaction(async tx => { await tx.$queryRaw`SELECT id FROM agri_workspaces WHERE "competitionId"=${edition.id} FOR UPDATE`; locked(); await gate; }, { timeout: 15000 }); await ready;
      const pending = assert.rejects(run(owner.id, command({ entryStageId: raceStage.entryStageId, expectedRevision: 1, expectedRuleVersionId: raceRule, content: raceContent })), /AGRI_CLOSED/);
      await new Promise(resolve => setTimeout(resolve, 1100)); release(); await holder; await pending;
      assert.equal((await get(owner.id, raceStage.entryStageId)).history.length, 0);
    });
    await check("deadline crossing during writes rolls back submission, material refs, events, receipt and audit", async () => {
      const raceRule = await publish(950);
      const before = await db.auditLog.count({ where: { resourceId: raceStage.entryStageId } });
      await db.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION fixture_agri_submission_pause() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='AGRI_SUBMIT' THEN PERFORM pg_sleep(1.1); END IF; RETURN NEW; END; $$`);
      await db.$executeRawUnsafe(`CREATE TRIGGER fixture_agri_submission_pause BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION fixture_agri_submission_pause()`);
      try { await assert.rejects(run(owner.id, command({ entryStageId: raceStage.entryStageId, expectedRevision: 1, expectedRuleVersionId: raceRule, content: raceContent })), /AGRI_CLOSED/); }
      finally { await db.$executeRawUnsafe(`DROP TRIGGER fixture_agri_submission_pause ON audit_logs`); }
      const view = await get(owner.id, raceStage.entryStageId); assert.equal(view.revision, 1); assert.equal(view.history.length, 0);
      assert.equal(await db.auditLog.count({ where: { resourceId: raceStage.entryStageId } }), before);
      const [counts] = await db.$queryRaw<Array<{ refs: bigint; events: bigint; receipts: bigint }>>`SELECT (SELECT count(*) FROM agri_submission_material_refs WHERE "entryStageId"=${raceStage.entryStageId}) AS refs,(SELECT count(*) FROM agri_submission_events WHERE "entryStageId"=${raceStage.entryStageId}) AS events,(SELECT count(*) FROM agri_submission_receipts WHERE "entryStageId"=${raceStage.entryStageId}) AS receipts`;
      assert.deepEqual(counts, { refs: BigInt(0), events: BigInt(0), receipts: BigInt(0) });
    });
    let acceptedRaceCommand: ReturnType<typeof command>, acceptedRaceId: string;
    await check("old adopted deadline remains frozen after replacement rules reopen; consecutive history GETs do not write", async () => {
      const raceRule = await publish(1600);
      acceptedRaceCommand = command({ entryStageId: raceStage.entryStageId, expectedRevision: 1, expectedRuleVersionId: raceRule, content: raceContent });
      const accepted = await run(owner.id, acceptedRaceCommand); acceptedRaceId = accepted.submissionId!;
      const extendedRule = await publish(120000);
      await new Promise(resolve => setTimeout(resolve, 1750));
      const before = await databaseSnapshot();
      for (let index = 0; index < 3; index++) {
        const frozen = await get(owner.id, raceStage.entryStageId);
        assert.equal(frozen.frozenSubmissionId, acceptedRaceId); assert.equal(frozen.recordedFrozenSubmissionId, null);
        assert.equal(frozen.frozenByDeadline, true); assert.equal(frozen.revision, 2); assert.equal(frozen.windowState, "OPEN");
        const listed = (await list(owner.id, { stage: "PRELIMINARY" })).stages.find(row => row.id === raceStage.entryStageId)!;
        assert.equal(listed.frozenSubmissionId, acceptedRaceId); assert.equal(listed.recordedFrozenSubmissionId, null); assert.equal(listed.revision, 2);
        const phase = await phaseView(edition.id, owner.id);
        assert.equal(phase?.viewer?.entries.find(row => row.id === raceEntry.id)?.stages[0].frozen, true);
        const record = await summary(fullStaff.id, acceptedRaceId);
        assert.equal(record.submission.isFrozen, true); assert.equal(record.submission.isRecordedFrozen, false); assert.equal(record.submission.frozenByDeadline, true);
      }
      const after = await databaseSnapshot(); assert.deepEqual(after, before); report.readonlySnapshots.push({ before, after });
      await assert.rejects(run(owner.id, command({ entryStageId: raceStage.entryStageId, expectedRevision: 2, expectedRuleVersionId: extendedRule, content: raceContent })), /AGRI_FROZEN/);
      await assert.rejects(run(owner.id, { action: "saveDraft", entryStageId: raceStage.entryStageId, expectedRevision: 2, idempotencyKey: randomUUID(), draft: raceContent }), /AGRI_FROZEN/);
      const [stored] = await db.$queryRaw<Array<{ revision: number; frozenSubmissionId: string | null }>>`SELECT revision,"frozenSubmissionId" FROM agri_entry_stages WHERE id=${raceStage.entryStageId}`;
      assert.deepEqual(stored, { revision: 2, frozenSubmissionId: null });
    });
    await check("valid accepted replay after deadline returns original immutable receipt without another sequence", async () => {
      const before = await get(owner.id, raceStage.entryStageId);
      assert.equal(before.frozenSubmissionId, acceptedRaceId!);
      const [adoptedWindow] = await db.$queryRaw<Array<{ closed: boolean }>>`SELECT w."closesAt" < clock_timestamp() AS closed
        FROM agri_stage_windows w WHERE w."ruleVersionId"=${acceptedRaceCommand!.expectedRuleVersionId} AND stage='PRELIMINARY'`;
      assert.equal(adoptedWindow.closed, true);
      const replay = await run(owner.id, acceptedRaceCommand!);
      assert.equal(replay.duplicate, true); assert.equal(replay.submissionId, acceptedRaceId!); assert.equal(replay.appliedRevision, 2);
      const after = await get(owner.id, raceStage.entryStageId);
      assert.equal(after.history.length, 1); assert.equal(after.revision, before.revision);
      assert.equal(after.current?.id, acceptedRaceId!);
    });
    await check("only an explicit permitted correction records the original freeze and appends a new accepted version", async () => {
      const permit = await decide(owner.id, { action: "issueCorrectionPermit", idempotencyKey: randomUUID(), entryStageId: raceStage.entryStageId,
        expectedRevision: 2, previousSubmissionId: acceptedRaceId!, allowedFields: ["summary"], reason: "LOCAL FIXTURE permitted summary correction",
        expiresAt: new Date((await clock()).getTime() + 120000).toISOString() });
      const corrected = await run(owner.id, { action: "correctSubmission", idempotencyKey: randomUUID(), entryStageId: raceStage.entryStageId,
        expectedRevision: 2, previousSubmissionId: acceptedRaceId!, correctionPermitId: permit.resourceId,
        expectedRuleVersionId: acceptedRaceCommand!.expectedRuleVersionId, content: { ...raceContent, summary: "PRIVATE_FIXTURE permitted correction" } });
      const view = await get(owner.id, raceStage.entryStageId);
      assert.equal(view.revision, 3); assert.equal(view.current?.id, corrected.submissionId); assert.equal(view.history.length, 2);
      assert.equal(view.frozenSubmissionId, acceptedRaceId!); assert.equal(view.recordedFrozenSubmissionId, acceptedRaceId!); assert.equal(view.frozenByDeadline, false);
      assert.equal(view.current?.correction?.previousSubmissionId, acceptedRaceId!);
      await assert.rejects(db.$executeRaw`UPDATE agri_entry_stages SET "frozenSubmissionId"=NULL,revision=revision+1 WHERE id=${raceStage.entryStageId}`, /AGRI_STAGE_REVISION_OR_FROZEN/);
      const [eventCounts] = await db.$queryRaw<Array<{ correction: bigint; freeze: bigint }>>`SELECT count(*) FILTER(WHERE action='correctSubmission') AS correction,count(*) FILTER(WHERE action='freezeStage') AS freeze FROM agri_submission_events WHERE "entryStageId"=${raceStage.entryStageId}`;
      assert.deepEqual(eventCounts, { correction: BigInt(1), freeze: BigInt(0) });
    });
    await check("pagination applies membership/stage filters in SQL and prevents cursor filter reuse", async () => {
      for (let index = 0; index < 65; index++) {
        const t = await db.team.create({ data: { name: prefix + " PAGE " + index, slug: prefix + "-page-" + index, ownerId: owner.id }, select: { id: true } });
        await db.teamMember.create({ data: { teamId: t.id, userId: owner.id, role: "OWNER" } });
        const e = await db.teamCompetition.create({ data: { teamId: t.id, competitionId: edition.id }, select: { id: true } });
        await prepare(owner.id, { action: "prepareStage", teamCompetitionId: e.id, stage: "PRELIMINARY" });
      }
      const first = await list(owner.id, { stage: "PRELIMINARY" }); assert.equal(first.stages.length, 30); assert.ok(first.nextCursor);
      const second = await list(owner.id, { stage: "PRELIMINARY", cursor: first.nextCursor }); assert.equal(second.stages.length, 30);
      const third = await list(owner.id, { stage: "PRELIMINARY", cursor: second.nextCursor! }); assert.equal(third.stages.length, 7); assert.equal(third.nextCursor, null);
      assert.equal(new Set([...first.stages, ...second.stages, ...third.stages].map(row => row.id)).size, 67);
      await assert.rejects(list(owner.id, { stage: "FINAL", cursor: first.nextCursor }), /INVALID_CURSOR/);
      for (const changed of [{ q: "PAGE" }, { status: "SUBMITTED" }, { scope: "staff" }]) await assert.rejects(list(owner.id, { stage: "PRELIMINARY", cursor: first.nextCursor, ...changed }), /INVALID_CURSOR/);
      await assert.rejects(list(teammate.id, { stage: "PRELIMINARY", cursor: first.nextCursor }), /INVALID_CURSOR/);
      assert.equal((await list(teammate.id, { stage: "PRELIMINARY" })).stages.length, 1);
      assert.equal((await list(outsider.id, { stage: "FINAL" })).stages.length, 0);
    });
    // Reissue the synthetic private grant after the earlier revocation scenario.
    await db.$executeRaw`UPDATE agri_access_grants SET "revokedAt"=NULL,revision=revision+1 WHERE "userId"=${fullStaff.id} AND scope='PRIVATE_MATERIALS_READ' AND "competitionId"=${edition.id}`;
    await check("staff filters are applied before pagination and percent/underscore are literal team search", async () => {
      const submitted = await list(fullStaff.id, { scope: "staff", stage: "PRELIMINARY", status: "SUBMITTED" });
      assert.equal(submitted.stages.length, 2); assert.equal(submitted.nextCursor, null); assert.ok(submitted.stages.every(row => row.currentSubmissionId));
      const pending = await list(fullStaff.id, { scope: "staff", stage: "PRELIMINARY", q: "PAGE", status: "NOT_SUBMITTED" });
      assert.equal(pending.stages.length, 30); assert.ok(pending.nextCursor); assert.ok(pending.stages.every(row => !row.currentSubmissionId));
      assert.equal((await list(fullStaff.id, { scope: "staff", q: "%_" })).stages.length, 0);
      await db.team.update({ where: { id: team.id }, data: { name: prefix + " literal %_" } });
      assert.equal((await list(fullStaff.id, { scope: "staff", q: "%_", status: "SUBMITTED" })).stages.length, 1);
      assert.equal((await list(fullStaff.id, { scope: "staff", stage: "FINAL", status: "NOT_SUBMITTED" })).stages.length, 1);
      const minimum = await list(staff.id, { scope: "staff" }); assert.equal(minimum.canExport, false); assert.equal(minimum.hasPrivateMaterials, false);
      assert.equal(submitted.canExport, true); assert.equal(submitted.hasPrivateMaterials, true);
    });
    await check("exports all 65 matching stages, not the first 30, with an auditable source/time and no draft/private metadata", async () => {
      const result = await exportWorks(fullStaff.id, { q: "PAGE", stage: "PRELIMINARY", status: "NOT_SUBMITTED" });
      assert.equal(result.rows, 65); assert.equal(result.csv.split("\r\n").length, 67); assert.ok(result.csv.startsWith("\uFEFF"));
      assert.ok(result.csv.includes('"exported_at_utc"')); assert.ok(result.csv.includes(edition.id)); assert.ok(!result.csv.includes("PRIVATE_FIXTURE")); assert.ok(!result.csv.includes("PRIVATE_FACT_NOT_PROJECTED"));
      const logged = await db.auditLog.findFirstOrThrow({ where: { actorId: fullStaff.id, action: "AGRI_EXPORT_WORKS" }, orderBy: { createdAt: "desc" } });
      assert.deepEqual(Object.keys(logged.metadata as object).sort(), ["competitionId", "exportedAt", "mode", "rows", "stage", "status"].sort());
      assert.equal((logged.metadata as { rows: number }).rows, 65);
      const metadata = await exportWorks(fullStaff.id, { q: "%_", status: "SUBMITTED" }); assert.equal(metadata.rows, 1); assert.ok(!metadata.csv.includes("PRIVATE_FIXTURE"));
      const full = await exportWorks(fullStaff.id, { q: "%_", status: "SUBMITTED", mode: "materials" }); assert.equal(full.rows, 1); assert.ok(full.csv.includes("PRIVATE_FIXTURE")); assert.ok(!full.csv.includes("PRIVATE_FACT_NOT_PROJECTED"));
      assert.ok(full.csv.includes(currentId)); assert.ok(!full.csv.includes(firstCommand!.idempotencyKey));
    });
    await check("EXPORT requires WORKS_READ and materials require their own live scope; revoked/expired/account grants fail closed", async () => {
      for (const actor of [owner.id, admin.id, outsider.id, staff.id]) await assert.rejects(exportWorks(actor), /AGRI_SCOPE_REQUIRED/);
      await root(staff.id, "EXPORT"); assert.equal((await list(staff.id, { scope: "staff" })).canExport, true);
      assert.ok(!(await exportWorks(staff.id)).csv.includes("PRIVATE_FIXTURE")); await assert.rejects(exportWorks(staff.id, { mode: "materials" }), /AGRI_SCOPE_REQUIRED/);
      await db.$executeRaw`UPDATE agri_access_grants SET "revokedAt"=clock_timestamp(),revision=revision+1 WHERE "userId"=${fullStaff.id} AND scope='PRIVATE_MATERIALS_READ'`;
      assert.equal((await list(fullStaff.id, { scope: "staff" })).hasPrivateMaterials, false);
      const downgraded = await get(fullStaff.id, stageId); assert.equal(downgraded.hasPrivateMaterials, false); assert.ok(!JSON.stringify(downgraded).includes("PRIVATE_FIXTURE"));
      await assert.rejects(exportWorks(fullStaff.id, { mode: "materials" }), /AGRI_SCOPE_REQUIRED/); assert.ok(!(await exportWorks(fullStaff.id)).csv.includes("PRIVATE_FIXTURE"));
      await db.$executeRaw`UPDATE agri_access_grants SET "expiresAt"=clock_timestamp()+interval '0.1 second',revision=revision+1 WHERE "userId"=${staff.id} AND scope='EXPORT'`;
      await new Promise(resolve => setTimeout(resolve, 150));
      assert.equal((await list(staff.id, { scope: "staff" })).canExport, false); await assert.rejects(exportWorks(staff.id), /AGRI_SCOPE_REQUIRED/);
      await db.$executeRaw`UPDATE agri_access_grants SET "revokedAt"=clock_timestamp(),revision=revision+1 WHERE "userId"=${fullStaff.id} AND scope='WORKS_READ'`;
      await assert.rejects(exportWorks(fullStaff.id), /AGRI_SCOPE_REQUIRED/); await assert.rejects(list(fullStaff.id, { scope: "staff" }), /AGRI_SCOPE_REQUIRED/);
      await db.user.update({ where: { id: staff.id }, data: { flagged: true } }); await assert.rejects(exportWorks(staff.id), /ACCOUNT_UNAVAILABLE/);
      await db.user.update({ where: { id: staff.id }, data: { flagged: false } });
    });
    await check("oversized exports refuse truncation and the exact 5000 boundary remains complete", async () => {
      // Bulk rows are declared test fixtures; accepted submissions are never fabricated.
      await db.$executeRaw`UPDATE agri_access_grants SET "expiresAt"=NULL,revision=revision+1 WHERE "userId"=${staff.id} AND scope='EXPORT'`;
      const ids = Array.from({ length: 5001 }, (_, index) => prefix + "-limit-" + index);
      await db.team.createMany({ data: ids.map(id => ({ id, name: "LIMIT_FIXTURE " + id, slug: id, ownerId: owner.id })) });
      await db.teamCompetition.createMany({ data: ids.map(id => ({ id, teamId: id, competitionId: edition.id })) });
      await db.$executeRaw`INSERT INTO agri_entry_stages (id,"competitionId","teamCompetitionId",stage)
        SELECT tc.id,tc."competitionId",tc.id,'PRELIMINARY' FROM team_competitions tc JOIN teams t ON t.id=tc."teamId"
        WHERE tc."competitionId"=${edition.id} AND strpos(t.name,'LIMIT_FIXTURE ')=1`;
      const beforeAudit = await db.auditLog.count({ where: { actorId: staff.id, action: "AGRI_EXPORT_WORKS" } });
      await assert.rejects(exportWorks(staff.id, { q: "LIMIT_FIXTURE", stage: "PRELIMINARY" }), /AGRI_EXPORT_TOO_LARGE/);
      assert.equal(await db.auditLog.count({ where: { actorId: staff.id, action: "AGRI_EXPORT_WORKS" } }), beforeAudit);
      await db.team.update({ where: { id: ids.at(-1)! }, data: { name: "OUTSIDE_BOUNDARY" } });
      const bounded = await exportWorks(staff.id, { q: "LIMIT_FIXTURE ", stage: "PRELIMINARY" });
      assert.equal(bounded.rows, 5000); assert.equal(bounded.csv.split("\r\n").length, 5002);
    });
    await check("technical submissions do not change competition approval, member XP/quota, public consent or publication", async () => {
      for (const user of [owner, teammate, outsider, admin, staff, fullStaff]) {
        const current = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { id: true, xp: true, quotaPoints: true } });
        assert.equal(current.id, user.id); assert.equal(current.xp, user.xp); assert.equal(current.quotaPoints.toString(), user.quotaPoints.toString());
      }
      const live = await db.teamCompetition.findUniqueOrThrow({ where: { id: entry.id } }); assert.equal(live.entryStatus, "REGISTERED"); assert.equal(live.submissionVersionId, null); assert.equal(live.publicConsent, false); assert.equal(live.awardedXp, 0);
      assert.equal(await db.artifactPublication.count({ where: { artifactVersionId: { in: [own.artifactVersionId, foreign.artifactVersionId] } } }), 0);
      assert.equal(await db.quotaLedger.count({ where: { userId: { in: [owner.id, teammate.id, outsider.id] } } }), 0);
      assert.equal(await db.xpLedger.count({ where: { userId: { in: [owner.id, teammate.id, outsider.id] } } }), 0);
    });
    await check("all current migration names and exact SQL checksums match the applied isolated database", async () => {
      const rows = await db.$queryRaw<Array<{ migration_name: string; checksum: string; finished: boolean }>>`SELECT migration_name,checksum,finished_at IS NOT NULL AS finished FROM _prisma_migrations ORDER BY migration_name`;
      const migrations = (await readdir("prisma/migrations", { withFileTypes: true })).filter(item => item.isDirectory()).map(item => item.name).sort();
      assert.equal(rows.length, migrations.length); assert.deepEqual(rows.map(row => row.migration_name), migrations);
      for (const row of rows) { assert.ok(row.finished); const file = await readFile("prisma/migrations/" + row.migration_name + "/migration.sql"); assert.equal(row.checksum, createHash("sha256").update(file).digest("hex")); }
    });
    await writeFile(dir + "/persistence-fixture.json", JSON.stringify({ actorId: owner.id, competitionId: edition.id, stageId, submissionId: currentId, expectedHistory: 2 }) + "\n");
    report.passed = true;
  } catch (error) { report.failures.push(error instanceof Error ? error.message : "Unknown integration failure"); throw error; }
  finally {
    await mkdir(dir, { recursive: true }); const file = dir + "/" + (persistence ? "persistence" : "integration") + ".json";
    try { await writeFile(file.replace(".json", "-previous-" + Date.now() + ".json"), await readFile(file)); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
    await writeFile(file, JSON.stringify(report, null, 2) + "\n"); await db.$disconnect();
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Submission integration failed"); process.exitCode = 1; });
