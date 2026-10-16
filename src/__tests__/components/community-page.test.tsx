import { beforeEach, expect, it, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import CommunityPage from "@/app/community/page";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), redirect: vi.fn(), growth: vi.fn(), growthPanel: vi.fn(), communityPanel: vi.fn() }));
vi.mock("next-auth/react", () => ({ useSession: () => ({ status: "authenticated", data: { user: { id: "self" } } }) }));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/server/growth/service", () => ({ getGrowthProfile: mocks.growth }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect, notFound: () => { throw new Error("NOT_FOUND"); }, useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/components/community/community-panel", () => ({ CommunityPanel: (props: unknown) => { mocks.communityPanel(props); return <div data-testid="community-history" />; } }));
vi.mock("@/components/growth/profile-growth-panel", () => ({ ProfileGrowthPanel: (props: unknown) => { mocks.growthPanel(props); return <div data-testid="complete-growth" />; } }));
const profile = { xp: 125, communityPoints: 20, checkInStreak: 2, avatarFrameKey: "mint", chatBubbleKey: "mint", growthDay: "2026-10-16", recentEvents: [], checkIns: [{ id: "today", day: "2026-10-16" }] };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.redirect.mockImplementation(() => { throw new Error("REDIRECT"); });
  mocks.growth.mockResolvedValue(profile);
});
afterEach(cleanup);
it("redirects visitors before loading private growth", async () => {
  mocks.auth.mockResolvedValue(null);
  await expect(CommunityPage()).rejects.toThrow("REDIRECT");
  expect(mocks.redirect).toHaveBeenCalledWith("/login?callbackUrl=/community");
  expect(mocks.growth).not.toHaveBeenCalled();
});
it("restores full private growth and real community destinations without a second check-in", async () => {
  mocks.auth.mockResolvedValue({ user: { id: "self", username: "real-member", xp: 0, role: "USER", verified: false } });
  render(await CommunityPage());
  expect(screen.getByTestId("complete-growth")).toBeInTheDocument();
  expect(screen.getByTestId("community-history")).toBeInTheDocument();
  expect(mocks.growth).toHaveBeenCalledExactlyOnceWith("self");
  expect(mocks.growthPanel).toHaveBeenCalledWith(expect.objectContaining({ actorId: "self", editable: true, showActivity: false, user: { ...profile, checkedInToday: true } }));
  expect(mocks.communityPanel).toHaveBeenCalledWith({ actorId: "self", showGrowth: false });
  expect(screen.getByRole("link", { name: "works" })).toHaveAttribute("href", "/showcase");
  expect(screen.getByRole("link", { name: "profile" })).toHaveAttribute("href", "/@real-member");
  expect(screen.getByRole("link", { name: "publish" })).toHaveAttribute("href", "/explore/submit");
});
it("does not manufacture growth for a removed or unavailable account", async () => {
  mocks.auth.mockResolvedValue({ user: { id: "self", username: "real-member" } });
  mocks.growth.mockResolvedValue(null);
  await expect(CommunityPage()).rejects.toThrow("NOT_FOUND");
  expect(mocks.growthPanel).not.toHaveBeenCalled();
});
