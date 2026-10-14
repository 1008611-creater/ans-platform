// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ query: vi.fn(), audit: vi.fn(), transaction: vi.fn(), scope: vi.fn(), authority: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { $transaction: mocks.transaction } }));
vi.mock("@/server/competitions/agrihackathon/workspace", () => ({
  lockAgriWorkspace: vi.fn(async () => ({ workspace: { id: "workspace", competitionId: "edition" } })),
  requireAgriScope: mocks.scope, assertAgriAuthorityCurrent: mocks.authority,
  agriDatabaseClock: vi.fn(async () => new Date("2026-10-14T12:00:00.000Z")),
}));
import { exportAgriWorks } from "@/server/competitions/agrihackathon/submissions";
import { AgriWorkspaceError } from "@/contracts/agri-workspace";
const tx = { $queryRaw: mocks.query, auditLog: { create: mocks.audit } };
const record = { id: "stage", teamId: "team", teamCompetitionId: "entry", teamName: "Team", stage: "PRELIMINARY", revision: 2,
  frozenSubmissionId: null, currentSubmissionId: "current", sequence: 1, ruleVersionId: "adopted", acceptedAt: new Date("2026-10-14T11:00:00Z"),
  content: null, adoptedSubmissionId: "current", adoptedRuleId: "adopted", windowState: "CONFIRMED", windowOpensAt: new Date("2026-10-14T10:00:00Z"),
  windowClosesAt: new Date("2026-10-14T11:59:59Z"), windowIncludesDeadline: false, ruleConfirmedById: "PRIVATE_RULE_CONFIRMER", ruleConfirmedAt: new Date("2026-10-14T09:00:00Z") };
const legacyHead = ["source", "exported_at_utc", "competition_id", "scope", "stage_filter", "status_filter", "team_query", "team_id", "team_name", "entry_id", "stage_id", "stage", "revision", "current_submission_id", "sequence", "rule_version_id", "accepted_at_utc", "recorded_frozen_submission_id"];
beforeEach(() => {
  vi.clearAllMocks(); mocks.transaction.mockImplementation(async run => run(tx));
  mocks.scope.mockResolvedValue({ id: "grant" }); mocks.authority.mockResolvedValue(undefined); mocks.audit.mockResolvedValue({ id: "audit" });
  mocks.query.mockResolvedValue([record]);
});
describe("works export effective freeze", () => {
  it("appends freeze fields without changing legacy metadata columns or exposing rule authors", async () => {
    const result = await exportAgriWorks("staff");
    expect(result.csv.split("\r\n")[0]).toBe('\uFEFF' + [...legacyHead, "effective_frozen_submission_id", "frozen_by_deadline"].map(v => '"' + v + '"').join(","));
    expect(result.csv).toContain('"","current","true"\r\n');
    expect(result.csv).not.toContain("PRIVATE_RULE_CONFIRMER"); expect(mocks.query).toHaveBeenCalledTimes(1);
    const sql = mocks.query.mock.calls[0][0].join("?");
    expect(sql).toContain('rv.id=sub."ruleVersionId"'); expect(sql).toContain('w.stage=es.stage');
  });
  it("retains current materials after correction while effective freeze refers to the original", async () => {
    mocks.query.mockResolvedValue([{ ...record, frozenSubmissionId: "original", currentSubmissionId: "corrected",
      content: { projectId: "project", artifactVersionId: "version", repository: null, demoUrl: null, summary: "corrected summary", materials: { schemaVersion: 1, items: [] } } }]);
    const result = await exportAgriWorks("staff", { mode: "materials" });
    const head = result.csv.split("\r\n")[0];
    expect(head).toContain('"recorded_frozen_submission_id","project_id","artifact_version_id"');
    expect(head).toMatch(/"materials_json","effective_frozen_submission_id","frozen_by_deadline"$/);
    expect(result.csv).toContain('"corrected summary"'); expect(result.csv).toContain('"original","false"\r\n');
    expect(mocks.scope.mock.calls.map(call => call[2])).toEqual(["WORKS_READ", "EXPORT", "PRIVATE_MATERIALS_READ"]);
  });
  it("uses one batch query and one exported instant even for 5000 submitted rows", async () => {
    mocks.query.mockResolvedValue(Array.from({ length: 5000 }, (_, i) => ({ ...record, id: "stage-" + i })));
    const result = await exportAgriWorks("staff");
    expect(result.rows).toBe(5000); expect(mocks.query).toHaveBeenCalledTimes(1);
    expect(result.csv.split('"2026-10-14T12:00:00.000Z"').length - 1).toBe(5000);
    expect(result.csv.split('"current","true"').length - 1).toBe(5000); expect(mocks.audit).toHaveBeenCalledTimes(1);
  });
  it("refuses missing adopted-window provenance before auditing or returning a CSV", async () => {
    mocks.query.mockResolvedValue([{ ...record, adoptedRuleId: null }]);
    await expect(exportAgriWorks("staff")).rejects.toMatchObject({ code: "AGRI_RULE_INVALID" }); expect(mocks.audit).not.toHaveBeenCalled();
  });
  it("keeps the 5001 hard boundary and permission recheck fail-closed", async () => {
    mocks.query.mockResolvedValue(Array.from({ length: 5001 }, () => record));
    await expect(exportAgriWorks("staff")).rejects.toMatchObject({ code: "AGRI_EXPORT_TOO_LARGE" }); expect(mocks.audit).not.toHaveBeenCalled();
    mocks.query.mockResolvedValue([record]); mocks.authority.mockRejectedValueOnce(new AgriWorkspaceError("AGRI_SCOPE_REQUIRED", 403));
    await expect(exportAgriWorks("staff")).rejects.toMatchObject({ code: "AGRI_SCOPE_REQUIRED" });
  });
});
