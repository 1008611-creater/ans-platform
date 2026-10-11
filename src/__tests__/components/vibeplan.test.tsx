import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { VibePlan } from "@/components/workspace/vibeplan";
import { getPlanSalesReadiness } from "@/server/billing/plan-readiness";
import zh from "../../../messages/product/zh.json";
import en from "../../../messages/product/en.json";

vi.unmock("next-intl");

afterEach(cleanup);
function mount(locale: "zh" | "en" = "zh") {
  return render(<NextIntlClientProvider locale={locale} messages={{ product: locale === "zh" ? zh : en }} timeZone="Asia/Shanghai"><VibePlan readiness={getPlanSalesReadiness()} /></NextIntlClientProvider>);
}

describe("approved VibePlan terms and closed sales", () => {
  it("defaults to monthly with exact approved Plan and Pro prices, without enabling checkout", () => {
    mount();
    expect(screen.getByRole("tab", { name: "月卡" })).toHaveAttribute("aria-selected", "true");
    const plan = screen.getByRole("article", { name: "VibePlan" });
    const pro = screen.getByRole("article", { name: "VibePlan Pro" });
    expect(within(plan).getByText("¥49")).toBeVisible();
    expect(within(plan).getByText("含 300 算力积分")).toBeVisible();
    expect(within(pro).getByText("¥129")).toBeVisible();
    expect(within(pro).getByText("含 800 算力积分")).toBeVisible();
    expect(screen.getAllByRole("button", { name: "开放筹备中" })).toHaveLength(2);
    screen.getAllByRole("button", { name: "开放筹备中" }).forEach(button => expect(button).toBeDisabled());
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.getByRole("link", { name: "前往积分中心" })).toHaveAttribute("href", "/workspace/credits");
  });
  it("switches to weekly and quarterly with exact totals and grant timing", async () => {
    const user = userEvent.setup(); mount();
    await user.click(screen.getByRole("tab", { name: "周卡" }));
    expect(within(screen.getByRole("article", { name: "VibePlan" })).getByText("¥19")).toBeVisible();
    expect(screen.getByText("含 100 算力积分")).toBeVisible();
    expect(screen.getAllByText("开通发放一次，积分有效 14 天。")).toHaveLength(2);
    await user.click(screen.getByRole("tab", { name: "季卡" }));
    expect(screen.getAllByRole("tabpanel")).toHaveLength(1);
    expect(within(screen.getByRole("article", { name: "VibePlan" })).getByText("¥129")).toBeVisible();
    expect(within(screen.getByRole("article", { name: "VibePlan Pro" })).getByText("¥329")).toBeVisible();
    expect(screen.getByText("含 900 算力积分")).toBeVisible();
    expect(screen.getByText("含 2,400 算力积分")).toBeVisible();
    expect(screen.getByText("开通、第30天、第60天各发放 800 积分，每批有效60天。")).toBeVisible();
  });
  it("supports keyboard period navigation and one visible panel", async () => {
    const user = userEvent.setup(); mount();
    screen.getByRole("tab", { name: "月卡" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "季卡" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getAllByRole("tabpanel")).toHaveLength(1);
  });
  it("labels comparison as targets, states fixed value and shows source-backed sale blockers", () => {
    mount();
    expect(screen.getByText(/下表为规划对比/)).toBeVisible();
    expect(screen.getByText("固定 ¥1 = 10 积分，1 积分 = ¥0.10。")).toBeVisible();
    expect(screen.getByText("链动小铺套餐商品与履约核验")).toBeVisible();
    expect(screen.getByText("原渠道退款与兑换撤销")).toBeVisible();
    const rows = within(screen.getByRole("table")).getAllByRole("row");
    expect(rows).toHaveLength(9);
    expect(within(rows[3]).getAllByRole("cell").map(cell => cell.textContent)).toEqual(["5 个", "30 个", "100 个"]);
  });
  it("renders aligned English copy without claiming present membership benefits", () => {
    mount("en");
    expect(screen.getByRole("tab", { name: "Monthly" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Includes 800 compute points")).toBeVisible();
    expect(screen.getByText("Planned: batch execution and version branches")).toBeVisible();
    expect(screen.getAllByRole("button", { name: "Preparing to open" })).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Open points center" })).toHaveAttribute("href", "/workspace/credits");
  });
});
