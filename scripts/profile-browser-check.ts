/** Public profile isolation against real PostgreSQL + production Next; no payment or model. */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import puppeteer from "puppeteer";
async function main() {
  for (const key of ["DATABASE_URL", "DIRECT_URL"]) {
    const url = new URL(process.env[key] || "");
    assert(["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) && /^\/ans_product_verify_[a-z0-9_]+$/.test(url.pathname), "Isolated database required");
  }
  const { db } = await import("../src/lib/db");
  const api = await import("../src/server/marketplace/listings");
  const prefix = "profile-browser-" + Date.now().toString(36) + "-" + randomBytes(3).toString("hex");
  const output = ".workbuddy/evidence/profile/browser";
  await mkdir(output, { recursive: true });
  const report = { environment: "isolated PostgreSQL + production Next; public browser; no provider usage", checks: [] as string[], accessibility: [] as unknown[], pageErrors: [] as string[], translationErrors: [] as string[] };
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3108"], { env: { ...process.env, ANS_PROJECT_WORKER_DISABLED: "true" }, windowsHide: true, stdio: "ignore" });
  const browser = await puppeteer.launch({ executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
  const users: string[] = []; const offers: string[] = [];
  async function check(label: string, run: () => Promise<void>) { await run(); report.checks.push(label); console.log("[profile browser] PASS " + label); }
  try {
    const deadline = Date.now() + 45000;
    while (true) {
      if (child.exitCode !== null || Date.now() > deadline) throw new Error("Preview unavailable");
      try { if ((await fetch("http://127.0.0.1:3108/api/health")).ok) break; } catch { /* Startup. */ }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    for (const role of ["seller", "other", "moderator"]) {
      const user = await db.user.create({ data: { username: prefix + "-" + role, email: prefix + "-" + role + "@example.invalid", role: role === "moderator" ? "ADMIN" : "USER" } }); users.push(user.id);
    }
    const input = { slug: prefix, title: "Approved profile service", summary: "A public verified service on the creator profile.", description: "Website service using confirmed personal experience and agreed delivery scope.", category: "career", subcategory: "resume", fulfillment: "service", priceMinor: 10001, currency: "CNY", deliveryDays: 3, revisionLimit: 1, computeIncluded: true, deliverables: ["Website source", "Setup guide"], licenseTerms: "Buyer may use the delivered files for their personal website." };
    const listing = await api.createMarketListing(users[0], input); offers.push(listing.id);
    const other = await api.createMarketListing(users[1], { ...input, slug: prefix + "-other", title: "OTHER_SELLER_MARKER" }); offers.push(other.id);
    await api.submitMarketListing(other.id, users[1], 1); await api.reviewMarketListing(other.id, users[2], 1, true, "isolated approval");
    const page = await browser.newPage();
    page.on("pageerror", error => report.pageErrors.push(String(error)));
    page.on("console", message => { if (/MISSING_MESSAGE|Missing translation:/.test(message.text())) report.translationErrors.push(message.text()); });
    async function profile(status = 200) {
      await page.bringToFront();
      const response = await page.goto("http://127.0.0.1:3108/@" + prefix + "-seller", { waitUntil: "networkidle0", timeout: 45000 });
      if (status === 404) {
        // Next streamed notFound responses may use HTTP 200. Verify the denial UI,
        // indexing exclusion and absence of protected content, not status alone.
        assert([200, 404].includes(response?.status() || 0));
        assert.equal(await page.$eval("h1", node => node.textContent), "404");
        assert(await page.$('meta[name="robots"][content*="noindex"]'));
        assert.equal(await page.$('a[href="/market/' + prefix + '"]'), null);
        assert(!(await page.content()).includes(input.title));
      } else assert.equal(response?.status(), status);
      return (await page.$eval("body", node => node.textContent)) || "";
    }
    await check("draft and pending offers never appear on public profiles", async () => {
      assert(!(await profile()).includes(input.title)); await api.submitMarketListing(listing.id, users[0], 1); assert(!(await profile()).includes(input.title));
    });
    await api.reviewMarketListing(listing.id, users[2], 1, true, "isolated approval");
    await check("profile links to its approved service and excludes another seller", async () => {
      const text = await profile(); assert(text.includes(input.title)); assert(!text.includes("OTHER_SELLER_MARKER")); assert(await page.$('a[href="/market/' + prefix + '"]')); assert(await page.$('h3'));
    });
    const axe = await readFile(createRequire(resolve(process.cwd(), "package.json")).resolve("axe-core/axe.min.js"), "utf8");
    await check("desktop and mobile profiles remain accessible without overflow", async () => {
      for (const width of [1440, 390]) {
        await page.setViewport({ width, height: width === 390 ? 844 : 1000 }); await page.bringToFront();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
        await page.screenshot({ path: output + "/profile-" + width + ".png", fullPage: true }); await page.addScriptTag({ content: axe });
        const violations = await page.evaluate(async () => {
          const result = await (window as unknown as { axe: { run: (document: Document, options: unknown) => Promise<{ violations: { id: string; nodes: { target: string[] }[] }[] }> } }).axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } });
          return result.violations.map(item => ({ id: item.id, targets: item.nodes.map(node => node.target) }));
        }); report.accessibility.push({ width, violations }); assert.equal(violations.length, 0, JSON.stringify(violations));
      }
    });
    await check("new unapproved version cannot leak its title or price", async () => {
      await api.reviseMarketListing(listing.id, users[0], { expectedVersion: 1, listing: { ...input, title: "PRIVATE_DRAFT_MARKER", priceMinor: 20002 } });
      const text = await profile(); assert(text.includes(input.title)); assert(text.includes("100.01")); assert(!text.includes("PRIVATE_DRAFT_MARKER")); assert(!text.includes("200.02"));
    });
    await check("revoked and deleted creator profiles return 404", async () => {
      await db.user.update({ where: { id: users[0] }, data: { flagged: true } }); await profile(404);
      await db.user.update({ where: { id: users[0] }, data: { flagged: false, deletedAt: new Date() } }); await profile(404);
      await db.user.update({ where: { id: users[0] }, data: { deletedAt: null } });
    });
    await check("withdrawal removes the profile offer and its public link", async () => {
      await api.withdrawMarketListing(listing.id, users[0]); const text = await profile(); assert(!text.includes(input.title)); assert.equal(await page.$('a[href="/market/' + prefix + '"]'), null);
    });
    assert.deepEqual(report.pageErrors, []); assert.deepEqual(report.translationErrors, []);
  } finally {
    await db.marketListing.updateMany({ where: { id: { in: offers } }, data: { status: "WITHDRAWN" } });
    await db.user.updateMany({ where: { id: { in: users } }, data: { flagged: true, deletedAt: new Date() } });
    await writeFile(output + "/checks.json", JSON.stringify(report, null, 2));
    await browser.close(); child.kill(); await db.$disconnect();
  }
}
main().catch(error => { console.error("[profile browser] FAIL " + (error instanceof Error ? error.message : "unknown")); process.exitCode = 1; });
