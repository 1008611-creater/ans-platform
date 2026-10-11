/** Actual Next.js HTTP and loopback PostgreSQL; no model/fund operation. */
import assert from "node:assert/strict";
import { createHash, createHmac, randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
const url = new URL(process.env.DATABASE_URL ?? "http://invalid");
if (url.hostname !== "127.0.0.1" || !/^\/ans_product_verify_compute(?:_r[0-9]+)?$/.test(url.pathname)) throw new Error("Refusing non-isolated HTTP writes");
const origin = "http://127.0.0.1:3121", path = "/api/integrations/toonflow/compute";
const secret = randomBytes(32).toString("hex");
const checks: { label: string; passed: boolean }[] = [];
async function main() {
  const { db } = await import("../src/lib/db");
  const prefix = `compute-http-${randomBytes(6).toString("hex")}`;
  const user = await db.user.create({ data: { email: `${prefix}@example.invalid`, username: prefix, quotaPoints: 100 }, select: { id: true } });
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3121"], {
    env: { ...process.env, AUTH_URL: origin, NEXTAUTH_URL: origin, ANS_TOONFLOW_COMPUTE_SECRET: secret, ANS_TOONFLOW_COMPUTE_ENABLED: "1", ANS_TOONFLOW_COMPUTE_POLICY: JSON.stringify({ version: "fixture-http-v1", concurrentMax: 2, models: { "fixture-model": { unit: "token", ratePoints: 1, rateUnits: 1, maxUnits: 1000 } } }) }, stdio: "ignore", windowsHide: true,
  });
  let ended = false; child.on("exit", () => { ended = true; });
  async function request(body: string | Buffer, changes: { timestamp?: string; signature?: string; type?: string; search?: string; cookie?: string } = {}) {
    const timestamp = changes.timestamp ?? String(Date.now());
    const signature = changes.signature ?? createHmac("sha256", secret).update(`POST\n${path}\n${timestamp}\n${createHash("sha256").update(body).digest("hex")}`).digest("hex");
    return fetch(origin + path + (changes.search ?? ""), { method: "POST", headers: { "content-type": changes.type ?? "application/json", "x-ans-compute-timestamp": timestamp, "x-ans-compute-signature": signature, ...(changes.cookie ? { cookie: changes.cookie } : {}) }, body: typeof body === "string" ? body : new Uint8Array(body), signal: AbortSignal.timeout(10_000) });
  }
  async function check(label: string, run: () => Promise<void>) { await run(); checks.push({ label, passed: true }); console.log(`[compute-http] PASS ${label}`); }
  try {
    let ready = false;
    for (let n = 0; n < 60; n++) {
      if (ended) throw new Error("Isolated Next server exited");
      try { if ((await fetch(origin + "/api/health", { signal: AbortSignal.timeout(1000) })).ok) { ready = true; break; } } catch { /* readiness only */ }
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    assert.equal(ready, true);
    await check("signed balance reads ANS ledger with no browser login", async () => {
      const response = await request(JSON.stringify({ action: "balance", userId: user.id }));
      assert.equal(response.status, 200); assert.deepEqual((await response.json()).data, { unit: "point", balance: 100, spendingEnabled: true });
    });
    await check("browser session cannot substitute for service signature", async () => {
      const response = await fetch(origin + path, { method: "POST", headers: { "content-type": "application/json", cookie: "authjs.session-token=fixture" }, body: JSON.stringify({ action: "balance", userId: user.id }) });
      assert.equal(response.status, 401);
    });
    await check("stale, future, malformed signature and query replay are rejected", async () => {
      const body = JSON.stringify({ action: "balance", userId: user.id });
      for (const changes of [{ timestamp: String(Date.now() - 120_000) }, { timestamp: String(Date.now() + 120_000) }, { signature: "0".repeat(64) }, { search: "?authority=admin" }]) assert.equal((await request(body, changes)).status, 401);
    });
    await check("malformed JSON and UTF-8 do not reach service", async () => {
      assert.equal((await request("invalid-json")).status, 400); assert.equal((await request(Buffer.from([0xff]))).status, 400);
      assert.equal((await request("{}", { type: "text/plain" })).status, 415);
    });
    await check("oversized signed bodies and authority overrides are rejected without echo", async () => {
      assert.equal((await request(" ".repeat(32769))).status, 413);
      const marker = "fixture-private-input";
      const response = await request(JSON.stringify({ action: "balance", userId: user.id, price: marker }));
      assert.equal(response.status, 400); assert.ok(!(await response.text()).includes(marker));
    });
    let taskId = "";
    await check("concurrent HTTP retries create one task and one debit", async () => {
      const body = JSON.stringify({ action: "reserve", userId: user.id, modelId: "fixture-model", maxUnits: 60, idempotencyKey: prefix + "-reserve" });
      const responses = await Promise.all(Array.from({ length: 5 }, () => request(body))); assert.ok(responses.every(r => r.status === 200));
      const results = await Promise.all(responses.map(r => r.json())); assert.equal(new Set(results.map(r => r.data.taskId)).size, 1); taskId = results[0].data.taskId;
      assert.equal(await db.quotaLedger.count({ where: { userId: user.id } }), 1);
    });
    await check("HTTP start, uncertain and late usage settle once with authoritative balance", async () => {
      const submit = (action: string, expectedRevision: number, extra = {}) => request(JSON.stringify({ action, userId: user.id, taskId, expectedRevision, eventId: prefix + "-" + action, ...extra }));
      assert.equal((await submit("start", 1)).status, 200); assert.equal((await submit("uncertain", 2)).status, 200);
      const args = { units: 20, outcome: "partial", evidenceRef: prefix + "-usage" };
      assert.equal((await submit("settle", 3, args)).status, 200); assert.equal((await submit("settle", 3, args)).status, 200);
      const response = await request(JSON.stringify({ action: "balance", userId: user.id })); assert.equal((await response.json()).data.balance, 80);
      assert.equal(await db.quotaLedger.count({ where: { userId: user.id } }), 2);
    });
  } finally {
    child.kill(); await new Promise<void>(resolve => { if (ended) resolve(); else { child.once("exit", () => resolve()); setTimeout(resolve, 5000).unref(); } });
    await db.computeTask.deleteMany({ where: { userId: user.id } }); await db.quotaLedger.deleteMany({ where: { userId: user.id } }); await db.user.delete({ where: { id: user.id } }); await db.$disconnect();
    await mkdir(".workbuddy/evidence/compute", { recursive: true }); await writeFile(".workbuddy/evidence/compute/http.json", JSON.stringify({ actualNextHttp: true, isolatedPostgres: true, providerCalls: 0, realFunds: false, checks }, null, 2));
  }
}
main().catch(() => { console.error("[compute-http] FAILED (diagnostics withheld)"); process.exitCode = 1; });
