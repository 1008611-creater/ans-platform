import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import type { AgriRulesDraft } from "../src/contracts/agri-workspace";
import type { AgriDemoSnapshot } from "../src/contracts/agri-demo";
import type { AgriOnsiteFields } from "../src/contracts/agri-onsite";
for (const value of [process.env.DATABASE_URL, process.env.DIRECT_URL]) { const url = new URL(value ?? "http://invalid"); if (url.hostname !== "127.0.0.1" || url.port !== "55438" || url.pathname !== "/ans_product_verify_agri_onsite_r4") throw new Error("Refusing non-isolated onsite writes"); }
async function main() {
  const { db } = await import("../src/lib/db");
  const { executeAgriWorkspaceCommand: rules, readAgriWorkspaceRules: getRules } = await import("../src/server/competitions/agrihackathon/workspace");
  const { prepareAgriStage: prepare, executeAgriSubmissionCommand: submit } = await import("../src/server/competitions/agrihackathon/submissions");
  const { executeAgriDemoCommand: demo } = await import("../src/server/competitions/agrihackathon/demo");
  const { executeAgriOnsiteCommand: run, listAgriOnsiteItems: list, readAgriOnsiteItem: get } = await import("../src/server/competitions/agrihackathon/onsite");
  const dir = ".workbuddy/evidence/agri-onsite", checks: Array<{ label: string; passed: boolean }> = [];
  const report = { database: "ans_product_verify_agri_onsite_r4", isolatedPostgres: true, productionWrites: false, providerCalls: 0, realFunds: false, syntheticFinalFixture: true, passed: false, checks };
  let current = "prepare";
  const check = async (label: string, work: () => Promise<void>) => { current = label; await work(); checks.push({ label, passed: true }); };
  try {
    const [identity] = await db.$queryRaw<Array<{ database: string; migrations: number }>>`SELECT current_database() AS database,(SELECT count(*)::integer FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL) AS migrations`;
    assert.equal(identity.database, report.database); assert.equal(identity.migrations, 59);
    const [migration] = await db.$queryRaw<Array<{ checksum: string }>>`SELECT checksum FROM "_prisma_migrations" WHERE migration_name='20261008060000_agri_onsite_records' AND finished_at IS NOT NULL AND rolled_back_at IS NULL`;
    assert.equal(migration.checksum, createHash("sha256").update(await readFile("prisma/migrations/20261008060000_agri_onsite_records/migration.sql")).digest("hex"));
    if (process.argv.includes("--persistence")) {
      const fixture = JSON.parse(await readFile(dir + "/persistence-fixture.json", "utf8")) as { actorId: string; competitionId: string; itemId: string; onsiteId: string; sourceId: string };
      process.env.ANS_AGRIHACKATHON_COMPETITION_ID = fixture.competitionId;
      await check("fresh Node reads latest published safe revision and exact staff source with immutable history", async () => {
        const staff = await get(fixture.actorId, fixture.itemId, { scope: "staff" }); assert.equal(staff.item.source?.submissionId, fixture.sourceId); const exact = await list(fixture.actorId, { scope: "staff", submissionId: fixture.sourceId }); assert.equal(exact.source?.submissionId, fixture.sourceId); assert.equal(exact.source?.artifactVersion, staff.item.version.artifactVersion); const history = [...staff.history]; if (staff.nextCursor) history.push(...(await get(fixture.actorId, fixture.itemId, { scope: "staff", cursor: staff.nextCursor })).history); assert.ok(history.some(row => row.action === "withdrawOnsite"));
        const onsite = await get(fixture.onsiteId, fixture.itemId); assert.equal(onsite.item.source, undefined); assert.equal(onsite.history.length, 0); assert.equal(onsite.item.fields.operations.result, "Projector checked and backup ready");
      }); report.passed = true; return;
    }
    const prefix = "agri-onsite-" + randomUUID();
    const edition = await db.competition.create({ data: { title: prefix + " LOCAL FIXTURE", status: "ONGOING" }, select: { id: true } });
    process.env.ANS_AGRIHACKATHON_COMPETITION_ID = edition.id;
    const user = (suffix: string, role: "USER" | "ADMIN" = "USER") => db.user.create({ data: { email: prefix + suffix + "@example.invalid", username: prefix + suffix, role }, select: { id: true } });
    const [owner, limited, privateReader, internalReader, full, outsider, admin, onsite] = await Promise.all([user("owner"), user("limited"), user("private"), user("internal"), user("full"), user("outsider"), user("admin", "ADMIN"), user("onsite")]);
    await db.$executeRaw`INSERT INTO agri_workspaces (id,"competitionId") VALUES (${randomUUID()},${edition.id})`;
    const grant = async (actorId: string, scope: string) => db.$executeRaw`INSERT INTO agri_access_grants (id,"competitionId","userId",scope,"grantedById","grantedAt") VALUES (${randomUUID()},${edition.id},${actorId},${scope},${owner.id},clock_timestamp())`;
    await grant(owner.id, "RULES_CONFIRM"); for (const actor of [limited, privateReader, internalReader, full]) await grant(actor.id, "WORKS_READ");
    await grant(privateReader.id, "PRIVATE_MATERIALS_READ"); await grant(internalReader.id, "INTERNAL_NOTES_READ"); await grant(onsite.id, "ONSITE_READ");
    await grant(full.id, "ONSITE_READ"); await grant(onsite.id, "ONSITE_WRITE"); await grant(limited.id, "ONSITE_READ"); await grant(limited.id, "ONSITE_WRITE");
    for (const scope of ["PRIVATE_MATERIALS_READ", "INTERNAL_NOTES_READ", "TECHNICAL_WRITE", "DEMO_WRITE", "ISSUES_WRITE", "EXPORT", "ONSITE_WRITE"]) await grant(full.id, scope);
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
    const condition = { status: "PASS" as const, note: "PRIVATE_SOURCE_DEMO_NOTE" };
    const snapshot: AgriDemoSnapshot = { schemaVersion: 1, mode: "LIVE", description: "PRIVATE_SOURCE_DEMO_DESCRIPTION", device: condition, compatibility: condition, network: condition, audio: condition, backup: { ...condition, url: "https://example.invalid/private-source-backup", artifactVersionId: version.id }, conclusion: "PASS", recheckDue: { state: "UNKNOWN", at: null } };
    const demoResult = await demo(full.id, { action: "recordDemoCheck", idempotencyKey: randomUUID(), submissionId, expectedLatestCheckId: null, acknowledgeStaleSubmission: true, basis: "PRIVATE_MATERIALS", demo: snapshot, internalNote: "PRIVATE_SOURCE_INTERNAL_NOTE" });
    const fields: AgriOnsiteFields = { title: "Fixture projector setup", mode: "HYBRID", summary: "Connect shared projector", backupSummary: "Offline presentation ready", operations: { device: "Laptop and HDMI adapter", conditions: "Venue power ready", schedule: { state: "UNKNOWN", at: null }, status: "NOT_STARTED", result: null } };
    const create = (extra: Record<string, unknown> = {}) => ({ action: "createOnsite", idempotencyKey: randomUUID(), submissionId, demoCheckId: demoResult.checkId, acknowledgeStaleSubmission: true, fields, ...extra });
    const sideEffects = async () => ({ entry: await db.teamCompetition.findUniqueOrThrow({ where: { id: entry.id } }), stage: await db.agriEntryStage.findUniqueOrThrow({ where: { id: stage.entryStageId } }), users: await db.user.findMany({ where: { id: { in: [owner.id, full.id, onsite.id] } }, select: { id: true, xp: true, quotaPoints: true }, orderBy: { id: "asc" } }), publication: await db.artifactPublication.count({ where: { artifactVersionId: version.id } }), ledger: await db.quotaLedger.count({ where: { userId: { in: [owner.id, full.id, onsite.id] } } }) });
    const before = await sideEffects(); let itemId = "", originalKey: ReturnType<typeof create>;
    await check("create, source reading and onsite operation writes use independent scopes without ADMIN or own-team bypass", async () => {
      for (const who of [owner, outsider, admin, onsite]) await assert.rejects(run(who.id, create()), /AGRI_SCOPE_REQUIRED/);
      await assert.rejects(run(limited.id, create()), /AGRI_SCOPE_REQUIRED/);
      for (const who of [owner, outsider, admin]) await assert.rejects(list(who.id), /AGRI_SCOPE_REQUIRED/);
      assert.equal((await list(onsite.id)).items.length, 0);
      await assert.rejects(run(full.id, create({ demoCheckId: randomUUID() })), /AGRI_DEMO_CHECK_NOT_FOUND/);
    });
    await check("exact staff source metadata is available before cards exist, without optional Demo writes or private scopes", async () => {
      const page = await list(limited.id, { scope: "staff", submissionId });
      assert.equal(page.items.length, 0); assert.equal(page.canCreate, true);
      assert.deepEqual(page.source, { submissionId, stage: "PRELIMINARY", sequence: 1, artifactVersion: 1, artifactVersionId: version.id, isCurrentSubmission: false });
      const latest = await list(limited.id, { scope: "staff", submissionId: second.submissionId });
      assert.equal(latest.source?.isCurrentSubmission, true); assert.equal(latest.source?.artifactVersion, 2);
      for (const text of ["PRIVATE_SOURCE", "PRIVATE_SUBMISSION_BODY", "PRIVATE_ARTIFACT_BODY", "https://", demoResult.checkId]) assert.ok(!JSON.stringify(page).includes(text));
      assert.equal((await list(onsite.id)).source, undefined); assert.equal((await list(limited.id, { scope: "staff" })).source, undefined);
      await assert.rejects(list(limited.id, { scope: "staff", submissionId: randomUUID() }), /AGRI_SUBMISSION_NOT_FOUND/);
    });
    await check("same-key concurrent draft creation persists exactly one item/event/receipt/audit", async () => {
      originalKey = create(); const results = await Promise.all([run(full.id, originalKey), run(full.id, originalKey), run(full.id, originalKey)]); assert.equal(results.filter(row => !row.duplicate).length, 1); itemId = results[0].itemId; assert.ok(results.every(row => row.itemId === itemId));
      assert.equal((await run(full.id, originalKey)).duplicate, true); await assert.rejects(run(full.id, { ...originalKey, fields: { ...fields, title: "Different title" } }), /AGRI_IDEMPOTENCY_CONFLICT/);
      for (const table of ["agri_onsite_events", "agri_onsite_receipts"]) { const [count] = await db.$queryRawUnsafe<Array<{ n: number }>>(`SELECT count(*)::integer AS n FROM ${table} WHERE "itemId"=$1`, itemId); assert.equal(count.n, 1); }
      assert.equal(await db.auditLog.count({ where: { resourceId: itemId, action: "AGRI_CREATEONSITE" } }), 1);
    });
    await check("unpublished drafts and exact source IDs are unavailable to onsite-only readers and operators", async () => {
      assert.equal((await list(onsite.id)).items.length, 0); await assert.rejects(get(onsite.id, itemId), /AGRI_ONSITE_NOT_FOUND/);
      await assert.rejects(run(onsite.id, { action: "updateOnsiteOperations", idempotencyKey: randomUUID(), itemId, expectedRevision: 1, operations: fields.operations }), /AGRI_ONSITE_NOT_FOUND/);
      assert.equal((await list(limited.id, { scope: "staff" })).items.length, 0); await assert.rejects(get(limited.id, itemId, { scope: "staff" }), /AGRI_ONSITE_NOT_FOUND/);
      assert.equal((await get(full.id, itemId, { scope: "staff" })).item.source?.submissionId, submissionId);
    });
    await check("explicit reviewed publication discloses only the whitelist, never original private Demo/source text", async () => {
      const publish = { action: "publishOnsite", idempotencyKey: randomUUID(), itemId, expectedRevision: 1, reviewedForOnsite: true };
      assert.equal((await run(full.id, publish)).appliedRevision, 2); assert.equal((await run(full.id, publish)).duplicate, true);
      const onsiteView = await get(onsite.id, itemId); assert.equal(onsiteView.item.source, undefined); assert.equal(onsiteView.history.length, 0); assert.equal(onsiteView.item.fields.title, fields.title);
      for (const secret of [submissionId, demoResult.checkId, version.id, rule.resourceId, "PRIVATE_SOURCE", "https://example.invalid", "PRIVATE_SUBMISSION_BODY"]) assert.ok(!JSON.stringify(onsiteView).includes(secret));
      assert.equal((await list(onsite.id)).items.length, 1); assert.equal(onsiteView.item.canPublish, false); assert.equal(onsiteView.item.canEditDraft, false); assert.equal(onsiteView.item.canUpdateOperations, true);
      await assert.rejects(run(onsite.id, { action: "withdrawOnsite", idempotencyKey: randomUUID(), itemId, expectedRevision: 2 }), /AGRI_SCOPE_REQUIRED/);
      await assert.rejects(run(full.id, { action: "editOnsiteDraft", idempotencyKey: randomUUID(), itemId, expectedRevision: 2, fields }), /AGRI_ONSITE_DRAFT_REQUIRED/);
    });
    await check("different-key same-revision onsite updates have one CAS winner and no overwritten prior revision", async () => {
      const operations = { ...fields.operations, status: "IN_PROGRESS" as const, schedule: { state: "TENTATIVE" as const, at: "2026-10-09T09:00:00+08:00" } };
      const command = { action: "updateOnsiteOperations", idempotencyKey: randomUUID(), itemId, expectedRevision: 2, operations };
      const results = await Promise.allSettled([run(onsite.id, command), run(full.id, { ...command, idempotencyKey: randomUUID() })]); assert.equal(results.filter(row => row.status === "fulfilled").length, 1); assert.ok(results.some(row => row.status === "rejected" && String(row.reason).includes("AGRI_ONSITE_REVISION_CONFLICT")));
      const view = await get(full.id, itemId, { scope: "staff" }); assert.equal(view.item.revision, 3); assert.ok(view.history.some(row => row.revision === 2 && row.fields.operations.status === "NOT_STARTED"));
    });
    await check("withdrawal immediately removes safe records from onsite list/detail/replay, then edit and republish retain history", async () => {
      await run(full.id, { action: "withdrawOnsite", idempotencyKey: randomUUID(), itemId, expectedRevision: 3 }); assert.equal((await list(onsite.id)).items.length, 0); await assert.rejects(get(onsite.id, itemId), /AGRI_ONSITE_NOT_FOUND/);
      await run(full.id, { action: "editOnsiteDraft", idempotencyKey: randomUUID(), itemId, expectedRevision: 4, fields: { ...fields, summary: "Reviewed new safe projector setup" } });
      await run(full.id, { action: "publishOnsite", idempotencyKey: randomUUID(), itemId, expectedRevision: 5, reviewedForOnsite: true });
      const view = await get(full.id, itemId, { scope: "staff" }); assert.equal(view.item.revision, 6); assert.equal(view.history.length, 6); assert.ok(view.history.some(row => row.fields.summary === fields.summary && row.published));
    });
    await check("onsite completion records actual result without writing qualification, official dates or source check", async () => {
      const operation = { ...fields.operations, status: "DONE", result: "Projector checked and backup ready" };
      const command = { action: "updateOnsiteOperations", idempotencyKey: randomUUID(), itemId, expectedRevision: 6, operations: operation };
      assert.equal((await run(onsite.id, command)).appliedRevision, 7); assert.equal((await run(onsite.id, command)).duplicate, true);
      assert.equal((await get(onsite.id, itemId)).item.fields.operations.result, operation.result); assert.deepEqual(await sideEffects(), before);
    });
    await check("source/private/internal revocation blocks staff draft reads, publication and create replay; explicit safe onsite view remains independent", async () => {
      await db.$executeRaw`UPDATE agri_access_grants SET "revokedAt"=clock_timestamp(),revision=revision+1 WHERE "competitionId"=${edition.id} AND "userId"=${full.id} AND scope='PRIVATE_MATERIALS_READ'`;
      try { await assert.rejects(get(full.id, itemId, { scope: "staff" }), /AGRI_ONSITE_NOT_FOUND/); await assert.rejects(run(full.id, originalKey!), /AGRI_SCOPE_REQUIRED/); assert.equal((await get(onsite.id, itemId)).item.published, true); } finally { await db.$executeRaw`UPDATE agri_access_grants SET "revokedAt"=NULL,revision=revision+1 WHERE "competitionId"=${edition.id} AND "userId"=${full.id} AND scope='PRIVATE_MATERIALS_READ'`; }
      await db.$executeRaw`UPDATE agri_access_grants SET "revokedAt"=clock_timestamp(),revision=revision+1 WHERE "competitionId"=${edition.id} AND "userId"=${onsite.id} AND scope='ONSITE_WRITE'`;
      try { await assert.rejects(run(onsite.id, { action: "updateOnsiteOperations", idempotencyKey: randomUUID(), itemId, expectedRevision: 7, operations: fields.operations }), /AGRI_SCOPE_REQUIRED/); assert.equal((await get(onsite.id, itemId)).item.canUpdateOperations, false); } finally { await db.$executeRaw`UPDATE agri_access_grants SET "revokedAt"=NULL,revision=revision+1 WHERE "competitionId"=${edition.id} AND "userId"=${onsite.id} AND scope='ONSITE_WRITE'`; }
    });
    await check("safe text, exact source identity, immutable history and same-transaction event/receipt constraints reject direct corruption", async () => {
      const payload = JSON.stringify({ schemaVersion: 1, ...fields });
      await assert.rejects(db.$executeRaw`INSERT INTO agri_onsite_items (id,"competitionId","entryStageId","submissionId","demoCheckId",fields,published,revision,"createdById","createdAt","updatedAt") VALUES (${randomUUID()},${edition.id},${stage.entryStageId},${submissionId},NULL,${payload}::jsonb,false,1,${full.id},clock_timestamp(),clock_timestamp())`, /AGRI_ONSITE_ATOMIC_RECORD_REQUIRED/);
      await assert.rejects(db.$executeRaw`UPDATE agri_onsite_items SET "submissionId"=${second.submissionId},revision=revision+1 WHERE id=${itemId}`, /AGRI_ONSITE_IDENTITY_OR_REVISION/);
      for (const bad of [{ schemaVersion: 1, ...fields, internalNote: "hidden" }, { schemaVersion: 1, ...fields, summary: "https://example.invalid/private" }, { schemaVersion: 1, ...fields, operations: { ...fields.operations, status: "DONE" } }, { schemaVersion: 1, ...fields, operations: { ...fields.operations, schedule: { state: "UNKNOWN", at: "2026-10-08T00:00:00Z" } } }]) { const [valid] = await db.$queryRaw<Array<{ valid: boolean }>>`SELECT agri_onsite_fields_valid(${JSON.stringify(bad)}::jsonb) AS valid`; assert.equal(valid.valid, false); }
      for (const table of ["agri_onsite_items", "agri_onsite_events", "agri_onsite_receipts"]) await assert.rejects(db.$executeRawUnsafe(`DELETE FROM ${table} WHERE ${table === "agri_onsite_items" ? 'id' : '"itemId"'}=$1`, itemId));
    });
    await check("authorization expiry during command rolls back item revision, event, receipt and audit", async () => {
      const counts = async () => ({ item: await db.$queryRaw`SELECT revision,fields FROM agri_onsite_items WHERE id=${itemId}`, events: await db.$queryRaw`SELECT count(*) FROM agri_onsite_events WHERE "itemId"=${itemId}`, receipts: await db.$queryRaw`SELECT count(*) FROM agri_onsite_receipts WHERE "itemId"=${itemId}`, audit: await db.auditLog.count({ where: { resourceId: itemId } }) }); const previous = await counts();
      await db.$executeRawUnsafe(`CREATE FUNCTION agri_onsite_test_delay() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_sleep(0.5); RETURN NEW; END; $$`); await db.$executeRawUnsafe(`CREATE TRIGGER agri_onsite_test_delay BEFORE INSERT ON agri_onsite_receipts FOR EACH ROW EXECUTE FUNCTION agri_onsite_test_delay()`);
      await db.$executeRaw`UPDATE agri_access_grants SET "expiresAt"=clock_timestamp()+interval '0.3 seconds',revision=revision+1 WHERE "competitionId"=${edition.id} AND "userId"=${onsite.id} AND scope='ONSITE_WRITE'`;
      try { await assert.rejects(run(onsite.id, { action: "updateOnsiteOperations", idempotencyKey: randomUUID(), itemId, expectedRevision: 7, operations: fields.operations }), /AGRI_SCOPE_REQUIRED/); } finally { await db.$executeRawUnsafe(`DROP TRIGGER agri_onsite_test_delay ON agri_onsite_receipts`); await db.$executeRawUnsafe(`DROP FUNCTION agri_onsite_test_delay()`); await db.$executeRaw`UPDATE agri_access_grants SET "expiresAt"=NULL,revision=revision+1 WHERE "competitionId"=${edition.id} AND "userId"=${onsite.id} AND scope='ONSITE_WRITE'`; }
      assert.deepEqual(await counts(), previous);
    });
    await check("historical source creation needs deliberate stale acknowledgement and never rolls onto current submission", async () => {
      await assert.rejects(run(full.id, create({ acknowledgeStaleSubmission: false })), /AGRI_ONSITE_STALE_SUBMISSION_ACK_REQUIRED/);
      const row = (await get(full.id, itemId, { scope: "staff" })).item; assert.equal(row.source?.submissionId, submissionId); assert.equal(row.source?.artifactVersionId, version.id); assert.equal(row.source?.ruleVersionId, rule.resourceId);
    });
    await check("list cursor binds actor, scope, exact source filter and returns only visible rows before pagination", async () => {
      for (let i = 0; i < 31; i++) { const draftItem = await run(limited.id, create({ submissionId: second.submissionId, demoCheckId: null, acknowledgeStaleSubmission: false, fields: { ...fields, title: "Page fixture " + i } })); await run(limited.id, { action: "publishOnsite", idempotencyKey: randomUUID(), itemId: draftItem.itemId, expectedRevision: 1, reviewedForOnsite: true }); }
      const page = await list(onsite.id); assert.equal(page.items.length, 30); assert.ok(page.nextCursor); const next = await list(onsite.id, { cursor: page.nextCursor }); assert.equal(next.items.length, 2); assert.equal(new Set([...page.items, ...next.items].map(row => row.id)).size, 32);
      await assert.rejects(list(full.id, { cursor: page.nextCursor }), /INVALID_CURSOR/); await assert.rejects(list(onsite.id, { scope: "staff", cursor: page.nextCursor }), /AGRI_SCOPE_REQUIRED/);
      const staffPage = await list(full.id, { scope: "staff", submissionId }); assert.equal(staffPage.items.length, 1);
      assert.deepEqual(await sideEffects(), before);
    });
    await check("audit stores IDs/revisions only and never safe projection text or private source text", async () => { const logs = await db.auditLog.findMany({ where: { resourceId: itemId }, select: { metadata: true } }); for (const text of [fields.title, fields.summary, "PRIVATE_SOURCE", "example.invalid", "Projector checked"]) assert.ok(!JSON.stringify(logs).includes(text)); });
    await check("internal source permission and onsite read revocation are independent and replays do not bypass them", async () => {
      await db.$executeRaw`UPDATE agri_access_grants SET "revokedAt"=clock_timestamp(),revision=revision+1 WHERE "competitionId"=${edition.id} AND "userId"=${full.id} AND scope='INTERNAL_NOTES_READ'`;
      try { await assert.rejects(get(full.id, itemId, { scope: "staff" }), /AGRI_ONSITE_NOT_FOUND/); await assert.rejects(run(full.id, originalKey!), /AGRI_SCOPE_REQUIRED/); } finally { await db.$executeRaw`UPDATE agri_access_grants SET "revokedAt"=NULL,revision=revision+1 WHERE "competitionId"=${edition.id} AND "userId"=${full.id} AND scope='INTERNAL_NOTES_READ'`; }
      await db.$executeRaw`UPDATE agri_access_grants SET "revokedAt"=clock_timestamp(),revision=revision+1 WHERE "competitionId"=${edition.id} AND "userId"=${onsite.id} AND scope='ONSITE_READ'`;
      try { await assert.rejects(get(onsite.id, itemId), /AGRI_SCOPE_REQUIRED/); await assert.rejects(run(onsite.id, { action: "updateOnsiteOperations", idempotencyKey: randomUUID(), itemId, expectedRevision: 7, operations: fields.operations }), /AGRI_SCOPE_REQUIRED/); } finally { await db.$executeRaw`UPDATE agri_access_grants SET "revokedAt"=NULL,revision=revision+1 WHERE "competitionId"=${edition.id} AND "userId"=${onsite.id} AND scope='ONSITE_READ'`; }
    });
    await check("historical event pagination is staff-only, cursor-bound and preserves all immutable revisions", async () => {
      for (let i = 0; i < 31; i++) { const detail = await get(onsite.id, itemId); await run(onsite.id, { action: "updateOnsiteOperations", idempotencyKey: randomUUID(), itemId, expectedRevision: detail.item.revision, operations: detail.item.fields.operations }); }
      const first = await get(full.id, itemId, { scope: "staff" }); assert.equal(first.history.length, 30); assert.ok(first.nextCursor);
      const secondPage = await get(full.id, itemId, { scope: "staff", cursor: first.nextCursor }); assert.equal(secondPage.history.length, 8); assert.equal(new Set([...first.history, ...secondPage.history].map(event => event.revision)).size, 38);
      await assert.rejects(get(onsite.id, itemId, { cursor: first.nextCursor }), /INVALID_CURSOR/); assert.equal((await get(onsite.id, itemId)).history.length, 0);
    });
    await writeFile(dir + "/persistence-fixture.json", JSON.stringify({ actorId: full.id, competitionId: edition.id, itemId, onsiteId: onsite.id, sourceId: submissionId })); report.passed = true;
  } catch (error) { await mkdir(dir, { recursive: true }); await writeFile(dir + "/failure.txt", String(error instanceof Error ? error.stack : error)); throw error; }
  finally { await mkdir(dir, { recursive: true }); await writeFile(dir + (process.argv.includes("--persistence") ? "/persistence.json" : "/integration.json"), JSON.stringify({ ...report, current }, null, 2) + "\n"); await db.$disconnect(); }
}
main().catch(() => { console.error("AGRI_ONSITE_INTEGRATION_FAILED; inspect sanitized evidence"); process.exitCode = 1; });
