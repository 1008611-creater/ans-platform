import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { canonicalAgriArchiveJSON } from "../src/contracts/agri-record-archive";
import type { AgriRulesDraft } from "../src/contracts/agri-workspace";
import type { AgriDemoSnapshot } from "../src/contracts/agri-demo";
import { agriTaskTemplates } from "../src/domain/competitions/agri-task-templates";
const database = "ans_product_verify_agri_completion_r1";
for (const raw of [process.env.DATABASE_URL, process.env.DIRECT_URL]) {
  const url = new URL(raw ?? "http://invalid");
  if (url.hostname !== "127.0.0.1" || url.port !== "55438" || url.pathname !== "/" + database) throw new Error("Refusing non-isolated completion writes");
}
async function main() {
  const { db } = await import("../src/lib/db");
  const { executeAgriWorkspaceCommand: rules, readAgriWorkspaceRules: ruleView } = await import("../src/server/competitions/agrihackathon/workspace");
  const { prepareAgriStage: prepare, executeAgriSubmissionCommand: submit } = await import("../src/server/competitions/agrihackathon/submissions");
  const { executeAgriReviewCommand: review } = await import("../src/server/competitions/agrihackathon/reviews");
  const { executeAgriDemoCommand: demo } = await import("../src/server/competitions/agrihackathon/demo");
  const { executeAgriIssueCommand: issue } = await import("../src/server/competitions/agrihackathon/issues");
  const { executeAgriOnsiteCommand: onsite } = await import("../src/server/competitions/agrihackathon/onsite");
  const { executeAgriTaskCommand: task, getAgriTask: detail } = await import("../src/server/competitions/agrihackathon/tasks");
  const { readAgriReferenceRecord: choices } = await import("../src/server/competitions/agrihackathon/task-references");
  const { readAgriRecordSummary: summary } = await import("../src/server/competitions/agrihackathon/record-summary");
  const { createAgriRecordArchive: save, readAgriRecordArchive: archive, listAgriRecordArchives: list } = await import("../src/server/competitions/agrihackathon/record-archive");
  const evidence = process.env.AGRI_COMPLETION_EVIDENCE_DIR ?? ".workbuddy/evidence/agri-completion";
  const checks: string[] = []; let passed = false;
  const check = async (name: string, run: () => Promise<void>) => { await run(); checks.push(name); };
  try {
    const [identity] = await db.$queryRaw<Array<{ database: string; count: number }>>`SELECT current_database() AS database,(SELECT count(*)::integer FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL) AS count`;
    assert.equal(identity.database, database);
    assert.equal(identity.count, (await readdir("prisma/migrations", { withFileTypes: true })).filter(item => item.isDirectory()).length);
    const migrationName = "20261011183000_agri_completion_provenance";
    const expectedHash = createHash("sha256").update(await readFile(process.argv.includes("--seed-legacy") ? "completion-pending-migration/migration.sql" : "prisma/migrations/" + migrationName + "/migration.sql")).digest("hex");
    const [migration] = await db.$queryRaw<Array<{ checksum: string }>>`SELECT checksum FROM "_prisma_migrations" WHERE migration_name=${migrationName} AND finished_at IS NOT NULL AND rolled_back_at IS NULL`;
    if (!process.argv.includes("--seed-legacy")) assert.equal(migration.checksum, expectedHash);
    if (process.argv.includes("--persistence")) {
      const fixture = JSON.parse(await readFile(evidence + "/fixture.json", "utf8"));
      process.env.ANS_AGRIHACKATHON_COMPETITION_ID = fixture.competitionId;
      await check("fresh process re-reads v2 onsite hash, actors and frozen result", async () => {
        const value = await archive(fixture.fullId, fixture.archiveId);
        assert.equal(value.archive.sha256, fixture.hash);
        assert.equal(value.snapshot.schemaVersion, 2);
        if (value.snapshot.schemaVersion !== 2) throw new Error("v2 expected");
        assert.equal(value.snapshot.onsite.items[0].fields.operations.result, "Isolated cable issue resolved");
        assert.equal(value.snapshot.onsite.events.length, 3);
        assert.ok(value.snapshot.onsite.events.every(event => event.actorId === fixture.fullId));
      });
      await check("fresh process still reads original v1 bytes", async () => { assert.equal((await archive(fixture.fullId, fixture.legacyId)).snapshot.schemaVersion, 1); });
      passed = true; return;
    }
    const prefix = "isolated-agri-completion-" + randomUUID();
    const competition = await db.competition.create({ data: { title: prefix + " LOCAL ONLY", status: "ONGOING" }, select: { id: true } });
    process.env.ANS_AGRIHACKATHON_COMPETITION_ID = competition.id;
    const user = (name: string) => db.user.create({ data: { email: prefix + name + "@example.invalid", username: prefix + name }, select: { id: true } });
    const [owner, full, limited, outsider] = await Promise.all([user("owner"), user("full"), user("limited"), user("outsider")]);
    await db.$executeRaw`INSERT INTO agri_workspaces (id,"competitionId") VALUES (${randomUUID()},${competition.id})`;
    const grant = (userId: string, scope: string) => db.$executeRaw`INSERT INTO agri_access_grants (id,"competitionId","userId",scope,"grantedById","grantedAt") VALUES (${randomUUID()},${competition.id},${userId},${scope},${owner.id},clock_timestamp())`;
    await grant(owner.id, "RULES_CONFIRM");
    for (const scope of ["WORKS_READ", "PRIVATE_MATERIALS_READ", "INTERNAL_NOTES_READ", "TECHNICAL_WRITE", "DEMO_WRITE", "ISSUES_WRITE", "ARCHIVE_WRITE", "EXPORT", "ONSITE_READ", "ONSITE_WRITE"]) await grant(full.id, scope);
    for (const scope of ["WORKS_READ", "ARCHIVE_WRITE"]) await grant(limited.id, scope);
    const [clock] = await db.$queryRaw<Array<{ now: Date }>>`SELECT clock_timestamp() AS now`;
    const rulesDraft: AgriRulesDraft = { schemaVersion: 1, guidanceMarkdown: "Isolated completion verification only", requirements: { schemaVersion: 1, repositoryRequired: false, repositoryRefRequired: false, demoRequired: false, materials: [] }, windows: [
      { stage: "REGISTRATION", state: "PENDING", opensAt: null, closesAt: null },
      { stage: "PRELIMINARY", state: "READY", opensAt: new Date(clock.now.getTime() - 60000).toISOString(), closesAt: new Date(clock.now.getTime() + 3600000).toISOString(), includesDeadline: false },
      { stage: "FINAL", state: "PENDING", opensAt: null, closesAt: null },
    ] };
    let revision = (await ruleView(owner.id)).revision;
    await rules(owner.id, { action: "saveRulesDraft", expectedRevision: revision++, idempotencyKey: randomUUID(), draft: rulesDraft });
    const confirmed = await rules(owner.id, { action: "confirmRules", expectedRevision: revision++, idempotencyKey: randomUUID() });
    await rules(owner.id, { action: "publishRules", expectedRevision: revision++, idempotencyKey: randomUUID(), ruleVersionId: confirmed.resourceId });
    await rules(owner.id, { action: "setEnabled", expectedRevision: revision, idempotencyKey: randomUUID(), enabled: true });
    const team = await db.team.create({ data: { name: prefix, slug: prefix, ownerId: owner.id }, select: { id: true } });
    await db.teamMember.create({ data: { teamId: team.id, userId: owner.id, role: "OWNER" } });
    const entry = await db.teamCompetition.create({ data: { teamId: team.id, competitionId: competition.id }, select: { id: true } });
    const project = await db.project.create({ data: { title: "LOCAL ONLY", ownerId: owner.id, teamId: team.id, goal: "CONTEST" }, select: { id: true } });
    const artifact = await db.artifact.create({ data: { projectId: project.id, createdById: owner.id, kind: "CONTEST_MVP", workflowId: "fixture", title: "LOCAL ONLY" }, select: { id: true } });
    const version = await db.artifactVersion.create({ data: { artifactId: artifact.id, version: 1, createdById: owner.id, contentJson: {}, contentMarkdown: "LOCAL ONLY", factSnapshotHash: "fixture" }, select: { id: true } });
    const stage = await prepare(owner.id, { action: "prepareStage", teamCompetitionId: entry.id, stage: "PRELIMINARY" });
    const submission = await submit(owner.id, { action: "submit", expectedRevision: 1, expectedRuleVersionId: confirmed.resourceId, entryStageId: stage.entryStageId, idempotencyKey: randomUUID(), content: { projectId: project.id, artifactVersionId: version.id, repository: null, demoUrl: null, summary: "LOCAL ONLY", materials: { schemaVersion: 1, items: [] } } });
    assert.ok(submission.submissionId); const sid = submission.submissionId;
    if (process.argv.includes("--seed-legacy")) {
      const record = await summary(full.id, sid), archiveId = randomUUID();
      const snapshot = { schemaVersion: 1, source: "ANS_AGRI_SAVED_RECORD_ARCHIVE", includesOnsite: false, archiveId, sequence: 1, previousArchiveId: null, createdById: full.id, collectedAt: record.generatedAt, record };
      const canonical = canonicalAgriArchiveJSON(snapshot), hash = createHash("sha256").update(canonical).digest("hex");
      await db.$transaction(async tx => {
        await tx.$executeRaw`INSERT INTO agri_record_archives (id,"competitionId","submissionId","entryStageId","artifactVersionId","ruleVersionId",sequence,"previousArchiveId","createdById","collectedAt","includePrivate","includeInternal","snapshotSchemaVersion","snapshotCanonical","snapshotHash","byteLength") VALUES (${archiveId},${competition.id},${sid},${stage.entryStageId},${version.id},${confirmed.resourceId},1,NULL,${full.id},${new Date(record.generatedAt)},false,false,1,${canonical},${hash},${Buffer.byteLength(canonical)})`;
        await tx.$executeRaw`INSERT INTO agri_record_archive_receipts (id,"competitionId","archiveId","actorId","idempotencyKey","requestHash","createdAt") VALUES (${randomUUID()},${competition.id},${archiveId},${full.id},${randomUUID()},${"a".repeat(64)},${new Date(record.generatedAt)})`;
        await tx.auditLog.create({ data: { actorId: full.id, action: "AGRI_CREATE_RECORD_ARCHIVE", resourceType: "agri_record_archive", resourceId: archiveId } });
      });
      await mkdir(evidence, { recursive: true });
      await writeFile(evidence + "/legacy-before-migration.json", JSON.stringify({ competitionId: competition.id, actorId: full.id, archiveId, canonical, hash }));
      passed = true; return;
    }
    await check("migration preserves a pre-existing v1 archive byte for byte", async () => {
      const legacy = JSON.parse(await readFile(evidence + "/legacy-before-migration.json", "utf8"));
      process.env.ANS_AGRIHACKATHON_COMPETITION_ID = legacy.competitionId;
      try { const value = await archive(legacy.actorId, legacy.archiveId); assert.equal(value.archive.sha256, legacy.hash); assert.equal(canonicalAgriArchiveJSON(value.snapshot), legacy.canonical); }
      finally { process.env.ANS_AGRIHACKATHON_COMPETITION_ID = competition.id; }
    });
    const checklist = { schemaVersion: 1, items: [{ key: "access", result: "PASS", note: "Isolated check" }] };
    const technical = await review(full.id, { action: "recordCheck", submissionId: sid, result: "PASS", basis: "METADATA", checklist, internalNote: null, idempotencyKey: randomUUID() });
    const condition = { status: "PASS" as const, note: "Isolated check" };
    const demoSnapshot: AgriDemoSnapshot = { schemaVersion: 1, mode: "LIVE", description: "Isolated demo", device: condition, compatibility: condition, network: condition, audio: condition, backup: { ...condition, url: null, artifactVersionId: null }, conclusion: "PASS", recheckDue: { state: "UNKNOWN", at: null } };
    const firstDemo = await demo(full.id, { action: "recordDemoCheck", submissionId: sid, expectedLatestCheckId: null, acknowledgeStaleSubmission: false, basis: "METADATA", demo: demoSnapshot, internalNote: null, idempotencyKey: randomUUID() });
    const taskResult = await task(owner.id, { action: "create", idempotencyKey: randomUUID(), task: agriTaskTemplates("en")[0].task });
    assert.ok(taskResult.task); const tid = taskResult.task.id;
    await check("timetable owner is the actual persisted account", async () => { assert.equal((await detail(owner.id, tid)).task.ownerId, owner.id); });
    await check("unpublished Demo check remains unavailable to team references", async () => {
      await assert.rejects(task(owner.id, { action: "attachReference", taskId: tid, expectedRevision: 1, idempotencyKey: randomUUID(), target: { submissionId: sid, issueId: null, demoCheckId: firstDemo.checkId } }), /AGRI_REFERENCE_UNAVAILABLE/);
    });
    await demo(full.id, { action: "publishDemoFeedback", checkId: firstDemo.checkId, expectedSequence: 0, body: "Isolated published feedback", idempotencyKey: randomUUID() });
    await check("exact Demo and submission references coexist with stable IDs", async () => {
      await task(owner.id, { action: "attachReference", taskId: tid, expectedRevision: 1, idempotencyKey: randomUUID(), target: { submissionId: sid, issueId: null, demoCheckId: firstDemo.checkId } });
      await task(owner.id, { action: "attachReference", taskId: tid, expectedRevision: 2, idempotencyKey: randomUUID(), target: { submissionId: sid, issueId: null } });
      const view = await detail(owner.id, tid); assert.equal(view.references?.length, 2);
      assert.ok(view.references?.some(reference => reference.available && reference.record.demoCheck?.id === firstDemo.checkId));
      const candidates = await choices(owner.id, sid, { scope: "team", demo: firstDemo.checkId });
      assert.equal(candidates.record.demoCheck?.id, firstDemo.checkId);
      assert.equal(candidates.demoChecks?.length, 1);
    });
    await check("missing and cross-submission Demo cannot be attached", async () => {
      await assert.rejects(task(owner.id, { action: "attachReference", taskId: tid, expectedRevision: 3, idempotencyKey: randomUUID(), target: { submissionId: sid, issueId: null, demoCheckId: "missing" } }), /AGRI_REFERENCE_UNAVAILABLE/);
      await assert.rejects(task(outsider.id, { action: "attachReference", taskId: tid, expectedRevision: 3, idempotencyKey: randomUUID(), target: { submissionId: sid, issueId: null, demoCheckId: firstDemo.checkId } }), /NOT_FOUND/);
    });
    await check("withdrawal removes previously linked Demo from team reads", async () => {
      await demo(full.id, { action: "withdrawDemoFeedback", checkId: firstDemo.checkId, expectedSequence: 1, idempotencyKey: randomUUID() });
      const view = await detail(owner.id, tid); assert.ok(view.references?.some(reference => !reference.available));
      await assert.rejects(choices(owner.id, sid, { scope: "team", demo: firstDemo.checkId }), /AGRI_REFERENCE_UNAVAILABLE/);
    });
    const issueFields = { title: "Isolated cable issue", body: "Requires cable adapter", status: "OPEN", severity: "HIGH", type: "ENVIRONMENT", visibility: "INTERNAL", assigneeId: full.id, dueState: "UNKNOWN", dueAt: null, processingSummary: null, reviewedForTeam: false };
    const opened = await issue(full.id, { action: "createIssue", submissionId: sid, basis: "METADATA", ...issueFields, idempotencyKey: randomUUID() });
    await issue(full.id, { action: "updateIssue", issueId: opened.issueId, expectedRevision: 1, ...issueFields, status: "RESOLVED", processingSummary: "Cable replaced", idempotencyKey: randomUUID() });
    const fields = { title: "Isolated onsite demo", mode: "LIVE", summary: "Local only", backupSummary: "Local backup", operations: { device: "Laptop", conditions: "Cable adapter required", schedule: { state: "UNKNOWN", at: null }, status: "NOT_STARTED", result: null } };
    const onsiteItem = await onsite(full.id, { action: "createOnsite", submissionId: sid, demoCheckId: firstDemo.checkId, acknowledgeStaleSubmission: false, fields, idempotencyKey: randomUUID() });
    await onsite(full.id, { action: "publishOnsite", itemId: onsiteItem.itemId, expectedRevision: 1, reviewedForOnsite: true, idempotencyKey: randomUUID() });
    await onsite(full.id, { action: "updateOnsiteOperations", itemId: onsiteItem.itemId, expectedRevision: 2, operations: { ...fields.operations, status: "DONE", result: "Isolated cable issue resolved" }, idempotencyKey: randomUUID() });
    await check("live summary preserves checker, assignee, completer and each issue operator", async () => {
      const view = await summary(full.id, sid, { includePrivate: true, includeInternal: true });
      assert.equal(view.technicalChecks.find(row => row.id === technical.checkId)?.checkedById, full.id);
      assert.equal(view.demoChecks[0].checkedById, full.id);
      assert.equal(view.issues[0].assigneeId, full.id); assert.equal(view.issues[0].completedById, full.id);
      assert.ok(view.issueEvents.every(row => row.actorId === full.id));
      assert.equal((view.issueEvents.find(row => row.revision === 2)?.afterState as { processingSummary: string }).processingSummary, "Cable replaced");
    });
    await check("new archives need independent ONSITE_READ", async () => { await assert.rejects(save(limited.id, { action: "createArchive", submissionId: sid, idempotencyKey: randomUUID() }), /AGRI_SCOPE_REQUIRED/); });
    const saved = await save(full.id, { action: "createArchive", submissionId: sid, selection: { includePrivate: true, includeInternal: true }, idempotencyKey: randomUUID() });
    await check("v2 binds fixed onsite items and all operations to exact submission", async () => {
      const value = await archive(full.id, saved.archiveId); assert.equal(value.snapshot.schemaVersion, 2);
      if (value.snapshot.schemaVersion !== 2) throw new Error("v2 expected");
      assert.equal(value.snapshot.onsite.items[0].demoCheckId, firstDemo.checkId);
      assert.equal(value.snapshot.onsite.events.length, 3);
      assert.ok(value.snapshot.onsite.events.every(event => event.actorId === full.id));
      await onsite(full.id, { action: "updateOnsiteOperations", itemId: onsiteItem.itemId, expectedRevision: 3, operations: { ...fields.operations, status: "DONE", result: "Later local change" }, idempotencyKey: randomUUID() });
      const unchanged = await archive(full.id, saved.archiveId); assert.equal(unchanged.archive.sha256, saved.sha256);
      assert.equal(unchanged.snapshot.schemaVersion === 2 && unchanged.snapshot.onsite.items[0].fields.operations.result, "Isolated cable issue resolved");
      await assert.rejects(db.$executeRaw`UPDATE agri_record_archives SET "snapshotCanonical"='{}' WHERE id=${saved.archiveId}`, /IMMUTABLE/i);
    });
    const record = await summary(full.id, sid); const legacyId = randomUUID();
    await check("original v1 archives retain their canonical bytes and readable semantics", async () => {
      const snapshot = { schemaVersion: 1, source: "ANS_AGRI_SAVED_RECORD_ARCHIVE", includesOnsite: false, archiveId: legacyId, sequence: 2, previousArchiveId: saved.archiveId, createdById: full.id, collectedAt: record.generatedAt, record };
      const canonical = canonicalAgriArchiveJSON(snapshot), hash = createHash("sha256").update(canonical).digest("hex");
      await db.$transaction(async tx => {
        await tx.$executeRaw`INSERT INTO agri_record_archives (id,"competitionId","submissionId","entryStageId","artifactVersionId","ruleVersionId",sequence,"previousArchiveId","createdById","collectedAt","includePrivate","includeInternal","snapshotSchemaVersion","snapshotCanonical","snapshotHash","byteLength") VALUES (${legacyId},${competition.id},${sid},${stage.entryStageId},${version.id},${confirmed.resourceId},2,${saved.archiveId},${full.id},${new Date(record.generatedAt)},false,false,1,${canonical},${hash},${Buffer.byteLength(canonical)})`;
        await tx.$executeRaw`INSERT INTO agri_record_archive_receipts (id,"competitionId","archiveId","actorId","idempotencyKey","requestHash","createdAt") VALUES (${randomUUID()},${competition.id},${legacyId},${full.id},${randomUUID()},${"a".repeat(64)},${new Date(record.generatedAt)})`;
        await tx.auditLog.create({ data: { actorId: full.id, action: "AGRI_CREATE_RECORD_ARCHIVE", resourceType: "agri_record_archive", resourceId: legacyId } });
      });
      const value = await archive(full.id, legacyId); assert.equal(value.snapshot.schemaVersion, 1); assert.equal(value.snapshot.includesOnsite, false); assert.equal(value.archive.sha256, hash);
    });
    await check("foreign existing Demo identity is rejected rather than rebound", async () => {
      const second = await submit(owner.id, { action: "submit", expectedRevision: 2, expectedRuleVersionId: confirmed.resourceId, entryStageId: stage.entryStageId, idempotencyKey: randomUUID(), content: { projectId: project.id, artifactVersionId: version.id, repository: null, demoUrl: null, summary: "Second local submission", materials: { schemaVersion: 1, items: [] } } });
      assert.ok(second.submissionId);
      const foreignDemo = await demo(full.id, { action: "recordDemoCheck", submissionId: second.submissionId, expectedLatestCheckId: null, acknowledgeStaleSubmission: false, basis: "METADATA", demo: demoSnapshot, internalNote: null, idempotencyKey: randomUUID() });
      await assert.rejects(task(owner.id, { action: "attachReference", taskId: tid, expectedRevision: 3, idempotencyKey: randomUUID(), target: { submissionId: sid, issueId: null, demoCheckId: foreignDemo.checkId } }), /AGRI_REFERENCE_UNAVAILABLE/);
      await assert.rejects(db.$executeRaw`INSERT INTO agri_task_references (id,"competitionId","taskId","entryStageId","submissionId","demoCheckId","attachedAt","attachedRevision") VALUES (${randomUUID()},${competition.id},${tid},${stage.entryStageId},${sid},${foreignDemo.checkId},clock_timestamp(),4)`, /foreign key|identity_fkey/);
    });
    await check("limited reader sees legacy v1 but never onsite v2 without permission", async () => {
      assert.equal((await archive(limited.id, legacyId)).snapshot.schemaVersion, 1);
      await assert.rejects(archive(limited.id, saved.archiveId), /AGRI_SCOPE_REQUIRED/);
      assert.deepEqual((await list(limited.id, sid)).items.map(item => item.id), [legacyId]);
    });
    await mkdir(evidence, { recursive: true });
    await writeFile(evidence + "/fixture.json", JSON.stringify({ competitionId: competition.id, fullId: full.id, archiveId: saved.archiveId, legacyId, hash: saved.sha256 }));
    passed = true;
  } finally {
    await mkdir(evidence, { recursive: true });
    await writeFile(evidence + (process.argv.includes("--persistence") ? "/persistence.json" : process.argv.includes("--seed-legacy") ? "/legacy-seed.json" : "/integration.json"), JSON.stringify({ database, isolatedPostgres: true, productionWrites: false, passed, checks }, null, 2));
    await db.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
