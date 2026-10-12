// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ tx: {
  user: { findUnique: vi.fn(), update: vi.fn() },
  teamCompetition: { findUnique: vi.fn(), updateMany: vi.fn() },
  teamMember: { findFirst: vi.fn() },
  artifactPublication: { upsert: vi.fn() },
  auditLog: { create: vi.fn() }, xpLedger: { create: vi.fn() },
  $queryRaw: vi.fn(), $transaction: vi.fn(),
} }));
vi.mock("@/lib/db", () => ({ db: mocks.tx }));
import { reviewCompetitionEntry, submitCompetitionEntry } from "@/server/competitions/service";
const submit = { teamId: "team", projectId: "project", artifactVersionId: "version", summary: "A genuine contribution described by the submitting team.", publicConsent: true };
let workspace: { enabled: boolean } | null;
let history: { id: string }[];
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv("ANS_AGRIHACKATHON_COMPETITION_ID", "bound-edition");
  workspace = null; history = [];
  mocks.tx.$transaction.mockImplementation(async (fn: (tx: typeof mocks.tx) => unknown) => fn(mocks.tx));
  mocks.tx.$queryRaw.mockImplementation(async (sql: TemplateStringsArray) => sql.join("?").includes("agri_workspaces") ? workspace ? [workspace] : [] : history);
  mocks.tx.user.findUnique.mockResolvedValue({ role: "ADMIN" });
  mocks.tx.teamCompetition.findUnique.mockResolvedValue({ competitionId: "edition" });
});
afterEach(() => vi.unstubAllEnvs());
function expectNoEffects() {
  expect(mocks.tx.teamCompetition.updateMany).not.toHaveBeenCalled();
  expect(mocks.tx.teamMember.findFirst).not.toHaveBeenCalled();
  expect(mocks.tx.artifactPublication.upsert).not.toHaveBeenCalled();
  expect(mocks.tx.user.update).not.toHaveBeenCalled();
  expect(mocks.tx.xpLedger.create).not.toHaveBeenCalled();
  expect(mocks.tx.auditLog.create).not.toHaveBeenCalled();
}
describe("managed competition never falls back to legacy submit or review", () => {
  it.each([true, false])("blocks a persisted workspace enabled=%s before its first stage", async enabled => {
    workspace = { enabled };
    await expect(submitCompetitionEntry("member", "edition", submit)).rejects.toMatchObject({ code: "AGRI_STAGE_WORKSPACE_REQUIRED", status: 409 });
    await expect(reviewCompetitionEntry("admin", { teamCompetitionId: "entry", decision: "approve", note: "Legacy review must not publish or award.", awardedXp: 100 })).rejects.toMatchObject({ code: "AGRI_STAGE_WORKSPACE_REQUIRED", status: 409 });
    expectNoEffects();
    expect(mocks.tx.$queryRaw.mock.calls[0][0].join("?")).toContain("FOR SHARE");
  });
  it("blocks the explicitly bound edition even before workspace creation", async () => {
    mocks.tx.teamCompetition.findUnique.mockResolvedValue({ competitionId: "bound-edition" });
    await expect(submitCompetitionEntry("member", "bound-edition", submit)).rejects.toMatchObject({ code: "AGRI_STAGE_WORKSPACE_REQUIRED" });
    await expect(reviewCompetitionEntry("admin", { teamCompetitionId: "entry", decision: "reject", note: "No legacy review before configured stage setup." })).rejects.toMatchObject({ code: "AGRI_STAGE_WORKSPACE_REQUIRED" });
    expectNoEffects();
  });
  it("keeps another persisted managed edition protected when the configured binding changes", async () => {
    vi.stubEnv("ANS_AGRIHACKATHON_COMPETITION_ID", "new-edition"); workspace = { enabled: false };
    await expect(submitCompetitionEntry("member", "edition", submit)).rejects.toMatchObject({ code: "AGRI_STAGE_WORKSPACE_REQUIRED" });
    expectNoEffects();
  });
  it("retains the stage-history review guard without a matching configuration", async () => {
    history = [{ id: "immutable-stage" }];
    await expect(reviewCompetitionEntry("admin", { teamCompetitionId: "entry", decision: "reject", note: "History remains protected." })).rejects.toMatchObject({ code: "AGRI_STAGE_WORKSPACE_REQUIRED" });
    expectNoEffects();
  });
  it("does not label an unrelated ordinary edition as managed", async () => {
    mocks.tx.teamCompetition.findUnique.mockResolvedValue(null);
    await expect(reviewCompetitionEntry("admin", { teamCompetitionId: "entry", decision: "reject", note: "Ordinary absent entry." })).rejects.toMatchObject({ code: "REVIEW_NOT_PENDING" });
    expect(mocks.tx.teamCompetition.findUnique).toHaveBeenCalledTimes(2);
    expectNoEffects();
  });
});