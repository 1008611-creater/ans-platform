// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/server/competitions/agrihackathon/workspace", () => ({ readAgriWorkspaceRules: vi.fn(), executeAgriWorkspaceCommand: vi.fn(), readAgriGrantManagement: vi.fn(), executeAgriGrantCommand: vi.fn() }));
vi.mock("@/server/competitions/agrihackathon/decisions", () => ({ readAgriDecisionManagement: vi.fn(), executeAgriDecisionCommand: vi.fn() }));
import { auth } from "@/lib/auth";
import { executeAgriWorkspaceCommand, executeAgriGrantCommand } from "@/server/competitions/agrihackathon/workspace";
import { executeAgriDecisionCommand } from "@/server/competitions/agrihackathon/decisions";
import { AgriWorkspaceError } from "@/contracts/agri-workspace";
import { GET as rulesRead, POST as rulesWrite } from "@/app/api/competitions/agrihackathon/manage/route";
import { GET as grantsRead, POST as grantsWrite } from "@/app/api/competitions/agrihackathon/manage/grants/route";
import { GET as decisionsRead, POST as decisionsWrite } from "@/app/api/competitions/agrihackathon/manage/decisions/route";
const origin = "https://ans.example", key = "e388a9d9-e83d-4ed2-a36d-123b183c1401";
let actor = ""; let serial = 0;
const request = (query = "", body?: unknown, from = origin) => new Request(origin + "/api/competitions/agrihackathon/manage" + query, { headers: { "x-ans-submission-actor": actor, ...(body ? { origin: from, "content-type": "application/json" } : {}) }, ...(body ? { method: "POST", body: JSON.stringify(body) } : {}) });
const rule = { action: "confirmRules", expectedRevision: 1, idempotencyKey: key };
const grant = { action: "delegateScope", recipientId: "verified-account", scope: "WORKS_READ", expectedRevision: 0, expiresAt: null, delegable: false, idempotencyKey: key };
const decision = { action: "recordFinalEligibility", teamCompetitionId: "entry", expectedSequence: 0, state: "ELIGIBLE", reason: "Responsible manager decision", sourceReference: "Official decision reference", idempotencyKey: key };
beforeEach(() => { vi.clearAllMocks(); actor = "management-" + serial++; vi.mocked(auth).mockResolvedValue({ user: { id: actor } } as never); for (const env of ["AUTH_URL", "NEXTAUTH_URL", "NEXT_PUBLIC_APP_URL"]) vi.stubEnv(env, ""); });
describe("agri management HTTP authorization and strict boundaries", () => {
 it("rejects anonymous and changed-account requests before a management service", async () => {
  for (const identity of [null, { user: { id: "changed" } }]) {
   vi.mocked(auth).mockResolvedValue(identity as never);
   const expected = identity ? 409 : 401;
   for (const response of [await rulesRead(request()), await grantsRead(request()), await decisionsRead(request("?teamCompetitionId=entry")), await rulesWrite(request("", rule)), await grantsWrite(request("", grant)), await decisionsWrite(request("", decision))]) expect(response.status).toBe(expected);
  }
  for (const service of [executeAgriWorkspaceCommand, executeAgriGrantCommand, executeAgriDecisionCommand]) expect(service).not.toHaveBeenCalled();
 });
 it("rejects forged manager IDs, timestamps, public flags, XP and root-scope delegation", async () => {
  for (const extra of [{ actorId: "forged" }, { authorizedById: "forged" }, { decidedAt: "2026-10-11T00:00:00Z" }, { publicConsent: true }, { awardedXp: 1 }]) expect((await decisionsWrite(request("", { ...decision, ...extra }))).status).toBe(400);
  expect((await grantsWrite(request("", { ...grant, scope: "ACCESS_MANAGE" }))).status).toBe(400);
  expect(executeAgriDecisionCommand).not.toHaveBeenCalled(); expect(executeAgriGrantCommand).not.toHaveBeenCalled();
 });
 it("requires a same-origin explicit action and forwards session identity only", async () => {
  for (const [handler, body] of [[rulesWrite, rule], [grantsWrite, grant], [decisionsWrite, decision]] as const) {
   expect((await handler(request("", body, "https://outsider.invalid"))).status).toBe(403);
   expect((await handler(request("", body))).status).toBe(200);
  }
  expect(executeAgriWorkspaceCommand).toHaveBeenCalledWith(actor, rule); expect(executeAgriGrantCommand).toHaveBeenCalledWith(actor, grant); expect(executeAgriDecisionCommand).toHaveBeenCalledWith(actor, decision);
 });
 it("preserves missing-configuration and scope denial without exposing diagnostics", async () => {
  vi.mocked(executeAgriWorkspaceCommand).mockRejectedValueOnce(new AgriWorkspaceError("AGRI_EDITION_NOT_CONFIGURED", 503));
  expect(await (await rulesWrite(request("", rule))).json()).toMatchObject({ error: { code: "AGRI_EDITION_NOT_CONFIGURED" } });
  vi.mocked(executeAgriDecisionCommand).mockRejectedValueOnce(new AgriWorkspaceError("AGRI_SCOPE_REQUIRED", 403));
  expect((await decisionsWrite(request("", decision))).status).toBe(403);
  vi.mocked(executeAgriGrantCommand).mockRejectedValueOnce(new Error("PRIVATE_DB_CREDENTIALS"));
  const response = await grantsWrite(request("", grant)); expect(response.status).toBe(500); expect(response.headers.get("cache-control")).toBe("no-store"); expect(JSON.stringify(await response.json())).not.toContain("PRIVATE_DB_CREDENTIALS");
 });
});
