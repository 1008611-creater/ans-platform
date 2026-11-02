import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createTranslator } from "use-intl/core";
import product from "../../../messages/product/zh.json";
import type { ModelPlazaCatalog } from "@/lib/model-plaza";
import { ModelPlaza } from "@/components/workspace/model-plaza";

vi.mock("next-intl", () => ({ useLocale: () => "zh", useTranslations: () => createTranslator({ locale: "zh", messages: { product }, namespace: "product.modelPlaza" }) }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const catalog: ModelPlazaCatalog = {
  sourceUrl: "https://apic.cauai.fun/pricing", observedAt: "2026-10-16T02:00:00Z", pricingVersion: "fixture-public", referenceDate: "2026-10-16", state: "current",
  billing: { pointsPerCny: 10, usdCny: null, fxSource: null, fxAsOf: null },
  models: [
    { id: "deepseek-v4.1-flash", name: "DeepSeek V4.1 Flash", vendor: "DeepSeek", endpoints: ["chat/completions"], pricingType: "tokens", status: "listed", consumptionMultiplier: 1, pointsPerMillion: null, usdPerMillion: { input: 0.3, output: 1.2, cacheRead: 0.006, cacheWrite5m: null, cacheWrite1h: null, source: "apic", sourceUrl: "https://apic.cauai.fun/pricing" } },
    { id: "gpt-6.1-sol", name: "GPT-6.1 Sol", vendor: "OpenAI", endpoints: ["responses"], pricingType: "tokens", status: "not-listed", consumptionMultiplier: 0.16, pointsPerMillion: null, usdPerMillion: { input: 2, output: 10, cacheRead: 0.1, cacheWrite: 2.5, cacheWrite5m: null, cacheWrite1h: null, source: "official", sourceUrl: "https://developers.openai.com/api/docs/models/gpt-6.1-sol" } },
    { id: "claude-opus-5-5", name: "Claude Opus 5.5", vendor: "Anthropic", endpoints: ["messages"], pricingType: "tokens", status: "prepared", consumptionMultiplier: 1, pointsPerMillion: null, usdPerMillion: { input: 4, output: 20, cacheRead: 0.2, cacheWrite5m: 5, cacheWrite1h: 8, source: "official", sourceUrl: "https://platform.claude.com/docs/en/about-claude/pricing" } },
  ],
};
function page(data = catalog) { return render(<ModelPlaza catalog={data} />); }
describe("model plaza", () => {
  it("shows verified public prices without claiming registered models are available", () => {
    page();
    expect(screen.getByText("$0.3")).toBeVisible(); expect(screen.getByText("$1.2")).toBeVisible(); expect(screen.getByText("$0.006")).toBeVisible();
    expect(screen.getByText("$2.5")).toBeVisible();
    expect(screen.getByText("缓存写入", { exact: true })).toBeVisible();
    expect(screen.getByText(/官方参考标价核对日期：2026-10-16/)).toBeVisible();
    expect(screen.getByText("当前未公开", { selector: "span" })).toBeVisible(); expect(screen.getByText("准备中 · 默认关闭", { selector: "span" })).toBeVisible();
    expect(screen.getByText(/目录已发布不代表实时调用成功/)).toBeVisible();
    expect(screen.getAllByText("官方美元参考标价")).toHaveLength(2);
    expect(screen.getByText(/不包含超过 272K 上下文/)).toBeVisible();
    expect(screen.getByRole("link", { name: "返回算力中心" })).toHaveAttribute("href", "/workspace/credits");
  });
  it("combines search and real metadata filters and recovers an empty search", () => {
    page(); fireEvent.change(screen.getByLabelText("供应商"), { target: { value: "DeepSeek" } });
    expect(screen.queryByText("GPT-6.1 Sol")).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: /搜索模型/ }), { target: { value: "missing" } });
    expect(screen.getByText("没有符合条件的模型")).toBeVisible();
    fireEvent.click(screen.getAllByRole("button", { name: "清除筛选" })[1]);
    expect(screen.getByText("GPT-6.1 Sol")).toBeVisible();
  });
  it("switches token units and refuses to invent a credit quote without exchange pricing", () => {
    page(); fireEvent.change(screen.getByLabelText("Token 单位"), { target: { value: "thousand" } });
    expect(screen.getByText("$0.0003")).toBeVisible();
    fireEvent.change(screen.getByLabelText("价格显示"), { target: { value: "points" } });
    expect(screen.queryByText("$0.0003")).not.toBeInTheDocument();
    expect(screen.getByText(/积分价格需要完整/)).toBeVisible();
    expect(screen.getAllByText("未配置").length).toBeGreaterThan(0);
  });
  it("offers an accessible table and keyboard dialog with model-specific disclosure", async () => {
    page(); fireEvent.click(screen.getByRole("button", { name: "表格视图" }));
    expect(screen.getByRole("region", { name: "可横向滚动的模型价格表" })).toHaveAttribute("tabindex", "0");
    const opener = screen.getByRole("button", { name: "查看 Claude Opus 5.5 的模型详情" });
    opener.focus(); fireEvent.click(opener);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/接入方案准备中，默认关闭/)).toBeVisible();
    expect(within(dialog).getByRole("link", { name: "查看客户端接入设置" })).toHaveAttribute("href", "/settings#api-key");
    expect(within(dialog).getByRole("button", { name: "关闭详情" })).toBeVisible();
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(opener).toHaveFocus();
  });
  it("awaits clipboard success and reports failure honestly", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied")); Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    page(); fireEvent.click(screen.getByRole("button", { name: "复制模型 ID：deepseek-v4.1-flash" }));
    expect(await screen.findByText(/复制未成功/)).toBeVisible(); expect(writeText).toHaveBeenCalledWith("deepseek-v4.1-flash");
    writeText.mockResolvedValue(undefined); fireEvent.click(screen.getByRole("button", { name: "复制模型 ID：deepseek-v4.1-flash" }));
    expect(await screen.findByText("已复制 deepseek-v4.1-flash")).toBeVisible();
  });
  it("filters protocols and directory states, then sorts by the displayed input price", () => {
    const { container } = page();
    fireEvent.change(screen.getByLabelText("接入协议"), { target: { value: "messages" } });
    expect(screen.getByText("Claude Opus 5.5")).toBeVisible();
    expect(screen.queryByText("DeepSeek V4.1 Flash")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("接入协议"), { target: { value: "all" } });
    fireEvent.change(screen.getByLabelText("目录状态"), { target: { value: "listed" } });
    expect(screen.getByText("DeepSeek V4.1 Flash")).toBeVisible();
    expect(screen.queryByText("GPT-6.1 Sol")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("目录状态"), { target: { value: "all" } });
    fireEvent.change(screen.getByLabelText("排序"), { target: { value: "input" } });
    expect(container.querySelector("article h2")?.textContent).toBe("DeepSeek V4.1 Flash");
  });
  it("keeps a failed directory read distinct from a current empty catalog", () => {
    page({ ...catalog, state: "unavailable", models: [] });
    expect(screen.getByRole("alert")).toHaveTextContent("公开目录暂时无法读取"); expect(screen.getByText("没有符合条件的模型")).toBeVisible();
  });
});