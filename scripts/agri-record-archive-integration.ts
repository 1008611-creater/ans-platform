import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import type { AgriRulesDraft } from "../src/contracts/agri-workspace";
import type { AgriDemoSnapshot } from "../src/contracts/agri-demo";
for (const value of [process.env.DATABASE_URL, process.env.DIRECT_URL]) {
  const url = new URL(value ?? "http://invalid");
  if (url.hostname !== "127.0.0.1" || url.port !== "55438" || url.pathname !== "/ans_product_verify_agri_archive_r5") throw new Error("Refusing non-isolated summary writes");
}
async function main() {
  const { db } = await import("../src/lib/db");
  const { executeAgriWorkspaceCommand: rules, readAgriWorkspaceRules: getRules } = await import("../src/server/competitions/agrihackathon/workspace");
  const { prepareAgriStage: prepare, executeAgriSubmissionCommand: submit } = await import("../src/server/competitions/agrihackathon/submissions");
  const { executeAgriReviewCommand: review } = await import("../src/server/competitions/agrihackathon/reviews");
  const { executeAgriDemoCommand: demo } = await import("../src/server/competitions/agrihackathon/demo");
  const { executeAgriIssueCommand: issue } = await import("../src/server/competitions/agrihackathon/issues");
  const { readAgriRecordSummary: live } = await import("../src/server/competitions/agrihackathon/record-summary");
  const { createAgriRecordArchive: create, listAgriRecordArchives: list, readAgriRecordArchive: get } = await import("../src/server/competitions/agrihackathon/record-archive");
  const { canonicalAgriArchiveJSON } = await import("../src/contracts/agri-record-archive");
  const dir = ".workbuddy/evidence/agri-record-archive", checks: Array<{ label: string; passed: boolean }> = [];
  const report = { database: "ans_product_verify_agri_archive_r5", isolatedPostgres: true, productionWrites: false, providerCalls: 0, realFunds: false, syntheticFinalFixture: true, passed: false, checks };
  let current = "prepare";
  const check = async (label: string, work: () => Promise<void>) => { current = label; await work(); checks.push({ label, passed: true }); };
  try {
    const identity = await db.$queryRaw<Array<{ database: string; migrations: number }>>`SELECT current_database() AS database,(SELECT count(*)::integer FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL) AS migrations`;
    assert.equal(identity[0].database, report.database); assert.equal(identity[0].migrations, 60);
    const [migration] = await db.$queryRaw<Array<{ checksum: string }>>`SELECT checksum FROM "_prisma_migrations" WHERE migration_name='20261008070000_agri_record_archives' AND finished_at IS NOT NULL AND rolled_back_at IS NULL`;
    assert.equal(migration.checksum, createHash("sha256").update(await readFile("prisma/migrations/20261008070000_agri_record_archives/migration.sql")).digest("hex"));
    if (process.argv.includes("--persistence")) {
      const fixture = JSON.parse(await readFile(dir + "/persistence-fixture.json", "utf8")) as { actorId: string; limitedId: string; competitionId: string; archiveId: string; metadataId: string; submissionId: string; sha256: string };
      process.env.ANS_AGRIHACKATHON_COMPETITION_ID = fixture.competitionId;
      await check("fresh Node verifies persisted canonical hash, exact old source and indivisible private/internal selection", async () => {
        const saved = await get(fixture.actorId, fixture.archiveId); assert.equal(saved.archive.sha256, fixture.sha256); assert.equal(saved.snapshot.record.submission.id, fixture.submissionId); assert.equal(saved.snapshot.record.content?.summary, "PRIVATE_SUBMISSION_BODY"); assert.equal(saved.snapshot.includesOnsite, false);
        assert.equal((await get(fixture.limitedId, fixture.metadataId)).snapshot.record.content, undefined); await assert.rejects(get(fixture.limitedId, fixture.archiveId), /AGRI_SCOPE_REQUIRED/);
      }); report.passed = true; return;
    }
    const prefix = "agri-record-archive-" + randomUUID();
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
    const sideEffects = async () => ({ stage: await db.agriEntryStage.findUniqueOrThrow({ where: { id: stage.entryStageId } }), entry: await db.teamCompetition.findUniqueOrThrow({ where: { id: entry.id } }), publicationCount: await db.artifactPublication.count({ where: { artifactVersionId: version.id } }), ledgerCount: await db.quotaLedger.count({ where: { userId: { in: [owner.id, full.id] } } }), users: await db.user.findMany({ where: { id: { in: [owner.id, full.id] } }, select: { id: true, xp: true, quotaPoints: true }, orderBy: { id: "asc" } }) });
    const before = await sideEffects(), command = (extra: Record<string, unknown> = {}) => ({ action: "createArchive", submissionId, selection: { includePrivate: false, includeInternal: false }, idempotencyKey: randomUUID(), ...extra });
    const count = async () => { const [row] = await db.$queryRaw<Array<{ n: number }>>`SELECT count(*)::integer AS n FROM agri_record_archives WHERE "competitionId"=${edition.id}`; return row.n; };
    let archiveId = "", metadataId = "", savedHash = "";
    await check("ARCHIVE_WRITE and WORKS_READ are independent; ADMIN, owner and onsite rights never bypass them", async () => {
      for (const who of [owner, limited, full, outsider, admin, onsite]) await assert.rejects(create(who.id, command()), /AGRI_SCOPE_REQUIRED/);
      await grant(outsider.id, "ARCHIVE_WRITE"); await assert.rejects(create(outsider.id, command()), /AGRI_SCOPE_REQUIRED/);
      for (const who of [limited, privateReader, internalReader, full]) await grant(who.id, "ARCHIVE_WRITE");
      await assert.rejects(create(limited.id, command({ selection: { includePrivate: true, includeInternal: false } })), /AGRI_SCOPE_REQUIRED/);
      await assert.rejects(create(limited.id, command({ selection: { includePrivate: false, includeInternal: true } })), /AGRI_SCOPE_REQUIRED/);
      assert.equal(await count(), 0);
    });
    await check("three same-key concurrent saves produce one immutable archive/receipt/audit and one repeat result", async () => {
      const request = command({ selection: { includePrivate: true, includeInternal: true } });
      const results = await Promise.all([create(full.id, request), create(full.id, request), create(full.id, request)]);
      assert.equal(results.filter(row => !row.duplicate).length, 1); archiveId = results[0].archiveId; savedHash = results[0].sha256; assert.ok(results.every(row => row.archiveId === archiveId));
      assert.equal((await create(full.id, request)).duplicate, true);
      await assert.rejects(create(full.id, { ...request, selection: { includePrivate: false, includeInternal: false } }), /AGRI_IDEMPOTENCY_CONFLICT/);
      const [receipt] = await db.$queryRaw<Array<{ n: number }>>`SELECT count(*)::integer AS n FROM agri_record_archive_receipts WHERE "archiveId"=${archiveId}`;
      assert.equal(receipt.n, 1); assert.equal(await count(), 1); assert.equal(await db.auditLog.count({ where: { resourceId: archiveId, action: "AGRI_CREATE_RECORD_ARCHIVE" } }), 1);
      const view = await get(full.id, archiveId); assert.equal(view.snapshot.record.content?.summary, "PRIVATE_SUBMISSION_BODY"); assert.equal(view.snapshot.record.issues.length, 4); assert.equal(view.snapshot.record.issueEvents.length, 6);
      assert.equal(view.snapshot.record.technicalChecks.find(row => row.id === privateCheck.checkId)?.feedback, null); assert.ok(view.snapshot.record.demoChecks.some(row => row.id === privateDemo.checkId));
      assert.equal(createHash("sha256").update(canonicalAgriArchiveJSON(view.snapshot)).digest("hex"), savedHash);
      assert.equal(view.archive.artifactVersionId, version.id); assert.equal(view.archive.ruleVersionId, rule.resourceId); assert.equal(view.snapshot.record.stageHistory.length, 3); assert.equal(view.snapshot.includesOnsite, false);
    });
    await check("all four explicit selections preserve authorized content without cross-range lowering", async () => {
      metadataId = (await create(limited.id, command())).archiveId;
      const privateId = (await create(privateReader.id, command({ selection: { includePrivate: true, includeInternal: false } }))).archiveId;
      const internalId = (await create(internalReader.id, command({ selection: { includePrivate: false, includeInternal: true } }))).archiveId;
      const metadata = JSON.stringify((await get(limited.id, metadataId)).snapshot); for (const forbidden of ["PRIVATE_SUBMISSION_BODY", "PRIVATE_CHECK_BODY", "PRIVATE_DEMO_DESCRIPTION", "INTERNAL_META_BODY", "TEAM_META_BODY", "INTERNAL_EVENT_BODY", "example.invalid/private"]) assert.ok(!metadata.includes(forbidden));
      const privateView = (await get(privateReader.id, privateId)).snapshot.record; assert.equal(privateView.issues.length, 2); assert.ok(privateView.issues.some(row => row.id === teamPrivate.issueId)); assert.ok(!JSON.stringify(privateView).includes("INTERNAL_NOTE"));
      const internalView = (await get(internalReader.id, internalId)).snapshot.record; assert.equal(internalView.content, undefined); assert.equal(internalView.issues.length, 2); assert.ok(internalView.issues.some(row => row.id === internalMeta.issueId)); assert.ok(!internalView.issues.some(row => row.id === internalPrivate.issueId));
      for (const who of [limited, privateReader, internalReader]) await assert.rejects(get(who.id, archiveId), /AGRI_SCOPE_REQUIRED/);
      for (const who of [owner, outsider, admin, onsite]) await assert.rejects(get(who.id, metadataId), /AGRI_SCOPE_REQUIRED/);
      assert.deepEqual((await list(limited.id, submissionId)).items.map(row => row.id), [metadataId]);
      assert.deepEqual(new Set((await list(privateReader.id, submissionId)).items.map(row => row.id)), new Set([metadataId, privateId]));
      assert.deepEqual(new Set((await list(internalReader.id, submissionId)).items.map(row => row.id)), new Set([metadataId, internalId]));
      await assert.rejects(get(full.id, archiveId, { includePrivate: false }), /Unrecognized key/);
    });
    await check("different keys and actors append contiguous versions on one exact submission, without inheriting another receipt", async () => {
      const key = randomUUID(), shared = command({ idempotencyKey: key });
      const results = await Promise.all([create(full.id, shared), create(limited.id, shared), create(full.id, command())]);
      assert.equal(new Set(results.map(row => row.archiveId)).size, 3); assert.ok(results.every(row => !row.duplicate));
      const sequences = results.map(row => row.sequence).sort((a,b) => a-b); assert.deepEqual(sequences, [5,6,7]);
      const [chain] = await db.$queryRaw<Array<{ n: number }>>`SELECT count(*)::integer AS n FROM agri_record_archives a JOIN agri_record_archives p ON p.id=a."previousArchiveId" AND p."competitionId"=a."competitionId" AND p."submissionId"=a."submissionId" AND p.sequence=a.sequence-1 WHERE a."competitionId"=${edition.id}`; assert.equal(chain.n, 6);
    });
    await check("saved bytes and hash stay fixed after live feedback changes; a new version sees the changed state", async () => {
      await review(full.id, { action: "withdrawFeedback", idempotencyKey: randomUUID(), checkId: metadataCheck.checkId, expectedSequence: 1 });
      assert.equal((await live(full.id, submissionId, { includePrivate: true })).technicalChecks.find(row => row.id === metadataCheck.checkId)?.feedback, null);
      const saved = await get(full.id, archiveId); assert.equal(saved.archive.sha256, savedHash); assert.equal(saved.snapshot.record.technicalChecks.find(row => row.id === metadataCheck.checkId)?.feedback?.body, "PUBLISHED_FEEDBACK");
      const next = await create(full.id, command({ selection: { includePrivate: true, includeInternal: true } })); assert.equal((await get(full.id, next.archiveId)).snapshot.record.technicalChecks.find(row => row.id === metadataCheck.checkId)?.feedback, null);
    });
    await check("EXPORT remains independent and audits only exact version provenance, never body", async () => {
      const logs = await db.auditLog.count({ where: { action: "AGRI_EXPORT_RECORD_ARCHIVE" } }); await assert.rejects(get(limited.id, metadataId, { mode: "exportJSON" }), /AGRI_SCOPE_REQUIRED/);
      await get(full.id, archiveId, { mode: "exportJSON" }); assert.equal(await db.auditLog.count({ where: { action: "AGRI_EXPORT_RECORD_ARCHIVE" } }), logs + 1);
      const audits = await db.auditLog.findMany({ where: { resourceType: "agri_record_archive" }, select: { metadata: true } }); for (const row of audits) { assert.ok(!JSON.stringify(row.metadata).includes("BODY")); assert.ok(!JSON.stringify(row.metadata).includes("NOTE")); }
    });
    await check("database immutable archive/receipt and hash checks reject raw overwrites and deletions", async () => {
      await assert.rejects(db.$executeRaw`UPDATE agri_record_archives SET "snapshotHash"=repeat('a',64) WHERE id=${archiveId}`, /AGRI_FOUNDATION_IMMUTABLE/);
      await assert.rejects(db.$executeRaw`DELETE FROM agri_record_archives WHERE id=${archiveId}`, /AGRI_FOUNDATION_IMMUTABLE/);
      await assert.rejects(db.$executeRaw`DELETE FROM agri_record_archive_receipts WHERE "archiveId"=${archiveId}`, /AGRI_FOUNDATION_IMMUTABLE/);
      await assert.rejects(db.$transaction(async tx => { await tx.$executeRawUnsafe('ALTER TABLE agri_record_archives DISABLE TRIGGER agri_record_archive_immutable'); await tx.$executeRaw`UPDATE agri_record_archives SET "snapshotHash"=repeat('a',64) WHERE id=${archiveId}`; }), /check constraint/);
    });
    await check("read-time integrity refuses canonical-byte or row-provenance tampering even with recomputed hash", async () => {
      const [original] = await db.$queryRaw<Array<{ snapshotCanonical: string; snapshotHash: string; byteLength: number }>>`SELECT "snapshotCanonical","snapshotHash","byteLength" FROM agri_record_archives WHERE id=${archiveId}`;
      const updateBytes = async (text: string) => db.$transaction(async tx => { await tx.$executeRawUnsafe('ALTER TABLE agri_record_archives DISABLE TRIGGER agri_record_archive_immutable'); await tx.$executeRaw`UPDATE agri_record_archives SET "snapshotCanonical"=${text},"snapshotHash"=${createHash("sha256").update(text).digest("hex")},"byteLength"=${Buffer.byteLength(text)} WHERE id=${archiveId}`; await tx.$executeRawUnsafe('ALTER TABLE agri_record_archives ENABLE TRIGGER agri_record_archive_immutable'); });
      try { await updateBytes(original.snapshotCanonical + " "); await assert.rejects(get(full.id, archiveId), /AGRI_ARCHIVE_INTEGRITY_FAILED/); await assert.rejects(list(full.id, submissionId), /AGRI_ARCHIVE_INTEGRITY_FAILED/); }
      finally { await updateBytes(original.snapshotCanonical); }
      const updateIdentity = async (artifactId: string) => db.$transaction(async tx => { await tx.$executeRawUnsafe('ALTER TABLE agri_record_archives DISABLE TRIGGER agri_record_archive_immutable'); await tx.$executeRaw`UPDATE agri_record_archives SET "artifactVersionId"=${artifactId} WHERE id=${archiveId}`; await tx.$executeRawUnsafe('ALTER TABLE agri_record_archives ENABLE TRIGGER agri_record_archive_immutable'); });
      try { await updateIdentity(version2.id); await assert.rejects(get(full.id,archiveId),/AGRI_ARCHIVE_INTEGRITY_FAILED/); }
      finally { await updateIdentity(version.id); }
      assert.equal((await get(full.id, archiveId)).archive.sha256, savedHash);
    });
    await check("raw insert cannot commit without matching receipt and audit, or splice another submission's previous version", async () => {
      const other = await create(full.id, command({submissionId:finalSubmissionId}));
      const appendRaw = async (override: {previousArchiveId?:string;artifactVersionId?:string} = {}) => {
        const latest=(await list(full.id,submissionId)).items[0], original=await get(full.id,archiveId), newId=randomUUID(), at=new Date().toISOString();
        const snapshot={...original.snapshot,archiveId:newId,sequence:latest.sequence+1,previousArchiveId:override.previousArchiveId??latest.id,collectedAt:at,record:{...original.snapshot.record,generatedAt:at}},text=canonicalAgriArchiveJSON(snapshot);
        return db.$transaction(async tx=>{await tx.$executeRaw`INSERT INTO agri_record_archives (id,"competitionId","submissionId","entryStageId","artifactVersionId","ruleVersionId",sequence,"previousArchiveId","createdById","collectedAt","includePrivate","includeInternal","snapshotSchemaVersion","snapshotCanonical","snapshotHash","byteLength") VALUES (${newId},${edition.id},${submissionId},${stage.entryStageId},${override.artifactVersionId??version.id},${rule.resourceId},${snapshot.sequence},${snapshot.previousArchiveId},${full.id},${new Date(at)},true,true,1,${text},${createHash("sha256").update(text).digest("hex")},${Buffer.byteLength(text)})`;});
      };
      const n=await count(); await assert.rejects(appendRaw(),/AGRI_ARCHIVE_ATOMIC_RECORD_REQUIRED/); await assert.rejects(appendRaw({previousArchiveId:other.archiveId}),/AGRI_ARCHIVE_SEQUENCE_INVALID/); await assert.rejects(appendRaw({artifactVersionId:version2.id}),/AGRI_ARCHIVE_SOURCE_MISMATCH/); assert.equal(await count(),n);
    });
    await db.$executeRawUnsafe(`CREATE FUNCTION agri_archive_test_delay() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action IN ('AGRI_CREATE_RECORD_ARCHIVE','AGRI_EXPORT_RECORD_ARCHIVE') THEN PERFORM pg_sleep(0.6); END IF; RETURN NEW; END; $$`);
    await db.$executeRawUnsafe(`CREATE TRIGGER agri_archive_test_delay BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION agri_archive_test_delay()`);
    const waitForAudit = async () => { for (let i=0;i<100;i++) { const [row] = await db.$queryRaw<Array<{ sleeping: boolean }>>`SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event='PgSleep' AND query ILIKE '%audit_logs%') AS sleeping`; if (row.sleeping) return; await new Promise(resolve => setTimeout(resolve, 10)); } throw new Error("Archive audit sleep not observed"); };
    await check("source collection and snapshot persistence share one transaction; concurrent feedback waits and cannot mix versions", async () => {
      const pending = create(full.id, command({ selection: { includePrivate: true, includeInternal: true } })); await waitForAudit(); let changed = false;
      const concurrent = demo(full.id, { action: "publishDemoFeedback", idempotencyKey: randomUUID(), checkId: metaDemo.checkId, expectedSequence: 0, body: "NEW_DEMO_FEEDBACK" }).then(row => { changed=true; return row; });
      await new Promise(resolve => setTimeout(resolve, 50)); assert.equal(changed, false); const saved = await pending; await concurrent;
      assert.equal((await get(full.id, saved.archiveId)).snapshot.record.demoChecks.find(row => row.id === metaDemo.checkId)?.feedback, null); assert.equal((await live(full.id,submissionId,{includePrivate:true})).demoChecks.find(row=>row.id===metaDemo.checkId)?.feedback?.body,"NEW_DEMO_FEEDBACK");
    });
    await check("ARCHIVE_WRITE expiry at final check rolls back snapshot, receipt and audit together", async () => {
      const n = await count(), receipts = await db.$queryRaw<Array<{ n: number }>>`SELECT count(*)::integer AS n FROM agri_record_archive_receipts`;
      await db.$executeRaw`UPDATE agri_access_grants SET "expiresAt"=clock_timestamp()+interval '0.3 seconds',revision=revision+1 WHERE "competitionId"=${edition.id} AND "userId"=${full.id} AND scope='ARCHIVE_WRITE'`;
      try { await assert.rejects(create(full.id, command()), /AGRI_SCOPE_REQUIRED/); }
      finally { await db.$executeRaw`UPDATE agri_access_grants SET "expiresAt"=NULL,revision=revision+1 WHERE "competitionId"=${edition.id} AND "userId"=${full.id} AND scope='ARCHIVE_WRITE'`; }
      assert.equal(await count(), n); assert.deepEqual(await db.$queryRaw`SELECT count(*)::integer AS n FROM agri_record_archive_receipts`, receipts);
    });
    await check("stored private selection cannot survive grant revocation through read, export or idempotent replay", async () => {
      const request = command({ selection: { includePrivate: true, includeInternal: true } }), pending = create(full.id, request); await waitForAudit(); let revoked = false;
      const revoke = db.$transaction(async tx => { await tx.$queryRaw`SELECT id FROM agri_workspaces WHERE "competitionId"=${edition.id} FOR UPDATE`; await tx.$executeRaw`UPDATE agri_access_grants SET "revokedAt"=clock_timestamp(),revision=revision+1 WHERE "competitionId"=${edition.id} AND "userId"=${full.id} AND scope='PRIVATE_MATERIALS_READ'`; }).then(() => { revoked=true; });
      await new Promise(resolve => setTimeout(resolve,50)); assert.equal(revoked,false); const saved = await pending; await revoke;
      try { await assert.rejects(get(full.id,saved.archiveId),/AGRI_SCOPE_REQUIRED/); await assert.rejects(get(full.id,saved.archiveId,{mode:"exportJSON"}),/AGRI_SCOPE_REQUIRED/); await assert.rejects(create(full.id,request),/AGRI_SCOPE_REQUIRED/); assert.equal((await get(full.id,metadataId)).snapshot.record.content,undefined); }
      finally { await db.$executeRaw`UPDATE agri_access_grants SET "revokedAt"=NULL,revision=revision+1 WHERE "competitionId"=${edition.id} AND "userId"=${full.id} AND scope='PRIVATE_MATERIALS_READ'`; }
    });
    await check("EXPORT expiry at final check rolls back export audit without altering saved bytes", async () => {
      const n = await db.auditLog.count({where:{action:"AGRI_EXPORT_RECORD_ARCHIVE"}});
      await db.$executeRaw`UPDATE agri_access_grants SET "expiresAt"=clock_timestamp()+interval '0.3 seconds',revision=revision+1 WHERE "competitionId"=${edition.id} AND "userId"=${full.id} AND scope='EXPORT'`;
      try { await assert.rejects(get(full.id,archiveId,{mode:"exportJSON"}),/AGRI_SCOPE_REQUIRED/); }
      finally { await db.$executeRaw`UPDATE agri_access_grants SET "expiresAt"=NULL,revision=revision+1 WHERE "competitionId"=${edition.id} AND "userId"=${full.id} AND scope='EXPORT'`; }
      assert.equal(await db.auditLog.count({where:{action:"AGRI_EXPORT_RECORD_ARCHIVE"}}),n); assert.equal((await get(full.id,archiveId)).archive.sha256,savedHash);
    });
    await db.$executeRawUnsafe(`DROP TRIGGER agri_archive_test_delay ON audit_logs`); await db.$executeRawUnsafe(`DROP FUNCTION agri_archive_test_delay()`);
    await check("history pagination binds actor, edition and exact submission; no repeated rows", async () => {
      for(let i=0;i<32;i++) await create(limited.id,command());
      const page = await list(limited.id,submissionId); assert.equal(page.items.length,30); assert.ok(page.nextCursor); const next=await list(limited.id,submissionId,{cursor:page.nextCursor}); assert.ok(next.items.length>0); assert.equal(new Set([...page.items,...next.items].map(row=>row.id)).size,page.items.length+next.items.length);
      await assert.rejects(list(full.id,submissionId,{cursor:page.nextCursor}),/INVALID_CURSOR/); await assert.rejects(list(limited.id,second.submissionId!,{cursor:page.nextCursor}),/INVALID_CURSOR/);
      await assert.rejects(list(limited.id,randomUUID()),/AGRI_SUBMISSION_NOT_FOUND/); await assert.rejects(get(full.id,randomUUID()),/AGRI_ARCHIVE_NOT_FOUND/);
    });
    await check("101 authorized source records fail the entire save atomically rather than claiming complete truncated archive", async () => {
      for(let i=0;i<101;i++) await makeIssue("METADATA","TEAM","BOUNDARY FIXTURE "+i,second.submissionId!);
      const n=await count(); await assert.rejects(create(full.id,command({submissionId:second.submissionId})),/AGRI_SUMMARY_TOO_LARGE/); assert.equal(await count(),n);
    });
    await check("archiving has no public, stage freeze, eligibility, review, XP, quota or billing side effects", async()=>{assert.deepEqual(await sideEffects(),before);});
    await writeFile(dir+"/persistence-fixture.json",JSON.stringify({actorId:full.id,limitedId:limited.id,competitionId:edition.id,archiveId,metadataId,submissionId,sha256:savedHash})); report.passed=true;
  } catch(error) { await mkdir(dir,{recursive:true}); await writeFile(dir+"/failure.txt",String(error instanceof Error?error.stack:error)); throw error; }
  finally { await mkdir(dir,{recursive:true}); await writeFile(dir+(process.argv.includes("--persistence")?"/persistence.json":"/integration.json"),JSON.stringify({...report,current},null,2)+"\n"); await db.$disconnect(); }
}
main().catch(()=>{console.error("AGRI_ARCHIVE_INTEGRATION_FAILED; inspect sanitized evidence");process.exitCode=1;});
