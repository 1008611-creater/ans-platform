// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: {
    teamMember: { findFirst: vi.fn() },
    competition: { findUnique: vi.fn() },
    teamCompetition: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn() },
    auditLog: { create: vi.fn() },
    $queryRaw: vi.fn(), $transaction: vi.fn(),
  },
}));
vi.mock("@/lib/db", () => ({ db: mocks.db }));
import { registerCompetitionTeam } from "@/server/competitions/service";

const opensAt = new Date("2030-01-01T00:00:00.000Z");
const closesAt = new Date("2030-01-02T00:00:00.000Z");
const workspace = { competitionId: "edition", enabled: true, publishedRuleVersionId: "published-rule" };
let currentWorkspace: { competitionId: string; enabled: boolean; publishedRuleVersionId: string | null } | null;
let currentWindow: { state: string; opensAt: Date | null; closesAt: Date | null; includesDeadline: boolean | null; confirmedById: string; confirmedAt: Date } | null;
let clocks: Date[];
let account: { flagged: boolean; deletedAt: Date | null } | null;
let stageHistory: Array<{ id: string }>;

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("ANS_AGRIHACKATHON_COMPETITION_ID", "edition");
  currentWorkspace = { ...workspace };
  currentWindow = { state: "CONFIRMED", opensAt, closesAt, includesDeadline: false, confirmedById: "rules-owner", confirmedAt: opensAt };
  clocks = [new Date("2030-01-01T12:00:00Z")];
  account = { flagged: false, deletedAt: null };
  stageHistory = [];
  mocks.db.$transaction.mockImplementation(async (fn: (tx: typeof mocks.db) => unknown) => fn(mocks.db));
  mocks.db.$queryRaw.mockImplementation(async (parts: TemplateStringsArray) => {
    const sql = parts.join("?");
    if (sql.includes("FROM agri_workspaces")) return currentWorkspace ? [currentWorkspace] : [];
    if (sql.includes("FROM users")) return account ? [account] : [];
    if (sql.includes("FROM agri_stage_windows")) return currentWindow ? [currentWindow] : [];
    if (sql.includes("FROM agri_entry_stages")) return stageHistory;
    if (sql.includes("clock_timestamp()")) return [{ now: clocks.length > 1 ? clocks.shift() : clocks[0] }];
    throw new Error("Unexpected registration query: " + sql);
  });
  mocks.db.teamMember.findFirst.mockResolvedValue({ role: "OWNER" });
  // General dates deliberately conflict with the isolated registration window.
  mocks.db.competition.findUnique.mockResolvedValue({ status: "UPCOMING", startsAt: new Date("2030-02-01"), endsAt: new Date("2030-02-02"), maxTeams: null });
  mocks.db.teamCompetition.findUnique.mockResolvedValue(null);
  mocks.db.teamCompetition.create.mockResolvedValue({ id: "registration", entryStatus: "REGISTERED" });
  mocks.db.auditLog.create.mockResolvedValue({ id: "audit" });
});
afterEach(() => vi.unstubAllEnvs());
const register = () => registerCompetitionTeam("captain", "edition", { teamId: "team" });

function expectRejectedBeforeWrite() {
  expect(mocks.db.teamCompetition.create).not.toHaveBeenCalled();
  expect(mocks.db.teamCompetition.update).not.toHaveBeenCalled();
  expect(mocks.db.auditLog.create).not.toHaveBeenCalled();
}

