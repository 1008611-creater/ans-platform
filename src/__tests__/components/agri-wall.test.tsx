import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgriPopularityManager, AgriWall, AgriWallSubmit, beijingDateTimeToIso } from "@/components/competitions/agri-wall";
import type { AgriWallMine, AgriWallView } from "@/contracts/agri-wall";
import type { MarketOfferView } from "@/contracts/marketplace-view";
import zh from "../../../messages/agri-wall/zh.json";

const state = vi.hoisted(() => ({ actor: "actor-one" as string | null }));
vi.mock("next-auth/react", () => ({ useSession: () => ({ status: state.actor ? "authenticated" : "unauthenticated", data: state.actor ? { user: { id: state.actor } } : null }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("next-intl", () => ({
  useLocale: () => "zh-CN",
  useTranslations: (namespace: string) => {
    const lookup = (key: string) => namespace === "agriWall" ? key.split(".").reduce<unknown>((value, part) => value && typeof value === "object" ? (value as Record<string, unknown>)[part] : undefined, zh) : undefined;
    const t = (key: string, values?: Record<string, string | number>) => { let value = String(lookup(key) ?? key); for (const [name, item] of Object.entries(values ?? {})) value = value.replaceAll("{" + name + "}", String(item)); return value; };
    t.has = (key: string) => typeof lookup(key) === "string";
    return t;
  },
}));
function offer(id = "offer-one"): MarketOfferView {
  return { id, slug: "field-project", official: false, status: "PUBLISHED", version: 3, seller: { id: "actor-one", username: "owner", nickname: null, avatar: null }, submittedAt: null, reviewedAt: null, reviewNote: null, starCount: 12, starred: false,
    listing: { slug: "field-project", title: "真实田间项目", summary: "这是一个解决真实田间问题的项目。", description: "足够详细的真实项目描述，用于公开作品测试。", category: "competition", subcategory: "agri-wall", fulfillment: "resource", priceMinor: 0, currency: "CNY", deliveryDays: 1, revisionLimit: 0, computeIncluded: false, deliverables: ["项目介绍"], licenseTerms: "仅供查看和赛事评审使用，不含额外授权。" } };
}
function mine(): AgriWallMine { return { entries: [{ id: "entry-one", teamName: "种子队", wall: null }], listings: [offer()], canConfigure: false, round: null }; }
function view(): AgriWallView { return { configured: true, competitionId: "competition-one", round: null, entries: [{ id: "wall-one", teamName: "种子队", projectId: "private-project", offer: offer(), validStars: 2, eligible: true, viewerEligible: true, viewerVoted: false }] }; }
const respond = (data: unknown) => new Response(JSON.stringify({ ok: true, data }), { headers: { "Content-Type": "application/json" } });
beforeEach(() => { state.actor = "actor-one"; });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("AgriHackathon wall", () => {
  it("separates eligible event votes from all-time Stars, shows rank badge, and supports one-click share rally", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => respond(view())));
    render(<AgriWall />);
    expect(await screen.findByText(zh.validStars)).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("TOP 1")).toBeInTheDocument();
    expect(screen.getByText(zh.leaderHint)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /star 12/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "真实田间项目" })).toHaveAttribute("href", "/explore/member-field-project");
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    fireEvent.click(screen.getByRole("button", { name: zh.shareVote }));
    expect(await screen.findByRole("button", { name: zh.shareCopied })).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("/competitions/agrihackathon/wall/field-project"));
  });
  it("actively confirms an existing Star without toggling it off", async () => {
    const data = view(); data.entries[0].offer.starred = true;
    data.round = { revision: 1, opensAt: "2026-10-01T00:00:00Z", closesAt: "2026-10-20T00:00:00Z", state: "OPEN", frozenAt: null, results: [] };
    const eventVote = { open: true, eligible: true, voted: false };
    const fetcher = vi.fn(async (url: string, init?: RequestInit) => respond(url.endsWith("/star") ? { starred: true, starCount: 12, eventVote: { ...eventVote, voted: init?.method === "PUT" } } : data));
    vi.stubGlobal("fetch", fetcher);
    render(<AgriWall />);
    fireEvent.click(await screen.findByRole("button", { name: new RegExp(zh.confirmVote) }));
    await waitFor(() => expect(fetcher.mock.calls.some(([, init]) => init?.method === "PUT")).toBe(true));
    const command = fetcher.mock.calls.find(([, init]) => init?.method === "PUT")![1]!;
    expect(JSON.parse(String(command.body))).toEqual({ starred: true });
  });
  it("explains own-team exclusion instead of offering a misleading vote confirmation", async () => {
    const data = view(); data.entries[0].offer.starred = true; data.entries[0].viewerEligible = false;
    data.round = { revision: 1, opensAt: "2026-10-01T00:00:00Z", closesAt: "2026-10-20T00:00:00Z", state: "OPEN", frozenAt: null, results: [] };
    vi.stubGlobal("fetch", vi.fn(async () => respond(data)));
    render(<AgriWall />);
    expect(await screen.findByText(zh.ownTeamVote)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: zh.confirmVote })).toBeNull();
  });
  it("shows an honest empty state instead of sample entrants", async () => {
    const empty = view(); empty.entries = [];
    vi.stubGlobal("fetch", vi.fn(async () => respond(empty)));
    render(<AgriWall />);
    expect(await screen.findByText(zh.emptyTitle)).toBeInTheDocument();
    expect(screen.queryByText("真实田间项目")).toBeNull();
  });
  it("keeps zero-vote results unawarded", async () => {
    const closed = view(); closed.round = { revision: 1, opensAt: "2026-10-01T00:00:00Z", closesAt: "2026-10-02T00:00:00Z", state: "CLOSED", frozenAt: "2026-10-02T00:00:00Z", results: [{ entryId: "wall-one", listingId: "offer-one", title: "真实田间项目", teamName: "种子队", votes: 0, rank: 1, winner: false }] };
    vi.stubGlobal("fetch", vi.fn(async () => respond(closed)));
    render(<AgriWall />);
    expect(await screen.findByText(zh.noWinner)).toBeInTheDocument();
    expect(screen.queryByText(/获奖 ·/)).toBeNull();
  });
  it("directs anonymous users to sign in before private team access", () => {
    state.actor = null; const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    render(<AgriWallSubmit />);
    expect(screen.getByRole("link", { name: zh.login })).toHaveAttribute("href", expect.stringContaining("/login?callbackUrl="));
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("requires explicit publication consent and sends a version-checked binding", async () => {
    const fetcher = vi.fn(async (_url: string, init?: RequestInit) => respond(init?.method === "POST" ? { id: "wall-one" } : mine()));
    vi.stubGlobal("fetch", fetcher);
    render(<AgriWallSubmit />);
    const select = await screen.findByLabelText(zh.chooseProject);
    fireEvent.change(select, { target: { value: "offer-one" } });
    expect(screen.getByRole("button", { name: zh.bind })).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: zh.consent }));
    fireEvent.click(screen.getByRole("button", { name: zh.bind }));
    await waitFor(() => expect(fetcher.mock.calls.some(([, init]) => init?.method === "POST")).toBe(true));
    const command = fetcher.mock.calls.find(([, init]) => init?.method === "POST")![1]!;
    expect(JSON.parse(String(command.body))).toEqual({ action: "bind", teamCompetitionId: "entry-one", listingId: "offer-one", expectedVersion: 3 });
    expect(command.headers).toEqual(expect.objectContaining({ "x-ans-actor": "actor-one" }));
  });
  it("shows receipts and a stage-submission next step for already bound teams", async () => {
    const bound = mine(); bound.entries[0].wall = { id: "wall-one", listingId: "offer-one", projectId: "private-project", artifactVersionId: "version-one", title: "真实田间项目", published: true };
    vi.stubGlobal("fetch", vi.fn(async () => respond(bound)));
    render(<AgriWallSubmit />);
    expect(await screen.findByText(zh.boundTitle)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: zh.continueSubmission })).toHaveAttribute("href", "/competitions/agrihackathon/submissions?teamCompetitionId=entry-one");
    expect(screen.getByRole("link", { name: zh.details })).toHaveAttribute("href", "/explore/member-field-project");
    expect(screen.queryByRole("button", { name: zh.bind })).toBeNull();
  });
  it("syncs the same bound project with the current published version", async () => {
    const bound = mine(); bound.entries[0].wall = { id: "wall-one", listingId: "offer-one", projectId: "private-project", artifactVersionId: "version-one", title: "existing title", published: true };
    const fetcher = vi.fn(async (_url: string, init?: RequestInit) => respond(init?.method === "POST" ? { wallEntryId: "wall-one" } : bound));
    vi.stubGlobal("fetch", fetcher);
    render(<AgriWallSubmit />);
    fireEvent.click(await screen.findByRole("button", { name: zh.syncProject }));
    await waitFor(() => expect(fetcher.mock.calls.some(([, init]) => init?.method === "POST")).toBe(true));
    expect(JSON.parse(String(fetcher.mock.calls.find(([, init]) => init?.method === "POST")![1]!.body))).toEqual({ action: "bind", teamCompetitionId: "entry-one", listingId: "offer-one", expectedVersion: 3 });
  });
  it("explains and blocks new bindings after voting opens", async () => {
    const data = mine(); data.round = { revision: 1, opensAt: "2026-10-01T00:00:00Z", closesAt: "2026-10-20T00:00:00Z", state: "OPEN", frozenAt: null, results: [] };
    vi.stubGlobal("fetch", vi.fn(async () => respond(data)));
    render(<AgriWallSubmit />);
    fireEvent.change(await screen.findByLabelText(zh.chooseProject), { target: { value: "offer-one" } });
    fireEvent.click(screen.getByRole("checkbox", { name: zh.consent }));
    expect(screen.getByText(zh.bindingClosed)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: zh.bind })).toBeDisabled();
  });
  it("never offers a pending or paid listing as a project choice", async () => {
    const data = mine(); data.listings[0].status = "PENDING_REVIEW";
    const paid = offer("paid"); paid.listing.priceMinor = 100; data.listings.push(paid);
    vi.stubGlobal("fetch", vi.fn(async () => respond(data)));
    render(<AgriWallSubmit />);
    expect(await screen.findByText(zh.noOffer)).toBeInTheDocument();
    expect(screen.queryByLabelText(zh.chooseProject)).toBeNull();
  });
  it("does not expose old-account private data when the session switches", async () => {
    let finish: ((response: Response) => void) | null = null;
    const fetcher = vi.fn((_: string, init?: RequestInit) => init?.headers && (init.headers as Record<string, string>)["x-ans-actor"] === "actor-one" ? new Promise<Response>(resolve => { finish = resolve; }) : Promise.resolve(respond({ ...mine(), entries: [] })));
    vi.stubGlobal("fetch", fetcher);
    const result = render(<AgriWallSubmit />);
    await waitFor(() => expect(fetcher).toHaveBeenCalledOnce());
    state.actor = "actor-two"; result.rerender(<AgriWallSubmit />);
    expect(await screen.findByText(zh.noTeamTitle)).toBeInTheDocument();
    finish!(respond(mine()));
    await waitFor(() => expect(screen.queryByLabelText(zh.team)).toBeNull());
    expect(screen.queryByText("种子队")).toBeNull();
  });
  it("denies configuration controls to ordinary members", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => respond(mine())));
    render(<AgriPopularityManager />);
    expect(await screen.findByText(zh.staffOnly)).toBeInTheDocument();
    expect(screen.queryByLabelText(zh.opensAt)).toBeNull();
  });
  it("saves Beijing-offset dates and automatically reads back the accepted window", async () => {
    const data = mine(); data.canConfigure = true;
    const fetcher = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        const command = JSON.parse(String(init.body));
        data.round = { revision: 1, opensAt: command.opensAt, closesAt: command.closesAt, state: "NOT_OPEN", frozenAt: null, results: [] };
        return respond({ revision: 1 });
      }
      return respond(data);
    });
    vi.stubGlobal("fetch", fetcher);
    render(<AgriPopularityManager />);
    fireEvent.change(await screen.findByLabelText(zh.opensAt), { target: { value: "2026-10-20T09:30" } });
    fireEvent.change(screen.getByLabelText(zh.closesAt), { target: { value: "2026-10-22T18:00" } });
    fireEvent.click(screen.getByRole("checkbox", { name: zh.configureConsent }));
    fireEvent.click(screen.getByRole("button", { name: zh.saveWindow }));
    expect(await screen.findByText(zh.saved)).toBeInTheDocument();
    expect(await screen.findByText(zh.states.NOT_OPEN)).toBeInTheDocument();
    const command = fetcher.mock.calls.find(([, init]) => init?.method === "POST")![1]!;
    expect(JSON.parse(String(command.body))).toEqual({ action: "configurePopularity", expectedRevision: 0, opensAt: "2026-10-20T09:30:00+08:00", closesAt: "2026-10-22T18:00:00+08:00" });
  });
  it("requires a receipt refresh after an uncertain binding response", async () => {
    const fetcher = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === "POST") throw new TypeError("Load failed");
      return respond(mine());
    });
    vi.stubGlobal("fetch", fetcher);
    render(<AgriWallSubmit />);
    fireEvent.change(await screen.findByLabelText(zh.chooseProject), { target: { value: "offer-one" } });
    fireEvent.click(screen.getByRole("checkbox", { name: zh.consent }));
    fireEvent.click(screen.getByRole("button", { name: zh.bind }));
    expect(await screen.findByText(zh.uncertain)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: zh.bind })).toBeDisabled();
    expect(screen.getByRole("button", { name: zh.refresh })).toBeEnabled();
  });
  it("locks the time controls after voting starts", async () => {
    const data = mine(); data.canConfigure = true; data.round = { revision: 1, opensAt: "2026-10-01T00:00:00Z", closesAt: "2026-10-20T00:00:00Z", state: "OPEN", frozenAt: null, results: [] };
    vi.stubGlobal("fetch", vi.fn(async () => respond(data)));
    render(<AgriPopularityManager />);
    expect(await screen.findByLabelText(zh.opensAt)).toBeDisabled();
    expect(screen.getByLabelText(zh.closesAt)).toBeDisabled();
    expect(screen.queryByRole("button", { name: zh.saveWindow })).toBeNull();
  });
});
describe("Beijing time entry", () => {
  it("uses an explicit offset regardless of the browser timezone", () => { expect(beijingDateTimeToIso("2026-10-20T09:30")).toBe("2026-10-20T09:30:00+08:00"); });
  it.each(["2026-02-30T09:30", "2026-13-01T09:30", "2026-10-20T25:30", "not a date"])("rejects invalid or rolled-over dates: %s", value => { expect(beijingDateTimeToIso(value)).toBeNull(); });
});
