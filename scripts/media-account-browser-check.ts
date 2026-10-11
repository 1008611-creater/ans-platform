/** Real Next and isolated PostgreSQL; model catalog and WebSocket fixtures, no provider calls. */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { encode } from "next-auth/jwt";
import puppeteer, { type Page, type ElementHandle } from "puppeteer";
let stage = "isolated environment guard";
async function main() {
  for (const name of ["DATABASE_URL", "DIRECT_URL"]) {
    const url = new URL(process.env[name] || "");
    assert(["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) && url.pathname === "/ans_product_verify_audit3");
  }
  assert(process.env.AUTH_SECRET);
  const { db } = await import("../src/lib/db");
  const { encryptCredential } = await import("../src/server/integrations/credential-crypto");
  const base = "http://127.0.0.1:3111", prefix = "media-account-browser-" + randomBytes(6).toString("hex");
  const output = ".workbuddy/evidence/audits/round-4/account-browser";
  const fifthOutput = ".workbuddy/evidence/audits/round-5/status-browser";
  await mkdir(output, { recursive: true }); await mkdir(fifthOutput, { recursive: true });
  const t = JSON.parse(await readFile("messages/zh.json", "utf8")).prompts;
  const axe = await readFile(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
  const report = { passed: false, environment: "isolated PostgreSQL and production Next; fixture sessions, catalog, outputs and WebSocket; zero provider calls", checks: [] as { round: number; name: string }[], accessibility: [] as unknown[], pageErrors: 0, translationErrors: 0 };
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3111"], { env: process.env, windowsHide: true, stdio: ["ignore", "ignore", "ignore"] });
  const browser = await puppeteer.launch({ headless: true, executablePath: await puppeteer.executablePath(), args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"] });
  const users: string[] = [];
  let page: Page | null = null, modelsEnabled = false;
  const posts: { actor: string | undefined; key: string }[] = [];
  const modelActors: string[] = [];
  const recoveryResponses: { status: number; type?: string; state?: string }[] = [];
  async function until(test: () => Promise<boolean>, timeout = 30000) { const end = Date.now() + timeout; while (!await test()) { if (Date.now() > end) throw new Error("Browser condition timed out"); await new Promise(resolve => setTimeout(resolve, 100)); } }
  async function check(round: number, name: string, run: () => Promise<void>) { stage = name; await run(); report.checks.push({ round, name }); console.log("[media account browser] PASS " + name); }
  async function click(label: string) {
    assert(page); await page.bringToFront();
    await until(async () => page!.evaluate(label => Array.from(document.querySelectorAll("button,[role=menuitem]")).some(n => n.textContent?.trim() === label && !(n as HTMLButtonElement).disabled), label));
    const handle = await page.evaluateHandle(label => Array.from(document.querySelectorAll<HTMLElement>("button,[role=menuitem]")).find(n => n.textContent?.trim() === label && !(n as HTMLButtonElement).disabled), label);
    const element = handle.asElement(); assert(element); await (element as ElementHandle<HTMLElement>).click(); await handle.dispose();
  }
  async function cookie(userId: string) {
    const token = await encode({ token: { id: userId, pwdAt: 0 }, secret: process.env.AUTH_SECRET!, salt: "authjs.session-token", maxAge: 3600 });
    await page!.browserContext().setCookie({ name: "authjs.session-token", value: token, domain: "127.0.0.1", path: "/", httpOnly: true, secure: false, sameSite: "Lax" });
  }
  async function visit() { assert.equal((await page!.goto(base + "/prompts/new?type=IMAGE&content=PRIVATE_INPUT_BROWSER_FIXTURE", { waitUntil: "networkidle0" }))?.status(), 200); }
  const has = (text: string) => page!.evaluate(text => document.body.innerText.includes(text) === true, text);
  const emit = (body: unknown) => page!.evaluate(body => (window as unknown as { __ansMediaFixture: { emit: (body: unknown) => void } }).__ansMediaFixture.emit(body), body);
  async function seed(userId: string, legacy = false, state: "ACCEPTED" | "UNCERTAIN" = "ACCEPTED") {
    const key = randomUUID(), hash = randomBytes(32).toString("hex");
    await db.mediaGeneration.create({ data: { userId, idempotencyKey: key, requestHash: hash, provider: "wiro", model: "fixture-browser", type: "image", status: state, encryptedTask: state === "ACCEPTED" ? encryptCredential(JSON.stringify({ taskId: "fixture-original-task", socketAccessToken: "fixture-private-task-token" })) : null, webSocketUrl: "wss://fixture.invalid/socket", creditRevision: 0 } });
    await page!.evaluate(({ userId, key, hash, legacy }) => { sessionStorage.clear(); sessionStorage.setItem(`${legacy ? "ans-media-request-v1" : `ans-media-request-v2:${userId}:IMAGE`}:${hash}`, JSON.stringify({ hash, key })); }, { userId, key, hash, legacy });
    return { hash, key };
  }
  async function audit(label: string, width: number) {
    await page!.setViewport({ width, height: width < 600 ? 844 : 1000 });
    assert.equal(await page!.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    await page!.screenshot({ path: output + "/" + label + ".png", fullPage: true });
    await page!.addScriptTag({ content: axe });
    const violations = await page!.evaluate(async () => (await (window as unknown as { axe: { run: (doc: Document, options: unknown) => Promise<{ violations: { id: string; nodes: { target: string[] }[] }[] }> } }).axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } })).violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })));
    report.accessibility.push({ label, width, violations }); assert.deepEqual(violations, []);
  }
  try {
    await until(async () => { if (child.exitCode !== null) throw new Error("Preview exited"); try { return (await fetch(base + "/api/health")).status === 200; } catch { return false; } });
    for (let i = 0; i < 2; i++) { const u = await db.user.create({ data: { username: `${prefix}-${i}`, email: `${prefix}-${i}@example.invalid`, generationCreditsRemaining: 0, dailyGenerationLimit: 3 } }); users.push(u.id); }
    page = await browser.newPage(); page.setDefaultTimeout(20_000);
    page.on("response", response => {
      const url = new URL(response.url());
      if (url.pathname === "/api/media-generate" && url.searchParams.has("key")) {
        void response.json().then(data => recoveryResponses.push({ status: response.status(), type: data.type, state: data.error || (data.pending ? "pending" : "accepted") })).catch(() => {});
      }
    });
    page.on("pageerror", error => { report.pageErrors++; console.log("[media account browser] page error classification", JSON.stringify({ type: error instanceof Error ? error.name : "unknown", undefinedMember: String(error).includes("undefined"), socket: String(error).includes("WebSocket") })); }); page.on("console", msg => { if (/MISSING_MESSAGE|Missing translation:/.test(msg.text())) report.translationErrors++; });
    // Keep this injected browser script as JavaScript text. The TS runner's
    // function-name helpers are not globals in Chromium's page context.
    await page.evaluateOnNewDocument(`(() => {
      const sockets = [];
      let lastMessage = null;
      class FixtureSocket {
        constructor() { this.onopen = null; this.onmessage = null; this.onerror = null; this.onclose = null; sockets.push(this); setTimeout(() => { this.onopen?.(); }, 25); }
        send() { lastMessage = this.onmessage; }
        close() {}
      }
      window.WebSocket = FixtureSocket;
      window.__ansMediaFixture = {
        emit: body => sockets.at(-1)?.onmessage?.({ data: JSON.stringify(body) }),
        late: body => lastMessage?.({ data: JSON.stringify(body) }),
        count: () => sockets.length,
      };
    })();`);
    await page.setRequestInterception(true);
    page.on("request", request => {
      void (async () => {
        const url = new URL(request.url());
        if (!["127.0.0.1", "localhost"].includes(url.hostname)) { await request.abort(); return; }
        if (url.pathname === "/api/media-generate" && request.method() === "GET" && !url.searchParams.has("key")) {
          if (request.headers()["x-ans-actor"]) modelActors.push(request.headers()["x-ans-actor"]);
          await request.respond({ status: 200, contentType: "application/json", body: JSON.stringify({ imageModels: modelsEnabled ? [{ id: "fixture-browser", name: "Fixture browser model", type: "image", provider: "wiro", providerName: "Fixture provider" }] : [], videoModels: [], audioModels: [] }) }); return;
        }
        if (url.pathname === "/api/media-generate" && request.method() === "POST" && !url.searchParams.has("account-guard-fixture")) {
          const data = JSON.parse(request.postData() || "{}");
          posts.push({ actor: request.headers()["x-ans-actor"], key: data.idempotencyKey });
          await request.respond({ status: 202, contentType: "application/json", body: JSON.stringify({ pending: true, requiresReview: true }) }); return;
        }
        await request.continue();
      })().catch(() => { report.pageErrors++; });
    });
    await cookie(users[0]); await visit();
    const old = await seed(users[0], true); await visit();
    await check(4, "owned legacy task is recoverable without enabled models and migrates without a POST", async () => {
      await click(t.resumeGeneration); await until(async () => has(t.mediaGeneration.connected));
      assert.equal(posts.length, 0);
      const stored = await page!.evaluate(() => JSON.stringify(sessionStorage));
      assert(stored.includes("ans-media-request-v2:" + users[0]), "owned v2 record missing");
      assert(!stored.includes("ans-media-request-v1:"), "legacy record remains");
      assert(stored.includes(old.key), "original key missing");
      assert(!stored.includes("fixture-private-task-token"), "task token in storage");
    });
    await check(5, "WebSocket stage and repeated output events never display a fabricated percentage", async () => {
      for (const type of ["task_accept", "task_start", "task_output", "task_output"]) await emit({ type, message: "PRIVATE_PROVIDER_DIAGNOSTIC_BROWSER_FIXTURE" });
      assert.equal(await page!.$('[role="progressbar"]'), null);
      assert.equal(await has("PRIVATE_PROVIDER_DIAGNOSTIC_BROWSER_FIXTURE"), false);
    });
    await check(4, "changing the cookie account refreshes the member and discards an old socket callback", async () => {
      await cookie(users[1]); await page!.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
      await until(async () => modelActors.includes(users[1]));
      await page!.evaluate(() => (window as unknown as { __ansMediaFixture: { late: (body: unknown) => void } }).__ansMediaFixture.late({ type: "task_postprocess_end", message: [{ url: "https://example.invalid/private-account-a.png" }] }));
      assert.equal(await page!.$('img[src*="private-account-a"]'), null); assert.equal(await has(t.mediaAddedToPrompt), false);
      assert.equal(await page!.evaluate(userId => Object.keys(sessionStorage).filter(k => k.startsWith(`ans-media-request-v2:${userId}:`)).length, users[1]), 0);
    });
    await check(4, "server rejects an old actor header before any new task or allowance change", async () => {
      const before = await db.mediaGeneration.count({ where: { userId: users[1] } });
      // PATCH-free fetch POST is locally intercepted by default. Use a distinct
      // query flag for this real ownership guard request, never call a provider.
      const result = await page!.evaluate(async actor => { const r = await fetch("/api/media-generate?account-guard-fixture=1", { method: "POST", headers: { "Content-Type": "application/json", "x-ans-actor": actor }, body: "{}" }); return { status: r.status, body: await r.json() }; }, users[0]);
      assert.equal(result.status, 409); assert.equal(result.body.error, "MEDIA_ACCOUNT_CHANGED");
      assert.equal(await db.mediaGeneration.count({ where: { userId: users[1] } }), before);
      assert.equal((await db.user.findUniqueOrThrow({ where: { id: users[1] } })).generationCreditsRemaining, 0);
    });
    await cookie(users[0]); await visit(); modelsEnabled = true; await visit();
    await check(4, "same-tab account change creates a separate explicitly confirmed request key", async () => {
      await page!.evaluate(() => sessionStorage.clear()); await visit();
      await click(t.generateMedia); await click("Fixture browser model"); await click(t.startGeneration); await until(async () => has(t.generationReviewRequired));
      await cookie(users[1]); await visit(); await click(t.generateMedia); await click("Fixture browser model"); await click(t.startGeneration); await until(async () => has(t.generationReviewRequired));
      assert.equal(posts.length, 2); assert.equal(posts[0].actor, users[0]); assert.equal(posts[1].actor, users[1]); assert.notEqual(posts[0].key, posts[1].key);
    });
    modelsEnabled = false;
    await seed(users[1]); await visit(); await click(t.resumeGeneration); await until(async () => has(t.mediaGeneration.connected));
    await check(5, "confirmed provider failure hides upstream diagnostics and preserves the recoverable task", async () => {
      await emit({ type: "task_error", message: "PRIVATE_PROVIDER_DIAGNOSTIC_BROWSER_FIXTURE" });
      await until(async () => has(t.generationProviderFailed)); assert.equal(await has("PRIVATE_PROVIDER_DIAGNOSTIC_BROWSER_FIXTURE"), false);
      assert.equal(await page!.evaluate(() => Object.keys(sessionStorage).filter(k => k.startsWith("ans-media-request-")).length), 1); await audit("provider-failure-desktop", 1440); await audit("provider-failure-mobile", 390);
    });
    await seed(users[1]); await visit(); await click(t.resumeGeneration); await until(async () => has(t.mediaGeneration.connected));
    await check(5, "finished event without a usable output remains a recoverable error", async () => {
      await emit({ type: "task_postprocess_end", message: [{ url: "javascript:alert(1)" }] });
      await until(async () => has(t.generationConnectionFailed)); assert.equal(await has(t.mediaAddedToPrompt), false); assert.equal(await page!.evaluate(() => Object.keys(sessionStorage).filter(k => k.startsWith("ans-media-request-")).length), 1);
    });
    await seed(users[1]); await visit(); await click(t.resumeGeneration); await until(async () => has(t.mediaGeneration.connected));
    await check(5, "only a valid completed output is delivered and clears recovery state", async () => {
      await emit({ type: "task_postprocess_end", message: [{ url: "https://example.invalid/completed-fixture.png" }] });
      await until(async () => !!await page!.$('img[src*="completed-fixture.png"]')); assert.equal(await page!.evaluate(() => Object.keys(sessionStorage).filter(k => k.startsWith("ans-media-request-")).length), 0);
      assert.equal(posts.length, 2);
    });
    assert.equal(report.pageErrors, 0); assert.equal(report.translationErrors, 0); report.passed = true;
  } finally {
    if (!report.passed && page) console.log("[media account browser] fixture diagnosis", JSON.stringify(await page.evaluate(() => ({ storageFamilies: Object.keys(sessionStorage).map(k => k.startsWith("ans-media-request-v1:") ? "v1" : k.startsWith("ans-media-request-v2:") ? "v2" : "other"), socketCount: (window as unknown as { __ansMediaFixture?: { count: () => number } }).__ansMediaFixture?.count(), storageCount: sessionStorage.length, otherKeys: Object.keys(sessionStorage).filter(k => !k.startsWith("ans-media-request-v1:") && !k.startsWith("ans-media-request-v2:")).map(k => k.slice(0, 40)) }))));
    if (!report.passed) console.log("[media account browser] recovery classifications", JSON.stringify(recoveryResponses));
    if (!report.passed && page) await page.screenshot({ path: output + "/failure.png", fullPage: true }).catch(() => {});
    await db.user.deleteMany({ where: { id: { in: users } } });
    await writeFile(output + "/checks.json", JSON.stringify(report, null, 2) + "\n");
    await writeFile(fifthOutput + "/checks.json", JSON.stringify({ ...report, checks: report.checks.filter(c => c.round === 5) }, null, 2) + "\n");
    await browser.close(); child.kill(); await db.$disconnect();
  }
}
main().catch(error => { console.error("MEDIA_ACCOUNT_BROWSER_FAILED", JSON.stringify({ stage, type: error instanceof Error ? error.name : "Unknown", assertion: error instanceof assert.AssertionError ? error.operator : undefined, location: error instanceof Error ? error.stack?.split("\n").filter(line => line.trim().startsWith("at ") && line.includes("media-account-browser-check")) : [] })); process.exitCode = 1; });
