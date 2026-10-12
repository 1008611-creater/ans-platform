import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileGrowthPanel } from "@/components/growth/profile-growth-panel";

const m = vi.hoisted(() => ({ actor: "member-a", status: "authenticated", refresh: vi.fn() }));
vi.mock("next-auth/react", () => ({ useSession: () => ({ data: { user: { id: m.actor } }, status: m.status }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: m.refresh }) }));
vi.mock("next-intl", () => ({ useLocale: () => "zh", useTranslations: () => (key: string, values?: Record<string, unknown>) => `${key}${values ? JSON.stringify(values) : ""}` }));
const fetchMock = vi.fn();
const initial = { xp: 125, communityPoints: 20, checkInStreak: 2, avatarFrameKey: "default", chatBubbleKey: "default", checkedInToday: false,
  recentEvents: [{ id: "private-a-event", type: "COMMENT", xp: 37, points: 0, sourceType: "comment", createdAt: "2026-10-11T00:00:00Z" }],
  checkIns: [{ id: "private-a-checkin", day: "2026-10-11", streak: 2, xpAwarded: 5, createdAt: "2026-10-11T00:00:00Z" }],
};
const newMember = { ...initial, xp: 0, communityPoints: 0, checkInStreak: 0, recentEvents: [], checkIns: [] };
const panel = (actorId = "member-a", user = initial) => <ProfileGrowthPanel actorId={actorId} user={user} editable />;
function deferred() { let resolve!: (value: unknown) => void; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; }
const reply = (data: unknown) => ({ ok: true, json: async () => data });
const checkInRecord = { id: "committed-checkin", day: "2026-10-12", streak: 3, xpAwarded: 5, createdAt: "2026-10-12T00:00:00Z" };

beforeEach(() => {
  vi.clearAllMocks(); m.actor = "member-a"; m.status = "authenticated";
  fetchMock.mockReset(); vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("个人成长与装扮的账号边界", () => {
  it("签到与服务端成长重读都发送渲染账号，使用已提交余额", async () => {
    fetchMock.mockResolvedValueOnce(reply({ alreadyCheckedIn: false, checkIn: checkInRecord }))
      .mockResolvedValueOnce(reply({ xp: 450, communityPoints: 60, checkInStreak: 3, recentEvents: [], checkIns: [checkInRecord] }));
    render(panel()); fireEvent.click(screen.getByRole("button", { name: "checkIn" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "checkedIn" })).toBeDisabled());
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(["/api/community/check-in", "/api/community/growth"]);
    for (const [, init] of fetchMock.mock.calls) expect(init).toMatchObject({ cache: "no-store", credentials: "same-origin", headers: { "x-ans-actor": "member-a" } });
    expect(screen.getByText("450")).toBeInTheDocument();
  });
  it("换号卸载旧成长与日历，迟到签到不得请求新账号历史或恢复 XP", async () => {
    const task = deferred(); fetchMock.mockReturnValueOnce(task.promise);
    const view = render(panel()); fireEvent.click(screen.getByRole("button", { name: "checkIn" }));
    const signal = fetchMock.mock.calls[0][1].signal as AbortSignal;
    m.actor = "member-b"; view.rerender(panel());
    expect(signal.aborted).toBe(true); expect(screen.getByRole("alert")).toHaveTextContent("changed");
    expect(screen.queryByRole("list", { name: "checkInCalendarTitle" })).not.toBeInTheDocument();
    expect(screen.queryByText("+37 XP")).not.toBeInTheDocument();
    view.rerender(panel("member-b", newMember));
    await act(async () => task.resolve(reply({ alreadyCheckedIn: false, checkIn: { ...checkInRecord, xpAwarded: 9000 } })));
    expect(fetchMock).toHaveBeenCalledTimes(1); expect(screen.getByRole("button", { name: "checkIn" })).toBeEnabled();
    expect(screen.queryByText(/9,000/)).not.toBeInTheDocument(); expect(screen.queryByText(/checkInSuccess/)).not.toBeInTheDocument();
  });
  it("签到已提交但成长重读迟到时，旧响应不能写入新账号", async () => {
    const task = deferred(); fetchMock.mockResolvedValueOnce(reply({ alreadyCheckedIn: false, checkIn: checkInRecord })).mockReturnValueOnce(task.promise);
    const view = render(panel()); fireEvent.click(screen.getByRole("button", { name: "checkIn" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const signal = fetchMock.mock.calls[1][1].signal as AbortSignal;
    m.actor = "member-b"; view.rerender(panel("member-b", newMember)); expect(signal.aborted).toBe(true);
    await act(async () => task.resolve(reply({ xp: 987654, communityPoints: 777, checkInStreak: 99, checkIns: [checkInRecord], recentEvents: initial.recentEvents })));
    expect(screen.queryByText("987,654")).not.toBeInTheDocument(); expect(screen.queryByText("+37 XP")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "checkIn" })).toBeEnabled();
  });
  it.each(["avatar-frame", "chat-bubble"])("%s 装扮换号后不采纳迟到成功，也不刷新新账号", async kind => {
    const task = deferred(); fetchMock.mockReturnValueOnce(task.promise);
    const view = render(panel());
    const name = kind === "avatar-frame" ? "rewards.mint.label" : "bubbleLabels.mint";
    fireEvent.click(screen.getByRole("button", { name }));
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(fetchMock.mock.calls[0][0]).toBe("/api/community/growth/equip");
    expect(init.headers).toMatchObject({ "x-ans-actor": "member-a" }); expect(JSON.parse(init.body as string)).toEqual({ kind, key: "mint" });
    m.actor = "member-b"; view.rerender(panel("member-b", newMember)); expect(init.signal?.aborted).toBe(true);
    await act(async () => task.resolve(reply({ key: "mint" })));
    expect(m.refresh).not.toHaveBeenCalled(); expect(screen.queryByText("applied")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: `${name}, locked` })).toHaveAttribute("aria-pressed", "false");
  });
  it("装扮响应已到但 JSON 迟到时也拒绝过期回执", async () => {
    const task = deferred(); fetchMock.mockResolvedValueOnce({ ok: true, json: () => task.promise });
    const view = render(panel()); fireEvent.click(screen.getByRole("button", { name: "rewards.mint.label" }));
    await act(async () => {});
    m.actor = "member-b"; view.rerender(panel("member-b", newMember));
    await act(async () => task.resolve({ key: "mint" }));
    expect(m.refresh).not.toHaveBeenCalled(); expect(screen.queryByText("applied")).not.toBeInTheDocument();
  });
  it.each(["loading", "unauthenticated"])("session=%s 时隐藏私密成长且无法提交", status => {
    m.status = status; render(panel());
    expect(screen.queryByRole("button", { name: "checkIn" })).not.toBeInTheDocument();
    expect(screen.queryByText("+37 XP")).not.toBeInTheDocument(); expect(fetchMock).not.toHaveBeenCalled();
  });
  it("缺失 actor 不能启用个人操作，公共主页不暴露私密日历或流水", () => {
    const view = render(<ProfileGrowthPanel user={initial} editable />);
    expect(screen.queryByRole("button", { name: "checkIn" })).not.toBeInTheDocument();
    view.rerender(<ProfileGrowthPanel user={initial} editable={false} />);
    expect(screen.queryByRole("button", { name: "checkIn" })).not.toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "checkInCalendarTitle" })).not.toBeInTheDocument();
    expect(screen.queryByText("+37 XP")).not.toBeInTheDocument(); expect(screen.getAllByText("privateGrowthHint")).toHaveLength(2);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
