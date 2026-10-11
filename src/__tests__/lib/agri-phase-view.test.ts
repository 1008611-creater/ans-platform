// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ db: {
  $transaction: vi.fn(), $queryRaw: vi.fn(),
  competition: { findUnique: vi.fn() }, teamMember: { findMany: vi.fn() }, teamCompetition: { findMany: vi.fn() },
} }));
vi.mock("@/lib/db", () => ({ db: mocks.db }));
import { getAgriCompetitionPhaseView } from "@/server/competitions/agrihackathon/phase-view";
let workspace: { enabled: boolean; publishedRuleVersionId: string | null } | null;
let account: { flagged: boolean; deletedAt: Date | null } | null;
let decision: "ELIGIBLE" | "INELIGIBLE" | null;
let recordedFreeze: string | null;
let adoptedClose: Date;
const opening = new Date("2030-01-01T00:00:00Z"); const deadline = new Date("2030-01-02T00:00:00Z");
let windowRows: Array<{ stage: string; state: string; opensAt: Date | null; closesAt: Date | null; includesDeadline: boolean | null }>;
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv("ANS_AGRIHACKATHON_COMPETITION_ID", "edition");
  recordedFreeze = "accepted"; adoptedClose = deadline;
  workspace = { enabled: true, publishedRuleVersionId: "published" }; account = { flagged: false, deletedAt: null }; decision = null;
  windowRows = [
    { stage: "REGISTRATION", state: "CONFIRMED", opensAt: opening, closesAt: deadline, includesDeadline: false },
    { stage: "PRELIMINARY", state: "CONFIRMED", opensAt: new Date("2030-01-03"), closesAt: new Date("2030-01-05"), includesDeadline: true },
    { stage: "FINAL", state: "PENDING", opensAt: null, closesAt: null, includesDeadline: null },
  ];
  mocks.db.$transaction.mockImplementation(async (fn: (tx: typeof mocks.db) => unknown) => fn(mocks.db));
  mocks.db.$queryRaw.mockImplementation(async (parts: TemplateStringsArray) => {
    const sql = parts.join("?");
    if (sql.includes("FROM agri_workspaces")) return workspace ? [workspace] : [];
    if (sql.includes("clock_timestamp()")) return [{ now: new Date("2030-01-01T12:00:00Z") }];
    if (sql.includes("FROM agri_rule_versions")) return [{ id: "adopted", requirements: { schemaVersion: 1, repositoryRequired: false, repositoryRefRequired: false, demoRequired: false, materials: [] }, version: 2, guidanceMarkdown: "Published guidance", confirmedById: "PRIVATE_STAFF_ID", confirmedAt: opening }];
    if (sql.includes("FROM agri_stage_windows")) return sql.includes("AND stage=")
      ? [{ stage: "PRELIMINARY", state: "CONFIRMED", opensAt: opening, closesAt: adoptedClose, includesDeadline: false }] : windowRows;
    if (sql.includes("FROM agri_stage_submissions")) return [{ ruleVersionId: "adopted" }];
    if (sql.includes("FROM users")) return account ? [account] : [];
    if (sql.includes("FROM agri_final_decisions")) return decision ? [{ state: decision }] : [];
    if (sql.includes("FROM agri_entry_stages")) return [{ id: "preliminary-stage", stage: "PRELIMINARY", sequence: 3, acceptedAt: opening, currentSubmissionId: "accepted", frozenSubmissionId: recordedFreeze }];
    throw new Error("Unexpected phase-view query: " + sql);
  });
  mocks.db.competition.findUnique.mockResolvedValue({ id: "edition", title: "Isolated edition", organizer: "CAUHub", status: "ENDED", startsAt: new Date("2000-01-01"), endsAt: new Date("2000-01-02"), rewardXp: 9000 });
  mocks.db.teamMember.findMany.mockResolvedValue([{ role: "OWNER", team: { id: "own-team", name: "Owned team", slug: "own-team" } }]);
  mocks.db.teamCompetition.findMany.mockResolvedValue([{ id: "own-entry", teamId: "own-team", team: { name: "Owned team", members: [{ role: "OWNER" }] }, entryStatus: "APPROVED", awardedXp: 9000 }]);
});
afterEach(() => vi.unstubAllEnvs());

