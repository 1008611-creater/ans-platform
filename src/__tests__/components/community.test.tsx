import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CommunityPanel } from "@/components/community/community-panel";
import { AccountContentBoundary } from "@/components/auth/account-content-boundary";
import { getLevelProgress } from "@/lib/level";

const session = vi.hoisted(() => ({ actor: "self", status: "authenticated" }));
vi.mock("next-auth/react", () => ({ useSession: () => ({ data: { user: { id: session.actor } }, status: session.status }) }));
const fetchMock = vi.fn();
const panel = (actorId = "self") => <AccountContentBoundary actorId={actorId}><CommunityPanel actorId={actorId} /></AccountContentBoundary>;
function deferred() { let resolve!: (value: unknown) => void; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; }

let checked: boolean;
let failRead: boolean;
const today = { id: "c1", day: "2026-09-08", streak: 1, xpAwarded: 5, createdAt: "2026-09-08T00:00:00Z" };
const me = () => ({ xp: checked ? 5 : 0, level: getLevelProgress(checked ? 5 : 0), checkInStreak: checked ? 1 : 0, todayCheckIn: checked ? today : null, ledger: checked ? [{ id: "l1", amount: 5, reason: "CHECK_IN", note: "每日签到", createdAt: today.createdAt }] : [] });

beforeEach(() => {
  session.actor = "self"; session.status = "authenticated";
  checked = false; failRead = false;
  fetchMock.mockReset().mockImplementation(async (url: string, init?: RequestInit) => {
    if (failRead) return { ok: false, status: 500, json: async () => ({ error: "SERVER_ERROR" }) };
    if (init?.method === "POST") { checked = true; return { ok: true, json: async () => ({ alreadyCheckedIn: false, checkIn: today }) }; }
    return { ok: true, json: async () => url.endsWith("/me") ? me() : { top: [{ id: "self", nickname: "匿名同学", xp: checked ? 5 : 0, level: getLevelProgress(checked ? 5 : 0), rank: 1 }], me: { id: "self", nickname: "匿名同学", xp: checked ? 5 : 0, level: getLevelProgress(checked ? 5 : 0), rank: 1 } } };
  });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("社区面板", () => {
  it("零级可签到，签到后刷新XP、最近流水和贡献榜", async () => {
    render(panel());
    const button = await screen.findByRole("button", { name: "每日签到" });
    expect(button).toBeEnabled();
    expect(screen.getByRole("button", { name: "historyGuide" })).toBeInTheDocument();
    fireEvent.click(button);
    await waitFor(() => expect(screen.getByRole("button", { name: "今日已签到" })).toBeDisabled());
    expect(screen.getByText("+5 XP")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "最近经验流水" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "贡献榜" })).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/community/check-in", expect.objectContaining({ method: "POST", headers: expect.objectContaining({ "x-ans-actor": "self" }) }));
  });

  it("已有签到记录时不允许再次点击", async () => {
    checked = true;
    render(panel());
    expect(await screen.findByRole("button", { name: "今日已签到" })).toBeDisabled();
    expect(fetchMock.mock.calls.every(([, init]) => init?.method !== "POST")).toBe(true);
  });

  it("加载失败显示可恢复错误，重试后正常渲染", async () => {
    failRead = true;
    render(panel());
    expect(await screen.findByRole("alert")).toHaveTextContent("社区数据加载失败");
    failRead = false;
    fireEvent.click(screen.getByRole("button", { name: "重试" }));
    expect(await screen.findByRole("button", { name: "每日签到" })).toBeEnabled();
  });

  it("签到请求处理中禁用按钮，避免连续提交", async () => {
    render(panel());
    const button = await screen.findByRole("button", { name: "每日签到" });
    let resolve!: (value: unknown) => void;
    fetchMock.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    fireEvent.click(button);
    expect(screen.getByRole("button", { name: "签到中…" })).toBeDisabled();
    checked = true;
    resolve({ ok: true, json: async () => ({ alreadyCheckedIn: false, checkIn: today }) });
    await screen.findByRole("button", { name: "今日已签到" });
  });

  it("资格拒绝显示验证提示，不把徽章作为准入依据", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 403, json: async () => ({ error: "COMMUNITY_INELIGIBLE" }) });
    render(panel());
    expect(await screen.findByRole("alert")).toHaveTextContent(/邮箱已验证/);
    expect(screen.queryByRole("button", { name: "每日签到" })).not.toBeInTheDocument();
  });
});


