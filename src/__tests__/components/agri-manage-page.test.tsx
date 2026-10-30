import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import Page from "@/app/competitions/(full)/agrihackathon/manage/page";
const mocks = vi.hoisted(() => ({ manager: vi.fn() }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }));
vi.mock("@/components/competitions/agri-workspace-manager", () => ({ AgriWorkspaceManager: (props: unknown) => { mocks.manager(props); return null; } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
type Query = Record<string, string | string[] | undefined>;
async function selection(query?: Query) { render(await Page({ searchParams: query ? Promise.resolve(query) : undefined })); return mocks.manager.mock.calls.at(-1)?.[0]; }
describe("decision management URL preselection", () => {
  it("passes only the canonical entry and optional stage to the client", async () => {
    expect(await selection({ teamCompetitionId: "entry-a", entryStageId: "stage-a" })).toEqual({ preselection: { teamCompetitionId: "entry-a", entryStageId: "stage-a" }, invalidPreselection: false });
  });
  it("allows entry-only decision history", async () => {
    expect(await selection({ teamCompetitionId: "entry-a" })).toEqual({ preselection: { teamCompetitionId: "entry-a" }, invalidPreselection: false });
  });
  it("starts an ordinary manual page when no selection exists", async () => {
    expect(await selection()).toEqual({ preselection: undefined, invalidPreselection: false });
  });
  it.each<Query>([
    { teamCompetitionId: ["entry-a", "entry-b"] },
    { teamCompetitionId: "entry-a", entryStageId: ["stage-a", "stage-b"] },
    { entryStageId: "stage-a" },
    { teamCompetitionId: "" },
    { teamCompetitionId: "entry-a", entryStageId: "" },
    { teamCompetitionId: " entry-a" },
    { teamCompetitionId: "entry-a", entryStageId: "stage-a " },
    { teamCompetitionId: "entry\u0000a" },
    { teamCompetitionId: "entry-a", entryStageId: "stage\u007fa" },
    { teamCompetitionId: "a".repeat(81) },
    { teamCompetitionId: "entry-a", teamName: "Untrusted name" },
    { teamCompetitionId: "entry-a", callbackUrl: "https://outside.invalid" },
    { teamCompetitionId: "entry-a", scope: "RULES_CONFIRM" },
  ])("rejects ambiguous or unexpected parameters without forwarding them: %j", async query => {
    expect(await selection(query)).toEqual({ preselection: undefined, invalidPreselection: true });
  });
});
