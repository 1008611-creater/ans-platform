import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DevelopersPage, { generateMetadata } from "@/app/developers/page";
import DevelopersPageContent from "@/components/developers/developers-page-content";

const { currentLocale } = vi.hoisted(() => ({ currentLocale: { value: "zh" } }));

const translations = {
  zh: {
    title: "开发者",
    description: "使用提示词优化器、分词器、构建器和嵌入设计器开发 AI 工具。",
    promptEnhancer: "提示词优化器",
    promptTokenizer: "分词器",
    promptBuilder: "Typed-Prompts IDE",
    embedDesigner: "嵌入设计器",
    desktopOnly: "仅限桌面端",
    desktopOnlyDescription: "开发者工具需要更大的屏幕。请在台式机或笔记本电脑上打开此页面。",
    browsePrompts: "浏览提示词",
  },
  en: {
    title: "Developers",
    description: "Build AI tools with the prompt enhancer, tokenizer, builder, and embed designer.",
    promptEnhancer: "Prompt Enhancer",
    promptTokenizer: "Tokenizer",
    promptBuilder: "Typed-Prompts IDE",
    embedDesigner: "Embed Designer",
    desktopOnly: "Desktop Only",
    desktopOnlyDescription: "Developer tools require a larger screen. Please open this page on a desktop or laptop computer.",
    browsePrompts: "Browse Prompts",
  },
} as const;

function translate(key: string) {
  const localeTranslations = translations[currentLocale.value as keyof typeof translations] ?? translations.en;
  return localeTranslations[key as keyof typeof translations.en] ?? key;
}

vi.mock("next-intl", () => ({ useTranslations: () => translate }));
vi.mock("next-intl/server", () => ({
  getLocale: async () => currentLocale.value,
  getTranslations: async (options: string | { locale?: string }) => {
    const locale = typeof options === "string" ? currentLocale.value : options.locale ?? currentLocale.value;
    return (key: string) => {
      const localeTranslations = translations[locale as keyof typeof translations] ?? translations.en;
      return localeTranslations[key as keyof typeof translations.en] ?? translations.en[key as keyof typeof translations.en] ?? key;
    };
  },
}));
vi.mock("@/components/developers/prompt-enhancer", () => ({ PromptEnhancer: () => <div>Enhancer panel</div> }));
vi.mock("@/components/developers/prompt-tokenizer", () => ({ PromptTokenizer: () => <div>Tokenizer panel</div> }));
vi.mock("@/components/ide/prompt-ide", () => ({ PromptIde: () => <div>Builder panel</div> }));
vi.mock("@/components/developers/embed-designer", () => ({ EmbedDesigner: () => <div>Embed panel</div> }));

const tabs = [
  ["enhancer", "提示词优化器"],
  ["tokenizer", "分词器"],
  ["builder", "Typed-Prompts IDE"],
  ["embed", "嵌入设计器"],
] as const;

describe("developers page", () => {
  beforeEach(() => {
    currentLocale.value = "zh";
    window.history.replaceState(null, "", "/developers");
  });

  afterEach(() => cleanup());

  it.each([
    ["zh", "开发者", translations.zh.description],
    ["en", "Developers", translations.en.description],
  ])("builds localized metadata for %s without duplicating the site name", async (locale, title, description) => {
    currentLocale.value = locale;

    await expect(generateMetadata()).resolves.toMatchObject({ title, description });
  });

  it("renders the page heading and tabs immediately while hydration starts", () => {
    render(<DevelopersPage />);

    expect(screen.getByRole("heading", { level: 1, name: "开发者" })).toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(4);
  });

  it.each(tabs)("opens the %s tab from its initial hash", async (tab, label) => {
    window.history.replaceState(null, "", `/developers#${tab}`);
    render(<DevelopersPageContent />);

    await waitFor(() => expect(screen.getByRole("tab", { name: label })).toHaveAttribute("aria-selected", "true"));
  });

  it.each(tabs)("updates the hash when switching to %s", async (tab, label) => {
    if (tab === "enhancer") window.history.replaceState(null, "", "/developers#tokenizer");
    const user = userEvent.setup();
    render(<DevelopersPageContent />);
    const previouslyActiveLabel = tab === "enhancer" ? "分词器" : "提示词优化器";
    await waitFor(() => expect(screen.getByRole("tab", { name: previouslyActiveLabel })).toHaveAttribute("aria-selected", "true"));

    await user.click(screen.getByRole("tab", { name: label }));

    await waitFor(() => expect(window.location.hash).toBe(`#${tab}`));
    expect(screen.getByRole("tab", { name: label })).toHaveAttribute("aria-selected", "true");
  });

  it("falls back to the enhancer tab for an unknown initial hash", async () => {
    window.history.replaceState(null, "", "/developers#unknown-tool");
    render(<DevelopersPageContent />);

    await waitFor(() => expect(screen.getByRole("tab", { name: "提示词优化器" })).toHaveAttribute("aria-selected", "true"));
  });

  it("falls back to the enhancer tab when a valid tab changes to an unknown hash", async () => {
    window.history.replaceState(null, "", "/developers#embed");
    render(<DevelopersPageContent />);
    const embed = screen.getByRole("tab", { name: "嵌入设计器" });
    await waitFor(() => expect(embed).toHaveAttribute("aria-selected", "true"));

    window.history.replaceState(null, "", "/developers#also-unknown");
    fireEvent(window, new HashChangeEvent("hashchange"));

    await waitFor(() => expect(screen.getByRole("tab", { name: "提示词优化器" })).toHaveAttribute("aria-selected", "true"));
  });

  it("shows a translated desktop limit message and prompt entry on mobile", () => {
    render(<DevelopersPageContent />);

    expect(screen.getByRole("heading", { name: "仅限桌面端" })).toBeInTheDocument();
    expect(screen.getByText(translations.zh.desktopOnlyDescription)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "浏览提示词" })).toHaveAttribute("href", "/prompts");
    expect(screen.getByRole("tablist").closest("[class*=\"lg:flex\"]")).toHaveClass("hidden", "lg:flex");
    expect(screen.getByRole("link", { name: "浏览提示词" }).closest("div")).toHaveClass("lg:hidden");
  });
});