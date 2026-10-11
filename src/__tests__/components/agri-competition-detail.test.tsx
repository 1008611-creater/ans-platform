import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { AgriCompetitionDetail } from "@/components/competitions/agri-competition-detail";
import type { AgriCompetitionPhaseView } from "@/contracts/agri-phase-view";
import messages from "../../../messages/product/zh.json";
vi.mock("next-auth/react", () => ({ useSession: () => ({data:{user:{id:"actor"}},status:"authenticated"}) }));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("next/navigation", () => ({ useRouter: () => ({refresh:vi.fn()}) }));
vi.mock("@/components/competitions/agri-competition-registration", () => ({ AgriCompetitionRegistration: () => <div>Registration control</div> }));
vi.mock("next-intl/server", () => ({ getLocale: async () => "zh", getTranslations: async () => {
  const read = (key: string): unknown => key.split(".").reduce<unknown>((value, part) => (value as Record<string, unknown>)[part], messages.agriPhases);
  const t = (key: string, params?: Record<string, string | number>) => Object.entries(params ?? {}).reduce((value, [name, replacement]) => value.replace("{" + name + "}", String(replacement)), String(read(key)));
  t.has = (key: string) => { try { return typeof read(key) === "string"; } catch { return false; } }; return t;
} }));
let view: AgriCompetitionPhaseView;
beforeEach(() => {
  view = { competitionId: "edition", title: "Isolated edition", organizer: "CAUHub", configuration: "READY", serverNow: "2030-01-01T12:00:00Z", rule: { version: 2, guidanceMarkdown: "Only published guidance" },
    windows: [ { stage: "REGISTRATION", state: "OPEN", opensAt: "2030-01-01T00:00:00Z", closesAt: "2030-01-02T00:00:00Z", includesDeadline: false },
      { stage: "PRELIMINARY", state: "NOT_OPEN", opensAt: "2030-01-03T00:00:00Z", closesAt: "2030-01-05T00:00:00Z", includesDeadline: true },
      { stage: "FINAL", state: "RULES_PENDING", opensAt: null, closesAt: null, includesDeadline: null } ],
    viewer: { available: true, teams: [], entries: [{ id: "entry", teamId: "team", teamName: "Own team", role: "OWNER", finalist: "UNKNOWN", stages: [{ id: "preliminary", stage: "PRELIMINARY", sequence: 3, acceptedAt: "2030-01-03T12:00:00Z", frozen: true }] }] } };
});
afterEach(() => cleanup());
const copy = messages.agriPhases;

describe("AgriHackathon stage detail", () => {
  it("shows independent published windows, Beijing time and frozen history without implying advancement or XP", async () => {
    render(await AgriCompetitionDetail({ view, actorId: "actor" }));
    expect(screen.getByText(copy.finalist.UNKNOWN)).toBeInTheDocument();
    expect(screen.queryByText(copy.finalist.ELIGIBLE)).not.toBeInTheDocument();
    expect(screen.getByText(copy.frozen)).toBeInTheDocument();
    expect(screen.getByText(copy.deadlineInclusive)).toBeInTheDocument();
    expect(screen.getByText(copy.deadlineExclusive)).toBeInTheDocument();
    expect(screen.getByText(copy.technicalBoundary)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: copy.viewStage })).toHaveAttribute("href", "/competitions/agrihackathon/submissions?teamCompetitionId=entry&stage=PRELIMINARY");
    expect(document.querySelector('a[href$="stage=FINAL"]')).toBeNull();
  });
  it("offers final preparation only when there is a recorded eligible decision", async () => {
    view.viewer!.entries[0].finalist = "ELIGIBLE";
    view.windows[2] = { stage: "FINAL", state: "NOT_OPEN", opensAt: "2030-01-05T00:00:00Z", closesAt: "2030-01-06T00:00:00Z", includesDeadline: false };
    render(await AgriCompetitionDetail({ view, actorId: "actor" }));
    expect(document.querySelector('a[href$="stage=FINAL"]')).toHaveAttribute("href", "/competitions/agrihackathon/submissions?teamCompetitionId=entry&stage=FINAL");
    expect(screen.getByText(copy.finalist.ELIGIBLE)).toBeInTheDocument();
  });
  it("does not offer new final preparation while its independent window is pending or closed", async () => {
    view.viewer!.entries[0].finalist = "ELIGIBLE";
    const ui = render(await AgriCompetitionDetail({ view, actorId: "actor" }));
    expect(document.querySelector('a[href$="stage=FINAL"]')).toBeNull(); ui.unmount();
    view.windows[2] = { stage: "FINAL", state: "CLOSED", opensAt: "2030-01-05T00:00:00Z", closesAt: "2030-01-06T00:00:00Z", includesDeadline: false };
    render(await AgriCompetitionDetail({ view, actorId: "actor" }));
    expect(document.querySelector('a[href$="stage=FINAL"]')).toBeNull();
  });
  it("preserves final history access after eligibility changes or the workspace is disabled", async () => {
    view.configuration = "DISABLED"; view.viewer!.entries[0].finalist = "INELIGIBLE";
    view.viewer!.entries[0].stages.push({ id: "final", stage: "FINAL", sequence: 1, acceptedAt: "2030-01-05T12:00:00Z", frozen: false });
    render(await AgriCompetitionDetail({ view, actorId: "actor" }));
    expect(document.querySelector('a[href$="stage=FINAL"]')).toBeInTheDocument();
    expect(screen.queryByText("Registration control")).not.toBeInTheDocument();
    expect(screen.getByText(copy.configurationBody.DISABLED)).toBeInTheDocument();
  });
  it("shows registration only for an open window and an unregistered manageable team", async () => {
    view.viewer!.teams.push({ id: "another", name: "Another team", slug: "another", role: "OWNER" });
    const ui = render(await AgriCompetitionDetail({ view, actorId: "actor" }));
    expect(screen.getByText("Registration control")).toBeInTheDocument(); ui.unmount();
    view.windows[0].state = "CLOSED";
    render(await AgriCompetitionDetail({ view, actorId: "actor" }));
    expect(screen.queryByText("Registration control")).not.toBeInTheDocument();
  });
  it("keeps anonymous visitors away from private team progress", async () => {
    view.viewer = null;
    render(await AgriCompetitionDetail({ view }));
    expect(screen.getByRole("link", { name: copy.login })).toHaveAttribute("href", "/login?callbackUrl=%2Fcompetitions%2Fedition");
    expect(screen.queryByText("Own team")).not.toBeInTheDocument();
    expect(screen.queryByText(copy.finalist.UNKNOWN)).not.toBeInTheDocument();
  });
});