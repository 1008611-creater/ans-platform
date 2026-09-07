import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CommunityPanel } from "@/components/community/community-panel";
import { getLevelProgress } from "@/lib/level";

const fetchMock = vi.fn();
let checked: boolean;
let failRead: boolean;
const today = { id: "c1", day: "2026-09-08", streak: 1, xpAwarded: 5, createdAt: "2026-09-08T00:00:00Z" };
const me = () => ({ xp: checked ? 5 : 0, level: getLevelProgress(checked ? 5 : 0), checkInStreak: checked ? 1 : 0, todayCheckIn: checked ? today : null, ledger: checked ? [{ id: "l1", amount: 5, reason: "CHECK_IN", note: "每日签到", createdAt: today.createdAt }] : [] });

beforeEach(() => {
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
    render(<CommunityPanel />);
    const button = await screen.findByRole("button", { name: "每日签到" });
    expect(button).toBeEnabled();
    expect(screen.getByText(/0 级即可提交模板/)).toBeInTheDocument();
    expect(screen.getByText(/管理权限始终由管理员独立授权/)).toBeInTheDocument();
    fireEvent.click(button);
    await waitFor(() => expect(screen.getByRole("button", { name: "今日已签到" })).toBeDisabled());
    expect(screen.getByText("+5 XP")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "最近经验流水" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "贡献榜" })).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/community/check-in", expect.objectContaining({ method: "POST" }));
  });

  it("已有签到记录时不允许再次点击", async () => {
    checked = true;
    render(<CommunityPanel />);
    expect(await screen.findByRole("button", { name: "今日已签到" })).toBeDisabled();
    expect(fetchMock.mock.calls.every(([, init]) => init?.method !== "POST")).toBe(true);
  });

  it("加载失败显示可恢复错误，重试后正常渲染", async () => {
    failRead = true;
    render(<CommunityPanel />);
    expect(await screen.findByRole("alert")).toHaveTextContent("社区数据加载失败");
    failRead = false;
    fireEvent.click(screen.getByRole("button", { name: "重试" }));
    expect(await screen.findByRole("button", { name: "每日签到" })).toBeEnabled();
  });

  it("签到请求处理中禁用按钮，避免连续提交", async () => {
    render(<CommunityPanel />);
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
    render(<CommunityPanel />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/邮箱已验证/);
    expect(screen.queryByRole("button", { name: "每日签到" })).not.toBeInTheDocument();
  });
});
