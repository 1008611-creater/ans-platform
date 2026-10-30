import { beforeEach, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import CommunityPage from "@/app/community/page";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), redirect: vi.fn(), growth: vi.fn(), growthPanel: vi.fn(), communityPanel: vi.fn(), feed: vi.fn() }));
vi.mock("next-auth/react", () => ({ useSession: () => ({ status: "authenticated", data: { user: { id: "self" } } }) }));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/server/growth/service", () => ({ getGrowthProfile: mocks.growth }));
vi.mock("@/server/community/feed", () => ({
  COMMUNITY_CHANNELS: ["all", "aigc"],
  parseCommunityChannel: (value: unknown) => value === "aigc" ? "aigc" : "all",
  listCommunityFeed: mocks.feed,
}));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect, notFound: () => { throw new Error("NOT_FOUND"); }, useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/components/community/community-feed", () => ({ CommunityFeed: ({ items }: { items: unknown[] }) => <ul data-testid="community-feed">{items.map((_, i) => <li key={i} />)}</ul> }));
vi.mock("@/components/community/community-panel", () => ({ CommunityPanel: (props: unknown) => { mocks.communityPanel(props); return <div data-testid="community-history" />; } }));
vi.mock("@/components/growth/profile-growth-panel", () => ({ ProfileGrowthPanel: (props: unknown) => { mocks.growthPanel(props); return <div data-testid="complete-growth" />; } }));
const profile = { xp: 125, communityPoints: 20, checkInStreak: 2, avatarFrameKey: "mint", chatBubbleKey: "mint", growthDay: "2026-10-16", recentEvents: [], checkIns: [{ id: "today", day: "2026-10-16" }] };
const note = { type: "note", id: "v1" };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.redirect.mockImplementation(() => { throw new Error("REDIRECT"); });
  mocks.growth.mockResolvedValue(profile);
  mocks.feed.mockResolvedValue({ feed: [note], noteCount: 1, repoCount: 0 });
});
afterEach(cleanup);
it("shows the public feed to visitors without loading private growth", async () => {
  mocks.auth.mockResolvedValue(null);
  render(await CommunityPage({ searchParams: Promise.resolve({ c: "aigc" }) }));
  expect(mocks.growth).not.toHaveBeenCalled();
  expect(mocks.growthPanel).not.toHaveBeenCalled();
  expect(mocks.feed).toHaveBeenCalledExactlyOnceWith("aigc");
  expect(screen.getByTestId("community-feed").children).toHaveLength(1);
  expect(screen.getByTestId("community-guest-preview")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "publish" })).toHaveAttribute("href", "/explore/submit");
  expect(screen.queryByRole("link", { name: "growth" })).not.toBeInTheDocument();
});
it("shows an honest empty state instead of padding the feed", async () => {
  mocks.auth.mockResolvedValue(null);
  mocks.feed.mockResolvedValue({ feed: [], noteCount: 0, repoCount: 0 });
  render(await CommunityPage());
  expect(screen.queryByTestId("community-feed")).not.toBeInTheDocument();
  expect(screen.getByText("empty")).toBeInTheDocument();
});
it("gives members a real check-in record beside the feed", async () => {
  mocks.auth.mockResolvedValue({ user: { id: "self", username: "real-member" } });
  render(await CommunityPage());
  expect(mocks.growth).toHaveBeenCalledExactlyOnceWith("self");
  expect(screen.getByTestId("community-checkin-card")).toBeInTheDocument();
  expect(screen.getByRole("img", { name: "checkInLabel" }).querySelectorAll(".bg-emerald-500")).toHaveLength(1);
  expect(screen.getByRole("link", { name: "viewGrowth" })).toHaveAttribute("href", "/community?tab=growth");
});
it("restores the full growth tab without loading the feed", async () => {
  mocks.auth.mockResolvedValue({ user: { id: "self", username: "real-member" } });
  render(await CommunityPage({ searchParams: Promise.resolve({ tab: "growth" }) }));
  expect(mocks.feed).not.toHaveBeenCalled();
  expect(screen.getByTestId("complete-growth")).toBeInTheDocument();
  expect(screen.getByTestId("community-history")).toBeInTheDocument();
  expect(mocks.growthPanel).toHaveBeenCalledWith(expect.objectContaining({ actorId: "self", editable: true, showActivity: false, user: { ...profile, checkedInToday: true } }));
  expect(mocks.communityPanel).toHaveBeenCalledWith({ actorId: "self", showGrowth: false });
});
it("does not manufacture growth for a removed or unavailable account", async () => {
  mocks.auth.mockResolvedValue({ user: { id: "self", username: "real-member" } });
  mocks.growth.mockResolvedValue(null);
  await expect(CommunityPage()).rejects.toThrow("NOT_FOUND");
  expect(mocks.growthPanel).not.toHaveBeenCalled();
});
