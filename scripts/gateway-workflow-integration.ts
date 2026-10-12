/** End-to-end real localhost PostgreSQL check, with all supplier HTTP intercepted. */
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

function requireIsolated(value: string | undefined) {
  if (!value) throw new Error("ISOLATED_DATABASE_REQUIRED");
  const url = new URL(value);
  if (url.hostname !== "127.0.0.1" || url.port !== "65439" || url.pathname !== "/ans_verify_gateway_workflow_20261013") throw new Error("ISOLATION_GUARD_FAILED");
}
requireIsolated(process.env.DATABASE_URL);
if (process.env.DIRECT_URL) requireIsolated(process.env.DIRECT_URL);
const evidenceRoot = process.env.ANS_WORKFLOW_GATEWAY_EVIDENCE_DIR;
if (!evidenceRoot || !resolve(evidenceRoot).includes("ans-workflow-settlement-release-20261013")) throw new Error("EVIDENCE_PATH_REQUIRED");
for (const key of Object.keys(process.env)) if (/^(OPENAI|APIC|RUN_|ANS_|TOONFLOW|SUPABASE|AUTH_|S3_|PAY)/.test(key)) delete process.env[key];
process.env.ANS_UNIFIED_POINTS_ENABLED = "1";
process.env.ANS_APIC_BILLING_ENABLED = "1";
process.env.ANS_PROJECT_WORKER_DISABLED = "false";
process.env.RUN_BASE_URL = "https://apic.cauai.fun/v1";
process.env.RUN_API_KEY = "isolated-not-a-real-provider-key";
process.env.APIC_COST_BRIDGE_URL = "http://127.0.0.1:1/isolated-bridge";
process.env.APIC_COST_BRIDGE_SECRET = "isolated-not-a-real-bridge-secret";
const originalFetch = globalThis.fetch;
let supplierCalls = 0;
let bridgeCalls = 0;
const supplierQuota = 50;
const chargedPoints = supplierQuota / 500000;
const requestReceipt = "isolated_workflow_receipt_000001";
const checks: { label: string; passed: boolean }[] = [];
let currentCheck = "setup";
async function check(label: string, fn: () => Promise<void>) {
  currentCheck = label; await fn(); checks.push({ label, passed: true }); console.log("PASS " + label);
}
const profile = {
  fullName: "Isolated <Student>", headline: "Isolated verification only", about: "My isolated input, never a public project.",
  location: "", email: "", contactUrl: "", education: "", skills: ["TypeScript"],
  projects: [{ name: "Isolated private project", role: "author", description: "Only a local verification fixture.", url: "" }],
  style: "minimal", accent: "emerald", language: "en",
};
globalThis.fetch = async (input, init) => {
  const url = String(input instanceof Request ? input.url : input);
  if (url === "https://apic.cauai.fun/v1/responses") {
    supplierCalls++;
    const payload = JSON.parse(String(init?.body));
    assert.equal(payload.model, "deepseek-v4.1-flash");
    assert.equal(payload.stream, false);
    assert.ok(JSON.stringify(payload.input).includes(profile.about));
    return Response.json({ output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify({ summary: profile.about, projects: [{ description: profile.projects[0].description }] }) }] }],
      usage: { input_tokens: 20, output_tokens: 20, total_tokens: 40 } }, { headers: { "x-oneapi-request-id": requestReceipt } });
  }
  if (url === "http://127.0.0.1:1/isolated-bridge/cost/" + requestReceipt) {
    bridgeCalls++; return Response.json({ requestId: requestReceipt, quota: supplierQuota });
  }
  throw new Error("UNEXPECTED_NETWORK_REQUEST_BLOCKED");
};
async function main() {
  const { db } = await import("../src/lib/db");
  const { publishPlatformResumeRecipe } = await import("./register-platform-resume-recipe");
  const { uploadWorkflowToMarket, runMarketWorkflow, listMarketWorkflowRuns } = await import("../src/server/marketplace/workflows");
  const { executePersistedWorkflow } = await import("../src/server/workflows/runner");
  const { getWorkflowRun } = await import("../src/server/workflows/service");
  const { adjustQuota } = await import("../src/server/quota/service");
  const { readMeteredRunCost } = await import("../src/server/integrations/metered-cost");
  const prefix = "isolated-workflow-" + randomUUID();
  try {
    assert.equal(await db.user.count(), 0, "This runner requires a fresh isolated database");
    const owner = await db.user.create({ data: { username: prefix + "-owner", email: prefix + "-owner@example.test", name: "Isolated owner", role: "ADMIN", adminPermissions: ["MARKETPLACE_MANAGE", "USERS_MANAGE"] } });
    const buyer = await db.user.create({ data: { username: prefix + "-buyer", email: prefix + "-buyer@example.test", name: "Isolated buyer", role: "USER" } });
    const other = await db.user.create({ data: { username: prefix + "-other", email: prefix + "-other@example.test", name: "Isolated other", role: "USER" } });
    await adjustQuota(owner.id, buyer.id, 5, "Isolated local verification allocation");
    const source = await publishPlatformResumeRecipe(owner.id, process.cwd());
    await check("actual fixed recipe registers and publishes without owner XP", async () => {
      assert.equal(source.status, "PUBLISHED");
      const row = await db.user.findUniqueOrThrow({ where: { id: owner.id } }); assert.equal(row.xp, 0);
      assert.equal(await db.workflow.count(), 1); assert.equal(await db.marketListing.count(), 1);
      assert.equal(supplierCalls, 0); assert.equal(bridgeCalls, 0);
    });
    const upload = { expectedWorkflowVersion: 1, category: "career", subcategory: "portfolio", licenseTerms: "Isolated personal-use verification license." };
    await check("owner one-click upload recovers the exact published listing", async () => {
      const result = await uploadWorkflowToMarket(source.workflowSlug, owner.id, upload);
      assert.equal(result.id, source.listingId); assert.equal(result.status, "PUBLISHED");
      await assert.rejects(uploadWorkflowToMarket(source.workflowSlug, other.id, upload));
      assert.equal(await db.marketListing.count(), 1);
    });
    const command = { expectedVersion: 1, acknowledged: true, input: { profile }, idempotencyKey: "isolated-market-run-001" };
    await check("confirmation and version gates reject before any run or debit", async () => {
      await assert.rejects(runMarketWorkflow(source.listingId, buyer.id, { ...command, acknowledged: false }));
      await assert.rejects(runMarketWorkflow(source.listingId, buyer.id, { ...command, expectedVersion: 2 }));
      assert.equal(await db.workflowRun.count(), 0);
      assert.equal((await db.user.findUniqueOrThrow({ where: { id: buyer.id } })).quotaPoints.toString(), "5");
    });
    const queued = await runMarketWorkflow(source.listingId, buyer.id, command);
    await check("market enqueues only confirmed immutable input with no immediate supplier call", async () => {
      assert.equal(queued.run.status, "QUEUED"); assert.equal(supplierCalls, 0);
      assert.equal(queued.run.costPoints, 0);
      assert.equal(await getWorkflowRun(queued.run.id, other.id), null);
      assert.equal(await executePersistedWorkflow(queued.run.id, other.id), null);
    });
    await check("two execution attempts produce one real stored HTML and one bill", async () => {
      const outcomes = await Promise.all([executePersistedWorkflow(queued.run.id, buyer.id), executePersistedWorkflow(queued.run.id, buyer.id)]);
      assert.equal(outcomes.filter(Boolean).length, 1);
      const run = await getWorkflowRun(queued.run.id, buyer.id); assert.ok(run); assert.equal(run.status, "SUCCEEDED");
      const artifact = run.output as { kind: string; mediaType: string; filename: string; content: string };
      assert.equal(artifact.kind, "resume-website"); assert.equal(artifact.mediaType, "text/html"); assert.equal(artifact.filename, "my-portfolio.html");
      assert.ok(artifact.content.startsWith("<!doctype html>")); assert.ok(artifact.content.includes("Isolated &lt;Student&gt;"));
      assert.ok(artifact.content.includes(profile.projects[0].description)); assert.equal(supplierCalls, 1); assert.equal(bridgeCalls, 1);
    });
    await check("immutable quote actual evidence account balance and parent bill agree", async () => {
      const request = await db.apiComputeRequest.findFirstOrThrow({ where: { userId: buyer.id } });
      assert.equal(request.state, "SETTLED"); assert.equal(Number(request.settledPoints), chargedPoints);
      const price = request.price as Record<string, unknown>; assert.equal(price.verifiedUpstreamPoints, undefined); assert.equal(price.platformCoveredPoints, undefined);
      const evidence = await db.$queryRaw<{kind:string; upstreamQuota:bigint; billedPoints:{toString():string}}[]>`SELECT kind,"upstreamQuota","billedPoints" FROM api_compute_billing_evidence WHERE "requestId"=${request.id}`;
      assert.equal(evidence.length, 1); assert.equal(evidence[0].kind, "VERIFIED"); assert.equal(Number(evidence[0].upstreamQuota), supplierQuota);
      assert.equal(Number(evidence[0].billedPoints.toString()), chargedPoints);
      const parent = await readMeteredRunCost(db, buyer.id, { type: "workflow_run", id: queued.run.id });
      assert.equal(parent.settledPoints, chargedPoints); assert.equal(parent.pendingPoints, 0); assert.equal(parent.requestCount, 1);
      const run = await getWorkflowRun(queued.run.id, buyer.id); assert.ok(run); assert.equal(run.costPoints, chargedPoints);
      const account = await db.user.findUniqueOrThrow({ where: { id: buyer.id } });
      assert.equal(Number(account.quotaPoints), 5 - chargedPoints);
      const ledgers = await db.quotaLedger.findMany({ where: { userId: buyer.id } });
      assert.equal(Math.round(ledgers.reduce((sum,row)=>sum+Number(row.amount),0)*1e6), Math.round(Number(account.quotaPoints)*1e6));
      assert.equal(ledgers.filter(row=>Number(row.amount)<0).length, 1);
    });
    await check("repeat market submit is the same output and cannot double-charge", async () => {
      const again = await runMarketWorkflow(source.listingId, buyer.id, command); assert.equal(again.run.id, queued.run.id);
      assert.equal(await executePersistedWorkflow(queued.run.id, buyer.id), null);
      await assert.rejects(runMarketWorkflow(source.listingId, buyer.id, { ...command, input: { profile: { ...profile, about: "Different isolated facts" } } }));
      assert.equal(await db.apiComputeRequest.count({ where: { userId: buyer.id } }), 1); assert.equal(supplierCalls, 1);
      const visible = await listMarketWorkflowRuns(source.listingId, buyer.id); assert.equal(visible.runs.length, 1);
      assert.equal((await listMarketWorkflowRuns(source.listingId, other.id)).runs.length, 0);
    });
    const final = await getWorkflowRun(queued.run.id, buyer.id); assert.ok(final);
    const artifact = final.output as {content:string};
    await mkdir(evidenceRoot!, { recursive: true });
    await writeFile(resolve(evidenceRoot!, "workflow-chain-isolated.json"), JSON.stringify({ status:"PASS", database:"ans_verify_gateway_workflow_20261013", migrationCount:await db.$queryRaw`SELECT count(*)::int AS count FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`, checks, supplierCalls, bridgeCalls, supplierPoints:chargedPoints, artifactSha256:createHash("sha256").update(artifact.content).digest("hex"), productionWrites:0, realSupplierCalls:0, limitations:"Synthetic inputs and HTTP exist only in explicitly guarded loopback DB; no production paid generation or browser download is certified." },null,2));
  } finally { globalThis.fetch=originalFetch; await db.$disconnect(); }
}
main().catch(async error => {
  globalThis.fetch=originalFetch;
  await mkdir(evidenceRoot!, {recursive:true});
  await writeFile(resolve(evidenceRoot!, "workflow-chain-isolated-failure.json"), JSON.stringify({ status:"FAIL", currentCheck, checks, code:typeof error?.code==="string"?error.code:null, message:error instanceof Error?error.message:"Unknown failure", productionWrites:0, realSupplierCalls:0 },null,2));
  console.error("ISOLATED_WORKFLOW_CHECK_FAILED " + currentCheck); process.exitCode=1;
});