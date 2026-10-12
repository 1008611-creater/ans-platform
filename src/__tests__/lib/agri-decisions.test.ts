// @vitest-environment node
import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ raw: vi.fn(), write: vi.fn(), scope: vi.fn(), assert: vi.fn(), audit: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { $transaction: (run: (tx: unknown) => unknown) => run({ $queryRaw: mocks.raw, $executeRaw: mocks.write, auditLog: { create: mocks.audit } }) } }));
vi.mock("@/server/competitions/agrihackathon/workspace", () => ({ lockAgriWorkspace: async () => ({ workspace: { competitionId: "edition", enabled: true } }), requireAgriScope: mocks.scope, assertAgriAuthorityCurrent: mocks.assert, agriDatabaseClock: async () => new Date("2026-10-11T04:00:00Z") }));
import { agriDecisionCommandSchema } from "@/contracts/agri-decisions";
import { AgriWorkspaceError } from "@/contracts/agri-workspace";
import { executeAgriDecisionCommand, finalEligibility, readAgriDecisionManagement } from "@/server/competitions/agrihackathon/decisions";
const key = "e388a9d9-e83d-4ed2-a36d-123b183c1401";
const decision = { action: "recordFinalEligibility", teamCompetitionId: "entry", expectedSequence: 0, state: "ELIGIBLE", reason: "Manager approval", sourceReference: "Official source", idempotencyKey: key };
const permit = { action: "issueCorrectionPermit", entryStageId: "stage", expectedRevision: 2, previousSubmissionId: "original", allowedFields: ["summary"], reason: "Approved limited correction", expiresAt: "2026-10-11T04:00:00Z", idempotencyKey: key };
beforeEach(() => { vi.clearAllMocks(); mocks.scope.mockResolvedValue({ expiresAt: null }); mocks.raw.mockImplementation((strings: TemplateStringsArray) => {
 const sql = strings.join("?"); if (sql.includes("agri_decision_receipts")) return [];
 if (sql.includes("team_competitions")) return [{ id: "entry" }];
 if (sql.includes("max(sequence)")) return [{ sequence: 0 }];
 if (sql.includes("agri_entry_stages")) return [{ revision: 2, currentSubmissionId: "original" }];
 if (sql.includes("agri_stage_submissions")) return [{ ruleVersionId: "original-rule" }]; return [];
}); });
describe("persistent decision service boundaries (in-memory mocks, no database)", () => {
 it("denies technical writers without RULES_CONFIRM before any write", async () => {
  mocks.scope.mockRejectedValueOnce(new AgriWorkspaceError("AGRI_SCOPE_REQUIRED", 403));
  await expect(executeAgriDecisionCommand("technical-writer", decision)).rejects.toMatchObject({ code: "AGRI_SCOPE_REQUIRED" });
  expect(mocks.scope.mock.calls[0][2]).toBe("RULES_CONFIRM"); expect(mocks.write).not.toHaveBeenCalled();
 });
 it("records a separate eligibility decision without modifying entries, checks, public state or XP", async () => {
  await executeAgriDecisionCommand("rules-manager", decision);
  const sql = mocks.write.mock.calls.map(call => call[0].join("?")).join(" ");
  expect(sql).toContain("INSERT INTO agri_final_decisions"); expect(sql).toContain("INSERT INTO agri_decision_receipts");
  expect(sql).not.toMatch(/UPDATE|publication|quota|ledger|awardedXp|technical_checks/i);
  expect(mocks.assert).toHaveBeenCalled();
 });
 it("rejects a changed eligibility sequence and expired correction permit before persistence", async () => {
  await expect(executeAgriDecisionCommand("rules-manager", { ...decision, expectedSequence: 1 })).rejects.toMatchObject({ code: "AGRI_REVISION_CONFLICT" });
  await expect(executeAgriDecisionCommand("rules-manager", permit)).rejects.toMatchObject({ code: "AGRI_PERMIT_EXPIRY_INVALID" });
  expect(mocks.write).not.toHaveBeenCalled();
 });
 it("replays the original receipt without a second decision and rejects changed content", async () => {
  const requestHash = createHash("sha256").update(JSON.stringify(agriDecisionCommandSchema.parse(decision))).digest("hex");
  mocks.raw.mockResolvedValueOnce([{ requestHash, resourceId: "existing-decision" }]);
  expect(await executeAgriDecisionCommand("rules-manager", decision)).toEqual({ resourceId: "existing-decision", duplicate: true });
  expect(mocks.write).not.toHaveBeenCalled(); expect(mocks.assert).toHaveBeenCalled();
  mocks.raw.mockResolvedValueOnce([{ requestHash, resourceId: "existing-decision" }]);
  await expect(executeAgriDecisionCommand("rules-manager", { ...decision, state: "INELIGIBLE" })).rejects.toMatchObject({ code: "AGRI_IDEMPOTENCY_CONFLICT" });
 });
 it("rejects unchecked source decisions, unbounded fields and extra caller authority", () => {
  for (const raw of [{ ...decision, sourceReference: "" }, { ...decision, actorId: "forged" }, { ...permit, allowedFields: [] }, { ...permit, allowedFields: ["summary", "summary"] }, { ...permit, allowedFields: ["projectId"] }]) expect(agriDecisionCommandSchema.safeParse(raw).success).toBe(false);
 });
 it("unknown eligibility remains closed; the latest persisted decision supplies the source", async () => {
  mocks.raw.mockResolvedValueOnce([]); expect(await finalEligibility({ $queryRaw: mocks.raw } as never, "edition", "entry")).toEqual({ state: "UNKNOWN" });
  mocks.raw.mockResolvedValueOnce([{ id: "decision-id", state: "INELIGIBLE" }]); expect(await finalEligibility({ $queryRaw: mocks.raw } as never, "edition", "entry")).toEqual({ state: "INELIGIBLE", sourceId: "decision-id" });
 });
});

