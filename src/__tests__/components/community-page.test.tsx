import { beforeEach, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import CommunityPage from "@/app/community/page";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), redirect: vi.fn(), growth: vi.fn(), growthPanel: vi.fn(), communityPanel: vi.fn(), feed: vi.fn(), compose: vi.fn(), stalls: vi.fn(), suggest: vi.fn() }));
vi.mock("next-auth/react", () => ({ useSession: () => ({ status: "authenticated", data: { user: { id: "self" } } }) }));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/server/growth/service", () => ({ getGrowthProfile: mocks.growth }));
vi.mock("@/server/community/feed", () => ({
  COMMUNITY_CHANNELS: ["following", "all", "team"],
  parseCommunityChannel: (value: unknown, signedIn = true) => value === "team" ? "team" : value === "following" && signedIn ? "following" : "all",
  parseCommunitySort: (value: unknown) => value === "open" ? "open" : "latest",
  listCommunityFeed: mocks.feed,
}));
vi.mock("@/server/community/posts", () => ({ getComposeOptions: mocks.compose, listMyStalls: mocks.stalls }));
vi.mock("@/server/community/follows", () => ({ suggestFollows: mocks.suggest }));
vi.mock("@/components/community/follow-button", () => ({ FollowButton: ({ userId, relation }: { userId: string; relation: { followedBy: boolean } }) => <button type="button" data-user={userId}>{relation.followedBy ? "followBack" : "follow"}</button> }));
vi.mock("@/components/community/post-compose", () => ({ PostCompose: () => <button type="button">compose</button> }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect, notFound: () => { throw new Error("NOT_FOUND"); }, useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/components/community/community-feed", () => ({ CommunityFeed: ({ items }: { items: unknown[] }) => <ul data-testid="community-feed">{items.map((_, i) => <li key={i} />)}</ul> }));
vi.mock("@/components/community/community-panel", () => ({ CommunityPanel: (props: unknown) => { mocks.communityPanel(props); return <div data-testid="community-history" />; } }));
vi.mock("@/components/growth/profile-growth-panel", () => ({ ProfileGrowthPanel: (props: unknown) => { mocks.growthPanel(props); return <div data-testid="complete-growth" />; } }));
const profile = { xp: 125, communityPoints: 20, checkInStreak: 2, avatarFrameKey: "mint", chatBubbleKey: "mint", growthDay: "2026-10-16", recentEvents: [], checkIns: [{ id: "today", day: "2026-10-16" }] };
const note = { type: "post", id: "p1" };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.redirect.mockImplementation(() => { throw new Error("REDIRECT"); });
  mocks.growth.mockResolvedValue(profile);
  mocks.feed.mockResolvedValue({ feed: [note], followingCount: null });
  mocks.suggest.mockResolvedValue([]);
  mocks.compose.mockResolvedValue({ teams: [], competitions: [] });
  mocks.stalls.mockResolvedValue([]);
});
afterEach(cleanup);
it("shows the public feed to visitors without loading private growth", async () => {
  mocks.auth.mockResolvedValue(null);
  render(await CommunityPage({ searchParams: Promise.resolve({ c: "team", sort: "open" }) }));
  expect(mocks.growth).not.toHaveBeenCalled();
  expect(mocks.growthPanel).not.toHaveBeenCalled();
  expect(mocks.compose).not.toHaveBeenCalled();
  expect(mocks.feed).toHaveBeenCalledExactlyOnceWith("team", "open", null);
  expect(mocks.suggest).not.toHaveBeenCalled();
  // 「关注」频道只给登录的人。
  expect(screen.queryByRole("link", { name: "channels.following" })).not.toBeInTheDocument();
  expect(screen.getByTestId("community-feed").children).toHaveLength(1);
  expect(screen.getByTestId("community-guest-preview")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "publish" })).toHaveAttribute("href", "/login?callbackUrl=/community");
  // 切换排序时保留当前板块。
  expect(screen.getByRole("link", { name: "sortLatest" })).toHaveAttribute("href", "/community?c=team");
  expect(screen.getByRole("link", { name: "sortOpen" })).toHaveAttribute("aria-current", "page");
  expect(screen.queryByRole("link", { name: "growth" })).not.toBeInTheDocument();
});
it("shows an honest empty state instead of padding the feed", async () => {
  mocks.auth.mockResolvedValue(null);
  mocks.feed.mockResolvedValue({ feed: [], followingCount: null });
  render(await CommunityPage({ searchParams: Promise.resolve({}) }));
  expect(screen.queryByTestId("community-feed")).not.toBeInTheDocument();
  expect(screen.getByText("empty")).toBeInTheDocument();
});
it("gives members a real check-in record beside the feed", async () => {
  mocks.auth.mockResolvedValue({ user: { id: "self", username: "real-member" } });
  render(await CommunityPage({ searchParams: Promise.resolve({}) }));
  expect(mocks.growth).toHaveBeenCalledExactlyOnceWith("self");
  expect(screen.getByTestId("community-checkin-card")).toBeInTheDocument();
  expect(screen.getByRole("img", { name: "checkInLabel" }).querySelectorAll(".bg-emerald-500")).toHaveLength(1);
  expect(screen.getByRole("link", { name: "viewGrowth" })).toHaveAttribute("href", "/community?tab=growth");
  expect(screen.getByRole("button", { name: "compose" })).toBeInTheDocument();
});
it("lists the member's own open posts with what is waiting for them", async () => {
  mocks.auth.mockResolvedValue({ user: { id: "self", username: "real-member" } });
  mocks.stalls.mockResolvedValue([{ id: "s1", title: "农客松缺前端", stall: "TEAM", pending: 3 }, { id: "s2", title: "求部署教程", stall: "SEEK", pending: 0 }]);
  render(await CommunityPage({ searchParams: Promise.resolve({}) }));
  expect(mocks.stalls).toHaveBeenCalledExactlyOnceWith("self");
  const card = screen.getByTestId("community-my-stalls");
  expect(card.querySelector('a[href="/community/posts/s1"]')).toHaveTextContent("myStallTeam");
  expect(card.querySelector('a[href="/community/posts/s2"]')).toHaveTextContent("myStallNone");
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
  await expect(CommunityPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("NOT_FOUND");
  expect(mocks.growthPanel).not.toHaveBeenCalled();
});

it("gives members a following channel that points to real people when it is empty", async () => {
  mocks.auth.mockResolvedValue({ user: { id: "self", username: "real-member" } });
  mocks.feed.mockResolvedValue({ feed: [], followingCount: 0 });
  mocks.suggest.mockResolvedValue([{ id: "u2", username: "kai", nickname: null, avatar: null, reason: "fan", count: 0 }, { id: "u3", username: "bai", nickname: "白榆", avatar: null, reason: "relays", count: 4 }]);
  render(await CommunityPage({ searchParams: Promise.resolve({ c: "following" }) }));
  expect(mocks.feed).toHaveBeenCalledExactlyOnceWith("following", "latest", "self");
  expect(mocks.suggest).toHaveBeenCalledExactlyOnceWith("self");
  expect(screen.getByRole("link", { name: "channels.following" })).toHaveAttribute("aria-current", "page");
  const empty = screen.getByTestId("community-following-empty");
  expect(empty).toHaveTextContent("followingEmpty");
  // 关注了我的人显示「回关」，其余显示「关注」。
  expect(empty.querySelector('button[data-user="u2"]')).toHaveTextContent("followBack");
  expect(empty.querySelector('button[data-user="u3"]')).toHaveTextContent("follow");
  expect(screen.getByTestId("community-follow-suggestions")).toBeInTheDocument();
});
