// @vitest-environment node
import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgriWorkspaceError } from "@/contracts/agri-workspace";
import { agriIssueCommandSchema } from "@/contracts/agri-issues";
const mocks = vi.hoisted(() => ({ raw: vi.fn(), write: vi.fn(), audit: vi.fn(), scope: vi.fn(), current: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { $transaction: (run: (tx: unknown) => unknown) => run({ $queryRaw: mocks.raw, $executeRaw: mocks.write, auditLog: { create: mocks.audit } }) } }));
vi.mock("@/server/competitions/agrihackathon/workspace", () => ({
  lockAgriWorkspace: async (_tx: unknown, actorId: string) => ({ actorId, workspace: { competitionId: "edition", enabled: true } }),
  requireAgriScope: mocks.scope, assertAgriAuthorityCurrent: mocks.current,
  agriDatabaseClock: async () => new Date("2026-10-13T04:00:00Z"),
}));
import { executeAgriIssueCommand } from "@/server/competitions/agrihackathon/issues";
const command = {
  action: "createIssue", idempotencyKey: "a041251b-0598-45a9-a785-47cc78151723", submissionId: "submission",
  title: "Actual issue", body: "Actual feedback", status: "OPEN", severity: "MEDIUM", type: "BUG",
  basis: "METADATA", visibility: "TEAM", reviewedForTeam: true, assigneeId: "recipient",
  dueState: "UNKNOWN", dueAt: null, processingSummary: null,
};
let memberStatus: string | null;
let account: { flagged: boolean; deletedAt: Date | null } | null;
let grants: Set<string>;
let rowVisibility: "TEAM" | "INTERNAL";
let rowBasis: "METADATA" | "PRIVATE_MATERIALS";
let receipt: { issueId: string; eventId: string; appliedRevision: number; requestHash: string } | null;
const recipientScopes = () => mocks.scope.mock.calls.filter(call => call[1].actorId === "recipient").map(call => call[2]);
beforeEach(() => {
  vi.resetAllMocks(); memberStatus = null; account = { flagged: false, deletedAt: null }; grants = new Set();
  rowVisibility = "TEAM"; rowBasis = "METADATA"; receipt = null;
  mocks.scope.mockImplementation(async (_tx: unknown, ctx: { actorId: string }, scope: string) => {
    if (ctx.actorId === "recipient" && !grants.has(scope)) throw new AgriWorkspaceError("AGRI_SCOPE_REQUIRED", 403);
    return { id: ctx.actorId + ":" + scope, expiresAt: null };
  });
  mocks.raw.mockImplementation(async (strings: TemplateStringsArray) => {
    const sql = strings.join("?");
    if (sql.includes("FROM agri_stage_submissions")) return [{ id: "submission", competitionId: "edition", entryStageId: "stage", teamId: "exact-team", artifactVersionId: "version", sequence: 1 }];
    if (sql.includes("FROM agri_issues")) return [{ id: "issue", competitionId: "edition", submissionId: "submission", visibility: rowVisibility, basis: rowBasis, revision: 1 }];
    if (sql.includes("FROM agri_issue_receipts")) return receipt ? [receipt] : [];
    if (sql.includes("FROM users")) return account ? [account] : [];
    if (sql.includes("FROM team_members")) return memberStatus ? [{ status: memberStatus }] : [];
    return [];
  });
  mocks.write.mockResolvedValue(1); mocks.audit.mockResolvedValue({}); mocks.current.mockResolvedValue(undefined);
});
afterEach(() => vi.restoreAllMocks());
describe("issue assignment requires existing visibility (actual service, mocked DB and grant checks)", () => {
  it("rejects an active unrelated account before any issue, receipt or audit is written", async () => {
    await expect(executeAgriIssueCommand("writer", command)).rejects.toMatchObject({ code: "AGRI_ASSIGNEE_CANNOT_READ", status: 422 });
    expect(mocks.write).not.toHaveBeenCalled(); expect(mocks.audit).not.toHaveBeenCalled();
    expect(recipientScopes()).toEqual(["WORKS_READ"]);
  });
  it.each(["METADATA", "PRIVATE_MATERIALS"])("allows exact active team membership for explicitly reviewed TEAM/%s feedback", async basis => {
    memberStatus = "ACTIVE";
    const result = await executeAgriIssueCommand("writer", { ...command, basis });
    expect(result.duplicate).toBe(false); expect(recipientScopes()).toEqual([]);
    const membership = mocks.raw.mock.calls.find(call => call[0].join("?").includes("FROM team_members"));
    expect(membership?.slice(1)).toEqual(["exact-team", "recipient"]);
    const sql = mocks.write.mock.calls.map(call => call[0].join("?")).join(" ");
    expect(sql).not.toMatch(/access_grants|publication|quota|ledger|xp/i);
  });
  it.each(["LEFT", "INVITED", "REMOVED"])("does not use %s membership as read authorization", async status => {
    memberStatus = status;
    await expect(executeAgriIssueCommand("writer", command)).rejects.toMatchObject({ code: "AGRI_ASSIGNEE_CANNOT_READ" });
    expect(mocks.write).not.toHaveBeenCalled();
  });
  it("permits a WORKS_READ staff recipient for TEAM metadata without granting write access", async () => {
    grants.add("WORKS_READ");
    expect((await executeAgriIssueCommand("writer", command)).duplicate).toBe(false);
    expect(recipientScopes()).toEqual(["WORKS_READ"]);
    expect(recipientScopes()).not.toContain("ISSUES_WRITE");
  });
  it("active team membership cannot reveal INTERNAL issues", async () => {
    memberStatus = "ACTIVE";
    await expect(executeAgriIssueCommand("writer", { ...command, visibility: "INTERNAL" })).rejects.toMatchObject({ code: "AGRI_ASSIGNEE_CANNOT_READ" });
    expect(mocks.raw.mock.calls.some(call => call[0].join("?").includes("FROM team_members"))).toBe(false);
  });
  it("requires internal notes scope for INTERNAL and private materials scope for staff private-basis issues", async () => {
    grants.add("WORKS_READ");
    await expect(executeAgriIssueCommand("writer", { ...command, visibility: "INTERNAL" })).rejects.toMatchObject({ code: "AGRI_ASSIGNEE_CANNOT_READ" });
    grants.add("INTERNAL_NOTES_READ");
    await expect(executeAgriIssueCommand("writer", { ...command, visibility: "INTERNAL", basis: "PRIVATE_MATERIALS" })).rejects.toMatchObject({ code: "AGRI_ASSIGNEE_CANNOT_READ" });
    grants.add("PRIVATE_MATERIALS_READ");
    expect((await executeAgriIssueCommand("writer", { ...command, visibility: "INTERNAL", basis: "PRIVATE_MATERIALS" })).duplicate).toBe(false);
    expect(recipientScopes().slice(-3)).toEqual(["WORKS_READ", "INTERNAL_NOTES_READ", "PRIVATE_MATERIALS_READ"]);
  });
  it.each([null, { flagged: true, deletedAt: null }, { flagged: false, deletedAt: new Date() }])("rejects unavailable recipient %s", async unavailable => {
    account = unavailable;
    await expect(executeAgriIssueCommand("writer", command)).rejects.toMatchObject({ code: "AGRI_ASSIGNEE_UNAVAILABLE", status: 422 });
    expect(mocks.write).not.toHaveBeenCalled(); expect(recipientScopes()).toEqual([]);
  });
  it("allows explicitly unassigned issues without looking up an account", async () => {
    expect((await executeAgriIssueCommand("writer", { ...command, assigneeId: null })).duplicate).toBe(false);
    expect(mocks.raw.mock.calls.some(call => call[0].join("?").includes("FROM users"))).toBe(false);
  });
  it("rejects a visibility update if the retained assignee cannot read the new scope", async () => {
    memberStatus = "ACTIVE";
    const fields = Object.fromEntries(Object.entries(command).filter(([key]) => !["submissionId", "basis"].includes(key)));
    await expect(executeAgriIssueCommand("writer", { ...fields, action: "updateIssue", issueId: "issue", expectedRevision: 1, visibility: "INTERNAL" })).rejects.toMatchObject({ code: "AGRI_ASSIGNEE_CANNOT_READ" });
    expect(mocks.write).not.toHaveBeenCalled();
  });
  it("retains immutable private-material basis when validating updates", async () => {
    rowBasis = "PRIVATE_MATERIALS"; grants.add("WORKS_READ");
    const fields = Object.fromEntries(Object.entries(command).filter(([key]) => !["submissionId", "basis"].includes(key)));
    await expect(executeAgriIssueCommand("writer", { ...fields, action: "updateIssue", issueId: "issue", expectedRevision: 1 })).rejects.toMatchObject({ code: "AGRI_ASSIGNEE_CANNOT_READ" });
    expect(recipientScopes()).toEqual(["WORKS_READ", "PRIVATE_MATERIALS_READ"]);
  });
  it("rechecks the recipient at the final transaction boundary and rejects expiry", async () => {
    grants.add("WORKS_READ");
    mocks.current.mockImplementation(async (_tx: unknown, ...authorities: { id: string }[]) => {
      if (authorities.some(authority => authority.id.startsWith("recipient:"))) throw new AgriWorkspaceError("AGRI_SCOPE_REQUIRED", 403);
    });
    await expect(executeAgriIssueCommand("writer", command)).rejects.toMatchObject({ code: "AGRI_ASSIGNEE_CANNOT_READ", status: 422 });
    expect(mocks.current.mock.calls.at(-1)?.slice(1)).toEqual([{ id: "recipient:WORKS_READ", expiresAt: null }]);
    // Real PostgreSQL must separately prove rollback; this mock only proves transaction rejection.
  });
  it("preserves confirmed idempotent receipts if the assignee subsequently loses access", async () => {
    receipt = { issueId: "old-issue", eventId: "old-event", appliedRevision: 1, requestHash: createHash("sha256").update(JSON.stringify(agriIssueCommandSchema.parse(command))).digest("hex") };
    expect(await executeAgriIssueCommand("writer", command)).toEqual({ issueId: "old-issue", eventId: "old-event", appliedRevision: 1, duplicate: true });
    expect(mocks.write).not.toHaveBeenCalled(); expect(recipientScopes()).toEqual([]);
  });
  it("does not change ownership or reassign access while appending a processing event", async () => {
    await executeAgriIssueCommand("writer", { action: "appendEvent", issueId: "issue", expectedRevision: 1, idempotencyKey: command.idempotencyKey, visibility: "TEAM", basis: "METADATA", body: "Checked manually", reviewedForTeam: true });
    expect(recipientScopes()).toEqual([]);
    expect(mocks.raw.mock.calls.some(call => call[0].join("?").includes("FROM users"))).toBe(false);
  });
  it("does not disguise unexpected grant storage failures as a permission denial", async () => {
    const failure = new Error("Database read failed");
    mocks.scope.mockImplementation(async (_tx: unknown, ctx: { actorId: string }) => { if (ctx.actorId === "recipient") throw failure; return { expiresAt: null }; });
    await expect(executeAgriIssueCommand("writer", command)).rejects.toBe(failure); expect(mocks.write).not.toHaveBeenCalled();
  });
});
