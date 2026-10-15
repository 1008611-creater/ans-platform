// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { activeCheckInStreak, communityCalendarDays, getCommunityDay, millisecondsUntilNextCommunityDay } from "@/domain/growth/check-in";
const mocks = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { $queryRaw: mocks.query } }));
import { getGrowthProfile } from "@/server/growth/service";
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });
describe("current Shanghai check-in streak", () => {
  it.each([
    ["2026-10-14T15:59:59.999Z", "2026-10-13T16:00:00Z", 8],
    ["2026-10-14T16:00:00Z", "2026-10-13T16:00:00Z", 8],
    ["2026-10-15T15:59:59.999Z", "2026-10-13T16:00:00Z", 8],
    ["2026-10-15T16:00:00Z", "2026-10-13T16:00:00Z", 0],
    ["2026-10-14T16:00:00Z", "2026-10-13T15:59:59.999Z", 0],
    ["2026-12-31T16:00:00Z", "2026-12-31T15:59:59Z", 8],
    ["2028-02-29T16:00:00Z", "2028-02-28T16:00:00Z", 8],
    ["2028-03-01T16:00:00Z", "2028-02-28T16:00:00Z", 0],
    ["2026-10-14T16:00:00Z", "2026-10-15T16:00:00Z", 0],
  ])("at %s with last check-in %s displays %s", (now, last, expected) => {
    expect(activeCheckInStreak(8, new Date(last), new Date(now))).toBe(expected);
  });
  it("does not invent a streak without a recorded check-in", () => {
    expect(activeCheckInStreak(8, null)).toBe(0);
    expect(activeCheckInStreak(-1, new Date())).toBe(0);
  });
  it("builds the 28-day calendar from Shanghai dates across leap day", () => {
    const days = communityCalendarDays("2028-03-01");
    expect(days).toHaveLength(28); expect(new Set(days).size).toBe(28);
    expect(days.slice(-3)).toEqual(["2028-02-28", "2028-02-29", "2028-03-01"]);
    expect(getCommunityDay(new Date("2028-02-29T16:00:00Z"))).toBe(days.at(-1));
    expect(millisecondsUntilNextCommunityDay(new Date("2026-10-14T15:59:59.999Z"))).toBe(2);
  });
  it("expires the API counter without altering historical rows or balances", async () => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-14T16:00:00Z"));
    const row = { id: "member", xp: 123, communityPoints: 45, checkInStreak: 8, lastCheckInAt: new Date("2026-10-11T01:00:00Z"), avatarFrameKey: "mint", chatBubbleKey: "default", recentEvents: [], checkIns: [{ id: "old", day: "2026-10-11", streak: 8, xpAwarded: 5, createdAt: "2026-10-11T01:00:00Z" }] };
    mocks.query.mockResolvedValue([row]);
    const profile = await getGrowthProfile("member");
    expect(profile).toMatchObject({ xp: 123, communityPoints: 45, checkInStreak: 0, growthDay: "2026-10-15" });
    expect(profile?.checkIns[0]).toMatchObject({ streak: 8, xpAwarded: 5 });
    expect(row.checkInStreak).toBe(8); expect(mocks.query).toHaveBeenCalledTimes(1);
  });
});
