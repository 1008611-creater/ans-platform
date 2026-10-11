/** Real isolated PostgreSQL; deterministic model fixtures, no upstream calls. */
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import type { WorkflowNodeExecutor } from "../src/domain/workflows/executor";

for (const key of ["DATABASE_URL", "DIRECT_URL"]) {
  const value = process.env[key];
  if (!value) throw new Error("Explicit isolated database connection required");
  const url = new URL(value);
  if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) || !/^\/ans_product_(?:test|verify)(?:_[a-z0-9_]+)?$/.test(url.pathname)) throw new Error("Refusing non-isolated database writes");
}
const prefix = `website-test-${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`;
const checks: string[] = [];
async function main() {
  const { db } = await import("../src/lib/db");
  const api = await import("../src/server/projects/resume-website");
  const { executePersistedWorkflow } = await import("../src/server/workflows/runner");
  const { RESUME_WEBSITE_EXAMPLE, plainResumeWebsiteCopy } = await import("../src/domain/projects/resume-website");
  const fixtures: string[] = [];
  const admin = await db.user.create({ data: { email: `${prefix}-admin@example.invalid`, username: `${prefix}-admin`, locale: "zh", role: "ADMIN" } }); fixtures.push(admin.id);
  const input = structuredClone(RESUME_WEBSITE_EXAMPLE);
  input.fullName = "隔离验收用户";
  const copy = plainResumeWebsiteCopy(input);
  const handlers = (text = JSON.stringify(copy)): Partial<Record<string, WorkflowNodeExecutor>> => ({ model: async () => text, output: ({ dependencyOutputs }) => Object.values(dependencyOutputs).at(-1) });
  async function check(label: string, run: () => Promise<void>) { await run(); checks.push(label); console.log(`[website] PASS ${label}`); }
  try {
    const [owner, outsider] = await Promise.all(["owner", "outsider"].map(role => db.user.create({ data: { email: `${prefix}-${role}@example.invalid`, username: `${prefix}-${role}`, quotaPoints: 100, locale: "zh" } })));
    fixtures.push(owner.id, outsider.id);
    const project = await db.project.create({ data: { ownerId: owner.id, title: "[隔离验收] 简历网站", goal: "PORTFOLIO" } });
    const balance = async () => (await db.user.findUniqueOrThrow({ where: { id: owner.id } })).quotaPoints;
    const request = (key: string, revision = 1) => ({ revision, acknowledged: true as const, idempotencyKey: `${prefix}-${key}` });
    await check("owner isolation and strict input validation", async () => {
      await assert.rejects(api.getResumeWebsiteState(project.id, outsider.id), /NOT_FOUND/);
      await assert.rejects(api.saveResumeWebsiteInput(project.id, outsider.id, { expectedRevision: 0, input }), /NOT_FOUND/);
      await assert.rejects(api.saveResumeWebsiteInput(project.id, owner.id, { expectedRevision: 0, input: { ...input, contactUrl: "javascript:alert(1)" } }));
      assert.equal((await api.getResumeWebsiteState(project.id, owner.id)).revision, 0);
      assert.equal((await api.saveResumeWebsiteInput(project.id, owner.id, { expectedRevision: 0, input })).revision, 1);
    });
    await check("revision CAS preserves winning draft", async () => {
      const results = await Promise.allSettled([api.saveResumeWebsiteInput(project.id, owner.id, { expectedRevision: 1, input }), api.saveResumeWebsiteInput(project.id, owner.id, { expectedRevision: 1, input })]);
      assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
      assert.equal((await api.getResumeWebsiteState(project.id, owner.id)).revision, 2);
    });
    let accepted = await api.enqueueResumeWebsite(project.id, owner.id, request("success", 2));
    await check("accepted request retry returns same run and debits only once", async () => {
      const again = await api.enqueueResumeWebsite(project.id, owner.id, request("success", 2));
      assert.equal(again.id, accepted.id); assert.equal(await balance(), 98);
      await assert.rejects(api.enqueueResumeWebsite(project.id, owner.id, request("success", 1)), /IDEMPOTENCY_CONFLICT/);
      await assert.rejects(api.enqueueResumeWebsite(project.id, owner.id, request("other", 2)), /RUN_IN_PROGRESS/);
    });
    await check("project cannot bypass artifact adapter and concurrent execution claims once", async () => {
      await assert.rejects(executePersistedWorkflow(accepted.id, owner.id, { handlers: handlers() }), /PROJECT_ADAPTER_REQUIRED/);
      let calls = 0;
      const h = { ...handlers(), model: async () => { calls++; return JSON.stringify(copy); } };
      await Promise.all([api.executeResumeWebsiteRun(accepted.id, owner.id, { handlers: h }), api.executeResumeWebsiteRun(accepted.id, owner.id, { handlers: h })]);
      assert.equal(calls, 1);
      const state = await api.getResumeWebsiteState(project.id, owner.id);
      assert.equal(state.runs[0].status, "SUCCEEDED"); assert.equal(state.versions.length, 1);
      assert.equal(state.versions[0].snapshot.inputRevision, 2);
      assert.equal(state.versions[0].snapshot.sourceWorkflowRunId, accepted.id);
      assert.match((await api.downloadResumeWebsite(project.id, owner.id, state.versions[0].id)).html, /<!doctype html>/);
    });
    await check("manual edits append versions without compute and historical download stays stable", async () => {
      const state = await api.getResumeWebsiteState(project.id, owner.id); const base = state.versions[0];
      const oldHtml = (await api.downloadResumeWebsite(project.id, owner.id, base.id)).html;
      const changed = { ...copy, summary: "这是一份手工确认的真实介绍。" };
      const edit = { baseVersionId: base.id, expectedVersion: 1, copy: changed };
      await assert.rejects(api.saveResumeWebsiteCopy(project.id, outsider.id, edit), /NOT_FOUND/);
      await assert.rejects(api.downloadResumeWebsite(project.id, outsider.id, base.id), /NOT_FOUND/);
      const saved = await api.saveResumeWebsiteCopy(project.id, owner.id, edit);
      assert.equal(saved.version, 2); assert.equal(await balance(), 98);
      await assert.rejects(api.saveResumeWebsiteCopy(project.id, owner.id, edit), /VERSION_CONFLICT/);
      assert.equal((await api.downloadResumeWebsite(project.id, owner.id, base.id)).html, oldHtml);
      assert.match((await api.downloadResumeWebsite(project.id, owner.id, saved.id)).html, /手工确认/);
    });
    await check("invalid model JSON fails without leaking private text and refunds exactly once", async () => {
      const run = await api.enqueueResumeWebsite(project.id, owner.id, request("bad-json", 2));
      const privateMarker = "PRIVATE_MODEL_FRAGMENT_12345";
      await api.executeResumeWebsiteRun(run.id, owner.id, { handlers: handlers(privateMarker) });
      const saved = await db.workflowRun.findUniqueOrThrow({ where: { id: run.id } });
      assert.equal(saved.status, "FAILED"); assert.equal(await balance(), 98);
      assert.ok(!saved.error?.includes(privateMarker));
      const audits = await db.auditLog.findMany({ where: { resourceId: run.id } });
      assert.ok(!JSON.stringify(audits).includes(privateMarker));
      await api.executeResumeWebsiteRun(run.id, owner.id, { handlers: handlers() });
      assert.equal(await db.quotaLedger.count({ where: { refId: run.id, reason: "REFUND" } }), 1);
    });
    await check("wrong result structure never saves partial artifact", async () => {
      const run = await api.enqueueResumeWebsite(project.id, owner.id, request("bad-count", 2));
      await api.executeResumeWebsiteRun(run.id, owner.id, { handlers: handlers(JSON.stringify({ ...copy, projects: [copy.projects[0]] })) });
      assert.equal((await db.workflowRun.findUniqueOrThrow({ where: { id: run.id } })).status, "FAILED");
      assert.equal((await api.getResumeWebsiteState(project.id, owner.id)).versions.length, 2); assert.equal(await balance(), 98);
    });
    await check("queued cancellation is owner-only and refunds once", async () => {
      const run = await api.enqueueResumeWebsite(project.id, owner.id, request("cancel", 2));
      await assert.rejects(api.cancelResumeWebsiteRun(project.id, outsider.id, run.id), /NOT_FOUND/);
      await Promise.all([api.cancelResumeWebsiteRun(project.id, owner.id, run.id), api.cancelResumeWebsiteRun(project.id, owner.id, run.id)]);
      assert.equal(await balance(), 98); assert.equal(await db.quotaLedger.count({ where: { refId: run.id, reason: "REFUND" } }), 1);
      assert.equal(await api.executeResumeWebsiteRun(run.id, owner.id, { handlers: handlers() }), null);
    });
    await check("interrupted running recovery refunds once and prevents late success", async () => {
      const run = await api.enqueueResumeWebsite(project.id, owner.id, request("expire", 2));
      await db.workflowRun.update({ where: { id: run.id }, data: { status: "RUNNING", startedAt: new Date(Date.now() - 240_000) } });
      const results = await Promise.all([api.expireResumeWebsiteRun(run.id, new Date()), api.expireResumeWebsiteRun(run.id, new Date())]);
      assert.equal(results.filter(Boolean).length, 1); assert.equal(await balance(), 98);
      assert.equal(await db.quotaLedger.count({ where: { refId: run.id, reason: "REFUND" } }), 1);
    });
    await check("insufficient quota rolls back run, ledger and nodes", async () => {
      await db.user.update({ where: { id: owner.id }, data: { quotaPoints: 1 } });
      await assert.rejects(api.enqueueResumeWebsite(project.id, owner.id, request("insufficient", 2)), /算力不足/);
      assert.equal(await db.workflowRun.count({ where: { projectId: project.id, idempotencyKey: { endsWith: "insufficient" } } }), 0);
      await db.user.update({ where: { id: owner.id }, data: { quotaPoints: 98 } });
    });
    await check("disabled worker refuses new work before any debit", async () => {
      const before = await balance();
      process.env.ANS_PROJECT_WORKER_DISABLED = "true";
      try { await assert.rejects(api.enqueueResumeWebsite(project.id, owner.id, request("disabled", 2)), /WORKER_UNAVAILABLE/); }
      finally { delete process.env.ANS_PROJECT_WORKER_DISABLED; }
      assert.equal(await balance(), before);
      assert.equal(await db.workflowRun.count({ where: { projectId: project.id, idempotencyKey: { endsWith: "disabled" } } }), 0);
    });
    await check("different concurrent requests accept only one active run and one debit", async () => {
      const before = await balance();
      const results = await Promise.allSettled([api.enqueueResumeWebsite(project.id, owner.id, request("race-a", 2)), api.enqueueResumeWebsite(project.id, owner.id, request("race-b", 2))]);
      const winners = results.filter((r): r is PromiseFulfilledResult<typeof accepted> => r.status === "fulfilled");
      assert.equal(winners.length, 1); assert.equal(await balance(), before - 2);
      await api.cancelResumeWebsiteRun(project.id, owner.id, winners[0].value.id);
      assert.equal(await balance(), before);
    });
    await check("running cancellation aborts execution and cannot commit late success", async () => {
      const run = await api.enqueueResumeWebsite(project.id, owner.id, request("running-cancel", 2));
      let started!: () => void;
      const entered = new Promise<void>(resolve => { started = resolve; });
      const executing = api.executeResumeWebsiteRun(run.id, owner.id, { handlers: { ...handlers(), model: ({ signal }) => new Promise<string>(resolve => { started(); signal.addEventListener("abort", () => resolve(JSON.stringify(copy)), { once: true }); }) } });
      await entered;
      await api.cancelResumeWebsiteRun(project.id, owner.id, run.id);
      await executing;
      assert.equal((await db.workflowRun.findUniqueOrThrow({ where: { id: run.id } })).status, "CANCELLED");
      assert.equal(await balance(), 98);
      assert.equal((await api.getResumeWebsiteState(project.id, owner.id)).versions.length, 2);
    });
    await check("private upstream error never enters audit or refund notes", async () => {
      const run = await api.enqueueResumeWebsite(project.id, owner.id, request("private-error", 2));
      await api.executeResumeWebsiteRun(run.id, owner.id, { handlers: { ...handlers(), model: () => { throw new Error("PRIVATE_UPSTREAM_FRAGMENT_4321"); } } });
      const stored = await db.workflowRun.findUniqueOrThrow({ where: { id: run.id }, include: { nodeRuns: true } });
      const audit = await db.auditLog.findMany({ where: { resourceId: run.id } });
      const ledger = await db.quotaLedger.findMany({ where: { refId: run.id } });
      assert.ok(!JSON.stringify([stored.error, stored.nodeRuns.map(node => node.error), audit, ledger]).includes("PRIVATE_UPSTREAM_FRAGMENT_4321"));
      assert.equal(await balance(), 98);
    });
    await check("artifact insert failure rolls back success and version increment without private diagnostics", async () => {
      const run = await api.enqueueResumeWebsite(project.id, owner.id, request("save-fault", 2));
      const constraint = "website_fixture_fault_" + randomBytes(6).toString("hex");
      assert(/^[a-z0-9_]+$/.test(constraint) && /^[a-z0-9]+$/.test(run.id));
      const oldError = console.error; const logs: string[] = [];
      console.error = (...args: unknown[]) => logs.push(args.map(String).join(" "));
      try {
        // Reversible fault injection only after the isolated DB guard above.
        await db.$executeRawUnsafe(`ALTER TABLE "artifact_versions" ADD CONSTRAINT "${constraint}" CHECK ("workflowRunId" IS DISTINCT FROM '${run.id}') NOT VALID`);
        await api.executeResumeWebsiteRun(run.id, owner.id, { handlers: handlers(JSON.stringify({ ...copy, summary: "PRIVATE_DATABASE_FRAGMENT_9876" })) });
      } finally {
        await db.$executeRawUnsafe(`ALTER TABLE "artifact_versions" DROP CONSTRAINT IF EXISTS "${constraint}"`);
        console.error = oldError;
      }
      const state = await api.getResumeWebsiteState(project.id, owner.id);
      const stored = await db.workflowRun.findUniqueOrThrow({ where: { id: run.id } });
      const audit = await db.auditLog.findMany({ where: { resourceId: run.id } });
      const ledger = await db.quotaLedger.findMany({ where: { refId: run.id } });
      assert.equal(stored.status, "FAILED"); assert.equal(stored.error, "ARTIFACT_SAVE_FAILED");
      assert.equal(state.versions.length, 2);
      assert.equal((await db.artifact.findUniqueOrThrow({ where: { projectId_workflowId: { projectId: project.id, workflowId: "resume-website" } } })).currentVersion, 2);
      assert.ok(logs.length > 0, "Real ORM error event must be exercised");
      assert.ok(!JSON.stringify([logs, stored.error, audit, ledger]).includes("PRIVATE_DATABASE_FRAGMENT_9876"));
      assert.equal(await balance(), 98); assert.equal(ledger.filter(row => row.reason === "REFUND").length, 1);
    });
    await check("archive during execution fails delivery atomically and refunds once", async () => {
      const run = await api.enqueueResumeWebsite(project.id, owner.id, request("mid-archive", 2));
      await api.executeResumeWebsiteRun(run.id, owner.id, { handlers: { ...handlers(), model: async () => {
        await db.project.update({ where: { id: project.id }, data: { status: "ARCHIVED" } });
        return JSON.stringify(copy);
      } } });
      assert.equal((await db.workflowRun.findUniqueOrThrow({ where: { id: run.id } })).error, "ARTIFACT_SAVE_FAILED");
      assert.equal((await api.getResumeWebsiteState(project.id, owner.id)).versions.length, 2); assert.equal(await balance(), 98);
      await db.project.update({ where: { id: project.id }, data: { status: "ACTIVE" } });
    });
    for (const change of ["revision", "archive"] as const) {
      await check(`acceptance rechecks ${change} after waiting on the project lock`, async () => {
        const target = await db.project.create({ data: { ownerId: owner.id, title: "[Isolated verification] " + change, goal: "PORTFOLIO" } });
        await api.saveResumeWebsiteInput(target.id, owner.id, { expectedRevision: 0, input });
        let submitted!: ReturnType<typeof api.enqueueResumeWebsite>;
        await db.$transaction(async tx => {
          await tx.$queryRaw`SELECT "id" FROM "projects" WHERE "id" = ${target.id} FOR UPDATE`;
          submitted = api.enqueueResumeWebsite(target.id, owner.id, request("locked-" + change));
          void submitted.catch(() => undefined);
          const deadline = Date.now() + 5000;
          while (true) {
            const blocked = await db.$queryRaw<{ count: bigint }[]>`SELECT count(*) AS count FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock' AND position('FOR UPDATE' in query) > 0 AND position('projects' in query) > 0 AND position('pg_stat_activity' in query) = 0`;
            if (Number(blocked[0].count) > 0) break;
            assert(Date.now() < deadline, "Run did not reach project lock");
            await new Promise(resolve => setTimeout(resolve, 25));
          }
          if (change === "revision") await tx.projectWorkflowInput.update({ where: { projectId_workflowId: { projectId: target.id, workflowId: "resume-website" } }, data: { revision: 2 } });
          else await tx.project.update({ where: { id: target.id }, data: { status: "ARCHIVED" } });
        }, { timeout: 10_000 });
        await assert.rejects(submitted, change === "revision" ? /REVISION_CONFLICT/ : /ARCHIVED/);
        assert.equal(await db.workflowRun.count({ where: { projectId: target.id } }), 0); assert.equal(await balance(), 98);
      });
    }
    await check("archived projects remain downloadable but cannot generate or edit", async () => {
      const run = await api.enqueueResumeWebsite(project.id, owner.id, request("archive", 2));
      await db.project.update({ where: { id: project.id }, data: { status: "ARCHIVED" } });
      await api.executeResumeWebsiteRun(run.id, owner.id, { handlers: handlers() });
      assert.equal(await balance(), 98);
      await assert.rejects(api.enqueueResumeWebsite(project.id, owner.id, request("archived", 2)), /ARCHIVED/);
      await assert.rejects(api.saveResumeWebsiteInput(project.id, owner.id, { expectedRevision: 2, input }), /ARCHIVED/);
      const state = await api.getResumeWebsiteState(project.id, owner.id);
      assert.equal(state.archived, true); assert.ok((await api.downloadResumeWebsite(project.id, owner.id, state.versions[0].id)).html);
    });
    await check("restricted account cannot read private project or spend", async () => {
      await db.user.update({ where: { id: owner.id }, data: { flagged: true } });
      await assert.rejects(api.getResumeWebsiteState(project.id, owner.id), /NOT_FOUND/);
      await assert.rejects(api.enqueueResumeWebsite(project.id, owner.id, request("flagged", 2)), /NOT_FOUND/);
    });
    await mkdir(".workbuddy/evidence/resume-website", { recursive: true });
    await writeFile(".workbuddy/evidence/resume-website/integration.json", JSON.stringify({ environment: "isolated PostgreSQL; deterministic simulated model; no upstream API", prefix, checks, passed: checks.length }, null, 2));
    console.log(`[website] ${checks.length}/${checks.length} passed`);
  } finally {
    if (fixtures.length) {
      await db.project.updateMany({ where: { ownerId: { in: fixtures } }, data: { status: "ARCHIVED" } });
      await db.user.updateMany({ where: { id: { in: fixtures } }, data: { flagged: true, deletedAt: new Date() } });
    }
    await db.$disconnect();
  }
}
main().catch(() => { console.error("[website] FAIL; inspect assertion trace in isolated development only"); process.exitCode = 1; });
