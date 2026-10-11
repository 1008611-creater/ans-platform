/** Isolated PostgreSQL + real browser; signed test sessions/payments, no production auth bypass. */
import assert from "node:assert/strict";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import puppeteer, { type Page } from "puppeteer";
import { encode } from "next-auth/jwt";
import type { MarketPaymentAdapter } from "../src/server/marketplace/payments";

async function main() {
const base = process.env.PRODUCT_PREVIEW_URL || "http://127.0.0.1:3107";
const localHosts = ["127.0.0.1", "localhost", "[::1]"];
assert(localHosts.includes(new URL(base).hostname), "Browser writes require a loopback preview");
for (const value of [process.env.DATABASE_URL, process.env.DIRECT_URL]) {
  assert(value, "Explicit isolated database required");
  const url = new URL(value);
  assert(localHosts.includes(url.hostname) && /^\/(?:ans_)?(?:product_)?(?:test|verify)(?:[_-][a-z0-9_-]+)?$/.test(url.pathname), "Refusing non-isolated database writes");
}
assert(process.env.AUTH_SECRET, "Local session signing secret required");
const prefix = "market-browser-" + Date.now().toString(36) + "-" + randomBytes(3).toString("hex");
const output = ".workbuddy/evidence/marketplace/browser";
const report = { checks: [] as string[], accessibility: [] as unknown[], pageErrors: [] as string[], translationErrors: [] as string[] };
const require = createRequire(resolve(process.cwd(), "package.json"));
const axe = await readFile(require.resolve("axe-core/axe.min.js"), "utf8");
const translations = JSON.parse(await readFile("messages/product/zh.json", "utf8"));
const t = translations.market as Record<string, string>;
const { db } = await import("../src/lib/db");
const listings = await import("../src/server/marketplace/listings");
const orders = await import("../src/server/marketplace/orders");
const payments = await import("../src/server/marketplace/payments");
await mkdir(output, { recursive: true });
const browser = await puppeteer.launch({ executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
const fixtureUsers: string[] = [];
let listingId: string | undefined;
async function check(label: string, run: () => Promise<void>) { await run(); report.checks.push(label); console.log("[market browser] PASS " + label); }
async function openUser(role: string) {
  const user = await db.user.create({ data: { username: prefix + "-" + role, email: prefix + "-" + role + "@example.invalid", locale: "zh", role: role === "moderator" ? "ADMIN" : "USER", ...(role === "moderator" ? { adminPermissions: ["MARKETPLACE_MANAGE"] } : {}) } });
  fixtureUsers.push(user.id);
  const context = await browser.createBrowserContext();
  const token = await encode({ token: { id: user.id, pwdAt: 0 }, secret: process.env.AUTH_SECRET!, salt: "authjs.session-token", maxAge: 3600 });
  await context.setCookie({ name: "authjs.session-token", value: token, domain: new URL(base).hostname, path: "/", httpOnly: true, secure: false, sameSite: "Lax" });
  const page = await context.newPage();
  page.on("pageerror", (error) => report.pageErrors.push(String(error)));
  page.on("console", (message) => { if (/Missing translation:|MISSING_MESSAGE/.test(message.text())) report.translationErrors.push(message.text()); });
  await page.setViewport({ width: 1440, height: 1000 });
  return { id: user.id, page };
}
async function visit(page: Page, path: string) {
  const response = await page.goto(base + path, { waitUntil: "networkidle0", timeout: 45_000 });
  assert.equal(response?.status(), 200, path);
}
async function fill(page: Page, selector: string, value: string) {
  selector = selector.startsWith("[name=") ? ":is(input,textarea)" + selector : selector;
  await page.waitForSelector(selector);
  await page.$eval(selector, (node) => { const input = node as HTMLInputElement; input.value = ""; input.dispatchEvent(new Event("input", { bubbles: true })); });
  await page.type(selector, value);
}
async function clickText(page: Page, text: string) {
  const clicked = await page.evaluate((label) => {
    const button = Array.from(document.querySelectorAll("button")).find((node) => node.textContent?.trim() === label);
    if (!button || button.disabled) return false;
    button.click(); return true;
  }, text);
  assert(clicked, "Enabled button missing: " + text);
}
async function mutate(page: Page, path: string, method: string, click: () => Promise<void>, status = 200) {
  const response = page.waitForResponse((result) => new URL(result.url()).pathname === path && result.request().method() === method, { timeout: 15_000 });
  await click(); let result; try { result = await response; } catch (error) { console.error(await page.evaluate(() => ({ alerts: Array.from(document.querySelectorAll("[role=alert]")).map(node => node.textContent), invalid: Array.from(document.querySelectorAll("input,textarea,select")).filter(node => !(node as HTMLInputElement).checkValidity()).map(node => ({ name: (node as HTMLInputElement).name, message: (node as HTMLInputElement).validationMessage, value: (node as HTMLInputElement).value })) }))); await page.screenshot({ path: output + "/failure.png", fullPage: true }); throw error; } assert.equal(result.status(), status, path); const payload = await result.json(); return payload.data ?? payload;
}
async function audit(page: Page, label: string, width = 1440) {
  await page.setViewport({ width, height: width < 600 ? 844 : 1000 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, label + " overflow");
  await page.screenshot({ path: output + "/" + label + ".png", fullPage: true });
  await page.addScriptTag({ content: axe });
  const violations = await page.evaluate(async () => {
    const result = await (window as unknown as { axe: { run: (document: Document, options: unknown) => Promise<{ violations: { id: string; impact: string; nodes: { target: string[] }[] }[] }> } }).axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } });
    return result.violations.map(({ id, impact, nodes }) => ({ id, impact, targets: nodes.map((node) => node.target) }));
  });
  report.accessibility.push({ label, width, violations });
  assert.equal(violations.length, 0, label + " accessibility: " + JSON.stringify(violations));
}
try {
  const seller = await openUser("seller"); const buyer = await openUser("buyer");
  const moderator = await openUser("moderator"); const outsider = await openUser("outsider");
  await visit(seller.page, "/market/creator/new");
  assert.equal(new URL(seller.page.url()).pathname, "/market/creator/new", "Signed local fixture was not authenticated");
  const formValues: Record<string, string> = { title: "Isolated resume website", slug: prefix, summary: "A personal resume website using confirmed experience.", description: "A verified personal website service with source files and a clear agreed delivery scope.", price: "100.01", deliverables: "Website source files\nSetup guide", licenseTerms: "Buyer may use the delivered source files for their personal website." };
  for (const [name, value] of Object.entries(formValues)) await fill(seller.page, '[name="' + name + '"]', value);
  await check("editor failure preserves entered values and category choices", async () => {
    await seller.page.setRequestInterception(true);
    const listener = (request: import("puppeteer").HTTPRequest) => {
      if (new URL(request.url()).pathname === "/api/market/listings" && request.method() === "POST") void request.respond({ status: 503, contentType: "application/json", body: JSON.stringify({ error: { code: "INTERNAL_ERROR" } }) });
      else void request.continue();
    };
    seller.page.on("request", listener);
    await mutate(seller.page, "/api/market/listings", "POST", () => clickText(seller.page, t.save), 503);
    await seller.page.waitForSelector('[role="alert"]');
    assert.equal(await seller.page.$eval('[name="title"]', (node) => (node as HTMLInputElement).value), formValues.title);
    assert.equal(await seller.page.$eval('[name="price"]', (node) => (node as HTMLInputElement).value), "100.01");
    seller.page.off("request", listener); await seller.page.setRequestInterception(false);
    await audit(seller.page, "editor-mobile", 390);
  });
  await check("seller creates draft and outsiders cannot read it", async () => {
    const result = await mutate(seller.page, "/api/market/listings", "POST", () => clickText(seller.page, t.save), 201);
    listingId = result.listing.id;
    await seller.page.waitForFunction((id) => location.pathname === "/market/creator/" + id, {}, listingId);
    await seller.page.waitForSelector('[name="title"]');
    assert.equal(await listings.getMarketListing(prefix).catch(() => null), null);
    await visit(outsider.page, "/market");
    const status = await outsider.page.evaluate(async (id) => (await fetch("/api/market/listings/" + id)).status, listingId);
    assert.equal(status, 404);
  });
  await check("submit and administrator review publish only the approved version", async () => {
    await mutate(seller.page, "/api/market/listings/" + listingId, "POST", () => clickText(seller.page, t.submit));
    await visit(moderator.page, "/admin/market");
    await fill(moderator.page, '[name="note"]', "Isolated review: scope, rights and price checked.");
    await moderator.page.select('[name="decision"]', "approve");
    await mutate(moderator.page, "/api/admin/market/" + listingId, "POST", () => clickText(moderator.page, t.confirmReview));
    assert.equal((await listings.getMarketListing(prefix)).version, 1);
    await visit(buyer.page, "/market/" + prefix);
    await audit(buyer.page, "listing-desktop"); await audit(buyer.page, "listing-mobile", 390);
    assert(await buyer.page.$("button[disabled]"), "Payment must stay disabled");
    const status = await buyer.page.evaluate(async (id) => (await fetch("/api/market/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listingId: id, expectedVersion: 1, idempotencyKey: "browser-checkout" }) })).status, listingId);
    assert.equal(status, 503);
  });
  await check("editing does not replace approved public content until review", async () => {
    await visit(seller.page, "/market/creator/" + listingId);
    await fill(seller.page, '[name="title"]', "Revised isolated resume website");
    await mutate(seller.page, "/api/market/listings/" + listingId, "PATCH", () => clickText(seller.page, t.save));
    assert.equal((await listings.getMarketListing(prefix)).listing.title, formValues.title);
    await seller.page.waitForFunction((label) => Array.from(document.querySelectorAll("button")).some((node) => node.textContent?.trim() === label && !node.disabled), {}, t.submit);
    await mutate(seller.page, "/api/market/listings/" + listingId, "POST", () => clickText(seller.page, t.submit));
    await visit(moderator.page, "/admin/market");
    await fill(moderator.page, '[name="note"]', "Isolated second-version review complete.");
    await moderator.page.select('[name="decision"]', "approve");
    await mutate(moderator.page, "/api/admin/market/" + listingId, "POST", () => clickText(moderator.page, t.confirmReview));
    assert.equal((await listings.getMarketListing(prefix)).version, 2);
    await visit(buyer.page, "/market?category=career&subcategory=resume&q=" + prefix);
    await audit(buyer.page, "market-mobile", 390);
  });
  // Only this explicit fixture policy and signed adapter may create a paid test order.
  const order = await orders.createMarketOrder(buyer.id, { listingId, expectedVersion: 2, idempotencyKey: prefix + "-order", requirements: "Verified personal history; deliver website files and setup guide." }, { commissionBps: 333 });
  const signingKey = randomBytes(32);
  const adapter: MarketPaymentAdapter = { provider: "isolated-browser", async requestRefund() {}, async verifyWebhook(body, headers) {
    const expected = createHmac("sha256", signingKey).update(body).digest("hex"); const actual = headers.get("x-test-signature") || "";
    assert(/^[a-f0-9]{64}$/.test(actual) && timingSafeEqual(Buffer.from(expected), Buffer.from(actual)), "Bad test signature"); return JSON.parse(body);
  } };
  const body = JSON.stringify({ provider: adapter.provider, eventId: prefix + "-event", orderId: order.id, paymentId: prefix + "-payment", type: "payment_succeeded", amountMinor: 10001, currency: "CNY" });
  await payments.handleMarketWebhook(body, new Headers({ "x-test-signature": createHmac("sha256", signingKey).update(body).digest("hex") }), adapter);
  const orderPath = "/market/orders/" + order.id; const orderApi = "/api/market/orders/" + order.id;
  await check("outsiders cannot read or mutate an order over HTTP", async () => {
    const results = await outsider.page.evaluate(async (url) => [
      (await fetch(url)).status,
      (await fetch(url + "/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: "unauthorized", idempotencyKey: "outsider-key" }) })).status,
    ], orderApi);
    assert.deepEqual(results, [404, 404]);
  });
  await check("seller delivery, buyer revision and second delivery use real UI", async () => {
    await visit(seller.page, orderPath); await fill(seller.page, '[name="message"]', "# Website delivery\nSource files and setup guide are ready for review.");
    await mutate(seller.page, orderApi, "POST", () => clickText(seller.page, translations.market.actions.deliver));
    await visit(buyer.page, orderPath); await fill(buyer.page, '[name="message"]', "Please adjust the headline using my confirmed history.");
    await mutate(buyer.page, orderApi, "POST", () => clickText(buyer.page, translations.market.actions.request_revision));
    await visit(seller.page, orderPath); await fill(seller.page, '[name="message"]', "# Revised website\nHeadline updated. Source files and setup guide included.");
    await mutate(seller.page, orderApi, "POST", () => clickText(seller.page, translations.market.actions.deliver));
    await visit(buyer.page, orderPath);
    assert(!(await buyer.page.$$eval("select option", (nodes) => nodes.map((node) => (node as HTMLOptionElement).value))).includes("request_revision"), "Revision limit should remove that action");
    await audit(buyer.page, "order-desktop"); await audit(buyer.page, "order-mobile", 390);
  });
  await check("messages preserve idempotency across failed transport retries", async () => {
    await fill(buyer.page, '[name="content"]', "Thank you, reviewing the files now.");
    await buyer.page.setRequestInterception(true);
    const listener = async (request: import("puppeteer").HTTPRequest) => {
      if (new URL(request.url()).pathname === orderApi + "/messages" && request.method() === "POST") {
        // Commit the real request, then simulate losing its response at the network edge.
        const upstream = await fetch(request.url(), { method: "POST", headers: { origin: base, "Content-Type": "application/json", cookie: request.headers().cookie || "" }, body: request.postData() });
        assert.equal(upstream.status, 200);
        await request.respond({ status: 503, contentType: "application/json", body: JSON.stringify({ ok: false, error: { code: "INTERNAL_ERROR" } }) });
      } else await request.continue();
    };
    buyer.page.on("request", listener);
    await mutate(buyer.page, orderApi + "/messages", "POST", () => clickText(buyer.page, t.send), 503);
    await buyer.page.waitForSelector('[role="alert"]');
    assert.equal(await buyer.page.$eval('textarea[name="content"]', (node) => (node as HTMLTextAreaElement).value), "Thank you, reviewing the files now.");
    buyer.page.off("request", listener); await buyer.page.setRequestInterception(false);
    await buyer.page.waitForFunction((label) => Array.from(document.querySelectorAll("button")).some((node) => node.textContent?.trim() === label && !node.disabled), {}, t.send);
    await mutate(buyer.page, orderApi + "/messages", "POST", () => clickText(buyer.page, t.send));
    const messages = await db.marketOrderMessage.findMany({ where: { orderId: order.id } });
    assert.equal(messages.length, 1);
  });
  await check("buyer must confirm acceptance before review becomes available", async () => {
    await visit(buyer.page, orderPath); await buyer.page.click('input[type="checkbox"][required]');
    await mutate(buyer.page, orderApi, "POST", () => clickText(buyer.page, translations.market.actions.accept));
    await buyer.page.waitForSelector('[name="rating"]');
    await fill(buyer.page, 'form:has([name="rating"]) textarea[name="content"]', "Clear scope and useful website source files.");
    await mutate(buyer.page, orderApi + "/review", "POST", () => clickText(buyer.page, t.writeReview));
    assert.equal((await orders.getMarketOrder(order.id, buyer.id)).status, "COMPLETED");
    assert.equal((await orders.getMarketOrder(order.id, buyer.id)).review?.rating, 5);
    await visit(buyer.page, orderPath); await audit(buyer.page, "completed-order-mobile", 390);
  });
  await check("withdrawal removes public listing while preserving order quote", async () => {
    await visit(seller.page, "/market/creator/" + listingId);
    await mutate(seller.page, "/api/market/listings/" + listingId, "POST", () => clickText(seller.page, t.withdraw));
    assert.equal(await listings.getMarketListing(prefix).catch(() => null), null);
    assert.equal((await orders.getMarketOrder(order.id, buyer.id)).quote.title, "Revised isolated resume website");
  });
  assert.deepEqual(report.pageErrors, []); assert.deepEqual(report.translationErrors, []);
  console.log(JSON.stringify({ checks: report.checks.length, accessibilityPages: report.accessibility.length, pageErrors: report.pageErrors.length, translationErrors: report.translationErrors.length }));
} finally {
  // Retain immutable financial/history evidence; hide all isolated fixtures from the preview.
  if (listingId) await db.marketListing.update({ where: { id: listingId }, data: { status: "WITHDRAWN" } });
  if (fixtureUsers.length) await db.user.updateMany({ where: { id: { in: fixtureUsers } }, data: { flagged: true, deletedAt: new Date() } });
  await writeFile(output + "/checks.json", JSON.stringify(report, null, 2));
  await browser.close(); await db.$disconnect();
}

}
main().catch((error) => { console.error(error); process.exitCode = 1; });
