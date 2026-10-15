/** Explicit isolated fixtures. No real entrants, dates, media, external hosts or providers are contacted. */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID, createHash } from "node:crypto";
import { mkdir, readFile, writeFile, readdir, statfs } from "node:fs/promises";
import { resolve } from "node:path";
import { Readable } from "node:stream";
import { EventEmitter } from "node:events";
import https from "node:https";
import dns from "node:dns/promises";
import fsPromises from "node:fs/promises";
import { syncBuiltinESMExports } from "node:module";
/** Built-in transport fixture only. No production switch, provider request, or real DNS/socket. */
async function githubFixture(run: (fixture: { urls: string[]; sha: string; fail: boolean }) => Promise<void>) {
    const request = https.request, lookup = dns.lookup;
    const fixture = { urls: [] as string[], sha: "a".repeat(40), fail: false };
    dns.lookup = (async () => [{ address: "8.8.8.8", family: 4 }]) as unknown as typeof dns.lookup;
    https.request = ((url: URL, options: { lookup: (host: string, options: object, callback: (error: Error | null, address: string, family: number) => void) => void }, receive: (response: unknown) => void) => {
        assert.ok(["api.github.com", "codeload.github.com"].includes(url.hostname));
        fixture.urls.push(url.href);
        const req = new EventEmitter() as EventEmitter & { end: () => void; destroy: (e: Error) => void };
        req.destroy = e => { req.emit("error", e); };
        req.end = () => queueMicrotask(() => options.lookup(url.hostname, {}, (error, address) => {
            assert.equal(error, null); assert.equal(address, "8.8.8.8");
            const body = url.hostname === "codeload.github.com" ? Buffer.from([0x1f,0x8b,0x08,0,0,0,0,0,0,0]) : Buffer.from(JSON.stringify(url.pathname.includes("/git/ref/tags/") ? { object: { type: "commit", sha: fixture.sha } } : { sha: url.pathname.split("/").pop() }));
            const response = Readable.from([body]);
            Object.assign(response, { statusCode: fixture.fail ? 503 : 200, headers: { "content-length": String(body.length) }, socket: { remoteAddress: "8.8.8.8" }, setTimeout: () => {} });
            receive(response);
        }));
        return req;
    }) as unknown as typeof https.request;
    syncBuiltinESMExports();
    try { await run(fixture); } finally { https.request = request; dns.lookup = lookup; syncBuiltinESMExports(); }
}