describe("read-only AgriHackathon phase projection", () => {
  it("uses published independent windows even when the general competition is marked ended", async () => {
    const result = await getAgriCompetitionPhaseView("edition", "actor");
    expect(result?.configuration).toBe("READY");
    expect(result?.windows.map(window => [window.stage, window.state])).toEqual([["REGISTRATION", "OPEN"], ["PRELIMINARY", "NOT_OPEN"], ["FINAL", "RULES_PENDING"]]);
    expect(result?.rule).toEqual({ version: 2, guidanceMarkdown: "Published guidance" });
    expect(JSON.stringify(result)).not.toContain("PRIVATE_STAFF_ID");
    expect(JSON.stringify(result)).not.toContain("rewardXp");
    expect(result?.viewer?.entries[0].stages[0]).toMatchObject({ sequence: 3, frozen: true });
    for (const [parts] of mocks.db.$queryRaw.mock.calls) expect(parts.join(" ")).not.toMatch(/INSERT|UPDATE|DELETE|FOR SHARE|FOR UPDATE/);
    expect(mocks.db.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "RepeatableRead" });
  });
  it.each([null, "ELIGIBLE", "INELIGIBLE"] as const)("takes Finalist eligibility only from the latest recorded decision: %s", async state => {
    decision = state;
    const result = await getAgriCompetitionPhaseView("edition", "actor");
    expect(result?.viewer?.entries[0].finalist).toBe(state ?? "UNKNOWN");
    const call = mocks.db.$queryRaw.mock.calls.find(([parts]) => parts.join("").includes("FROM agri_final_decisions"))!;
    expect(call[0].join("?")).toContain("ORDER BY sequence DESC LIMIT 1"); expect(call.slice(1)).toEqual(["edition", "own-entry"]);
  });
  it("projects the adopted deadline freeze without writes even when replacement preliminary rules are not open", async () => {
    recordedFreeze = null; adoptedClose = new Date("2030-01-01T06:00:00Z");
    const result = await getAgriCompetitionPhaseView("edition", "actor");
    expect(result?.windows[1].state).toBe("NOT_OPEN");
    expect(result?.viewer?.entries[0].stages[0].frozen).toBe(true);
    for (const [parts] of mocks.db.$queryRaw.mock.calls) expect(parts.join(" ")).not.toMatch(/INSERT|UPDATE|DELETE|FOR SHARE|FOR UPDATE/);
    expect(result?.viewer?.entries[0].stages[0]).not.toHaveProperty("currentSubmissionId");
  });
  it("does not request team data or eligibility for anonymous visitors", async () => {
    const result = await getAgriCompetitionPhaseView("edition");
    expect(result?.viewer).toBeNull(); expect(mocks.db.teamCompetition.findMany).not.toHaveBeenCalled();
    expect(mocks.db.$queryRaw.mock.calls.some(([parts]) => parts.join("").includes("FROM agri_final_decisions"))).toBe(false);
  });
  it.each([null, { flagged: true, deletedAt: null }, { flagged: false, deletedAt: opening }])("returns no private projection for unavailable accounts", async value => {
    account = value;
    const result = await getAgriCompetitionPhaseView("edition", "actor");
    expect(result?.viewer).toEqual({ available: false, teams: [], entries: [] }); expect(mocks.db.teamCompetition.findMany).not.toHaveBeenCalled();
  });
  it("filters entries by current edition and the viewer's active membership before reading stage history", async () => {
    await getAgriCompetitionPhaseView("edition", "actor");
    expect(mocks.db.teamCompetition.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {
      competitionId: "edition", entryStatus: { not: "REJECTED" }, team: { members: { some: { userId: "actor", status: "ACTIVE" } } },
    } }));
    const history = mocks.db.$queryRaw.mock.calls.find(([parts]) => parts.join("").includes("FROM agri_entry_stages"))!;
    expect(history.slice(1)).toEqual(["edition", "own-entry"]);
  });
  it("allows paused-workspace history without implying a currently open window", async () => {
    workspace!.enabled = false;
    const result = await getAgriCompetitionPhaseView("edition", "actor");
    expect(result?.configuration).toBe("DISABLED"); expect(result?.viewer?.entries[0].stages).toHaveLength(1);
  });
  it("keeps a stale binding closed and returns no team history or other-edition guidance", async () => {
    vi.stubEnv("ANS_AGRIHACKATHON_COMPETITION_ID", "another-edition");
    const result = await getAgriCompetitionPhaseView("edition", "actor");
    expect(result?.configuration).toBe("UNBOUND"); expect(result?.viewer?.entries).toEqual([]); expect(result?.rule).toBeNull();
  });
  it("returns a configured-but-missing workspace as pending without general-date fallback", async () => {
    workspace = null;
    const result = await getAgriCompetitionPhaseView("edition", "actor");
    expect(result?.configuration).toBe("WORKSPACE_PENDING"); expect(result?.viewer?.entries).toEqual([]);
  });
  it("does not expose draft or confirmed-only rules as published guidance", async () => {
    workspace!.publishedRuleVersionId = null;
    const result = await getAgriCompetitionPhaseView("edition");
    expect(result?.configuration).toBe("RULES_PENDING"); expect(result?.rule).toBeNull();
  });
  it("fails closed when published windows are incomplete or malformed", async () => {
    windowRows = windowRows.slice(0, 2);
    expect((await getAgriCompetitionPhaseView("edition"))?.configuration).toBe("UNAVAILABLE");
    windowRows.push({ stage: "FINAL", state: "CONFIRMED", opensAt: null, closesAt: null, includesDeadline: null });
    const result = await getAgriCompetitionPhaseView("edition"); expect(result?.configuration).toBe("UNAVAILABLE"); expect(result?.windows[2].state).toBe("INVALID");
  });
  it("leaves ordinary competitions on their existing detail path without guessing by title", async () => {
    workspace = null; vi.stubEnv("ANS_AGRIHACKATHON_COMPETITION_ID", "another-edition");
    expect(await getAgriCompetitionPhaseView("ordinary", "actor")).toBeNull(); expect(mocks.db.competition.findUnique).not.toHaveBeenCalled();
  });
});