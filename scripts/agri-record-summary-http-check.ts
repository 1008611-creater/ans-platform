/** Requires a separately prepared synthetic account fixture and an already-running 3162 Next server. */
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import type { AgriRecordSummary } from "../src/contracts/agri-record-summary";
for (const value of [process.env.DATABASE_URL, process.env.DIRECT_URL]) {
  const url = new URL(value ?? "http://invalid");
  if (url.hostname !== "127.0.0.1" || url.port !== "55438" || url.pathname !== "/ans_product_verify_agri_summary_r1") throw new Error("Refusing non-isolated summary HTTP");
}
const origin = "http://127.0.0.1:3162", dir = ".workbuddy/evidence/agri-summary";
interface User { id: string; email: string }
interface Fixture { localFixtureOnly: true; origin: string; edition: string; submissionId: string; tooLargeSubmissionId: string; full: User; reader: User; privateReader: User; internalReader: User; owner: User; outsider: User; admin: User; onsite: User }
class Client {
  private cookies = new Map<string, string>();
  constructor(readonly actorId: string | null) {}
  async fetch(path: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers); headers.set("cookie", Array.from(this.cookies, ([key, value]) => `${key}=${value}`).join("; "));
    const response = await fetch(origin + path, { ...init, headers, redirect: "manual", signal: AbortSignal.timeout(15000) });
    for (const cookie of response.headers.getSetCookie()) { const entry = cookie.split(";", 1)[0], split = entry.indexOf("="); if (split > 0) this.cookies.set(entry.slice(0, split), entry.slice(split + 1)); }
    return response;
  }
  async login(email: string, password: string) {
    const csrf = await this.fetch("/api/auth/csrf"); assert.equal(csrf.status, 200); const { csrfToken } = await csrf.json() as { csrfToken: string };
    const response = await this.fetch("/api/auth/callback/credentials", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", origin, "X-Auth-Return-Redirect": "1" }, body: new URLSearchParams({ csrfToken, email, password, callbackUrl: origin + "/competitions/agrihackathon/works" }) });
    assert.equal(response.status, 200); const result = await response.json() as { url: string }; assert.ok(!new URL(result.url).searchParams.has("error"));
    assert.equal(((await (await this.fetch("/api/auth/session")).json()) as { user?: User }).user?.id, this.actorId);
  }
  request(submissionId: string, query = "", extra: Record<string, string> = {}) {
    return this.fetch("/api/competitions/agrihackathon/records/" + encodeURIComponent(submissionId) + "/summary" + query, { headers: { ...(this.actorId ? { "x-ans-submission-actor": this.actorId } : {}), ...extra } });
  }
  async data(submissionId: string, query = "") {
    const response = await this.request(submissionId, query); assert.equal(response.status, 200); assert.equal(response.headers.get("cache-control"), "no-store");
    const result = await response.json() as { ok: boolean; data: AgriRecordSummary }; assert.equal(result.ok, true); return result.data;
  }
}
async function main() {
  const fixture = JSON.parse(await readFile(dir + "/http-fixture.json", "utf8")) as Fixture;
  assert.equal(fixture.localFixtureOnly, true); assert.equal(fixture.origin, origin);
  const users = [fixture.full, fixture.reader, fixture.privateReader, fixture.internalReader, fixture.owner, fixture.outsider, fixture.admin, fixture.onsite];
  assert.ok(users.every(user => user.email.endsWith("@example.invalid")));
  const password = process.env.ANS_AGRI_SUMMARY_FIXTURE_PASSWORD;
  if (!password) throw new Error("Separately prepared synthetic login fixture required");
  const checks: Array<{ label: string; passed: boolean }> = []; let current = "readiness", passed = false;
  const check = async (label: string, work: () => Promise<void>) => { current = label; await work(); checks.push({ label, passed: true }); console.log("[summary-http] PASS " + label); };
  const clients = users.map(user => new Client(user.id)), [full, reader, privateReader, internalReader, owner, outsider, admin, onsite] = clients, anon = new Client(null);
  try {
    assert.equal((await fetch(origin + "/api/health", { signal: AbortSignal.timeout(5000) })).status, 200);
    await check("anonymous exact summary requires actual login", async () => { assert.equal((await anon.request(fixture.submissionId)).status, 401); });
    await check("actual CSRF Credentials login authenticates eight independent synthetic accounts", async () => { for (let i = 0; i < users.length; i++) await clients[i].login(users[i].email, password); });
    await check("stable actor intent and strict query reject missing/changed intent and forged expansions", async () => {
      assert.equal((await full.fetch("/api/competitions/agrihackathon/records/" + fixture.submissionId + "/summary")).status, 409);
      assert.equal((await full.request(fixture.submissionId, "", { "x-ans-submission-actor": fixture.reader.id })).status, 409);
      for (const query of ["?scope=team", "?mode=public", "?includePrivate=1", "?includeInternal=yes", "?actorId=other"]) assert.equal((await full.request(fixture.submissionId, query)).status, 400);
    });
    await check("default metadata is exact old version without body or URL", async () => {
      const view = await reader.data(fixture.submissionId); assert.equal(view.submission.id, fixture.submissionId); assert.equal(view.submission.isCurrent, false); assert.equal(view.content, undefined); assert.equal(view.limits.complete, true); assert.equal(view.stageHistory.length, 3);
      for (const secret of ["PRIVATE_SUBMISSION_BODY", "PRIVATE_CHECK_BODY", "PRIVATE_DEMO_DESCRIPTION", "PRIVATE_INTERNAL_NOTE", "TEAM_META_BODY", "INTERNAL_META_BODY", "example.invalid/private"]) assert.ok(!JSON.stringify(view).includes(secret));
    });
    await check("private-only and internal-only selections enforce independent basis and visibility layers", async () => {
      const a = await privateReader.data(fixture.submissionId, "?includePrivate=true"), b = await internalReader.data(fixture.submissionId, "?includeInternal=true"); assert.equal(a.content?.summary, "PRIVATE_SUBMISSION_BODY"); assert.equal(a.issues.length, 2); assert.equal(b.issues.length, 2); assert.equal(b.content, undefined);
      assert.ok(!JSON.stringify(a).includes("INTERNAL_META_BODY")); assert.ok(!JSON.stringify(a).includes("PRIVATE_INTERNAL_NOTE")); assert.ok(JSON.stringify(b).includes("INTERNAL_META_BODY")); assert.ok(!JSON.stringify(b).includes("INTERNAL_PRIVATE_BODY")); assert.ok(!JSON.stringify(b).includes("PRIVATE_DEMO_INTERNAL_NOTE"));
      assert.equal((await reader.request(fixture.submissionId, "?includePrivate=true")).status, 403); assert.equal((await privateReader.request(fixture.submissionId, "?includeInternal=true")).status, 403);
    });
    await check("both explicit scopes retrieve authorized detail but withdrawn feedback never returns", async () => { const view = await full.data(fixture.submissionId, "?includePrivate=true&includeInternal=true"); assert.equal(view.issues.length, 4); assert.ok(JSON.stringify(view).includes("INTERNAL_PRIVATE_BODY")); assert.ok(!JSON.stringify(view).includes("WITHDRAWN_FEEDBACK")); });
    await check("own-team, onsite-only, global ADMIN and unrelated accounts have no WORKS_READ bypass", async () => { for (const client of [owner, outsider, admin, onsite]) assert.equal((await client.request(fixture.submissionId)).status, 403); });
    await check("EXPORT is independent and successful JSON attachment has safe headers and provenance", async () => {
      assert.equal((await reader.request(fixture.submissionId, "?mode=exportJSON")).status, 403); const response = await full.request(fixture.submissionId, "?mode=exportJSON&includePrivate=true&includeInternal=true"); assert.equal(response.status, 200); assert.equal(response.headers.get("cache-control"), "no-store"); assert.equal(response.headers.get("x-content-type-options"), "nosniff"); assert.match(response.headers.get("content-disposition")!, /^attachment; filename="ans-agri-record-summary-\d{4}-\d{2}-\d{2}\.json"$/); assert.equal((await response.json() as AgriRecordSummary).submission.id, fixture.submissionId);
    });
    await check("101 visible records reject view and export rather than producing a truncated file", async () => { for (const query of ["", "?mode=exportJSON"]) assert.equal((await full.request(fixture.tooLargeSubmissionId, query)).status, 422); });
    passed = true;
  } catch (error) { await writeFile(dir + "/http-failure.txt", String(error instanceof Error ? error.stack : error)); throw error; }
  finally { await writeFile(dir + "/http.json", JSON.stringify({ passed, current, checks, isolatedPostgres: true, productionWrites: false, modelCalls: 0, funds: false }, null, 2) + "\n"); }
}
main().catch(() => { console.error("SUMMARY_HTTP_FAILED; inspect local evidence, credentials suppressed"); process.exitCode = 1; });
