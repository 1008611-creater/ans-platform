import { afterEach, describe, expect, it, vi } from "vitest";
import { createTranslator } from "use-intl/core";
import { cleanup, render, screen, within } from "@testing-library/react";
import zh from "../../../messages/product/zh.json";
import { ComputeHistory } from "@/components/workspace/compute-history";
import type { ComputeHistory as History } from "@/server/compute/member-history";

vi.mock("next-intl/server", () => ({
  getTranslations: async () => createTranslator({ locale: "zh", messages: zh, namespace: "computeHistory" }),
  getLocale: async () => "zh",
}));
vi.mock("next/link", () => ({ default: ({ prefetch: _prefetch, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { prefetch?: boolean }) => {
  void _prefetch; return <a {...props} />;
} }));
afterEach(cleanup);
const baseTask = { taskId: "compute-fixture-0001", modelId: "fixture/model", revision: 2, authorizedPoints: 100,
  maxUnits: 1000, unit: "token" as const, policyVersion: "fixture-policy", createdAt: "2026-10-09T00:00:00.000Z", startedAt: "2026-10-09T00:01:00.000Z" };
const summary = { availablePoints: 900, reservedPoints: 100, consumedPoints: 70, refundedPoints: 130, taskCount: 30 };
const uncertain = { ...baseTask, state: "UNCERTAIN" as const, settledPoints: null, refundedPoints: 0, units: null, outcome: null, finishedAt: null };
function history(tasks: History["tasks"], nextCursor: string | null = null): History { return { tasks, summary, nextCursor }; }

describe("member compute statements", () => {
  it("keeps uncertain tasks reserved and never presents unknown usage as zero or a refund", async () => {
    render(await ComputeHistory({ history: history([uncertain]), filter: "active", paged: false }));
    expect(screen.getByText("待核对")).toBeInTheDocument();
    expect(screen.getByText(/执行结果或用量还未核实/)).toBeInTheDocument();
    const row = within(screen.getByRole("listitem"));
    expect(row.getByText("实际消耗").nextElementSibling?.textContent).toBe("尚未确认");
    expect(row.getByText("已退回").nextElementSibling?.textContent).toBe("0 点");
    expect(screen.getByText(/包含本账号全部 30 个/)).toBeInTheDocument();
    expect(screen.getByText("70 点")).toBeInTheDocument();
  });
  it("shows consumed partial or failed work as settled and exposes the returned remainder separately", async () => {
    const settled = { ...baseTask, state: "SETTLED" as const, settledPoints: 70, refundedPoints: 30, units: 700,
      outcome: "failed" as const, finishedAt: "2026-10-09T00:02:00.000Z" };
    render(await ComputeHistory({ history: history([settled]), filter: "settled", paged: false }));
    const row = within(screen.getByRole("listitem"));
    expect(row.getByText("已结算")).toBeInTheDocument();
    expect(row.getByText("执行失败（按实际用量结算）")).toBeInTheDocument();
    expect(row.getByText("实际消耗").nextElementSibling?.textContent).toBe("70 点");
    expect(row.getByText("已退回").nextElementSibling?.textContent).toBe("30 点");
    expect(row.getByText("700 Token")).toBeInTheDocument();
  });
  it("does not present settled supplier success as confirmed file delivery", async () => {
    const settled = { ...baseTask, state: "SETTLED" as const, settledPoints: 70, refundedPoints: 30, units: 700,
      outcome: "succeeded" as const, finishedAt: "2026-10-09T00:02:00.000Z" };
    render(await ComputeHistory({ history: history([settled]), filter: "settled", paged: false }));
    expect(screen.getByText("上游执行成功")).toBeInTheDocument();
    expect(screen.queryByText("已完成")).not.toBeInTheDocument();
    expect(screen.getByText(/不确认文件已保存或可领取/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "查看工作台作品" })).toHaveAttribute("href", "/workflows/toonflow");
  });
  it("shows verified unused release as zero consumed, not unknown usage", async () => {
    const released = { ...baseTask, state: "RELEASED" as const, settledPoints: 0, refundedPoints: 100, units: null,
      outcome: null, finishedAt: "2026-10-09T00:02:00.000Z" };
    render(await ComputeHistory({ history: history([released]), filter: "released", paged: false }));
    const row = within(screen.getByRole("listitem"));
    expect(row.getByText("实际消耗").nextElementSibling?.textContent).toBe("0 点");
    expect(row.getAllByText("已确认未产生用量")).toHaveLength(2);
    expect(row.queryByText("尚未确认")).not.toBeInTheDocument();
  });
  it("resets pagination when changing filters and preserves filter on older pages", async () => {
    render(await ComputeHistory({ history: history([uncertain], "cursor:page2"), filter: "active", paged: true }));
    expect(screen.getByRole("link", { name: "预占中" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "已结算" })).toHaveAttribute("href", "/workspace/compute?filter=settled");
    expect(screen.getByRole("link", { name: "查看更早账单" })).toHaveAttribute("href", "/workspace/compute?filter=active&cursor=cursor%3Apage2");
    expect(screen.getByRole("link", { name: "返回最新账单" })).toHaveAttribute("href", "/workspace/compute?filter=active");
  });
  it("distinguishes a new account's empty history from empty filtered pages without hiding totals", async () => {
    render(await ComputeHistory({ history: history([]), filter: "released", paged: true }));
    expect(screen.getByText("当前页没有符合条件的账单")).toBeInTheDocument();
    expect(screen.queryByText("还没有 AIGC 工作台账单")).not.toBeInTheDocument();
    expect(screen.getByText("900")).toBeInTheDocument();
  });
});
