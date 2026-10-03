import React from "react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TemplateFilters } from "@/components/templates/template-filters";
import { CopyTemplatePrompt, TemplateActions } from "@/components/templates/template-actions";
import { TemplateReviewStatus } from "@/components/templates/template-review-status";
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => ({
  searchLabel: "searchLabel", searchPlaceholder: "searchPlaceholder", domain: "domain", scene: "scene",
  allDomains: "allDomains", allScenes: "allScenes", filter: "filter", clear: "clear",
  copyPrompt: "copyPrompt", promptCopied: "promptCopied", copyFailed: "copyFailed",
}[key] ?? key) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock("next/link", () => ({ default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a> }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("模板中文交互", () => {
  it("切换父领域自动清空旧子场景并展示新场景", () => {
    render(<TemplateFilters initialDomain="writing" initialScene="summary" domains={[
      { id: "d1", slug: "writing", name: "写作", children: [{ id: "s1", slug: "summary", name: "摘要" }] },
      { id: "d2", slug: "design", name: "设计", children: [{ id: "s2", slug: "cover", name: "封面" }] },
    ]} />);
    expect(screen.getAllByRole("combobox")[1]).toHaveValue("summary");
    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "design" } });
    expect(screen.getAllByRole("combobox")[1]).toHaveValue("");
    expect(screen.queryByRole("option", { name: "摘要" })).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: "封面" })).toBeInTheDocument();
  });
  it("复制原始正文而不是伪运行", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<CopyTemplatePrompt prompt="请总结 {{text}}" />);
    fireEvent.click(screen.getByRole("button", { name: "copyPrompt" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("promptCopied"));
    expect(writeText).toHaveBeenCalledWith("请总结 {{text}}");
    expect(screen.queryByRole("button", { name: /运行/ })).not.toBeInTheDocument();
  });
  it("AI未通过禁用发布但允许填理由驳回", () => {
    render(<TemplateActions id="t" mode="review" canPublish={false} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "补充说明" } });
    expect(screen.getByRole("button", { name: "复核通过并发布" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "驳回" })).toBeEnabled();
  });
  it("自审不展示审核操作", () => {
    render(<TemplateActions id="t" mode="review" canPublish selfReview />);
    expect(screen.getByText(/不能自审/)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
  it("展示驳回理由，作为文本而不是HTML", () => {
    render(<TemplateReviewStatus status="REJECTED" reviewScore={{ verdict: "BLOCKED", reason: "说明不完整" }} reviewNote="<script>说明缺失</script>" />);
    expect(screen.getByText(/驳回理由/)).toHaveTextContent("<script>说明缺失</script>");
    expect(document.querySelector("script")).toBeNull();
  });
});
