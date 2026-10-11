import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import type { AgriRulesDraft } from "../src/contracts/agri-workspace";
import type { AgriDemoSnapshot } from "../src/contracts/agri-demo";
for (const value of [process.env.DATABASE_URL, process.env.DIRECT_URL]) {
  const url = new URL(value ?? "http://invalid");
  if (url.hostname !== "127.0.0.1" || url.port !== "55438" || url.pathname !== "/ans_product_verify_agri_summary_r1") throw new Error("Refusing non-isolated summary writes");
}
async function main() {
  const { db } = await import("../src/lib/db");
  const { executeAgriWorkspaceCommand: rules, readAgriWorkspaceRules: getRules } = await import("../src/server/competitions/agrihackathon/workspace");
  const { prepareAgriStage: prepare, executeAgriSubmissionCommand: submit } = await import("../src/server/competitions/agrihackathon/submissions");
  const { executeAgriReviewCommand: review } = await import("../src/server/competitions/agrihackathon/reviews");
  const { executeAgriDemoCommand: demo } = await import("../src/server/competitions/agrihackathon/demo");
  const { executeAgriIssueCommand: issue } = await import("../src/server/competitions/agrihackathon/issues");
  const { readAgriRecordSummary: get } = await import("../src/server/competitions/agrihackathon/record-summary");
  const dir = ".workbuddy/evidence/agri-summary", checks: Array<{ label: string; passed: boolean }> = [];
  const report = { database: "ans_product_verify_agri_summary_r1", isolatedPostgres: true, productionWrites: false, providerCalls: 0, realFunds: false, syntheticFinalFixture: true, passed: false, checks };
  let current = "prepare";
  const check = async (label: string, work: () => Promise<void>) => { current = label; await work(); checks.push({ label, passed: true }); };
  try {
    const identity = await db.$queryRaw<Array<{ database: string; migrations: number }>>`SELECT current_database() AS database,(SELECT count(*)::integer FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL) AS migrations`;
    assert.equal(identity[0].database, report.database); assert.equal(identity[0].migrations, 58);
    if (process.argv.includes("--persistence")) {
      const fixture = JSON.parse(await readFile(dir + "/persistence-fixture.json", "utf8")) as { actorId: string; competitionId: string; submissionId: string; finalSubmissionId: string };
      process.env.ANS_AGRIHACKATHON_COMPETITION_ID = fixture.competitionId;
      await check("fresh Node reads exact old submission and full authorized cross-stage history", async () => {
        const view = await get(fixture.actorId, fixture.submissionId);
        assert.equal(view.submission.id, fixture.submissionId); assert.equal(view.submission.isCurrent, false);
        assert.ok(view.stageHistory.some(row => row.id === fixture.finalSubmissionId && row.stage === "FINAL")); assert.equal(view.limits.complete, true);
        assert.equal(view.content, undefined); assert.ok(!JSON.stringify(view).includes("PRIVATE_SUBMISSION_BODY"));
      }); report.passed = true; return;
    }
    const prefix = "agri-summary-" + randomUUID();
    const edition = await db.competition.create({ data: { title: prefix + " LOCAL FIXTURE", status: "ONGOING" }, select: { id: true } });
    process.env.ANS_AGRIHACKATHON_COMPETITION_ID = edition.id;
    const user = (suffix: string, role: "USER" | "ADMIN" = "USER") => db.user.create({ data: { email: prefix + suffix + "@example.invalid", username: prefix + suffix, role }, select: { id: true } });
    const [owner, limited, privateReader, internalReader, full, outsider, admin, onsite] = await Promise.all([user("owner"), user("limited"), user("private"), user("internal"), user("full"), user("outsider"), user("admin", "ADMIN"), user("onsite")]);
    await db.$executeRaw`INSERT INTO agri_workspaces (id,"competitionId") VALUES (${randomUUID()},${edition.id})`;
    const grant = async (actorId: string, scope: string) => db.$executeRaw`INSERT INTO agri_access_grants (id,"competitionId","userId",scope,"grantedById","grantedAt") VALUES (${randomUUID()},${edition.id},${actorId},${scope},${owner.id},clock_timestamp())`;
    await grant(owner.id, "RULES_CONFIRM"); for (const actor of [limited, privateReader, internalReader, full]) await grant(actor.id, "WORKS_READ");
    await grant(privateReader.id, "PRIVATE_MATERIALS_READ"); await grant(internalReader.id, "INTERNAL_NOTES_READ"); await grant(onsite.id, "ONSITE_READ");
    for (const scope of ["PRIVATE_MATERIALS_READ", "INTERNAL_NOTES_READ", "TECHNICAL_WRITE", "DEMO_WRITE", "ISSUES_WRITE", "EXPORT"]) await grant(full.id, scope);
    const [clock] = await db.$queryRaw<Array<{ now: Date }>>`SELECT clock_timestamp() AS now`;
    const draft: AgriRulesDraft = { schemaVersion: 1, guidanceMarkdown: "LOCAL summary fixture, no official rules or eligibility", requirements: { schemaVersion: 1, repositoryRequired: false, repositoryRefRequired: false, demoRequired: false, materials: [] }, windows: [
      { stage: "REGISTRATION", state: "PENDING", opensAt: null, closesAt: null },
      { stage: "PRELIMINARY", state: "READY", opensAt: new Date(clock.now.getTime() - 60000).toISOString(), closesAt: new Date(clock.now.getTime() + 3600000).toISOString(), includesDeadline: false },
      { stage: "FINAL", state: "PENDING", opensAt: null, closesAt: null },
    ] };
    let revision = (await getRules(owner.id)).revision;
    await rules(owner.id, { action: "saveRulesDraft", idempotencyKey: randomUUID(), expectedRevision: revision++, draft });
    const rule = await rules(owner.id, { action: "confirmRules", idempotencyKey: randomUUID(), expectedRevision: revision++ });
    await rules(owner.id, { action: "publishRules", idempotencyKey: randomUUID(), expectedRevision: revision++, ruleVersionId: rule.resourceId });
    await rules(owner.id, { action: "setEnabled", idempotencyKey: randomUUID(), expectedRevision: revision, enabled: true });
    const team = await db.team.create({ data: { name: prefix + " TEAM", slug: prefix, ownerId: owner.id }, select: { id: true } });
    await db.teamMember.create({ data: { teamId: team.id, userId: owner.id, role: "OWNER" } });
    const entry = await db.teamCompetition.create({ data: { teamId: team.id, competitionId: edition.id }, select: { id: true } });
    const project = await db.project.create({ data: { title: "PRIVATE_PROJECT_TITLE", ownerId: owner.id, teamId: team.id, goal: "CONTEST" }, select: { id: true } });
    const artifact = await db.artifact.create({ data: { projectId: project.id, createdById: owner.id, kind: "CONTEST_MVP", workflowId: "fixture", title: "LOCAL" }, select: { id: true } });
    const version = await db.artifactVersion.create({ data: { artifactId: artifact.id, version: 1, createdById: owner.id, contentJson: { body: "PRIVATE_ARTIFACT_BODY" }, contentMarkdown: "PRIVATE_ARTIFACT_BODY", factSnapshotHash: "fixture" }, select: { id: true } });
    const version2 = await db.artifactVersion.create({ data: { artifactId: artifact.id, version: 2, createdById: owner.id, contentJson: {}, contentMarkdown: "PRIVATE_ARTIFACT_BODY_V2", factSnapshotHash: "fixture" }, select: { id: true } });
    const stage = await prepare(owner.id, { action: "prepareStage", teamCompetitionId: entry.id, stage: "PRELIMINARY" });
    const content = { projectId: project.id, artifactVersionId: version.id, repository: { url: "https://example.invalid/private-repository", ref: { kind: "TAG", value: "fixture-v1" } }, demoUrl: "https://example.invalid/private-demo", summary: "PRIVATE_SUBMISSION_BODY", materials: { schemaVersion: 1, items: [] } };
    const accepted = await submit(owner.id, { action: "submit", idempotencyKey: randomUUID(), entryStageId: stage.entryStageId, expectedRevision: 1, expectedRuleVersionId: rule.resourceId, content }); assert.ok(accepted.submissionId);
    const submissionId = accepted.submissionId;
    const second = await submit(owner.id, { action: "submit", idempotencyKey: randomUUID(), entryStageId: stage.entryStageId, expectedRevision: 2, expectedRuleVersionId: rule.resourceId, content: { ...content, artifactVersionId: version2.id } }); assert.ok(second.submissionId);
    const finalStage = await prepare(owner.id, { action: "prepareStage", teamCompetitionId: entry.id, stage: "FINAL" }), finalSubmissionId = randomUUID();
    // Explicit synthetic final history only. This does not claim real eligibility or bypass the production submission service.
    await db.$executeRaw`INSERT INTO agri_stage_submissions (id,"competitionId","entryStageId",sequence,"ruleVersionId","projectId","artifactVersionId",repository,"demoUrl",summary,materials,"submittedById","acceptedAt") VALUES (${finalSubmissionId},${edition.id},${finalStage.entryStageId},1,${rule.resourceId},${project.id},${version2.id},NULL,NULL,'LOCAL SYNTHETIC FINAL HISTORY','{"schemaVersion":1,"items":[]}'::jsonb,${owner.id},clock_timestamp())`;
    const checklist = { schemaVersion: 1, items: [{ key: "access", result: "PASS", note: "PRIVATE_CHECK_BODY" }] };
    const metadataCheck = await review(full.id, { action: "recordCheck", idempotencyKey: randomUUID(), submissionId, result: "PASS", basis: "METADATA", checklist, internalNote: "META_INTERNAL_NOTE" });
    const privateCheck = await review(full.id, { action: "recordCheck", idempotencyKey: randomUUID(), submissionId, result: "PASS", basis: "PRIVATE_MATERIALS", checklist, internalNote: "PRIVATE_INTERNAL_NOTE" });
    await review(full.id, { action: "publishFeedback", idempotencyKey: randomUUID(), checkId: metadataCheck.checkId, expectedSequence: 0, body: "PUBLISHED_FEEDBACK" });
    await review(full.id, { action: "publishFeedback", idempotencyKey: randomUUID(), checkId: privateCheck.checkId, expectedSequence: 0, body: "WITHDRAWN_FEEDBACK" });
    await review(full.id, { action: "withdrawFeedback", idempotencyKey: randomUUID(), checkId: privateCheck.checkId, expectedSequence: 1 });
    const condition = { status: "PASS" as const, note: "PRIVATE_DEMO_NOTE" };
    const snapshot: AgriDemoSnapshot = { schemaVersion: 1, mode: "LIVE", description: "PRIVATE_DEMO_DESCRIPTION", device: condition, compatibility: condition, network: condition, audio: condition, backup: { ...condition, url: null, artifactVersionId: null }, conclusion: "PASS", recheckDue: { state: "UNKNOWN", at: null } };
    const metaDemo = await demo(full.id, { action: "recordDemoCheck", idempotencyKey: randomUUID(), submissionId, expectedLatestCheckId: null, acknowledgeStaleSubmission: true, basis: "METADATA", demo: snapshot, internalNote: "META_DEMO_INTERNAL_NOTE" });
    const privateDemo = await demo(full.id, { action: "recordDemoCheck", idempotencyKey: randomUUID(), submissionId, expectedLatestCheckId: metaDemo.checkId, acknowledgeStaleSubmission: true, basis: "PRIVATE_MATERIALS", demo: { ...snapshot, backup: { ...snapshot.backup, url: "https://example.invalid/private-backup", artifactVersionId: version.id } }, internalNote: "PRIVATE_DEMO_INTERNAL_NOTE" });
    const fields = { title: "PRIVATE_ISSUE_TITLE", body: "PRIVATE_ISSUE_BODY", status: "OPEN", severity: "HIGH", type: "ENVIRONMENT", assigneeId: null, dueState: "UNKNOWN", dueAt: null, processingSummary: null, reviewedForTeam: true };
    const makeIssue = async (basis: string, visibility: string, body: string, sid = submissionId) => issue(full.id, { ...fields, body, action: "createIssue", idempotencyKey: randomUUID(), submissionId: sid, basis, visibility });
    const teamMeta = await makeIssue("METADATA", "TEAM", "TEAM_META_BODY"), teamPrivate = await makeIssue("PRIVATE_MATERIALS", "TEAM", "TEAM_PRIVATE_BODY"), internalMeta = await makeIssue("METADATA", "INTERNAL", "INTERNAL_META_BODY"), internalPrivate = await makeIssue("PRIVATE_MATERIALS", "INTERNAL", "INTERNAL_PRIVATE_BODY");
    await issue(full.id, { action: "appendEvent", idempotencyKey: randomUUID(), issueId: teamMeta.issueId, expectedRevision: 1, visibility: "INTERNAL", basis: "METADATA", body: "INTERNAL_EVENT_BODY", reviewedForTeam: false });
    await issue(full.id, { action: "appendEvent", idempotencyKey: randomUUID(), issueId: teamMeta.issueId, expectedRevision: 2, visibility: "TEAM", basis: "PRIVATE_MATERIALS", body: "PRIVATE_EVENT_BODY", reviewedForTeam: true });
    const originalStage = await db.agriEntryStage.findUniqueOrThrow({ where: { id: stage.entryStageId } });
    const sideEffects = async () => ({ stage: await db.agriEntryStage.findUniqueOrThrow({ where: { id: stage.entryStageId } }), entry: await db.teamCompetition.findUniqueOrThrow({ where: { id: entry.id } }), publicationCount: await db.artifactPublication.count({ where: { artifactVersionId: version.id } }), ledgerCount: await db.quotaLedger.count({ where: { userId: { in: [owner.id, full.id] } } }), users: await db.user.findMany({ where: { id: { in: [owner.id, full.id] } }, select: { id: true, xp: true, quotaPoints: true }, orderBy: { id: "asc" } }) });
    const before = await sideEffects();
    await check("default WORKS_READ metadata includes exact private-check IDs without any free text, materials or implicit audit write", async () => {
      const auditCount = await db.auditLog.count({ where: { action: "AGRI_EXPORT_RECORD_SUMMARY" } }); const view = await get(limited.id, submissionId), text = JSON.stringify(view);
      assert.equal(view.content, undefined); assert.equal(view.issues.length, 1); assert.equal(view.issueEvents.length, 1); assert.ok(view.technicalChecks.some(row => row.id === privateCheck.checkId)); assert.ok(view.demoChecks.some(row => row.id === privateDemo.checkId));
      for (const forbidden of ["PRIVATE_SUBMISSION_BODY", "PRIVATE_ARTIFACT_BODY", "PRIVATE_CHECK_BODY", "PRIVATE_DEMO_DESCRIPTION", "PRIVATE_DEMO_NOTE", "PRIVATE_INTERNAL_NOTE", "PRIVATE_ISSUE_TITLE", "TEAM_META_BODY", "PUBLISHED_FEEDBACK", "INTERNAL_META_BODY", "INTERNAL_PRIVATE_BODY", "INTERNAL_EVENT_BODY", "example.invalid/private", "WITHDRAWN_FEEDBACK"]) assert.ok(!text.includes(forbidden));
      assert.equal(await db.auditLog.count({ where: { action: "AGRI_EXPORT_RECORD_SUMMARY" } }), auditCount);
    });
    await check("private-only details exclude all internal notes, internal issues and internal events", async () => {
      const view = await get(privateReader.id, submissionId, { includePrivate: true }), text = JSON.stringify(view);
      assert.equal(view.content?.summary, "PRIVATE_SUBMISSION_BODY"); assert.equal(view.issues.length, 2); assert.ok(view.issues.some(row => row.id === teamPrivate.issueId)); assert.equal(view.issueEvents.length, 3);
      assert.ok(text.includes("PRIVATE_DEMO_DESCRIPTION")); assert.ok(text.includes("PUBLISHED_FEEDBACK")); assert.ok(!text.includes("INTERNAL_META_BODY")); assert.ok(!text.includes("INTERNAL_PRIVATE_BODY")); assert.ok(!text.includes("INTERNAL_NOTE")); assert.ok(!text.includes("INTERNAL_EVENT_BODY")); assert.ok(!text.includes("WITHDRAWN_FEEDBACK"));
    });
    await check("internal-only allows internal METADATA issue text but never private-basis objects or their notes", async () => {
      const view = await get(internalReader.id, submissionId, { includeInternal: true }), text = JSON.stringify(view);
      assert.equal(view.content, undefined); assert.equal(view.issues.length, 2); assert.ok(view.issues.some(row => row.id === internalMeta.issueId && row.body === "INTERNAL_META_BODY"));
      assert.ok(!view.issues.some(row => row.id === internalPrivate.issueId || row.id === teamPrivate.issueId)); assert.ok(text.includes("META_INTERNAL_NOTE")); assert.ok(text.includes("INTERNAL_EVENT_BODY"));
      assert.ok(!text.includes("PRIVATE_INTERNAL_NOTE")); assert.ok(!text.includes("PRIVATE_DEMO_INTERNAL_NOTE")); assert.ok(!text.includes("PRIVATE_EVENT_BODY")); assert.ok(!text.includes("PRIVATE_SUBMISSION_BODY"));
    });
    await check("both explicit permissions yield complete authorized detail with independent latest feedback withdrawal", async () => {
      const view = await get(full.id, submissionId, { includePrivate: true, includeInternal: true }), text = JSON.stringify(view);
      assert.equal(view.issues.length, 4); assert.equal(view.issueEvents.length, 6); assert.ok(text.includes("INTERNAL_PRIVATE_BODY")); assert.ok(text.includes("PRIVATE_DEMO_INTERNAL_NOTE")); assert.ok(text.includes("PRIVATE_EVENT_BODY")); assert.ok(!text.includes("WITHDRAWN_FEEDBACK"));
      assert.equal(view.technicalChecks.find(row => row.id === privateCheck.checkId)?.feedback, null); assert.equal(view.limits.complete, true);
    });
    await check("requested scopes never silently downgrade, global ADMIN, own team, onsite-only and unrelated users are refused", async () => {
      await assert.rejects(get(limited.id, submissionId, { includePrivate: true }), /AGRI_SCOPE_REQUIRED/); await assert.rejects(get(limited.id, submissionId, { includeInternal: true }), /AGRI_SCOPE_REQUIRED/);
      await assert.rejects(get(privateReader.id, submissionId, { includeInternal: true }), /AGRI_SCOPE_REQUIRED/);
      for (const who of [owner, outsider, admin, onsite]) await assert.rejects(get(who.id, submissionId), /AGRI_SCOPE_REQUIRED/);
      await assert.rejects(get(full.id, randomUUID()), /AGRI_SUBMISSION_NOT_FOUND/);
    });
    await check("same-team history includes both stages and exact old version without mutating frozen pointer or stage revision", async () => {
      const view = await get(full.id, submissionId); assert.equal(view.submission.id, submissionId); assert.equal(view.submission.artifactVersionId, version.id); assert.equal(view.submission.isCurrent, false);
      assert.equal(view.rule.id, rule.resourceId); assert.equal(view.stageHistory.length, 3); assert.ok(view.stageHistory.some(row => row.id === finalSubmissionId && row.stage === "FINAL")); assert.ok(view.stageHistory.some(row => row.id === second.submissionId && row.isCurrent));
      assert.deepEqual(await db.agriEntryStage.findUniqueOrThrow({ where: { id: stage.entryStageId } }), originalStage);
    });
    await check("EXPORT is independent, successful export audit contains only provenance, selection and visible collection counts", async () => {
      await assert.rejects(get(limited.id, submissionId, { mode: "exportJSON" }), /AGRI_SCOPE_REQUIRED/); await assert.rejects(get(privateReader.id, submissionId, { mode: "exportJSON", includePrivate: true }), /AGRI_SCOPE_REQUIRED/);
      await get(full.id, submissionId, { mode: "exportJSON", includePrivate: true, includeInternal: true }); const logs = await db.auditLog.findMany({ where: { action: "AGRI_EXPORT_RECORD_SUMMARY", resourceId: submissionId }, select: { metadata: true } });
      assert.equal(logs.length, 1); assert.ok(!JSON.stringify(logs).includes("BODY")); assert.ok(!JSON.stringify(logs).includes("NOTE")); assert.ok(!JSON.stringify(logs).includes("example.invalid"));
    });
    await db.$executeRawUnsafe(`CREATE FUNCTION agri_summary_test_delay() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='AGRI_EXPORT_RECORD_SUMMARY' THEN PERFORM pg_sleep(0.6); END IF; RETURN NEW; END; $$`);
    await db.$executeRawUnsafe(`CREATE TRIGGER agri_summary_test_delay BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION agri_summary_test_delay()`);
    const waitForExportSleep = async () => { for (let i = 0; i < 100; i++) { const [row] = await db.$queryRaw<Array<{ sleeping: boolean }>>`SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event='PgSleep' AND query ILIKE '%audit_logs%') AS sleeping`; if (row.sleeping) return; await new Promise(resolve => setTimeout(resolve, 10)); } throw new Error("Export transaction sleep not observed"); };
    await check("single RepeatableRead snapshot and workspace lock prevent feedback publication/withdrawal mixing during export", async () => {
      const pending = get(full.id, submissionId, { mode: "exportJSON", includePrivate: true }); await waitForExportSleep(); let writeComplete = false;
      const changed = review(full.id, { action: "withdrawFeedback", idempotencyKey: randomUUID(), checkId: metadataCheck.checkId, expectedSequence: 1 }).then(value => { writeComplete = true; return value; });
      await new Promise(resolve => setTimeout(resolve, 50)); assert.equal(writeComplete, false);
      const view = await pending; assert.equal(view.technicalChecks.find(row => row.id === metadataCheck.checkId)?.feedback?.body, "PUBLISHED_FEEDBACK"); await changed;
      assert.equal((await get(full.id, submissionId, { includePrivate: true })).technicalChecks.find(row => row.id === metadataCheck.checkId)?.feedback, null);
    });
    await check("scope expiry at final export check rolls back audit atomically and fails closed", async () => {
      const count = await db.auditLog.count({ where: { action: "AGRI_EXPORT_RECORD_SUMMARY" } });
      await db.$executeRaw`UPDATE agri_access_grants SET "expiresAt"=clock_timestamp()+interval '0.3 seconds',revision=revision+1 WHERE "competitionId"=${edition.id} AND "userId"=${full.id} AND scope='EXPORT'`;
      try { await assert.rejects(get(full.id, submissionId, { mode: "exportJSON" }), /AGRI_SCOPE_REQUIRED/); } finally { await db.$executeRaw`UPDATE agri_access_grants SET "expiresAt"=NULL,revision=revision+1 WHERE "competitionId"=${edition.id} AND "userId"=${full.id} AND scope='EXPORT'`; }
      assert.equal(await db.auditLog.count({ where: { action: "AGRI_EXPORT_RECORD_SUMMARY" } }), count);
    });
    await check("workspace-first revocation waits for authorized snapshot and subsequent requested private read fails", async () => {
      const pending = get(full.id, submissionId, { mode: "exportJSON", includePrivate: true }); await waitForExportSleep(); let revoked = false;
      const revoke = db.$transaction(async tx => { await tx.$queryRaw`SELECT id FROM agri_workspaces WHERE "competitionId"=${edition.id} FOR UPDATE`; await tx.$executeRaw`UPDATE agri_access_grants SET "revokedAt"=clock_timestamp(),revision=revision+1 WHERE "competitionId"=${edition.id} AND "userId"=${full.id} AND scope='PRIVATE_MATERIALS_READ'`; }).then(() => { revoked = true; });
      await new Promise(resolve => setTimeout(resolve, 50)); assert.equal(revoked, false); assert.equal((await pending).content?.summary, "PRIVATE_SUBMISSION_BODY"); await revoke;
      await assert.rejects(get(full.id, submissionId, { includePrivate: true }), /AGRI_SCOPE_REQUIRED/); assert.equal((await get(full.id, submissionId)).content, undefined);
      await db.$executeRaw`UPDATE agri_access_grants SET "revokedAt"=NULL,revision=revision+1 WHERE "competitionId"=${edition.id} AND "userId"=${full.id} AND scope='PRIVATE_MATERIALS_READ'`;
    });
    await db.$executeRawUnsafe(`DROP TRIGGER agri_summary_test_delay ON audit_logs`); await db.$executeRawUnsafe(`DROP FUNCTION agri_summary_test_delay()`);
    await check("metadata/private/internal reads and exports leave public status, review, XP, quota and stage freeze unchanged", async () => { assert.deepEqual(await sideEffects(), before); });
    await check("101 visible issues or events reject whole result rather than claiming a truncated complete export", async () => {
      for (let i = 0; i < 101; i++) await makeIssue("METADATA", "TEAM", "BOUNDARY FIXTURE " + i, second.submissionId!);
      for (const mode of ["view", "exportJSON"]) await assert.rejects(get(full.id, second.submissionId!, { mode }), /AGRI_SUMMARY_TOO_LARGE/);
    });
    await writeFile(dir + "/persistence-fixture.json", JSON.stringify({ actorId: limited.id, competitionId: edition.id, submissionId, finalSubmissionId })); report.passed = true;
  } catch (error) { await mkdir(dir, { recursive: true }); await writeFile(dir + "/failure.txt", String(error instanceof Error ? error.stack : error)); throw error; }
  finally { await mkdir(dir, { recursive: true }); await writeFile(dir + (process.argv.includes("--persistence") ? "/persistence.json" : "/integration.json"), JSON.stringify({ ...report, current }, null, 2) + "\n"); await db.$disconnect(); }
}
main().catch(() => { console.error("AGRI_SUMMARY_INTEGRATION_FAILED; inspect sanitized evidence"); process.exitCode = 1; });