describe("decision target context is returned only after server authorization", () => {
 it("returns the actual locked team and matching stage, without trusting client labels", async () => {
  mocks.raw.mockImplementation((strings: TemplateStringsArray) => {
   const sql = strings.join("?");
   if (sql.includes("FROM team_competitions")) return [{ id: "entry", teamName: "Actual team" }];
   if (sql.includes("FROM agri_entry_stages")) return [{ id: "stage", stage: "FINAL", revision: 2, currentSubmissionId: "original" }];
   return [];
  });
  const view = await readAgriDecisionManagement("rules-manager", { teamCompetitionId: "entry", entryStageId: "stage" });
  expect(view.context).toEqual({ teamName: "Actual team", stage: "FINAL" });
  expect(mocks.scope.mock.calls[0][2]).toBe("RULES_CONFIRM"); expect(mocks.assert).toHaveBeenCalled(); expect(mocks.write).not.toHaveBeenCalled();
 });
 it("does not reveal target metadata or query it when RULES_CONFIRM is absent", async () => {
  mocks.scope.mockRejectedValueOnce(new AgriWorkspaceError("AGRI_SCOPE_REQUIRED", 403));
  await expect(readAgriDecisionManagement("reader", { teamCompetitionId: "entry", entryStageId: "stage" })).rejects.toMatchObject({ code: "AGRI_SCOPE_REQUIRED" });
  expect(mocks.raw).not.toHaveBeenCalled(); expect(mocks.write).not.toHaveBeenCalled();
 });
 it("rejects a stage outside the target entry before returning its context", async () => {
  mocks.raw.mockImplementation((strings: TemplateStringsArray) => strings.join("?").includes("team_competitions") ? [{ id: "entry", teamName: "Actual team" }] : []);
  await expect(readAgriDecisionManagement("rules-manager", { teamCompetitionId: "entry", entryStageId: "other-stage" })).rejects.toMatchObject({ code: "AGRI_STAGE_NOT_FOUND" });
 });
});
