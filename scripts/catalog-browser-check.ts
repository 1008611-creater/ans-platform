/** Production Next + isolated PostgreSQL; fixture auth cookies, no upstream model or payment. */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { encode } from "next-auth/jwt";
import puppeteer, { type Page } from "puppeteer";
import { CATALOG_TEXT_FIELDS } from "../src/contracts/catalog-content";
async function main() {
  for (const key of ["DATABASE_URL", "DIRECT_URL"]) {
    const url = new URL(process.env[key] || "");
    assert(["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) && /^\/ans_product_verify_[a-z0-9_]+$/.test(url.pathname), "Isolated database required");
  }
  assert(process.env.AUTH_SECRET);
  const { db } = await import("../src/lib/db");
  const api = await import("../src/server/catalog/service");
  const base = "http://127.0.0.1:3107";
  const prefix = "catalog-browser-" + Date.now().toString(36) + "-" + randomBytes(3).toString("hex");
  const output = ".workbuddy/evidence/catalog/browser"; await mkdir(output, { recursive: true });
  const t = JSON.parse(await readFile("messages/product/zh.json", "utf8")).catalogAdmin;
  const axe = await readFile(createRequire(resolve(process.cwd(), "package.json")).resolve("axe-core/axe.min.js"), "utf8");
  const report = { environment: "isolated PostgreSQL + production Next; signed test sessions; no upstream usage", checks: [] as string[], accessibility: [] as unknown[], pageErrors: [] as string[], translationErrors: [] as string[] };
  const users: string[] = [];
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3107"], { env: { ...process.env, ANS_PROJECT_WORKER_DISABLED: "true" }, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  child.stdout.on("data", () => undefined); child.stderr.on("data", () => undefined);
  const browser = await puppeteer.launch({ executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true, protocolTimeout: 120_000 });
  async function until(test: () => boolean | Promise<boolean>, timeout = 30_000) { const deadline = Date.now() + timeout; while (!await test()) { if (Date.now() > deadline) throw new Error("Timed out"); await new Promise(r => setTimeout(r, 100)); } }
  async function check(label: string, run: () => Promise<void>) { await run(); report.checks.push(label); console.log("[catalog browser] PASS " + label); }
  async function actor(role: "ADMIN" | "USER") {
    const index = users.length; const user = await db.user.create({ data: { username: prefix + "-" + index, email: prefix + "-" + index + "@example.invalid", role, locale: "zh", ...(role === "ADMIN" ? { adminPermissions: ["CATALOG_MANAGE"] } : {}) } }); users.push(user.id);
    const context = await browser.createBrowserContext();
    const token = await encode({ token: { id: user.id, pwdAt: 0 }, secret: process.env.AUTH_SECRET!, salt: "authjs.session-token", maxAge: 3600 });
    await context.setCookie({ name: "authjs.session-token", value: token, domain: "127.0.0.1", path: "/", httpOnly: true, secure: false, sameSite: "Lax" });
    const page = await context.newPage(); await page.setViewport({ width: 1440, height: 1000 });
    page.on("pageerror", e => report.pageErrors.push(String(e))); page.on("console", m => { if (/MISSING_MESSAGE|Missing translation:/.test(m.text())) report.translationErrors.push(m.text()); });
    return { id: user.id, context, page };
  }
  async function visit(page: Page, path: string, status = 200) { assert.equal((await page.goto(base + path, { waitUntil: "networkidle0", timeout: 45_000 }))?.status(), status, path); }
  async function clickText(page: Page, text: string) {
    await page.bringToFront();
    await page.waitForFunction(label => Array.from(document.querySelectorAll("button")).some(b => b.textContent?.trim() === label && !b.disabled), {}, text);
    assert(await page.evaluate(label => { const b = Array.from(document.querySelectorAll("button")).find(b => b.textContent?.trim() === label && !b.disabled); b?.click(); return Boolean(b); }, text));
  }
  async function fill(page: Page, id: string, value: string) { await page.bringToFront(); const selector = '[data-testid="catalog-' + id + '"]'; await page.waitForSelector(selector, { visible: true }); await page.$eval(selector, n => n.scrollIntoView({ block: "center", behavior: "instant" })); await page.click(selector); await page.keyboard.down("Control"); await page.keyboard.press("A"); await page.keyboard.up("Control"); await page.keyboard.press("Backspace"); await page.type(selector, value); }
  async function mutation(page: Page, path: string, action: () => Promise<void>, status = 200) { await page.bringToFront(); const promise = page.waitForResponse(r => new URL(r.url()).pathname === path && r.request().method() === "POST", { timeout: 20_000 }); void promise.catch(() => undefined); await action(); assert.equal((await promise).status(), status); await page.waitForNetworkIdle({ idleTime: 300 }); }
  async function audit(page: Page, label: string, width = 1440) {
    await page.setViewport({ width, height: width < 600 ? 844 : 1000 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, label + " overflow");
    await page.screenshot({ path: output + "/" + label + ".png", fullPage: true }); await page.addScriptTag({ content: axe });
    const violations = await page.evaluate(async () => {
      const result = await (window as unknown as { axe: { run: (doc: Document, options: unknown) => Promise<{ violations: { id: string; nodes: { target: string[] }[] }[] }> } }).axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } });
      return result.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) }));
    }); report.accessibility.push({ label, width, violations }); assert.equal(violations.length, 0, JSON.stringify(violations));
  }
  const endpoint = "/api/admin/catalog";
  try {
    await until(async () => { if (child.exitCode !== null) throw new Error("Server exited"); try { return (await fetch(base + "/api/health")).status < 500; } catch { return false; } }, 45_000);
    const admin = await actor("ADMIN"); const member = await actor("USER"); const second = await admin.context.newPage();
    await visit(admin.page, "/admin/catalog");
    await check("official editor materializes builtins and all workflow labels", async () => { await clickText(admin.page, t.new); await audit(admin.page, "new-desktop"); await audit(admin.page, "new-mobile", 390); });
    await admin.page.setViewport({ width: 1440, height: 1000 });
    await fill(admin.page, "slug", prefix);
    for (const field of CATALOG_TEXT_FIELDS) await fill(admin.page, field, field === "title" ? "隔离目录公开验收卡" : "隔离验收内容 " + field);
    await check("save remains a private draft and publish requires saved preview", async () => {
      await mutation(admin.page, endpoint, () => admin.page.click('[data-testid="catalog-save"]'));
      assert.equal(await api.findPublishedCatalog(prefix), undefined);
      assert(await admin.page.$eval('[data-testid="catalog-publish"]', n => (n as HTMLButtonElement).disabled));
      await visit(member.page, "/explore/" + prefix, 404);
      await visit(member.page, "/admin/catalog/" + prefix + "/preview?revision=1", 404);
    });
    const preview = await admin.context.newPage();
    async function review(revision: number) {
      await admin.page.bringToFront();
      const href = await admin.page.$eval('a[href*="/preview?revision="]', a => a.getAttribute("href")); assert.equal(href, "/admin/catalog/" + prefix + "/preview?revision=" + revision);
      const previousTargets = new Set(browser.targets());
      const popupPromise = browser.waitForTarget(target => !previousTargets.has(target) && target.browserContext() === admin.context && target.url() === base + href, { timeout: 15_000 });
      void popupPromise.catch(() => undefined);
      await admin.page.click('a[href*="/preview?revision="]'); const popup = await (await popupPromise).page(); assert(popup); await popup.waitForNetworkIdle(); assert((await popup.$eval("body", n => n.textContent))?.includes("v" + revision)); await popup.close();
    }
    await check("saved preview matches exact version, then explicit publish reaches discovery", async () => {
      await review(1); await mutation(admin.page, endpoint + "/" + prefix, () => admin.page.click('[data-testid="catalog-publish"]'));
      await visit(member.page, "/explore/" + prefix); assert((await member.page.$eval("h1", n => n.textContent))?.includes("隔离目录公开验收卡")); await audit(member.page, "detail-desktop"); await audit(member.page, "detail-mobile", 390);
    });
    await visit(second, "/admin/catalog"); await clickText(second, "隔离目录公开验收卡" + t.live + " · v1");
    await fill(admin.page, "title", "新草稿内容不得泄露");
    await mutation(admin.page, endpoint, () => admin.page.click('[data-testid="catalog-save"]'));
    await check("new draft leaves old public intact and old private preview pinned", async () => {
      await visit(member.page, "/explore/" + prefix); assert((await member.page.$eval("h1", n => n.textContent))?.includes("隔离目录公开验收卡"));
      await visit(preview, "/admin/catalog/" + prefix + "/preview?revision=1"); assert((await preview.$eval("h1", n => n.textContent))?.includes("隔离目录公开验收卡"));
    });
    await check("multi-window conflict preserves typed content and explicit reload restores latest", async () => {
      await fill(second, "title", "冲突窗口输入必须保留"); await mutation(second, endpoint, () => second.click('[data-testid="catalog-save"]'), 409);
      assert.equal(await second.$eval('[data-testid="catalog-title"]', n => (n as HTMLInputElement).value), "冲突窗口输入必须保留"); assert((await second.$eval('[role="alert"]', n => n.textContent))?.includes("输入仍然保留"));
      second.once("dialog", d => void d.accept()); await clickText(second, t.reload); await until(async () => (await second.$eval('[data-testid="catalog-title"]', n => (n as HTMLInputElement).value)) === "新草稿内容不得泄露");
    });
    await check("new version publishes only after review and withdraw hides it everywhere", async () => {
      await review(2); await mutation(admin.page, endpoint + "/" + prefix, () => admin.page.click('[data-testid="catalog-publish"]'));
      await visit(member.page, "/explore/" + prefix); assert((await member.page.$eval("h1", n => n.textContent))?.includes("新草稿内容不得泄露"));
      admin.page.once("dialog", d => void d.accept()); await mutation(admin.page, endpoint + "/" + prefix, () => admin.page.click('[data-testid="catalog-withdraw"]'));
      await visit(member.page, "/explore/" + prefix, 404); assert.equal(await api.findPublishedCatalog(prefix), undefined);
    });
    await check("ordinary members cannot read or write private editor data", async () => {
      await visit(member.page, "/admin/catalog"); assert.equal(await member.page.$('[data-testid="catalog-save"]'), null);
      const entry = (await api.listCatalogAdmin(admin.id)).find(item => item.slug === prefix)?.draft; assert(entry);
      const statuses = await member.page.evaluate(async entry => { const read = await fetch("/api/admin/catalog"); const write = await fetch("/api/admin/catalog", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expectedRevision: 0, entry }) }); return [read.status, write.status]; }, entry); assert.deepEqual(statuses, [403, 403]);
    });
    await check("unsaved navigation can be cancelled without losing text", async () => {
      await fill(admin.page, "title", "未保存资料保留"); let prompted = false; admin.page.once("dialog", async d => { prompted = true; await d.dismiss(); }); await admin.page.click('a[href="/admin"]'); await until(() => prompted); assert.equal(new URL(admin.page.url()).pathname, "/admin/catalog"); assert.equal(await admin.page.$eval('[data-testid="catalog-title"]', n => (n as HTMLInputElement).value), "未保存资料保留");
    });
    assert.deepEqual(report.pageErrors, []); assert.deepEqual(report.translationErrors, []);
  } catch (error) { console.error("[catalog browser] failed: " + (error instanceof Error ? error.message : "unknown")); for (const [index, page] of (await browser.pages()).entries()) { await page.bringToFront().catch(() => undefined); await page.screenshot({ path: output + "/failure-" + index + ".png", fullPage: true }).catch(() => undefined); } throw error; }
  finally { await db.catalogProject.updateMany({ where: { slug: prefix }, data: { withdrawn: true } }); await db.user.updateMany({ where: { id: { in: users } }, data: { flagged: true, deletedAt: new Date() } }); await writeFile(output + "/checks.json", JSON.stringify(report, null, 2)); await browser.close(); child.kill(); await db.$disconnect(); }
}
main().catch(() => { process.exitCode = 1; });