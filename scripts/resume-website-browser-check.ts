/** Browser + production Next server + real worker; loopback simulated model, no upstream usage. */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { encode } from "next-auth/jwt";
import puppeteer, { type Page, type HTTPRequest } from "puppeteer";

async function main() {
  for (const key of ["DATABASE_URL", "DIRECT_URL"]) {
    const url = new URL(process.env[key] || "");
    assert(["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) && /^\/ans_product_(?:test|verify)(?:_[a-z0-9_]+)?$/.test(url.pathname), "Isolated DB required");
  }
  assert(process.env.AUTH_SECRET, "Isolated auth secret required");
  const prefix = "website-browser-" + Date.now().toString(36) + "-" + randomBytes(3).toString("hex");
  const base = "http://127.0.0.1:3107";
  const output = ".workbuddy/evidence/resume-website/browser";
  const { db } = await import("../src/lib/db");
  const api = await import("../src/server/projects/resume-website");
  const require = createRequire(resolve(process.cwd(), "package.json"));
  const axe = await readFile(require.resolve("axe-core/axe.min.js"), "utf8");
  const t = JSON.parse(await readFile("messages/product/zh.json", "utf8")).website as Record<string, string>;
  const report = { environment: "isolated PostgreSQL + production build + real worker + simulated loopback model", checks: [] as string[], accessibility: [] as unknown[], pageErrors: [] as string[], translationErrors: [] as string[], modelRequests: 0 };
  await mkdir(output, { recursive: true });
  let failModel = false;
  let holdModel = true;
  const releases: (() => void)[] = [];
  const mockKey = randomBytes(32).toString("hex");
  const gateway = createServer(async (req, res) => {
    if (req.url !== "/v1/chat/completions" || req.method !== "POST" || req.headers.authorization !== "Bearer " + mockKey) { res.writeHead(404).end(); return; }
    let text = ""; for await (const chunk of req) text += chunk;
    report.modelRequests++;
    if (holdModel) await new Promise<void>(release => releases.push(release));
    try {
      const prompt = JSON.parse(text).messages.at(-1).content as string;
      const marker = prompt.lastIndexOf("\n\n{");
      const input = JSON.parse(prompt.slice(marker + 2)) as { about: string; projects: { description: string }[] };
      const content = failModel ? "INVALID_SIMULATED_MODEL_OUTPUT" : JSON.stringify({ summary: "[模拟模型验收] " + input.about, projects: input.projects.map(p => ({ description: p.description })) });
      res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ choices: [{ message: { content } }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } }));
    } catch { res.writeHead(500).end(); }
  });
  await new Promise<void>(resolve => gateway.listen(0, "127.0.0.1", resolve));
  const address = gateway.address(); assert(address && typeof address !== "string");
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3107"], {
    env: { ...process.env, RUN_BASE_URL: `http://127.0.0.1:${address.port}/v1`, RUN_API_KEY: mockKey, AUTH_URL: base, NEXTAUTH_URL: base, ANS_PROJECT_WORKER_DISABLED: "false" },
    windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
  });
  let serverOutput = "";
  child.stdout.on("data", chunk => { serverOutput = (serverOutput + chunk.toString()).slice(-20_000); });
  child.stderr.on("data", chunk => { serverOutput = (serverOutput + chunk.toString()).slice(-20_000); });
  const browser = await puppeteer.launch({ executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
  const users: string[] = []; let projectId = "";
  const releaseModel = () => { holdModel = false; for (const release of releases.splice(0)) release(); };
  async function waitUntil(test: () => boolean | Promise<boolean>, timeout = 30_000) {
    const deadline = Date.now() + timeout;
    while (!await test()) { if (Date.now() > deadline) throw new Error("Condition timed out"); await new Promise(resolve => setTimeout(resolve, 100)); }
  }
  async function check(label: string, run: () => Promise<void>) { await run(); report.checks.push(label); console.log("[website browser] PASS " + label); }
  async function user(role: string) {
    const record = await db.user.create({ data: { username: prefix + "-" + role, email: prefix + "-" + role + "@example.invalid", locale: "zh", quotaPoints: 100 } }); users.push(record.id);
    const context = await browser.createBrowserContext();
    const token = await encode({ token: { id: record.id, pwdAt: 0 }, secret: process.env.AUTH_SECRET!, salt: "authjs.session-token", maxAge: 3600 });
    await context.setCookie({ name: "authjs.session-token", value: token, domain: "127.0.0.1", path: "/", httpOnly: true, secure: false, sameSite: "Lax" });
    const page = await context.newPage(); await page.setViewport({ width: 1440, height: 1000 });
    page.on("pageerror", error => report.pageErrors.push(String(error)));
    page.on("console", message => { if (/Missing translation:|MISSING_MESSAGE/.test(message.text())) report.translationErrors.push(message.text()); });
    return { id: record.id, page };
  }
  async function visit(page: Page, path: string) { assert.equal((await page.goto(base + path, { waitUntil: "networkidle0", timeout: 45_000 }))?.status(), 200); }
  async function fill(page: Page, name: string, value: string) {
    const selector = ':is(input,textarea)[name="' + name + '"]'; await page.waitForSelector(selector);
    await page.$eval(selector, n => n.scrollIntoView({ block: "center" }));
    await page.click(selector); await page.keyboard.down("Control"); await page.keyboard.press("A"); await page.keyboard.up("Control"); await page.keyboard.press("Backspace"); await page.type(selector, value);
  }
  async function click(page: Page, text: string) {
    await page.waitForFunction(label => Array.from(document.querySelectorAll("button")).some(b => b.textContent?.trim() === label && !b.disabled), {}, text);
    assert(await page.evaluate(label => { const b = Array.from(document.querySelectorAll("button")).find(b => b.textContent?.trim() === label && !b.disabled); b?.click(); return Boolean(b); }, text));
  }
  async function acknowledge(page: Page) {
    const selector = 'input[type="checkbox"]';
    await page.$eval(selector, node => node.scrollIntoView({ block: "center" }));
    if (!await page.$eval(selector, node => (node as HTMLInputElement).checked)) await page.click(selector);
    assert(await page.$eval(selector, node => (node as HTMLInputElement).checked));
  }
  async function mutation(page: Page, path: string, method: string, action: () => Promise<void>, status = 200) {
    const response = page.waitForResponse(r => new URL(r.url()).pathname === path && r.request().method() === method, { timeout: 20_000 });
    void response.catch(() => undefined); // Handle early timeout while the action is still pending.
    await action(); const r = await response; assert.equal(r.status(), status, path); return r;
  }
  async function audit(page: Page, label: string, width = 1440) {
    await page.setViewport({ width, height: width < 600 ? 844 : 1000 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, label + " overflow");
    await page.screenshot({ path: output + "/" + label + ".png", fullPage: true });
    await page.addScriptTag({ content: axe });
    const violations = await page.evaluate(async () => {
      const r = await (window as unknown as { axe: { run: (document: Document, options: unknown) => Promise<{ violations: { id: string; impact: string; nodes: { target: string[] }[] }[] }> } }).axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } });
      return r.violations.map(({ id, impact, nodes }) => ({ id, impact, targets: nodes.map(n => n.target) }));
    });
    report.accessibility.push({ label, width, violations }); assert.equal(violations.length, 0, JSON.stringify(violations));
  }
  try {
    await waitUntil(async () => { if (child.exitCode !== null) throw new Error("Local server exited"); try { return (await fetch(base + "/api/health")).status < 500; } catch { return false; } }, 45_000);
    const admin = await db.user.create({ data: { username: prefix + "-official-admin", email: prefix + "-official-admin@example.invalid", locale: "zh", role: "ADMIN" } }); users.push(admin.id);
    const owner = await user("owner"); const outsider = await user("outsider");
    const project = await db.project.create({ data: { ownerId: owner.id, title: "[隔离验收] 浏览器简历网站", goal: "PORTFOLIO" } }); projectId = project.id;
    const path = "/projects/" + project.id + "/website"; const endpoint = "/api/projects/" + project.id + "/website";
    const balance = async () => (await db.user.findUniqueOrThrow({ where: { id: owner.id } })).quotaPoints;
    await visit(owner.page, path);
    await check("empty studio explains input and never auto-generates or debits", async () => {
      assert.equal(await balance(), 100); assert.equal(report.modelRequests, 0);
      assert.equal(new URL(owner.page.url()).pathname, path); await audit(owner.page, "empty-desktop"); await audit(owner.page, "empty-mobile", 390);
    });
    await check("fills real form, live preview and saves personal decisions", async () => {
      for (const [name, value] of Object.entries({ fullName: "浏览器验收同学", headline: "用真实项目展示 AI 协作能力", about: "我学习网页开发，并整理校园活动信息。", education: "测试院校，本科在读。", skills: "资料整理, 网页开发", "project-0-name": "校园活动指南", "project-0-role": "负责信息整理", "project-0-description": "整理校园活动，制作可浏览的分类页面。" })) await fill(owner.page, name, value);
      await owner.page.select('[name="style"]', "minimal"); await owner.page.select('[name="accent"]', "violet");
      assert(await owner.page.$("iframe[sandbox]"));
      await mutation(owner.page, endpoint, "PATCH", () => click(owner.page, t.save));
      const saved = await api.getResumeWebsiteState(project.id, owner.id); assert.equal(saved.revision, 1); assert.equal(saved.input?.style, "minimal"); assert.equal(await balance(), 100);
    });
    await check("lost acceptance response retries the same persisted job and single debit", async () => {
      await acknowledge(owner.page);
      await owner.page.setRequestInterception(true);
      let acceptedStatus = 0; let acceptedCode = "";
      const listener = async (req: HTTPRequest) => {
        if (new URL(req.url()).pathname === endpoint + "/runs" && req.method() === "POST") {
          const upstream = await fetch(req.url(), { method: "POST", headers: { origin: base, "Content-Type": "application/json", cookie: req.headers().cookie || "" }, body: req.postData() }); acceptedStatus = upstream.status; const body = await upstream.json(); acceptedCode = body.error?.code || "";
          await req.respond({ status: 503, contentType: "application/json", body: JSON.stringify({ ok: false, error: { code: "INTERNAL_ERROR" } }) });
        } else await req.continue();
      };
      owner.page.on("request", listener);
      await mutation(owner.page, endpoint + "/runs", "POST", () => click(owner.page, t.generate), 503);
      assert.equal(acceptedStatus, 202, "Upstream acceptance: " + acceptedCode);
      await owner.page.waitForSelector('[role="alert"]'); owner.page.off("request", listener); await owner.page.setRequestInterception(false);
      await mutation(owner.page, endpoint + "/runs", "POST", () => click(owner.page, t.generate), 202);
      assert.equal(await balance(), 98); assert.equal(await db.workflowRun.count({ where: { projectId: project.id } }), 1);
      await waitUntil(() => report.modelRequests === 1); assert.equal((await api.getResumeWebsiteState(project.id, owner.id)).runs[0].status, "RUNNING");
    });
    await check("refresh reconnects to the real worker and selects completed output", async () => {
      await visit(owner.page, path); assert(await owner.page.$('[data-task-state="working"]'));
      releaseModel(); await owner.page.waitForSelector('[name="version"]', { timeout: 25_000 });
      assert.equal((await api.getResumeWebsiteState(project.id, owner.id)).versions.length, 1);
      assert.equal(await balance(), 98); await audit(owner.page, "delivered-desktop"); await audit(owner.page, "delivered-mobile", 390);
    });
    const v1 = (await api.getResumeWebsiteState(project.id, owner.id)).versions[0];
    await check("private state and download reject a third-party account over HTTP", async () => {
      await visit(outsider.page, "/projects");
      const results = await outsider.page.evaluate(async (urls) => Promise.all(urls.map(async u => (await fetch(u)).status)), [endpoint, endpoint + "/versions/" + v1.id + "/download"]);
      assert.deepEqual(results, [404, 404]);
    });
    await check("manual editing appends free version and download matches selected history", async () => {
      await click(owner.page, t.edit); await fill(owner.page, "copy-summary", "经过我核对的手工介绍。");
      await mutation(owner.page, endpoint + "/copy", "POST", () => click(owner.page, t.saveCopy));
      await waitUntil(async () => (await owner.page.$eval('[name="version"]', n => (n as HTMLSelectElement).value)) !== v1.id);
      assert.equal(await balance(), 98); assert.equal((await api.getResumeWebsiteState(project.id, owner.id)).versions.length, 2);
      await owner.page.select('[name="version"]', v1.id);
      const result = await mutation(owner.page, endpoint + "/versions/" + v1.id + "/download", "GET", () => click(owner.page, t.download));
      assert(result.headers()["content-type"].startsWith("text/html")); assert.match(await result.text(), /\[模拟模型验收\]/);
    });
    await check("concurrent edit preserves local text, refreshes versions and explicitly rebases", async () => {
      await click(owner.page, t.edit); await fill(owner.page, "copy-summary", "遇到冲突仍要保留我的修改。");
      const state = await api.getResumeWebsiteState(project.id, owner.id);
      await api.saveResumeWebsiteCopy(project.id, owner.id, { baseVersionId: state.versions[0].id, expectedVersion: 2, copy: { ...state.versions[0].snapshot.copy, summary: "另一个窗口的修改。" } });
      await mutation(owner.page, endpoint + "/copy", "POST", () => click(owner.page, t.saveCopy), 409);
      await owner.page.waitForSelector('[role="alert"]'); await owner.page.waitForFunction(label => Array.from(document.querySelectorAll("button")).some(b => b.textContent?.trim() === label), {}, t.rebaseEdit);
      assert.equal(await owner.page.$eval('[name="copy-summary"]', n => (n as HTMLTextAreaElement).value), "遇到冲突仍要保留我的修改。");
      await click(owner.page, t.rebaseEdit); await mutation(owner.page, endpoint + "/copy", "POST", () => click(owner.page, t.saveCopy));
      assert.equal((await api.getResumeWebsiteState(project.id, owner.id)).versions[0].version, 4); assert.equal(await balance(), 98);
    });
    await check("regeneration automatically selects newest delivery rather than stale history", async () => {
      await visit(owner.page, path); await owner.page.select('[name="version"]', v1.id); await acknowledge(owner.page);
      await mutation(owner.page, endpoint + "/runs", "POST", () => click(owner.page, t.generate), 202);
      await owner.page.waitForFunction(() => Array.from(document.querySelectorAll('[name="version"] option')).some(o => o.textContent?.startsWith("v5")), { timeout: 25_000 });
      const latest = (await api.getResumeWebsiteState(project.id, owner.id)).versions[0];
      assert.equal(await owner.page.$eval('[name="version"]', n => (n as HTMLSelectElement).value), latest.id); assert.equal(await balance(), 96);
    });
    await check("invalid model produces visible failure, no partial result and automatic refund", async () => {
      failModel = true; await acknowledge(owner.page);
      await mutation(owner.page, endpoint + "/runs", "POST", () => click(owner.page, t.generate), 202);
      await waitUntil(async () => (await api.getResumeWebsiteState(project.id, owner.id)).runs[0].status === "FAILED");
      await owner.page.waitForSelector('[data-task-state="failed"]');
      assert.equal((await api.getResumeWebsiteState(project.id, owner.id)).versions.length, 5); assert.equal(await balance(), 96); failModel = false;
      await audit(owner.page, "failure-mobile", 390);
    });
    await check("running cancellation prevents late output and refunds only once", async () => {
      holdModel = true; await acknowledge(owner.page);
      await mutation(owner.page, endpoint + "/runs", "POST", () => click(owner.page, t.generate), 202);
      await waitUntil(() => releases.length === 1);
      await mutation(owner.page, endpoint + "/runs", "DELETE", () => click(owner.page, t.cancel)); releaseModel();
      assert.equal((await api.getResumeWebsiteState(project.id, owner.id)).runs[0].status, "CANCELLED"); assert.equal(await balance(), 96);
    });
    await check("unsaved input return prompt can cancel navigation and preserve values", async () => {
      await fill(owner.page, "headline", "未保存的标题必须保留");
      let dialog = false; owner.page.once("dialog", async d => { dialog = true; await d.dismiss(); });
      await owner.page.click('a[href="/projects/' + project.id + '"]');
      assert(dialog); assert.equal(new URL(owner.page.url()).pathname, path);
      assert.equal(await owner.page.$eval('[name="headline"]', n => (n as HTMLInputElement).value), "未保存的标题必须保留");
    });
    assert.deepEqual(report.pageErrors, []); assert.deepEqual(report.translationErrors, []);
    console.log(JSON.stringify({ checks: report.checks.length, accessibilityPages: report.accessibility.length, simulatedModelRequests: report.modelRequests }));
  } catch (error) {
    // Do not print request bodies, cookies, keys, gateway outputs or private server diagnostics.
    console.error("[website browser] failed: " + (error instanceof Error ? error.message.replaceAll(mockKey, "[mock-key]") : "unknown"));
    const pages = await browser.pages();
    for (let i = 0; i < pages.length; i++) {
      console.error(JSON.stringify({ page: i, path: new URL(pages[i].url() === "about:blank" ? base : pages[i].url()).pathname, fields: await pages[i].$$eval("input,textarea,select", nodes => nodes.map(n => (n as HTMLInputElement).name)) }));
      await pages[i].screenshot({ path: output + "/failure-" + i + ".png", fullPage: true });
    }
    console.error("Local server running: " + String(child.exitCode === null) + "; log bytes: " + serverOutput.length);
    throw error;
  } finally {
    releaseModel();
    if (projectId) await db.project.update({ where: { id: projectId }, data: { status: "ARCHIVED" } });
    if (users.length) await db.user.updateMany({ where: { id: { in: users } }, data: { flagged: true, deletedAt: new Date() } });
    await writeFile(output + "/checks.json", JSON.stringify(report, null, 2));
    await browser.close(); child.kill(); gateway.closeAllConnections(); await new Promise<void>(resolve => gateway.close(() => resolve())); await db.$disconnect();
  }
}
main().catch(() => { process.exitCode = 1; });