describe("社区账号切换与迟到请求", () => {
  it("所有私密读取均绑定渲染账号且不缓存", async () => {
    render(panel()); await screen.findByRole("button", { name: "每日签到" });
    expect(fetchMock.mock.calls).toHaveLength(2);
    for (const [, init] of fetchMock.mock.calls) expect(init).toMatchObject({ cache: "no-store", headers: { "x-ans-actor": "self" } });
  });
  it("换号立即卸载旧 XP 和私密流水，旧签到回执不得触发新账号读取", async () => {
    const view = render(panel()); const button = await screen.findByRole("button", { name: "每日签到" });
    const task = deferred(); fetchMock.mockImplementationOnce(() => task.promise);
    fireEvent.click(button); const write = fetchMock.mock.calls.at(-1)![1] as RequestInit;
    expect(write.headers).toMatchObject({ "x-ans-actor": "self" });
    session.actor = "other-member"; view.rerender(panel());
    expect(screen.queryByRole("heading", { name: "我的社区成长" })).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("changed"); expect(write.signal?.aborted).toBe(true);
    const before = fetchMock.mock.calls.length;
    await act(async () => task.resolve({ ok: true, json: async () => ({ alreadyCheckedIn: false, checkIn: today }) }));
    expect(fetchMock).toHaveBeenCalledTimes(before);
    expect(screen.queryByText(/签到成功/)).not.toBeInTheDocument();
    expect(screen.queryByText("+5 XP")).not.toBeInTheDocument();
  });
  it("忽略已卸载旧账号的迟到读取，保持新账号的真实数据", async () => {
    const task = deferred(); fetchMock.mockImplementationOnce(() => task.promise);
    const view = render(panel()); const oldRead = fetchMock.mock.calls[0][1] as RequestInit;
    session.actor = "other-member"; view.rerender(panel()); expect(oldRead.signal?.aborted).toBe(true);
    view.rerender(panel("other-member")); await screen.findByRole("button", { name: "每日签到" });
    await act(async () => task.resolve({ ok: true, json: async () => ({ ...me(), xp: 987654, ledger: [{ id: "old-private", note: "旧账号私密流水", reason: "CHECK_IN", amount: 999, createdAt: today.createdAt }] }) }));
    expect(screen.queryByText("旧账号私密流水")).not.toBeInTheDocument(); expect(screen.queryByText(/987,654/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "每日签到" })).toBeEnabled();
    for (const [, init] of fetchMock.mock.calls.slice(2)) expect(init.headers).toMatchObject({ "x-ans-actor": "other-member" });
  });
  it.each(["loading", "unauthenticated"])("session=%s 不请求或显示私密数据", status => {
    session.status = status; render(panel());
    expect(fetchMock).not.toHaveBeenCalled(); expect(screen.queryByRole("heading", { name: "我的社区成长" })).not.toBeInTheDocument();
  });
});


it("换号后迟到的奖励申诉回执不重新请求旧账号流水", async () => {
  fetchMock.mockImplementation(async (url: string) => ({ ok: true, json: async () => url.endsWith("/me") ? {
    ...me(), ledger: [{ id: "reward-a", note: "旧账号奖励", reason: "COMMUNITY_REWARD", amount: 30, createdAt: today.createdAt }],
  } : { top: [], me: { id: "self", nickname: "匿名同学", xp: 0, level: getLevelProgress(0), rank: 1 } } }));
  const view = render(panel()); fireEvent.click(await screen.findByRole("button", { name: "申请复核" }));
  fireEvent.change(screen.getByRole("textbox", { name: "申诉说明" }), { target: { value: "这条奖励记录存在需要管理员复核的问题。" } });
  const task = deferred(); fetchMock.mockImplementationOnce(() => task.promise);
  fireEvent.click(screen.getByRole("button", { name: "提交" }));
  const init = fetchMock.mock.calls.at(-1)![1] as RequestInit;
  expect(init.headers).toMatchObject({ "x-ans-actor": "self" });
  expect(JSON.parse(init.body as string)).toMatchObject({ ledgerId: "reward-a" });
  session.actor = "other-member"; view.rerender(panel());
  expect(screen.queryByText("旧账号奖励")).not.toBeInTheDocument();
  const count = fetchMock.mock.calls.length;
  await act(async () => task.resolve({ ok: true, json: async () => ({ ok: true, data: { id: "appeal-a" } }) }));
  expect(fetchMock).toHaveBeenCalledTimes(count); expect(screen.queryByText(/申诉已提交/)).not.toBeInTheDocument();
});


it("history-only mode retains ledger and leaderboard without another check-in control", async () => {
  render(<AccountContentBoundary actorId="self"><CommunityPanel actorId="self" showGrowth={false} /></AccountContentBoundary>);
  await screen.findByRole("table");
  expect(screen.queryByRole("button", { name: "\u6bcf\u65e5\u7b7e\u5230" })).not.toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "\u6211\u7684\u793e\u533a\u6210\u957f" })).not.toBeInTheDocument();
  expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(0);
});