describe("managed-edition registration", () => {
  it("accepts only the published registration window, independently of competition start and submission dates", async () => {
    await expect(register()).resolves.toMatchObject({ created: true });
    expect(mocks.db.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ metadata: expect.objectContaining({ registrationRuleVersionId: "published-rule" }) }),
    }));
    const calls = mocks.db.$queryRaw.mock.calls.map(([parts, ...values]) => ({ sql: parts.join("?"), values }));
    expect(calls[0].sql).toContain("FOR UPDATE");
    const windowCall = calls.find(call => call.sql.includes("FROM agri_stage_windows"));
    expect(windowCall?.sql).toContain("w.stage='REGISTRATION'");
    expect(windowCall?.values).toEqual(["edition", "published-rule"]);
    expect(calls.filter(call => call.sql.includes("clock_timestamp()")).length).toBe(2);
  });

  it.each([undefined, "", "another-edition", "x".repeat(81)])("keeps a managed workspace closed when the binding is unavailable or different: %s", async binding => {
    vi.stubEnv("ANS_AGRIHACKATHON_COMPETITION_ID", binding);
    await expect(register()).rejects.toMatchObject({ code: "AGRI_EDITION_NOT_CONFIGURED", status: 503 });
    expectRejectedBeforeWrite();
  });
  it("keeps an explicitly bound edition closed before its workspace exists", async () => {
    currentWorkspace = null;
    await expect(register()).rejects.toMatchObject({ code: "AGRI_WORKSPACE_NOT_CONFIGURED", status: 503 });
    expectRejectedBeforeWrite();
  });
  it("does not let a disabled workspace fall back to general dates", async () => {
    currentWorkspace!.enabled = false;
    await expect(register()).rejects.toMatchObject({ code: "AGRI_WORKSPACE_DISABLED", status: 409 });
    expectRejectedBeforeWrite();
  });
  it("does not treat a confirmed but unpublished rule as open registration", async () => {
    currentWorkspace = { ...workspace, publishedRuleVersionId: null };
    await expect(register()).rejects.toMatchObject({ code: "AGRI_RULES_UNPUBLISHED", status: 409 });
    expectRejectedBeforeWrite();
  });
  it.each([null, { state: "CONFIRMED", opensAt: null, closesAt: null, includesDeadline: null, confirmedById: "rules-owner", confirmedAt: opensAt }])("fails closed for a missing or invalid registration window", async window => {
    currentWindow = window;
    await expect(register()).rejects.toMatchObject({ code: "AGRI_RULE_INVALID", status: 500 });
    expectRejectedBeforeWrite();
  });
  it("does not permit registration while its own window remains pending", async () => {
    currentWindow!.state = "PENDING";
    await expect(register()).rejects.toMatchObject({ code: "AGRI_REGISTRATION_RULES_PENDING", status: 409 });
    expectRejectedBeforeWrite();
  });
  it("rejects before the independent opening instant", async () => {
    clocks = [new Date(opensAt.getTime() - 1)];
    await expect(register()).rejects.toMatchObject({ code: "AGRI_REGISTRATION_NOT_OPEN", status: 409 });
    expectRejectedBeforeWrite();
  });
  it("includes the opening instant", async () => {
    clocks = [opensAt];
    await expect(register()).resolves.toMatchObject({ created: true });
  });
  it.each([false, true])("honors the explicit inclusive-deadline decision: %s", async includes => {
    currentWindow!.includesDeadline = includes;
    clocks = [closesAt];
    if (includes) await expect(register()).resolves.toMatchObject({ created: true });
    else { await expect(register()).rejects.toMatchObject({ code: "AGRI_REGISTRATION_CLOSED", status: 409 }); expectRejectedBeforeWrite(); }
  });
  it("rejects after the deadline even when its instant is inclusive", async () => {
    currentWindow!.includesDeadline = true;
    clocks = [new Date(closesAt.getTime() + 1)];
    await expect(register()).rejects.toMatchObject({ code: "AGRI_REGISTRATION_CLOSED", status: 409 });
    expectRejectedBeforeWrite();
  });
  it("throws inside the same transaction if auditing passes the deadline, so creation is rolled back", async () => {
    clocks = [new Date(closesAt.getTime() - 1), closesAt];
    await expect(register()).rejects.toMatchObject({ code: "AGRI_REGISTRATION_CLOSED", status: 409 });
    expect(mocks.db.teamCompetition.create).toHaveBeenCalledOnce();
    expect(mocks.db.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "Serializable" });
  });
  it.each([null, { flagged: true, deletedAt: null }, { flagged: false, deletedAt: opensAt }])("blocks unavailable accounts even if they retain a team role", async value => {
    account = value;
    await expect(register()).rejects.toMatchObject({ code: "ACCOUNT_UNAVAILABLE", status: 403 });
    expectRejectedBeforeWrite();
  });
  it.each([null, { role: "MEMBER" }])("keeps registration restricted to an active team owner or administrator", async role => {
    mocks.db.teamMember.findFirst.mockResolvedValue(role);
    await expect(register()).rejects.toMatchObject({ code: "TEAM_PERMISSION_REQUIRED", status: 403 });
    expectRejectedBeforeWrite();
  });
  it("allows existing registrations to replay without duplicate entry or audit", async () => {
    mocks.db.teamCompetition.findUnique.mockResolvedValue({ id: "existing", entryStatus: "REGISTERED" });
    await expect(register()).resolves.toMatchObject({ created: false, entry: { id: "existing" } });
    expectRejectedBeforeWrite();
  });
  it("does not reset a rejected registration or overwrite stage history through the legacy command", async () => {
    mocks.db.teamCompetition.findUnique.mockResolvedValue({ id: "existing", entryStatus: "REJECTED" });
    stageHistory = [{ id: "frozen-stage" }];
    await expect(register()).rejects.toMatchObject({ code: "AGRI_STAGE_WORKSPACE_REQUIRED", status: 409 });
    expectRejectedBeforeWrite();
  });
  it("retains the maximum-team admission check", async () => {
    mocks.db.competition.findUnique.mockResolvedValue({ status: "UPCOMING", maxTeams: 1 });
    mocks.db.teamCompetition.count.mockResolvedValue(1);
    await expect(register()).rejects.toMatchObject({ code: "COMPETITION_FULL", status: 409 });
    expectRejectedBeforeWrite();
  });
  it("preserves general competition behavior when neither a workspace nor an explicit edition binding identifies it", async () => {
    currentWorkspace = null;
    vi.stubEnv("ANS_AGRIHACKATHON_COMPETITION_ID", "other");
    await expect(register()).rejects.toMatchObject({ code: "COMPETITION_NOT_STARTED", status: 409 });
    expectRejectedBeforeWrite();
    mocks.db.competition.findUnique.mockResolvedValue({ status: "ONGOING", startsAt: null, endsAt: null, maxTeams: null });
    await expect(register()).resolves.toMatchObject({ created: true });
    expect(mocks.db.$queryRaw.mock.calls.some(([parts]) => parts.join("").includes("clock_timestamp()"))).toBe(false);
  });
});