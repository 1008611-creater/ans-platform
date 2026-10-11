import { describe, expect, it, vi, beforeEach } from "vitest";
import { agriRecordSummaryQuerySchema } from "@/contracts/agri-record-summary";
import { readAgriRecordSummary } from "@/server/competitions/agrihackathon/record-summary";
import { projectAgriStageFreeze } from "@/server/competitions/agrihackathon/submissions";
import { db } from "@/lib/db";
import { lockAgriWorkspace, requireAgriScope, assertAgriAuthorityCurrent } from "@/server/competitions/agrihackathon/workspace";
import { AgriWorkspaceError } from "@/contracts/agri-workspace";
vi.mock("@/server/competitions/agrihackathon/submissions", () => ({ projectAgriStageFreeze: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { $transaction: vi.fn() } }));
vi.mock("@/server/competitions/agrihackathon/workspace", () => ({
  lockAgriWorkspace: vi.fn(), requireAgriScope: vi.fn(), assertAgriAuthorityCurrent: vi.fn(),
  agriDatabaseClock: vi.fn(async () => new Date("2026-10-08T00:00:00Z")),
}));
const at = new Date("2026-10-07T00:00:00Z");
const source = { id: "old-submission", competitionId: "edition", teamCompetitionId: "entry", teamName: "Local team", entryStageId: "stage", stage: "PRELIMINARY", sequence: 1, artifactVersionId: "version-1", artifactVersion: 1, ruleVersionId: "rule-1", acceptedAt: at, currentSubmissionId: "new-submission", frozenSubmissionId: null, ruleVersion: 1, ruleConfirmedAt: at };
const check = { id: "check", basis: "PRIVATE_MATERIALS", result: "PASS", checkedAt: at, checklist: null, internalNote: "PRIVATE_NOTE", feedbackAction: "WITHDRAW", feedbackSequence: 2, feedbackBody: "WITHDRAWN_BODY", feedbackAt: at };
const tx = { $queryRaw: vi.fn(), auditLog: { create: vi.fn() } };
function results(overrides: { history?: unknown[]; checks?: unknown[]; demos?: unknown[]; issues?: unknown[]; events?: unknown[] } = {}) {
  tx.$queryRaw.mockResolvedValueOnce([source]).mockResolvedValueOnce(overrides.history ?? [source]).mockResolvedValueOnce(overrides.checks ?? [check]).mockResolvedValueOnce(overrides.demos ?? []).mockResolvedValueOnce(overrides.issues ?? []).mockResolvedValueOnce(overrides.events ?? []);
}
beforeEach(() => { vi.clearAllMocks();
  vi.mocked(projectAgriStageFreeze).mockImplementation(async (_tx, stage) => ({ frozenSubmissionId: stage.frozenSubmissionId, recordedFrozenSubmissionId: stage.frozenSubmissionId, frozenByDeadline: false })); tx.$queryRaw.mockReset(); vi.mocked(db.$transaction).mockImplementation(async run => (run as unknown as (transaction: typeof tx) => Promise<unknown>)(tx) as never);
  vi.mocked(lockAgriWorkspace).mockResolvedValue({ actorId: "staff", workspace: { id: "workspace", competitionId: "edition", enabled: true, draftRevision: 1, rulesDraft: null, confirmedRuleVersionId: "rule-1", publishedRuleVersionId: "rule-1" } });
  vi.mocked(requireAgriScope).mockImplementation(async (_tx, _ctx, scope) => ({ id: scope, expiresAt: null } as never));
});
describe("staff live summary boundaries", () => {
  it("retains the before/after permit and operator provenance in authorized summaries", async () => {
    tx.$queryRaw.mockResolvedValueOnce([{ ...source, correctionPreviousId: "original", correctionPermitId: "permit", correctionReason: "Approved correction", correctionAuthorizedById: "manager", correctionAuthorizedAt: at }]);
    tx.$queryRaw.mockResolvedValueOnce([{ ...source, correctionPreviousId: "original", correctionPermitId: "permit", correctionReason: "Approved correction", correctionAuthorizedById: "manager", correctionAuthorizedAt: at }]);
    for (let i = 0; i < 4; i++) tx.$queryRaw.mockResolvedValueOnce([]);
    const view = await readAgriRecordSummary("staff", "old-submission");
    expect(view.submission.correction).toEqual({ previousSubmissionId: "original", permitId: "permit", reason: "Approved correction", authorizedById: "manager", authorizedAt: at.toISOString() });
    expect(view.stageHistory[0].correction).toEqual(view.submission.correction);
  });
  it("marks deadline freezes as computed while retaining recorded-freeze provenance", async () => {
    results();
    vi.mocked(projectAgriStageFreeze).mockResolvedValue({ frozenSubmissionId: source.id, recordedFrozenSubmissionId: null, frozenByDeadline: true });
    const view = await readAgriRecordSummary("staff", source.id);
    expect(view.submission).toMatchObject({ isFrozen: true, isRecordedFrozen: false, frozenByDeadline: true });
    expect(view.stageHistory[0]).toMatchObject({ isFrozen: true, isRecordedFrozen: false, frozenByDeadline: true });
    expect(projectAgriStageFreeze).toHaveBeenCalledTimes(1);
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });
  it("parses explicit true/false only and rejects forged modes/scopes/selection", () => {
    expect(agriRecordSummaryQuerySchema.parse({})).toEqual({ includePrivate: false, includeInternal: false, mode: "view" });
    expect(agriRecordSummaryQuerySchema.parse({ includePrivate: "false", includeInternal: "true" })).toEqual({ includePrivate: false, includeInternal: true, mode: "view" });
    for (const raw of [{ includePrivate: "1" }, { includeInternal: "yes" }, { scope: "team" }, { actorId: "other" }, { mode: "public" }]) expect(agriRecordSummaryQuerySchema.safeParse(raw).success).toBe(false);
  });
  it("uses one RepeatableRead transaction, exact old submission and no readonly audit writes", async () => {
    results(); const view = await readAgriRecordSummary("staff", "old-submission");
    expect(db.$transaction).toHaveBeenCalledTimes(1); expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "RepeatableRead", timeout: 20000 });
    expect(view.submission.id).toBe("old-submission"); expect(view.submission.isCurrent).toBe(false); expect(view.rule.id).toBe("rule-1");
    expect(view.technicalChecks[0].feedback).toBeNull(); expect(JSON.stringify(view)).not.toContain("PRIVATE_NOTE"); expect(JSON.stringify(view)).not.toContain("WITHDRAWN_BODY"); expect(view.content).toBeUndefined();
    expect(tx.auditLog.create).not.toHaveBeenCalled(); expect(requireAgriScope).toHaveBeenCalledTimes(1); expect(assertAgriAuthorityCurrent).toHaveBeenCalledTimes(1);
  });
  it("fails requested unavailable permissions rather than returning downgraded success", async () => {
    vi.mocked(requireAgriScope).mockImplementation(async (_tx, _ctx, scope) => { if (scope === "PRIVATE_MATERIALS_READ") throw new AgriWorkspaceError("AGRI_SCOPE_REQUIRED", 403); return { id: scope } as never; });
    await expect(readAgriRecordSummary("staff", "old-submission", { includePrivate: true })).rejects.toMatchObject({ code: "AGRI_SCOPE_REQUIRED", status: 403 }); expect(tx.$queryRaw).not.toHaveBeenCalled();
  });
  it("never exposes private-basis internal notes with only INTERNAL_NOTES_READ selected", async () => {
    results(); const view = await readAgriRecordSummary("staff", "old-submission", { includeInternal: true });
    expect(view.technicalChecks[0].internalNote).toBeUndefined(); expect(JSON.stringify(view)).not.toContain("PRIVATE_NOTE");
    expect(vi.mocked(requireAgriScope).mock.calls.map(call => call[2])).toEqual(["WORKS_READ", "INTERNAL_NOTES_READ"]);
  });
  it("rejects complete collection overflow instead of truncating a success", async () => {
    results({ history: Array.from({ length: 101 }, () => source) });
    await expect(readAgriRecordSummary("staff", "old-submission")).rejects.toMatchObject({ code: "AGRI_SUMMARY_TOO_LARGE", status: 422 }); expect(tx.auditLog.create).not.toHaveBeenCalled();
  });
  it("requires independent EXPORT and audits only provenance and selection in the same transaction", async () => {
    results(); await readAgriRecordSummary("staff", "old-submission", { mode: "exportJSON" });
    expect(vi.mocked(requireAgriScope).mock.calls.map(call => call[2])).toEqual(["WORKS_READ", "EXPORT"]);
    expect(tx.auditLog.create).toHaveBeenCalledTimes(1); expect(JSON.stringify(tx.auditLog.create.mock.calls)).not.toContain("PRIVATE_NOTE"); expect(JSON.stringify(tx.auditLog.create.mock.calls)).not.toContain("WITHDRAWN_BODY");
  });
});
