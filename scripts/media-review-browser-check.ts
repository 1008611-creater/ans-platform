/** Isolated PostgreSQL + real production Next and fixture sessions. No upstream calls. */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { encode } from "next-auth/jwt";
import puppeteer, { type Page } from "puppeteer";
let stage = "isolated environment guard";
async function main() {
  for (const name of ["DATABASE_URL", "DIRECT_URL"]) {
    const url = new URL(process.env[name] || "");
    assert(["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) && url.pathname === "/ans_product_verify_audit3", "Isolated database required");
  }
  assert(process.env.AUTH_SECRET);
  stage = "database import";
  const { db } = await import("../src/lib/db");
  stage = "service import";
  const { readMediaGeneration } = await import("../src/server/media/service");
  const base = "http://127.0.0.1:3111", endpoint = "/api/admin/media-generations";
  const prefix = "media-browser-" + randomBytes(6).toString("hex");
  const output = ".workbuddy/evidence/audits/round-3/browser";
  await mkdir(output, { recursive: true });
  const t = JSON.parse(await readFile("messages/product/zh.json", "utf8")).mediaReview;
  const axe = await readFile(createRequire(resolve(process.cwd(), "package.json")).resolve("axe-core/axe.min.js"), "utf8");
  const report = { passed: false, environment: "isolated PostgreSQL + production Next; test sessions; zero provider calls", checks: [] as string[], accessibility: [] as unknown[], pageErrors: 0, translationErrors: 0 };
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3111"], { env: process.env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  for (const stream of [child.stdout, child.stderr]) stream?.on("data", chunk => {
    const text = String(chunk);
    const markers = ["MEDIA_RECONCILIATION_FAILED", "MEDIA_REVIEW_LIST_FAILED", "EADDRINUSE", "P2028", "P2024", "P2002", "PrismaClientKnownRequestError"].filter(marker => text.includes(marker));
    if (markers.length) console.log("[media browser] server markers", JSON.stringify(markers));
  });
  stage = "browser startup";
  const browser = await puppeteer.launch({ executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || await puppeteer.executablePath(), headless: true, protocolTimeout: 120_000, args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"] }).catch(error => { child.kill(); throw error; });
  const users: string[] = [];
  let inspectionPage: Page | null = null;
  async function until(test: () => Promise<boolean>, timeout = 30000) { const deadline = Date.now() + timeout; while (!await test()) { if (Date.now() > deadline) throw new Error("Browser condition timed out"); await new Promise(r => setTimeout(r, 100)); } }
  async function check(label: string, run: () => Promise<void>) { stage = label; console.log("[media browser] checking " + label); await run(); report.checks.push(label); console.log("[media browser] PASS " + label); }
  async function actor(admin: boolean) {
    const index = users.length;
    const user = await db.user.create({ data: { email: `${prefix}-${index}@example.invalid`, username: `${prefix}-${index}`, role: admin ? "ADMIN" : "USER", ...(admin ? { adminPermissions: ["USERS_MANAGE"] } : {}), generationCreditsRemaining: 0, dailyGenerationLimit: 3 } }); users.push(user.id);
    const context = await browser.createBrowserContext();
    const token = await encode({ token: { id: user.id, pwdAt: 0 }, secret: process.env.AUTH_SECRET!, salt: "authjs.session-token", maxAge: 3600 });
    await context.setCookie({ name: "authjs.session-token", value: token, domain: "127.0.0.1", path: "/", httpOnly: true, secure: false, sameSite: "Lax" });
    const page = await context.newPage(); page.setDefaultTimeout(15_000);
    page.on("request", request => { if (request.method() === "PATCH" && new URL(request.url()).pathname === endpoint) console.log("[media browser] PATCH started"); });
    page.on("response", reply => { if (reply.request().method() === "PATCH" && new URL(reply.url()).pathname === endpoint) console.log("[media browser] PATCH received " + reply.status()); });
    page.on("requestfailed", request => { if (request.method() === "PATCH" && new URL(request.url()).pathname === endpoint) console.log("[media browser] PATCH transport failed"); });
    page.on("pageerror", () => { report.pageErrors++; }); page.on("console", message => { if (/MISSING_MESSAGE|Missing translation:/.test(message.text())) report.translationErrors++; });
    return { user, page };
  }
  async function visit(page: Page) { await page.bringToFront(); assert.equal((await page.goto(base + "/admin/media-generations", { waitUntil: "networkidle0" }))?.status(), 200); }
  async function click(page: Page, label: string) { await page.bringToFront(); assert(await page.evaluate(label => { const button = Array.from(document.querySelectorAll("button")).find(b => b.textContent?.trim() === label && !b.disabled); button?.click(); return !!button; }, label)); }
  async function choose(page: Page, entry: { model: string; id: string }) {
    assert(await page.evaluate(({ model, label }) => { const card = Array.from(document.querySelectorAll('[data-slot="card"]')).find(n => n.textContent?.includes(model)); const button = Array.from(card?.querySelectorAll("button") || []).find(b => b.textContent === label); button?.click(); return !!button; }, { model: entry.model, label: t.inspect }));
    await page.waitForFunction(id => !!document.querySelector("form")?.textContent?.includes(id), {}, entry.id);
  }
  async function safeClick(page: Page, selector: string) {
    await page.waitForSelector(selector);
    await page.$eval(selector, n => n.scrollIntoView({ block: "center", behavior: "instant" }));
    await page.waitForFunction(selector => {
      const input = document.querySelector<HTMLInputElement>(selector); if (!input || input.disabled) return false;
      const rect = input.getBoundingClientRect(); return document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2) === input;
    }, {}, selector);
    await page.evaluate(() => new Promise<void>(done => requestAnimationFrame(() => requestAnimationFrame(() => done()))));
    const point = await page.$eval(selector, n => { const rect = n.getBoundingClientRect(); const x = rect.x + rect.width / 2, y = rect.y + rect.height / 2; return { x, y, exposed: document.elementFromPoint(x, y) === n }; });
    assert(point.exposed, "Target became obscured before click");
    await page.mouse.click(point.x, point.y);
    assert.equal(new URL(page.url()).pathname, "/admin/media-generations");
  }
  async function confirmRejection(page: Page) {
    const selector = 'form input[type="checkbox"]';
    await safeClick(page, selector);
    await page.waitForFunction(selector => document.querySelector<HTMLInputElement>(selector)?.checked === true, {}, selector);
    assert.equal(new URL(page.url()).pathname, "/admin/media-generations");
  }
  async function fill(page: Page, id: string, value: string) { await safeClick(page, "#" + id); await page.keyboard.down("Control"); await page.keyboard.press("A"); await page.keyboard.up("Control"); await page.keyboard.press("Backspace"); await page.type("#" + id, value); }
  async function mutate(page: Page, status = 200) { const response = page.waitForResponse(r => new URL(r.url()).pathname === endpoint && r.request().method() === "PATCH", { timeout: 60_000 }); await click(page, t.apply); const reply = await response; console.log("[media browser] review response " + reply.status()); assert.equal(reply.status(), status); await page.waitForNetworkIdle(); }
  async function audit(page: Page, width: number, label: string) {
    await page.setViewport({ width, height: width < 600 ? 844 : 1000 }); await page.bringToFront();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    await page.screenshot({ path: output + "/" + label + ".png", fullPage: true });
    await page.addScriptTag({ content: axe });
    const violations = await page.evaluate(async () => {
      const result = await (window as unknown as { axe: { run: (doc: Document, config: unknown) => Promise<{ violations: { id: string; nodes: { target: string[] }[] }[] }> } }).axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } });
      return result.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) }));
    }); report.accessibility.push({ width, label, violations }); assert.deepEqual(violations, []);
  }
  try {
    stage = "preview health";
    await until(async () => { if (child.exitCode !== null) throw new Error("Preview exited"); try { return (await fetch(base + "/api/health")).status === 200; } catch { return false; } }, 45000);
    stage = "fixture setup";
    const admin = await actor(true), member = await actor(false); inspectionPage = admin.page;
    const create = async (label: string, revision = 0) => db.mediaGeneration.create({ data: { userId: member.user.id, idempotencyKey: prefix + "-" + label, requestHash: "a".repeat(64), provider: "wiro", model: "fixture-" + label, type: "image", status: "UNCERTAIN", creditRevision: revision, webSocketUrl: "" } });
    const refund = await create("refund"), recover = await create("recover"), conflict = await create("conflict"), old = await create("old", 9);
    stage = "administrator initial page";
    await visit(admin.page);
    await check("pending requests and review form are accessible on desktop and mobile", async () => { await choose(admin.page, refund); await audit(admin.page, 1440, "review-desktop"); await audit(admin.page, 390, "review-mobile"); });
    await check("corroborated rejection returns one allowance and clears private form", async () => {
      await admin.page.select("#media-resolution", "notAccepted"); await fill(admin.page, "media-reference", "fixture-provider-audit-123"); await confirmRejection(admin.page); await mutate(admin.page);
      assert.equal((await db.user.findUniqueOrThrow({ where: { id: member.user.id } })).generationCreditsRemaining, 1);
      assert.equal(await admin.page.$("#media-reference"), null); assert((await admin.page.$eval('[role="status"]', n => n.textContent))?.includes(t.returned));
    });
    await check("accepted upstream task recovers without another provider request or debit", async () => {
      await choose(admin.page, recover); await fill(admin.page, "media-reference", "fixture-confirmed-task-456"); await fill(admin.page, "media-task", "fixture-original-task"); await fill(admin.page, "media-token", "fixture-task-credential");
      assert.equal(await admin.page.$eval("#media-token", n => (n as HTMLInputElement).type), "password"); await mutate(admin.page);
      const result = await readMediaGeneration(member.user.id, recover.idempotencyKey);
      assert.equal(result.status, 200); assert.equal((result.body as { taskId: string }).taskId, "fixture-original-task");
      assert.equal((await db.user.findUniqueOrThrow({ where: { id: member.user.id } })).generationCreditsRemaining, 1);
      assert(!(await admin.page.content()).includes("fixture-task-credential"));
      const stored = await admin.page.evaluate(() => JSON.stringify(localStorage) + JSON.stringify(sessionStorage));
      assert(!stored.includes("fixture-task-credential")); assert(!stored.includes("fixture-original-task")); assert(!stored.includes("fixture-confirmed-task-456"));
    });
    await check("changed state rejects stale review and preserves evidence input", async () => {
      await choose(admin.page, conflict); await fill(admin.page, "media-reference", "fixture-conflict-evidence"); await admin.page.select("#media-resolution", "notAccepted"); await confirmRejection(admin.page);
      await db.mediaGeneration.update({ where: { id: conflict.id }, data: { status: "FAILED" } }); await mutate(admin.page, 409);
      assert.equal(await admin.page.$eval("#media-reference", n => (n as HTMLInputElement).value), "fixture-conflict-evidence"); assert((await admin.page.$eval('[role="alert"]', n => n.textContent))?.includes(t.conflict));
      await click(admin.page, t.refresh); await until(async () => (await admin.page.$("#media-reference")) === null);
    });
    await check("an ended allowance is not refunded into today's balance", async () => {
      await choose(admin.page, old); await admin.page.select("#media-resolution", "notAccepted"); await fill(admin.page, "media-reference", "fixture-old-allowance-audit"); await confirmRejection(admin.page); await mutate(admin.page);
      assert.equal((await db.user.findUniqueOrThrow({ where: { id: member.user.id } })).generationCreditsRemaining, 1); assert((await admin.page.$eval('[role="status"]', n => n.textContent))?.includes(t.oldAllowance));
    });
    await check("ordinary members cannot inspect requests or mutate reviews", async () => {
      await visit(member.page); assert.equal(await member.page.$("form"), null);
      const results = await member.page.evaluate(async endpoint => { const read = await fetch(endpoint); const write = await fetch(endpoint, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ generationId: "fixture" }) }); return [read.status, write.status]; }, endpoint); assert.deepEqual(results, [403, 403]);
    });
    await check("revoked administrator permission takes effect immediately", async () => {
      await db.user.update({ where: { id: admin.user.id }, data: { adminPermissions: ["USERS_VIEW"] } });
      assert.equal(await admin.page.evaluate(async endpoint => (await fetch(endpoint)).status, endpoint), 403); await visit(admin.page); assert.equal(await admin.page.$("form"), null);
    });
    assert.equal(report.pageErrors, 0); assert.equal(report.translationErrors, 0); report.passed = true;
  } finally {
    if (!report.passed && inspectionPage) {
      await inspectionPage.screenshot({ path: output + "/failure.png", fullPage: true }).catch(() => {});
      console.log("[media browser] failure UI", JSON.stringify(await inspectionPage.evaluate(() => {
        const select = document.querySelector<HTMLSelectElement>("#media-resolution");
        const checkbox = document.querySelector<HTMLInputElement>('form input[type="checkbox"]');
        const rect = checkbox?.getBoundingClientRect();
        return { path: location.pathname, outcome: select?.value, checkboxPresent: !!checkbox, checkboxChecked: checkbox?.checked, checkboxBounds: rect && { x: rect.x, y: rect.y, width: rect.width, height: rect.height }, viewport: { width: innerWidth, height: innerHeight } };
      }).catch(() => ({ unavailable: true }))));
    }
    await db.auditLog.deleteMany({ where: { actorId: { in: users } } }); await db.user.deleteMany({ where: { id: { in: users } } });
    await writeFile(output + "/checks.json", JSON.stringify(report, null, 2)); await browser.close(); child.kill(); await db.$disconnect();
  }
}
main().catch(error => { console.error("MEDIA_REVIEW_BROWSER_FAILED", JSON.stringify({ stage, errorType: error instanceof Error ? error.name : "Unknown", errorCode: error && typeof error.code === "string" && /^P\d{4}$/.test(error.code) ? error.code : undefined, knownFailure: error instanceof Error ? ["not clickable", "No element found", "Waiting for selector", "timed out", "Target closed", "Node is detached", "Unable to obtain"].filter(label => error.message.includes(label)) : [], failureLocation: error instanceof Error ? error.stack?.split("\n").filter(line => line.trim().startsWith("at ") && line.includes("media-review-browser-check")) : [] })); process.exitCode = 1; });