import type { AgriRulesDraft } from "../src/contracts/agri-workspace";
for (const raw of [process.env.DATABASE_URL, process.env.DIRECT_URL]) {
    const u = new URL(raw ?? "http://invalid");
    if (u.hostname !== "127.0.0.1" || u.port !== process.env.ANS_AGRI_EVIDENCE_TEST_PORT || !["/ans_agri_evidence_isolated", "/ans_agri_evidence_isolated_restored"].includes(u.pathname))
        throw new Error("Refusing non-isolated database");
}
const dir = process.env.AGRI_EVIDENCE_REPORT_DIR!;
async function main() {
    const { db } = await import("../src/lib/db");
    const { executeAgriWorkspaceCommand: rules, readAgriWorkspaceRules: getRules, lockAgriWorkspace } = await import("../src/server/competitions/agrihackathon/workspace");
    const { prepareAgriStage: prepare, executeAgriSubmissionCommand: submit, exportAgriWorks: csv, listAgriStages, readAgriStage } = await import("../src/server/competitions/agrihackathon/submissions");
    const { createEvidence, listEvidence, executeEvidenceCommand: command, authorizedEvidenceDownload: download, evidenceTransition, evidenceRequest, bindEvidenceIntents, evidenceBudget } = await import("../src/server/competitions/agrihackathon/evidence");
    const { uploadEvidence, runEvidenceWorkerOnce } = await import("../src/server/competitions/agrihackathon/evidence-worker");
    const { readEvidence, storeEvidence, inspectEvidence, evidenceObjectKey } = await import("../src/server/competitions/agrihackathon/evidence-storage");
    const { createAgriRecordArchive: createArchive, readAgriRecordArchive: archive } = await import("../src/server/competitions/agrihackathon/record-archive");
    const { canonicalAgriArchiveJSON } = await import("../src/contracts/agri-record-archive");
    const { reconcileEvidenceReservations } = await import("../src/server/competitions/agrihackathon/evidence-maintenance");
    const { publicEvidenceIP, allowedEvidenceURL } = await import("../src/server/competitions/agrihackathon/evidence-network");
    const checks: string[] = [];
    let passed = false;
    const check = async (name: string, run: () => Promise<void>) => { await run(); checks.push(name); console.log("PASS " + name); };
    const storage = resolve(dir, process.env.AGRI_EVIDENCE_RESTORED === "true" ? "restored-objects" : "objects");
    await mkdir(storage, { recursive: true });
    Object.assign(process.env, { ANS_AGRI_EVIDENCE_ENABLED: "true", ANS_AGRI_EVIDENCE_STORAGE_MODE: "local_private", ANS_AGRI_EVIDENCE_LOCAL_DURABLE: "true", ANS_AGRI_EVIDENCE_LOCAL_DIR: storage, ANS_AGRI_EVIDENCE_LOCAL_MIN_FREE_BYTES: "1", ANS_AGRI_EVIDENCE_LOCAL_MAX_USED_PERCENT: "99", ANS_AGRI_EVIDENCE_SUPPORTING_FILE_LIMIT_BYTES: "4096" });
    const bytes = Buffer.from("LOCAL SYNTHETIC EVIDENCE\n??????????\n"), hash = createHash("sha256").update(bytes).digest("hex");
    try {
        if (process.argv.includes("--killed-upload")) {
            const fixture = JSON.parse(await readFile(resolve(dir, "kill-fixture.json"), "utf8"));
            process.env.ANS_AGRIHACKATHON_COMPETITION_ID = fixture.competitionId;
            const keepAlive = setInterval(() => { }, 1000);
            let yielded = false;
            try {
                await uploadEvidence(fixture.ownerId, fixture.requestId, new Request("http://127.0.0.1:9/isolated-upload", { method: "PUT", duplex: "half", body: new ReadableStream<Uint8Array>({ async pull(controller) { if (fixture.partial && !yielded) {
                            yielded = true;
                            controller.enqueue(Buffer.alloc(65536, 0x61));
                            return;
                        } await new Promise(() => { }); } }) } as RequestInit));
            }
            finally {
                clearInterval(keepAlive);
            }
            return;
        }
        if (process.argv.includes("--persistence")) {
            const f = JSON.parse(await readFile(resolve(dir, "fixture.json"), "utf8"));
            process.env.ANS_AGRIHACKATHON_COMPETITION_ID = f.competitionId;
            await check("fresh Node reopens persisted byte-identical objects and exact v3 manifest", async () => {
                const m = await download(f.ownerId, f.objectId), stream = await readEvidence(m, AbortSignal.timeout(5000));
                const chunks = [];
                for await (const b of stream)
                    chunks.push(b);
                assert.deepEqual(Buffer.concat(chunks), bytes);
                assert.equal(m.descriptor.sha256, hash);
                const value = await archive(f.staffId, f.archiveId);
                assert.equal(value.snapshot.schemaVersion, 3);
                assert.equal(value.archive.sha256, f.archiveHash);
                const objects = await db.agriEvidenceObject.findMany();
                assert.ok(objects.length > 0);
                for (const object of objects) {
                    const authorized = await download(f.staffId, object.id), checked = await inspectEvidence(authorized, object.byteLength, authorized.descriptor.kind, AbortSignal.timeout(10000));
                    assert.equal(checked.sha256, object.sha256);
                    assert.equal(checked.byteLength, object.byteLength);
                }
                for (const manifest of await db.agriEvidenceManifest.findMany()) {
                    assert.equal(createHash("sha256").update(manifest.canonicalJSON).digest("hex"), manifest.sha256);
                }
                for (const old of await db.agriRecordArchive.findMany({ where: { snapshotSchemaVersion: { in: [1, 2] } } })) {
                    assert.equal(createHash("sha256").update(old.snapshotCanonical).digest("hex"), old.snapshotHash);
                }
            });
            passed = true;
            return;
        }
        const [identity] = await db.$queryRaw<Array<{
            name: string;
            migrations: number;
        }>> `SELECT current_database() AS name,(SELECT count(*)::integer FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL) AS migrations`;
        assert.equal(identity.name, "ans_agri_evidence_isolated");
        assert.equal(identity.migrations, (await readdir("prisma/migrations", { withFileTypes: true })).filter(d => d.isDirectory()).length);
        const prefix = "evidence-fixture-" + randomUUID();
        const edition = await db.competition.create({ data: { title: prefix + " LOCAL ONLY", status: "ONGOING" }, select: { id: true } });
        process.env.ANS_AGRIHACKATHON_COMPETITION_ID = edition.id;
        const user = (suffix: string, role: "USER" | "ADMIN" = "USER") => db.user.create({ data: { email: prefix + suffix + "@example.invalid", username: prefix + suffix, role }, select: { id: true } });
        const [owner, staff, limited, outsider, other] = await Promise.all([user("owner"), user("staff"), user("limited"), user("outsider", "ADMIN"), user("other")]);
        await db.$executeRaw `INSERT INTO agri_workspaces(id,"competitionId") VALUES(${randomUUID()},${edition.id})`;
        const grant = (userId: string, scope: string) => db.$executeRaw `INSERT INTO agri_access_grants(id,"competitionId","userId",scope,"grantedById","grantedAt") VALUES(${randomUUID()},${edition.id},${userId},${scope},${owner.id},clock_timestamp())`;
        await grant(owner.id, "RULES_CONFIRM");
        for (const scope of ["WORKS_READ", "ARCHIVE_WRITE", "PRIVATE_MATERIALS_READ", "INTERNAL_NOTES_READ", "ONSITE_READ", "EXPORT"])
            await grant(staff.id, scope);
        for (const scope of ["WORKS_READ", "EXPORT"])
            await grant(limited.id, scope);
        const [clock] = await db.$queryRaw<Array<{
            now: Date;
        }>> `SELECT clock_timestamp() AS now`;
        const draft: AgriRulesDraft = { schemaVersion: 1, guidanceMarkdown: "LOCAL ONLY synthetic window for evidence invariants", requirements: { schemaVersion: 1, repositoryRequired: false, repositoryRefRequired: false, demoRequired: false, materials: [] }, windows: [{ stage: "REGISTRATION", state: "PENDING", opensAt: null, closesAt: null }, { stage: "PRELIMINARY", state: "READY", opensAt: new Date(clock.now.getTime() - 60000).toISOString(), closesAt: new Date(clock.now.getTime() + 3600000).toISOString(), includesDeadline: false }, { stage: "FINAL", state: "PENDING", opensAt: null, closesAt: null }] };
        let rev = (await getRules(owner.id)).revision;
        await rules(owner.id, { action: "saveRulesDraft", idempotencyKey: randomUUID(), expectedRevision: rev++, draft });
        const rule = await rules(owner.id, { action: "confirmRules", idempotencyKey: randomUUID(), expectedRevision: rev++ });
        await rules(owner.id, { action: "publishRules", idempotencyKey: randomUUID(), expectedRevision: rev++, ruleVersionId: rule.resourceId });
        await rules(owner.id, { action: "setEnabled", idempotencyKey: randomUUID(), expectedRevision: rev, enabled: true });
        async function teamFixture(actor: string, label: string) { const team = await db.team.create({ data: { name: prefix + label, slug: prefix + label, ownerId: actor }, select: { id: true } }); await db.teamMember.create({ data: { teamId: team.id, userId: actor, role: "OWNER" } }); const entry = await db.teamCompetition.create({ data: { teamId: team.id, competitionId: edition.id }, select: { id: true } }); const project = await db.project.create({ data: { title: "LOCAL ONLY", ownerId: actor, teamId: team.id, goal: "CONTEST" }, select: { id: true } }); const artifact = await db.artifact.create({ data: { projectId: project.id, createdById: actor, kind: "CONTEST_MVP", workflowId: "local-evidence-fixture", title: "LOCAL ONLY" }, select: { id: true } }); const version = await db.artifactVersion.create({ data: { artifactId: artifact.id, createdById: actor, version: 1, contentJson: { fixture: true }, contentMarkdown: "LOCAL ONLY", factSnapshotHash: "fixture" }, select: { id: true } }); const stage = await prepare(actor, { action: "prepareStage", teamCompetitionId: entry.id, stage: "PRELIMINARY" }); return { team, entry, project, version, stage }; }
        const a = await teamFixture(owner.id, "a"), b = await teamFixture(other.id, "b");
        const intent = { action: "create", idempotencyKey: randomUUID(), entryStageId: a.stage.entryStageId, submissionId: null, projectId: a.project.id, artifactVersionId: a.version.id, mode: "UPLOAD", kind: "SUPPORTING_FILE", fileName: "LOCAL ??.txt", sourceUrl: null, originalRef: null };
        let requestId = "", objectId = "", submissionId = "", archiveId = "", archiveHash = "";
        const upload = (actor: string, id: string, body: Buffer = bytes) => uploadEvidence(actor, id, new Request("http://127.0.0.1:9/isolated-upload", { method: "PUT", body: new Uint8Array(body), headers: { "content-type": "application/octet-stream" } }));
        await check("same-key concurrent intent creation has one durable request, event and receipt", async () => { const results = await Promise.all([createEvidence(owner.id, intent), createEvidence(owner.id, intent)]); assert.equal(results[0].requestId, results[1].requestId); assert.equal(results.filter(r => !r.duplicate).length, 1); requestId = results[0].requestId; await assert.rejects(createEvidence(owner.id, { ...intent, fileName: "different.txt" }), /AGRI_IDEMPOTENCY_CONFLICT/); });
        await check("pre-upload stores actual original bytes but cannot be read as formal evidence", async () => { const result = await upload(owner.id, requestId); assert.equal(result.state, "UPLOADED"); const row = await db.agriEvidenceRequest.findUniqueOrThrow({ where: { id: requestId } }); objectId = row.objectId; assert.equal(await db.agriEvidenceObject.count({ where: { requestId } }), 0); assert.equal((await inspectEvidence({ key: row.storageKey, backend: "local_private", namespaceVersion: 1 }, 4096, "SUPPORTING_FILE", AbortSignal.timeout(5000))).sha256, hash); await assert.rejects(download(owner.id, objectId), /AGRI_EVIDENCE_NOT_FOUND/); });
        await check("feature-off rejects bind/finalize atomically but leaves uploaded bytes and ordinary submit/read available", async () => {
            process.env.ANS_AGRI_EVIDENCE_ENABLED = "false";
            const content = { projectId: a.project.id, artifactVersionId: a.version.id, repository: null, demoUrl: null, summary: "LOCAL ONLY", materials: { schemaVersion: 1, items: [] } };
            const before = await db.agriStageSubmission.count();
            await assert.rejects(submit(owner.id, { action: "submit", idempotencyKey: randomUUID(), entryStageId: a.stage.entryStageId, expectedRevision: 1, expectedRuleVersionId: rule.resourceId, officialMemberIds: [owner.id], evidenceIntentIds: [requestId], content }), /AGRI_EVIDENCE_DISABLED/);
            assert.equal(await db.agriStageSubmission.count(), before);
            assert.equal((await db.agriEvidenceRequest.findUniqueOrThrow({ where: { id: requestId } })).state, "UPLOADED");
            assert.equal(await db.agriEvidenceObject.count(), 0);
            const ordinaryUser = await user("feature-off"), ordinary = await teamFixture(ordinaryUser.id, "feature-off");
            const accepted = await submit(ordinaryUser.id, { action: "submit", idempotencyKey: randomUUID(), entryStageId: ordinary.stage.entryStageId, expectedRevision: 1, expectedRuleVersionId: rule.resourceId, officialMemberIds: [ordinaryUser.id], content: { ...content, projectId: ordinary.project.id, artifactVersionId: ordinary.version.id } });
            assert.ok(accepted.submissionId);
            process.env.ANS_AGRI_EVIDENCE_ENABLED = "true";
        });
        await check("formal submission binds same-team exact-version uploaded bytes atomically", async () => { const content = { projectId: a.project.id, artifactVersionId: a.version.id, repository: { url: "https://github.com/ans-local-fixture/no-external-calls", ref: { kind: "COMMIT_SHA", value: "a".repeat(40) } }, demoUrl: null, summary: "LOCAL ONLY fixture", materials: { schemaVersion: 1, items: [] } }; const result = await submit(owner.id, { action: "submit", idempotencyKey: randomUUID(), entryStageId: a.stage.entryStageId, expectedRevision: 1, expectedRuleVersionId: rule.resourceId, officialMemberIds: [owner.id], evidenceIntentIds: [requestId], content }); assert.ok(result.submissionId); submissionId = result.submissionId; const row = await db.agriEvidenceObject.findUniqueOrThrow({ where: { id: objectId } }); assert.equal(row.submissionId, submissionId); assert.equal(row.sha256, hash); });
        const before = await db.user.findMany({ where: { id: { in: [owner.id, staff.id] } }, select: { id: true, xp: true, quotaPoints: true }, orderBy: { id: "asc" } });
        const beforeOtherEntry = await db.teamCompetition.findUniqueOrThrow({ where: { id: b.entry.id } });
        const beforeEntry = await db.teamCompetition.findUniqueOrThrow({ where: { id: a.entry.id } });
        const ledgers = await db.quotaLedger.count(), publications = await db.artifactPublication.count();
        const paymentCounts = [await db.marketOrder.count(), await db.marketPayment.count(), await db.ldxpRechargeOrder.count()];
        await check("own-team download hashes exactly; cross-team, ADMIN and export-only cannot list/read/replay private bytes", async () => { const meta = await download(owner.id, objectId), stream = await readEvidence(meta, AbortSignal.timeout(5000)); const parts = []; for await (const chunk of stream)
            parts.push(chunk); assert.deepEqual(Buffer.concat(parts), bytes); for (const actor of [other.id, outsider.id, limited.id]) {
            await assert.rejects(download(actor, objectId), /AGRI_SCOPE_REQUIRED/);
            await assert.rejects(listEvidence(actor, { submissionId }), /AGRI_SCOPE_REQUIRED/);
        } await assert.rejects(createEvidence(other.id, intent), /AGRI_SCOPE_REQUIRED/); });
        await check("immutable manifest has exact FK-backed descriptors and v3 fixed archive; v2 bytes remain unchanged", async () => {
            const v2 = await createArchive(staff.id, { action: "createArchive", submissionId, selection: { includePrivate: false, includeInternal: false }, idempotencyKey: randomUUID() });
            const before = await db.agriRecordArchive.findUniqueOrThrow({ where: { id: v2.archiveId } });
            const legacy = JSON.parse(before.snapshotCanonical);
            legacy.schemaVersion = 1;
            legacy.includesOnsite = false;
            delete legacy.onsite;
            legacy.archiveId = randomUUID();
            legacy.sequence = before.sequence + 1;
            legacy.previousArchiveId = before.id;
            const legacyCanonical = canonicalAgriArchiveJSON(legacy), legacyHash = createHash("sha256").update(legacyCanonical).digest("hex");
            await db.$transaction(async (tx) => {
                await tx.$executeRaw `INSERT INTO agri_record_archives(id,"competitionId","entryStageId","submissionId","artifactVersionId","ruleVersionId",sequence,"previousArchiveId","createdById","collectedAt","includePrivate","includeInternal","snapshotSchemaVersion","snapshotCanonical","snapshotHash","byteLength") VALUES(${legacy.archiveId},${edition.id},${a.stage.entryStageId},${submissionId},${a.version.id},${rule.resourceId},${legacy.sequence},${before.id},${staff.id},${before.collectedAt},false,false,1,${legacyCanonical},${legacyHash},${Buffer.byteLength(legacyCanonical)})`;
                await tx.$executeRaw `INSERT INTO agri_record_archive_receipts(id,"competitionId","archiveId","actorId","idempotencyKey","requestHash","createdAt") VALUES(${randomUUID()},${edition.id},${legacy.archiveId},${staff.id},${randomUUID()},${"d".repeat(64)},${before.collectedAt})`;
                await tx.auditLog.create({ data: { actorId: staff.id, action: "AGRI_CREATE_RECORD_ARCHIVE", resourceType: "agri_record_archive", resourceId: legacy.archiveId, metadata: { isolatedFixture: true } } });
            });
            const m = await command(staff.id, { action: "manifest", submissionId, objectIds: [objectId], idempotencyKey: randomUUID() });
            const v3 = await createArchive(staff.id, { action: "createArchive", submissionId, selection: { includePrivate: true, includeInternal: false }, evidenceManifestId: m.manifestId, idempotencyKey: randomUUID() });
            archiveId = v3.archiveId;
            archiveHash = v3.sha256;
            const saved = await archive(staff.id, archiveId);
            assert.equal(saved.snapshot.schemaVersion, 3);
            if (saved.snapshot.schemaVersion !== 3)
                throw new Error("v3 expected");
            assert.equal(saved.snapshot.evidence.selectedObjects[0].sha256, hash);
            assert.equal(saved.snapshot.evidence.selectedObjects[0].byteLength, bytes.length);
            assert.equal(JSON.stringify(saved.snapshot.evidence).includes("storageKey"), false);
            const after = await db.agriRecordArchive.findUniqueOrThrow({ where: { id: v2.archiveId } });
            assert.equal(after.snapshotCanonical, before.snapshotCanonical);
            assert.equal(after.snapshotHash, before.snapshotHash);
            const legacyRead = await archive(staff.id, legacy.archiveId);
            assert.equal(legacyRead.snapshot.schemaVersion, 1);
            assert.equal(legacyRead.archive.sha256, legacyHash);
            await assert.rejects(archive(limited.id, archiveId), /AGRI_SCOPE_REQUIRED/);
        });
        await check("raw mutations/deletions of successful objects/manifests/references are rejected", async () => { await assert.rejects(db.$executeRaw `UPDATE agri_evidence_objects SET sha256=${"b".repeat(64)} WHERE id=${objectId}`, /AGRI_EVIDENCE_IMMUTABLE/); await assert.rejects(db.$executeRaw `DELETE FROM agri_evidence_objects WHERE id=${objectId}`, /AGRI_EVIDENCE_IMMUTABLE/); await assert.rejects(db.$executeRaw `DELETE FROM agri_evidence_manifest_objects WHERE "objectId"=${objectId}`, /AGRI_EVIDENCE_IMMUTABLE/); });
        await check("deferred manifest guard rejects omitted refs and additional descriptor fields", async () => { const latest = await db.agriEvidenceManifest.findFirstOrThrow({ where: { submissionId }, orderBy: { sequence: "desc" } }); const value = JSON.parse(latest.canonicalJSON); value.id = randomUUID(); value.sequence++; value.previousManifestId = latest.id; const canonical = canonicalAgriArchiveJSON(value), sha = createHash("sha256").update(canonical).digest("hex"); await assert.rejects(db.$transaction(async (tx) => { await tx.$executeRaw `INSERT INTO agri_evidence_manifests(id,"competitionId","entryStageId","submissionId",sequence,"previousManifestId","createdById","createdAt","canonicalJSON",sha256,"byteLength") VALUES(${value.id},${edition.id},${a.stage.entryStageId},${submissionId},${value.sequence},${latest.id},${staff.id},${latest.createdAt},${canonical},${sha},${Buffer.byteLength(canonical)})`; }), /AGRI_EVIDENCE_MANIFEST_REFS_MISMATCH/); });
        await check("structured evidence references reject cross-stage identity and v3 descriptor tampering", async () => {
            const manifest = await db.agriEvidenceManifest.findFirstOrThrow({ where: { submissionId }, orderBy: { sequence: "desc" } });
            await assert.rejects(db.$executeRaw `INSERT INTO agri_evidence_manifest_objects("manifestId","objectId","submissionId","entryStageId","competitionId") VALUES(${manifest.id},${objectId},${submissionId},${b.stage.entryStageId},${edition.id})`);
            const saved = await db.agriRecordArchive.findUniqueOrThrow({ where: { id: archiveId } }), payload = JSON.parse(saved.snapshotCanonical);
            payload.archiveId = randomUUID();
            payload.sequence = saved.sequence + 1;
            payload.previousArchiveId = saved.id;
            payload.evidence.selectedObjects[0].sha256 = "c".repeat(64);
            const canonical = canonicalAgriArchiveJSON(payload), hash = createHash("sha256").update(canonical).digest("hex");
            await assert.rejects(db.$executeRaw `INSERT INTO agri_record_archives(id,"competitionId","entryStageId","submissionId","artifactVersionId","ruleVersionId",sequence,"previousArchiveId","createdById","collectedAt","includePrivate","includeInternal","snapshotSchemaVersion","evidenceManifestId","snapshotCanonical","snapshotHash","byteLength") VALUES(${payload.archiveId},${edition.id},${a.stage.entryStageId},${submissionId},${a.version.id},${rule.resourceId},${payload.sequence},${saved.id},${staff.id},${saved.collectedAt},true,false,3,${manifest.id},${canonical},${hash},${Buffer.byteLength(canonical)})`, /AGRI_ARCHIVE_EVIDENCE_MISMATCH/);
        });
        await check("human cutoff judgment is separate, staff-only and leaves immutable capture metadata unchanged", async () => { const key = randomUUID(), object = await db.agriEvidenceObject.findUniqueOrThrow({ where: { id: objectId } }); await assert.rejects(command(owner.id, { action: "verifyCutoff", requestId, objectId, idempotencyKey: key, reason: "LOCAL ONLY explicit review rationale" }), /AGRI_SCOPE_REQUIRED/); await command(staff.id, { action: "verifyCutoff", requestId, objectId, idempotencyKey: key, reason: "LOCAL ONLY explicit review rationale" }); assert.deepEqual((await db.agriEvidenceObject.findUniqueOrThrow({ where: { id: objectId } })).descriptor, object.descriptor); const team = await listEvidence(owner.id, { submissionId }), staffView = await listEvidence(staff.id, { submissionId }); assert.equal(team.requests[0].cutoffVerification, null); assert.ok(staffView.requests[0].cutoffVerification); });
        await check("summary lists only current-submission counts and manual review requires its separate internal-notes capability", async () => {
            const ownerView = await listEvidence(owner.id, { submissionId });
            assert.equal(ownerView.canVerify, false);
            await db.$executeRaw`UPDATE agri_access_grants SET "revokedAt"=clock_timestamp(),revision=revision+1 WHERE "userId"=${staff.id} AND scope='INTERNAL_NOTES_READ'`;
            const noNotes = await listEvidence(staff.id, { submissionId });
            assert.equal(noNotes.canArchive, true);
            assert.equal(noNotes.canVerify, false);
            assert.equal(noNotes.requests[0].cutoffVerification, null);
            await assert.rejects(command(staff.id, { action: "verifyCutoff", requestId, objectId, idempotencyKey: randomUUID(), reason: "LOCAL ONLY no internal-note authority" }), /AGRI_SCOPE_REQUIRED/);
            await db.$executeRaw`UPDATE agri_access_grants SET "revokedAt"=NULL,revision=revision+1 WHERE "userId"=${staff.id} AND scope='INTERNAL_NOTES_READ'`;
            assert.equal((await listEvidence(staff.id, { submissionId })).canVerify, true);
            const listed = await listAgriStages(limited.id, { scope: "staff" });
            const summary = listed.stages.find(row => row.id === a.stage.entryStageId)!.evidenceSummary;
            assert.deepEqual(summary, { stored: 1, pending: 0, failed: 0, cancelled: 0, late: 0 });
            assert.equal(JSON.stringify(listed).includes("storageKey"), false);
            assert.equal(JSON.stringify(listed).includes("explicit review rationale"), false);
        });
        await check("scope revocation and membership removal reject replay and download immediately", async () => { await db.$executeRaw `UPDATE agri_access_grants SET "revokedAt"=clock_timestamp(),revision=revision+1 WHERE "userId"=${staff.id} AND scope='PRIVATE_MATERIALS_READ'`; await assert.rejects(download(staff.id, objectId), /AGRI_SCOPE_REQUIRED/); await db.$executeRaw `UPDATE agri_access_grants SET "revokedAt"=NULL,revision=revision+1 WHERE "userId"=${staff.id} AND scope='PRIVATE_MATERIALS_READ'`; await db.teamMember.updateMany({ where: { teamId: a.team.id, userId: owner.id }, data: { status: "LEFT" } }); await assert.rejects(createEvidence(owner.id, intent), /AGRI_SCOPE_REQUIRED/); await assert.rejects(download(owner.id, objectId), /AGRI_SCOPE_REQUIRED/); await db.teamMember.updateMany({ where: { teamId: a.team.id, userId: owner.id }, data: { status: "ACTIVE" } }); });
        await check("cancelled queued repository jobs remain durable without any external fetch", async () => { const c = await createEvidence(owner.id, { ...intent, idempotencyKey: randomUUID(), submissionId, mode: "GITHUB_ARCHIVE", kind: "REPOSITORY", sourceUrl: "https://github.com/ans-local-fixture/no-external-calls", originalRef: { kind: "COMMIT_SHA", value: "a".repeat(40) }, fileName: "repository.tar.gz" }); const key = randomUUID(); await command(owner.id, { action: "cancel", requestId: c.requestId, idempotencyKey: key }); assert.equal((await db.agriEvidenceRequest.findUniqueOrThrow({ where: { id: c.requestId } })).state, "CANCELLED"); await command(owner.id, { action: "cancel", requestId: c.requestId, idempotencyKey: key }); await assert.rejects(command(owner.id, { action: "retry", requestId: c.requestId, idempotencyKey: randomUUID() }), /AGRI_EVIDENCE_RETRY_UNAVAILABLE/); });
        await check("expired worker recovery keeps original completed bytes and does not fetch or reread replacement body", async () => {
            const created = await createEvidence(owner.id, { ...intent, idempotencyKey: randomUUID(), submissionId, kind: "DEMO_DOCUMENT", fileName: "LOCAL recover.html" });
            const row = await db.agriEvidenceRequest.findUniqueOrThrow({ where: { id: created.requestId } });
            const original = Buffer.from("LOCAL ONLY persisted bytes before database finalize");
            await storeEvidence(row.storageKey, Readable.from([original]), row.maxBytes, "DEMO_DOCUMENT", AbortSignal.timeout(5000), async () => { });
            await upload(owner.id, row.id, Buffer.from("MUST NOT OVERWRITE"));
            const object = await db.agriEvidenceObject.findUniqueOrThrow({ where: { requestId: row.id } });
            assert.equal(object.sha256, createHash("sha256").update(original).digest("hex"));
        });
        await check("actual separate upload process killed after claim/partial stream recovers durable request and original bytes", async () => {
            for (const partial of [false, true]) {
                const created = await createEvidence(owner.id, { ...intent, idempotencyKey: randomUUID(), submissionId, kind: "DEMO_DOCUMENT", fileName: partial ? "LOCAL partial-process.txt" : "LOCAL claimed-process.txt" });
                await writeFile(resolve(dir, "kill-fixture.json"), JSON.stringify({ competitionId: edition.id, ownerId: owner.id, requestId: created.requestId, partial }));
                const child = spawn(process.execPath, ["--import", "tsx", "scripts/agri-evidence-integration.ts", "--killed-upload"], { env: process.env, stdio: "ignore", windowsHide: true });
                try {
                    let row = await db.agriEvidenceRequest.findUniqueOrThrow({ where: { id: created.requestId } });
                    for (let i = 0; i < 200 && (row.state !== "RUNNING" || partial && row.storedBytes < 65536); i++) {
                        await new Promise(resolve => setTimeout(resolve, 25));
                        row = await db.agriEvidenceRequest.findUniqueOrThrow({ where: { id: created.requestId } });
                    }
                    assert.equal(row.state, "RUNNING");
                    if (partial)
                        assert.equal(row.storedBytes, 65536);
                    const stopped = new Promise(resolve => child.once("exit", resolve));
                    child.kill("SIGKILL");
                    await stopped;
                    await db.$executeRaw `UPDATE agri_evidence_requests SET "leaseExpiresAt"=clock_timestamp()-interval '1 second' WHERE id=${row.id}`;
                    await upload(owner.id, row.id);
                    const object = await db.agriEvidenceObject.findUniqueOrThrow({ where: { requestId: row.id } });
                    assert.equal(object.sha256, hash);
                    assert.equal(object.byteLength, bytes.length);
                    assert.equal((await readdir(resolve(storage, row.storageKey, ".."))).some(name => name.endsWith(".part")), false);
                    await upload(owner.id, row.id).then(() => assert.fail("stored request must not be claimed twice"), () => { });
                    assert.equal(await db.agriEvidenceObject.count({ where: { requestId: row.id } }), 1);
                }
                finally {
                    child.kill("SIGKILL");
                }
            }
        });
        await check("expired lease is fenced: late old upload cannot finalize, fresh claim recovers immutable bytes", async () => {
            const created = await createEvidence(owner.id, { ...intent, idempotencyKey: randomUUID(), submissionId, kind: "SUPPORTING_FILE", fileName: "LOCAL stale worker.txt" });
            let release!: () => void;
            const wait = new Promise<void>(resolve => { release = resolve; });
            const body = new ReadableStream<Uint8Array>({ async pull(controller) { await wait; controller.enqueue(new Uint8Array(bytes)); controller.close(); } });
            const pending = uploadEvidence(owner.id, created.requestId, new Request("http://127.0.0.1:9/isolated-upload", { method: "PUT", body, duplex: "half" } as RequestInit)).then(() => null, error => error);
            let current = await db.agriEvidenceRequest.findUniqueOrThrow({ where: { id: created.requestId } });
            for (let i = 0; i < 100 && current.state !== "RUNNING"; i++) {
                await new Promise(resolve => setTimeout(resolve, 20));
                current = await db.agriEvidenceRequest.findUniqueOrThrow({ where: { id: created.requestId } });
            }
            assert.equal(current.state, "RUNNING");
            await db.$transaction(async (tx) => { const ctx = await lockAgriWorkspace(tx, owner.id), row = await evidenceRequest(tx, ctx, current.id); await evidenceTransition(tx, row, "ISOLATED_FIXTURE_FENCE", null, "local-fixture", { leaseToken: randomUUID(), leaseExpiresAt: new Date(Date.now() - 1000) }); });
            release();
            const error = await pending;
            assert.ok(error);
            assert.equal(await db.agriEvidenceObject.count({ where: { requestId: current.id } }), 0);
            await upload(owner.id, current.id);
            assert.equal((await db.agriEvidenceRequest.findUniqueOrThrow({ where: { id: current.id } })).state, "STORED");
            assert.equal(await db.agriEvidenceObject.count({ where: { requestId: current.id } }), 1);
        });
        await check("withdrawn queue head is quarantined; later durable job recovers bytes without network", async () => {
            const content = { projectId: b.project.id, artifactVersionId: b.version.id, repository: { url: "https://github.com/ans-local-fixture/no-external-calls", ref: { kind: "COMMIT_SHA", value: "a".repeat(40) } }, demoUrl: null, summary: "LOCAL ONLY second team", materials: { schemaVersion: 1, items: [] } };
            const accepted = await submit(other.id, { action: "submit", idempotencyKey: randomUUID(), entryStageId: b.stage.entryStageId, expectedRevision: 1, expectedRuleVersionId: rule.resourceId, officialMemberIds: [other.id], content });
            const first = await createEvidence(other.id, { ...intent, idempotencyKey: randomUUID(), entryStageId: b.stage.entryStageId, projectId: b.project.id, artifactVersionId: b.version.id, submissionId: accepted.submissionId, mode: "GITHUB_ARCHIVE", kind: "REPOSITORY", sourceUrl: content.repository.url, originalRef: content.repository.ref, fileName: "LOCAL repository.tar.gz" });
            const next = await createEvidence(staff.id, { ...intent, idempotencyKey: randomUUID(), submissionId, mode: "GITHUB_ARCHIVE", kind: "REPOSITORY", sourceUrl: content.repository.url, originalRef: content.repository.ref, fileName: "LOCAL repository.tar.gz" });
            const row = await db.agriEvidenceRequest.findUniqueOrThrow({ where: { id: next.requestId } });
            await storeEvidence(row.storageKey, Readable.from([Buffer.from([0x1f, 0x8b, 0x08, 0, 0, 0, 0, 0, 0, 0])]), row.maxBytes, "REPOSITORY", AbortSignal.timeout(5000), async () => { });
            await db.teamMember.updateMany({ where: { teamId: b.team.id, userId: other.id }, data: { status: "LEFT" } });
            assert.equal(await runEvidenceWorkerOnce(), true);
            assert.equal((await db.agriEvidenceRequest.findUniqueOrThrow({ where: { id: first.requestId } })).state, "NEEDS_REVIEW");
            assert.equal((await db.agriEvidenceRequest.findUniqueOrThrow({ where: { id: next.requestId } })).state, "STORED");
            await db.teamMember.updateMany({ where: { teamId: b.team.id, userId: other.id }, data: { status: "ACTIVE" } });
            const ownB = await createEvidence(other.id, { ...intent, idempotencyKey: randomUUID(), entryStageId: b.stage.entryStageId, projectId: b.project.id, artifactVersionId: b.version.id, submissionId: accepted.submissionId, fileName: "LOCAL second team bytes.txt" });
            await upload(other.id, ownB.requestId);
            const bObject = await db.agriEvidenceObject.findUniqueOrThrow({ where: { requestId: ownB.requestId } });
            const bManifest = await command(staff.id, { action: "manifest", submissionId: accepted.submissionId, objectIds: [bObject.id], idempotencyKey: randomUUID() });
            await assert.rejects(db.$executeRaw `INSERT INTO agri_evidence_manifest_objects("manifestId","objectId","submissionId","entryStageId","competitionId") VALUES(${bManifest.manifestId},${objectId},${accepted.submissionId},${b.stage.entryStageId},${edition.id})`, /foreign key constraint|Foreign key constraint|23503/);
        });
        await check("oversized/chunked/malformed media abort without successful objects or truncated files", async () => { const key = evidenceObjectKey(edition.id, randomUUID(), randomUUID()); await assert.rejects(storeEvidence(key, Readable.from([Buffer.alloc(3), Buffer.alloc(3)]), 5, "SUPPORTING_FILE", AbortSignal.timeout(5000), async () => { }), /AGRI_EVIDENCE_TOO_LARGE/); await assert.rejects(inspectEvidence({ key, backend: "local_private", namespaceVersion: 1 }, 5, "SUPPORTING_FILE", AbortSignal.timeout(5000))); await assert.rejects(storeEvidence(evidenceObjectKey(edition.id, randomUUID(), randomUUID()), Readable.from([Buffer.from("<html>not a video</html>")]), 100, "DEMO_VIDEO", AbortSignal.timeout(5000), async () => { }), /AGRI_EVIDENCE_MEDIA_INVALID/); });
        await check("strict public-IP classifier rejects alternate IPv6, mixed/private ranges and credential URLs", async () => { for (const ip of ["127.0.0.1", "10.1.2.3", "169.254.169.254", "100.64.0.1", "::1", "::ffff:127.0.0.1", "2001:0db8:0:0::1", "2001:0000::1", "fc00::1", "fe80::1", "2002:a00:1::1"])
            assert.equal(publicEvidenceIP(ip), false, ip); assert.equal(publicEvidenceIP("8.8.8.8"), true); assert.equal(publicEvidenceIP("2606:4700:4700::1111"), true); for (const url of ["https://127.0.0.1/", "https://github.com:444/", "https://u:p@github.com/", "https://github.com/?token=x", "http://github.com/"])
            assert.throws(() => allowedEvidenceURL(url, new Set(["github.com"]))); });
        await check("storage absent/unsafe names and feature-off stop new work while preserving authorized reads", async () => { process.env.ANS_AGRI_EVIDENCE_ENABLED = "false"; await assert.rejects(createEvidence(owner.id, { ...intent, idempotencyKey: randomUUID(), submissionId }), /AGRI_EVIDENCE_DISABLED/); assert.equal((await download(owner.id, objectId)).descriptor.sha256, hash); process.env.ANS_AGRI_EVIDENCE_ENABLED = "true"; process.env.ANS_AGRI_EVIDENCE_LOCAL_DURABLE = "false"; await assert.rejects(createEvidence(owner.id, { ...intent, idempotencyKey: randomUUID(), submissionId }), /AGRI_EVIDENCE_STORAGE_NOT_CONFIGURED/); process.env.ANS_AGRI_EVIDENCE_LOCAL_DURABLE = "true"; });
        await check("evidence actions leave XP, quota ledger, publications and entry status unchanged", async () => { assert.equal(JSON.stringify(await db.user.findMany({ where: { id: { in: [owner.id, staff.id] } }, select: { id: true, xp: true, quotaPoints: true }, orderBy: { id: "asc" } })), JSON.stringify(before)); assert.deepEqual([await db.marketOrder.count(), await db.marketPayment.count(), await db.ldxpRechargeOrder.count()], paymentCounts); assert.equal(await db.quotaLedger.count(), ledgers); assert.equal(await db.artifactPublication.count(), publications); assert.deepEqual(await db.teamCompetition.findUniqueOrThrow({ where: { id: a.entry.id } }), beforeEntry); });
        await check("pre-submit TAG snapshot survives moved TAG and binds exact immutable handle before byte capture", async () => {
            await githubFixture(async fixture => {
                const refOwner = await user("pre-ref"), f = await teamFixture(refOwner.id, "pre-ref");
                const repository = { url: "https://github.com/ans-local-fixture/pre-ref", ref: { kind: "TAG", value: "v1" } };
                const c = await createEvidence(refOwner.id, { ...intent, idempotencyKey: randomUUID(), entryStageId: f.stage.entryStageId, projectId: f.project.id, artifactVersionId: f.version.id, mode: "GITHUB_ARCHIVE", kind: "REPOSITORY", sourceUrl: repository.url, originalRef: repository.ref, fileName: "LOCAL pre-ref.tar.gz" });
                for (let attempt = 0; attempt < 2; attempt++) {
                    fixture.fail = true;
                    assert.equal(await runEvidenceWorkerOnce(), true);
                    const failed = await db.agriEvidenceRequest.findUniqueOrThrow({ where: { id: c.requestId } });
                    assert.equal(failed.state, "RETRY_WAIT"); assert.equal(failed.provenance, null);
                    await command(refOwner.id, { action: "retry", requestId: c.requestId, idempotencyKey: randomUUID() });
                }
                fixture.fail = false;
                assert.equal(await runEvidenceWorkerOnce(), true);
                const fixed = await db.agriEvidenceRequest.findUniqueOrThrow({ where: { id: c.requestId } });
                assert.equal(fixed.attempt, 3);
                assert.equal(fixed.state, "RESOLVED"); assert.equal(fixed.checkpoint, null); assert.equal(fixed.storedBytes, 0);
                assert.equal(await db.agriEvidenceObject.count({ where: { requestId: fixed.id } }), 0);
                const proof = fixed.provenance as { sha: string; resolvedAt: string; proof: object[] };
                assert.equal(proof.sha, "a".repeat(40)); assert.equal(proof.proof.length, 2);
                assert.equal((await listEvidence(refOwner.id, { entryStageId: f.stage.entryStageId, artifactVersionId: f.version.id })).requests[0].resolution?.sha, proof.sha);
                await assert.rejects(db.$transaction(async tx => { const ctx = await lockAgriWorkspace(tx, refOwner.id), row = await evidenceRequest(tx, ctx, fixed.id); await evidenceTransition(tx, row, "ISOLATED_TAMPER", refOwner.id, null, { provenance: { ...proof, sha: "b".repeat(40) } }); }), /AGRI_EVIDENCE_RESOLUTION_(IMMUTABLE|INVALID)/);
                const content = { projectId: f.project.id, artifactVersionId: f.version.id, repository, demoUrl: null, summary: "LOCAL TAG snapshot", materials: { schemaVersion: 1, items: [] } };
                fixture.sha = "b".repeat(40);
                const wrongVersion = await db.artifactVersion.create({ data: { artifactId: (await db.artifactVersion.findUniqueOrThrow({ where: { id: f.version.id } })).artifactId, createdById: refOwner.id, version: 2, contentJson: {}, contentMarkdown: "LOCAL ONLY", factSnapshotHash: "fixture" } });
                const base = { action: "submit", idempotencyKey: randomUUID(), entryStageId: f.stage.entryStageId, expectedRevision: 1, expectedRuleVersionId: rule.resourceId, officialMemberIds: [refOwner.id], evidenceIntentIds: [fixed.id], content };
                await assert.rejects(submit(refOwner.id, { ...base, content: { ...content, artifactVersionId: wrongVersion.id } }), /AGRI_EVIDENCE_INTENT_INVALID/);
                await assert.rejects(submit(refOwner.id, { ...base, content: { ...content, repository: { ...repository, ref: { kind: "TAG", value: "v2" } } } }), /AGRI_EVIDENCE_INTENT_INVALID/);
                await db.teamMember.updateMany({ where: { teamId: f.team.id, userId: refOwner.id }, data: { status: "LEFT" } });
                await assert.rejects(submit(refOwner.id, base));
                await db.teamMember.updateMany({ where: { teamId: f.team.id, userId: refOwner.id }, data: { status: "ACTIVE" } });
                const accepted = await submit(refOwner.id, base);
                const bound = await db.agriEvidenceRequest.findUniqueOrThrow({ where: { id: fixed.id } });
                assert.equal(bound.submissionId, accepted.submissionId); assert.equal(bound.state, "QUEUED"); assert.equal(bound.attempt, 0); assert.deepEqual(bound.provenance, fixed.provenance);
                assert.deepEqual((await db.agriStageSubmission.findUniqueOrThrow({ where: { id: accepted.submissionId! } })).repository, repository);
                assert.equal(await runEvidenceWorkerOnce(), true);
                const object = await db.agriEvidenceObject.findUniqueOrThrow({ where: { requestId: fixed.id } });
                assert.equal((object.descriptor as { resolvedSha: string }).resolvedSha, "a".repeat(40));
                assert.equal((object.descriptor as { sourceTiming: string }).sourceTiming, "PRE_SUBMISSION_FIXED_REF_BEFORE_CUTOFF");
                assert.equal(fixture.urls.filter(u => u.includes("/git/ref/tags/")).length, 3);
                assert.ok(fixture.urls.at(-1)?.endsWith("/tar.gz/" + "a".repeat(40)));
                assert.ok(await download(refOwner.id, object.id));
                await assert.rejects(db.$transaction(async tx => { const ctx = await lockAgriWorkspace(tx, other.id); await bindEvidenceIntents(tx, ctx, [fixed.id], accepted.submissionId!); }), /AGRI_TEAM_PERMISSION_REQUIRED/);
            });
        });
        await check("failed TAG resolution cannot be adopted or reported as stored", async () => {
            await githubFixture(async fixture => {
                fixture.fail = true;
                const refOwner = await user("failed-ref"), f = await teamFixture(refOwner.id, "failed-ref"), repository = { url: "https://github.com/ans-local-fixture/failed-ref", ref: { kind: "TAG", value: "v1" } };
                const c = await createEvidence(refOwner.id, { ...intent, idempotencyKey: randomUUID(), entryStageId: f.stage.entryStageId, projectId: f.project.id, artifactVersionId: f.version.id, mode: "GITHUB_ARCHIVE", kind: "REPOSITORY", sourceUrl: repository.url, originalRef: repository.ref, fileName: "LOCAL failed-ref.tar.gz" });
                await runEvidenceWorkerOnce();
                const row = await db.agriEvidenceRequest.findUniqueOrThrow({ where: { id: c.requestId } });
                assert.equal(row.state, "RETRY_WAIT"); assert.equal(row.provenance, null); assert.equal(row.checkpoint, null);
                await assert.rejects(submit(refOwner.id, { action: "submit", idempotencyKey: randomUUID(), entryStageId: f.stage.entryStageId, expectedRevision: 1, expectedRuleVersionId: rule.resourceId, officialMemberIds: [refOwner.id], evidenceIntentIds: [row.id], content: { projectId: f.project.id, artifactVersionId: f.version.id, repository, demoUrl: null, summary: "LOCAL ONLY", materials: { schemaVersion: 1, items: [] } } }), /AGRI_EVIDENCE_INTENT_INVALID/);
                assert.equal(await db.agriEvidenceObject.count({ where: { requestId: row.id } }), 0);
                await command(refOwner.id, { action: "cancel", requestId: row.id, idempotencyKey: randomUUID() });
            });
        });
        await check("expired pre-resolved handle is rejected while old TAG-only submissions remain readable unchanged", async () => {
            await githubFixture(async fixture => {
                const refOwner = await user("expired-ref"), f = await teamFixture(refOwner.id, "expired-ref"), repository = { url: "https://github.com/ans-local-fixture/expired-ref", ref: { kind: "TAG", value: "v1" } };
                const id = randomUUID(), oid = randomUUID(), key = evidenceObjectKey(edition.id, id, oid);
                // Short-lived synthetic row is created initially with its true expiry; no immutable identity is edited.
                await db.$transaction(async tx => {
                    await tx.$executeRaw`INSERT INTO agri_evidence_requests(id,"competitionId","entryStageId","projectId","artifactVersionId","actorId",authority,mode,kind,"bindingState",state,"sourceUrl","originalRef","fileName","maxBytes","requestHash","createdAt","expiresAt","objectId","storageKey",backend) VALUES(${id},${edition.id},${f.stage.entryStageId},${f.project.id},${f.version.id},${refOwner.id},'TEAM','GITHUB_ARCHIVE','REPOSITORY','PREPARED','QUEUED',${repository.url},${JSON.stringify(repository.ref)}::jsonb,'LOCAL expiring handle',67108864,${"c".repeat(64)},clock_timestamp(),clock_timestamp()+interval '2 seconds',${oid},${key},'local_private')`;
                    await tx.$executeRaw`INSERT INTO agri_evidence_events(id,"requestId","competitionId","actorId",action,revision,state,attempt,provenance,"serverAt") VALUES(${randomUUID()},${id},${edition.id},${refOwner.id},'ISOLATED_EXPIRY_FIXTURE',1,'QUEUED',0,'{}'::jsonb,clock_timestamp())`;
                });
                assert.equal(await runEvidenceWorkerOnce(), true);
                assert.equal((await db.agriEvidenceRequest.findUniqueOrThrow({ where: { id } })).state, "RESOLVED");
                await new Promise(resolve => setTimeout(resolve, 2100));
                const base = { action: "submit", idempotencyKey: randomUUID(), entryStageId: f.stage.entryStageId, expectedRevision: 1, expectedRuleVersionId: rule.resourceId, officialMemberIds: [refOwner.id], content: { projectId: f.project.id, artifactVersionId: f.version.id, repository, demoUrl: null, summary: "LOCAL old TAG", materials: { schemaVersion: 1, items: [] } } };
                await assert.rejects(submit(refOwner.id, { ...base, evidenceIntentIds: [id] }), /AGRI_EVIDENCE_INTENT_INVALID/);
                assert.equal(await db.agriStageSubmission.count({ where: { entryStageId: f.stage.entryStageId } }), 0);
                const accepted = await submit(refOwner.id, base);
                assert.deepEqual((await readAgriStage(refOwner.id, f.stage.entryStageId)).current?.content?.repository, repository);
                fixture.sha = "b".repeat(40);
                assert.deepEqual((await db.agriStageSubmission.findUniqueOrThrow({ where: { id: accepted.submissionId! } })).repository, repository);
                assert.equal(await db.agriEvidenceObject.count({ where: { submissionId: accepted.submissionId! } }), 0);
                assert.equal(fixture.urls.filter(u => u.includes("/git/ref/tags/")).length, 1);
            });
        });
        await check("partial stream cleanup resets confirmed progress and reserves the entire retry budget", async () => {
            const c = await createEvidence(owner.id, { ...intent, idempotencyKey: randomUUID(), submissionId, kind: "DEMO_DOCUMENT", fileName: "LOCAL failed partial.txt" });
            const claimCandidate = await createEvidence(owner.id, { ...intent, idempotencyKey: randomUUID(), submissionId, kind: "SUPPORTING_FILE", fileName: "LOCAL threshold claim.txt" });
            let sent = false;
            await assert.rejects(uploadEvidence(owner.id, c.requestId, new Request("http://127.0.0.1:9/isolated-partial", { method: "PUT", duplex: "half", body: new ReadableStream<Uint8Array>({ async pull(controller) { if (!sent) { sent = true; controller.enqueue(Buffer.alloc(65536)); } else { await new Promise(resolve => setTimeout(resolve, 20)); controller.error(new Error("LOCAL stream failure")); } } }) } as RequestInit)));
            const row = await db.agriEvidenceRequest.findUniqueOrThrow({ where: { id: c.requestId } });
            assert.equal(row.state, "RETRY_WAIT"); assert.equal(row.storedBytes, 0); assert.equal(row.checkpoint, null);
            assert.deepEqual(await readdir(resolve(storage, row.storageKey, "..")), []);
            const f = await statfs(storage, { bigint: true }), free = Number(f.bavail * f.bsize);
            const [reservation] = await db.$queryRaw<Array<{ remaining: bigint }>>`SELECT COALESCE(sum(CASE WHEN state<>'STORED' THEN CASE WHEN state='UPLOADED' OR (state='RUNNING' AND "leaseExpiresAt">clock_timestamp()) THEN "maxBytes"-"storedBytes" ELSE "maxBytes" END ELSE 0 END),0)::bigint AS remaining FROM agri_evidence_requests WHERE "cleanupCompletedAt" IS NULL`;
            assert.ok(Number(reservation.remaining) >= row.maxBytes);
            process.env.ANS_AGRI_EVIDENCE_LOCAL_MIN_FREE_BYTES = String(Math.max(1, free - Number(reservation.remaining) + 32768));
            await assert.rejects(createEvidence(owner.id, { ...intent, idempotencyKey: randomUUID(), submissionId, kind: "DEMO_VIDEO", fileName: "LOCAL over remaining threshold" }), /AGRI_EVIDENCE_STORAGE_CAPACITY_REQUIRED/);
            await assert.rejects(db.$transaction(tx => evidenceBudget(tx, edition.id, a.stage.entryStageId, owner.id, submissionId)), /AGRI_EVIDENCE_STORAGE_CAPACITY_REQUIRED/);
            await assert.rejects(upload(owner.id, claimCandidate.requestId), /AGRI_EVIDENCE_STORAGE_CAPACITY_REQUIRED/);
            process.env.ANS_AGRI_EVIDENCE_LOCAL_MIN_FREE_BYTES = "1";
            await command(owner.id, { action: "cancel", requestId: row.id, idempotencyKey: randomUUID() });
            await command(owner.id, { action: "cancel", requestId: claimCandidate.requestId, idempotencyKey: randomUUID() });
        });
        await check("delete failure retains old progress, full reservation and quarantine until exact cleanup succeeds", async () => {
            const c = await createEvidence(owner.id, { ...intent, idempotencyKey: randomUUID(), submissionId, kind: "DEMO_DOCUMENT", fileName: "LOCAL cleanup blocked.txt" });
            const unlink = fsPromises.unlink;
            let sent = false;
            fsPromises.unlink = (async (path) => { if (String(path).endsWith(".part")) throw Object.assign(new Error("LOCAL EACCES fixture"), { code: "EACCES" }); return unlink(path); }) as typeof unlink;
            syncBuiltinESMExports();
            try {
                await assert.rejects(uploadEvidence(owner.id, c.requestId, new Request("http://127.0.0.1:9/cleanup-failure", { method: "PUT", duplex: "half", body: new ReadableStream<Uint8Array>({ async pull(controller) { if (!sent) { sent = true; controller.enqueue(Buffer.alloc(65536)); } else { await new Promise(resolve => setTimeout(resolve, 20)); controller.error(new Error("LOCAL stream failure")); } } }) } as RequestInit)));
                const row = await db.agriEvidenceRequest.findUniqueOrThrow({ where: { id: c.requestId } });
                assert.equal(row.state, "NEEDS_REVIEW"); assert.equal(row.storedBytes, 65536); assert.equal(row.checkpoint, null);
                assert.equal(row.errorCode, "AGRI_EVIDENCE_STORAGE_RECONCILIATION_REQUIRED");
                assert.ok((await readdir(resolve(storage, row.storageKey, ".."))).some(name => name.endsWith(".part")));
                await assert.rejects(upload(owner.id, row.id), /LOCAL EACCES/);
                assert.equal(await db.agriEvidenceObject.count({ where: { requestId: row.id } }), 0);
            } finally { fsPromises.unlink = unlink; syncBuiltinESMExports(); }
            await upload(owner.id, c.requestId);
            const row = await db.agriEvidenceRequest.findUniqueOrThrow({ where: { id: c.requestId } });
            assert.equal(row.state, "STORED"); assert.equal(row.storedBytes, bytes.length);
            assert.equal((await readdir(resolve(storage, row.storageKey, ".."))).some(name => name.endsWith(".part")), false);
        });
        await check("complete published object recovers near capacity without double-reserving or reading replacement bytes", async () => {
            const c = await createEvidence(owner.id, { ...intent, idempotencyKey: randomUUID(), submissionId, kind: "DEMO_DOCUMENT", fileName: "LOCAL near-capacity published.txt" }), row = await db.agriEvidenceRequest.findUniqueOrThrow({ where: { id: c.requestId } });
            const original = Buffer.alloc(2 * 1024 * 1024, 0x62);
            await storeEvidence(row.storageKey, Readable.from([original]), row.maxBytes, "DEMO_DOCUMENT", AbortSignal.timeout(5000), async () => {});
            const [r] = await db.$queryRaw<Array<{ remaining: bigint }>>`SELECT COALESCE(sum(CASE WHEN state<>'STORED' THEN CASE WHEN state='UPLOADED' OR (state='RUNNING' AND "leaseExpiresAt">clock_timestamp()) THEN "maxBytes"-"storedBytes" ELSE "maxBytes" END ELSE 0 END),0)::bigint AS remaining FROM agri_evidence_requests WHERE "cleanupCompletedAt" IS NULL`;
            const st = await statfs(storage, { bigint: true });
            process.env.ANS_AGRI_EVIDENCE_LOCAL_MIN_FREE_BYTES = String(Number(st.bavail * st.bsize) - Number(r.remaining) + 1024 * 1024);
            try { await upload(owner.id, row.id, Buffer.from("MUST NOT REPLACE")); }
            finally { process.env.ANS_AGRI_EVIDENCE_LOCAL_MIN_FREE_BYTES = "1"; }
            const object = await db.agriEvidenceObject.findUniqueOrThrow({ where: { requestId: row.id } });
            assert.equal(object.byteLength, original.length); assert.equal(object.sha256, createHash("sha256").update(original).digest("hex"));
        });
        await check("explicit inventory cleanup retires only old unbound failed bytes and releases reservation after exact removal", async () => {
            const id = randomUUID(), oid = randomUUID(), when = new Date(Date.now() - 72 * 3600000), key = evidenceObjectKey(edition.id, id, oid);
            await db.$transaction(async (tx) => {
                await tx.$executeRaw `INSERT INTO agri_evidence_requests(id,"competitionId","entryStageId","submissionId","projectId","artifactVersionId","actorId",authority,mode,kind,"bindingState",state,"fileName","maxBytes","requestHash","createdAt","objectId","storageKey",backend) VALUES(${id},${edition.id},${a.stage.entryStageId},${submissionId},${a.project.id},${a.version.id},${owner.id},'TEAM','UPLOAD','SUPPORTING_FILE','BOUND','FAILED','LOCAL old failed file',4096,${"e".repeat(64)},${when},${oid},${key},'local_private')`;
                await tx.$executeRaw `INSERT INTO agri_evidence_events(id,"requestId","competitionId","actorId",action,revision,state,attempt,provenance,"serverAt") VALUES(${randomUUID()},${id},${edition.id},${owner.id},'ISOLATED_OLD_FAILED_FIXTURE',1,'FAILED',0,'{}'::jsonb,${when})`;
            });
            await storeEvidence(key, Readable.from([bytes]), 4096, "SUPPORTING_FILE", AbortSignal.timeout(5000), async () => { });
            const inventory = await reconcileEvidenceReservations();
            assert.ok(inventory.requests.some(r => r.requestId === id && !r.cleaned));
            assert.equal((await db.agriEvidenceRequest.findUniqueOrThrow({ where: { id } })).cleanupCompletedAt, null);
            const cleaned = await reconcileEvidenceReservations(true);
            assert.ok(cleaned.requests.some(r => r.requestId === id && r.cleaned));
            assert.ok((await db.agriEvidenceRequest.findUniqueOrThrow({ where: { id } })).cleanupCompletedAt);
            await assert.rejects(inspectEvidence({ key, backend: "local_private", namespaceVersion: 1 }, 4096, "SUPPORTING_FILE", AbortSignal.timeout(5000)));
            const valid = await download(owner.id, objectId);
            assert.equal((await inspectEvidence(valid, 4096, "SUPPORTING_FILE", AbortSignal.timeout(5000))).sha256, hash);
            assert.equal((await reconcileEvidenceReservations(true)).requests.some(r => r.requestId === id), false);
        });
        await check("private CSV retains authorized material export and never exposes storage keys", async () => { const result = await csv(staff.id, { mode: "materials" }); assert.ok(!result.csv.includes("agri-evidence/v1/")); });
        await writeFile(resolve(dir, "fixture.json"), JSON.stringify({ competitionId: edition.id, ownerId: owner.id, staffId: staff.id, objectId, archiveId, archiveHash }));
        passed = true;
    }
    finally {
        await writeFile(resolve(dir, process.argv.includes("--persistence") ? "persistence.json" : "integration.json"), JSON.stringify({ passed, checks, isolatedPostgres: true, syntheticFixtures: true, productionChanged: false, providerCalls: 0, actualOriginalBytes: true }, null, 2));
        await db.$disconnect();
    }
}
main().catch(error => { console.error(error instanceof Error ? error.message.replace(/postgresql:\/\/\S+/g, "[isolated-database]") : "Isolated integration failed"); process.exitCode = 1; });
