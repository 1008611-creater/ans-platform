import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DevelopersPage, { generateMetadata } from "@/app/developers/page";
import DevelopersPageContent from "@/components/developers/developers-page-content";

const { currentLocale, toolMounts } = vi.hoisted(() => ({
  currentLocale: { value: "zh" },
  toolMounts: { enhancer: 0, tokenizer: 0, builder: 0, embed: 0 },
}));
let desktop = true;
const viewportListeners = new Set<() => void>();

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
vi.mock("@/components/developers/prompt-enhancer", () => ({ PromptEnhancer: () => { toolMounts.enhancer += 1; return <div>Enhancer panel</div>; } }));
vi.mock("@/components/developers/prompt-tokenizer", () => ({ PromptTokenizer: () => { toolMounts.tokenizer += 1; return <div>Tokenizer panel</div>; } }));
vi.mock("@/components/ide/prompt-ide", () => ({ PromptIde: () => { toolMounts.builder += 1; return <div>Builder panel</div>; } }));
vi.mock("@/components/developers/embed-designer", () => ({ EmbedDesigner: () => { toolMounts.embed += 1; return <div>Embed panel</div>; } }));

const tabs = [
  ["enhancer", "提示词优化器"],
  ["tokenizer", "分词器"],
  ["builder", "Typed-Prompts IDE"],
  ["embed", "嵌入设计器"],
] as const;

describe("developers page", () => {
  beforeEach(() => {
    currentLocale.value = "zh";
    desktop = true;
    viewportListeners.clear();
    for (const key of Object.keys(toolMounts) as Array<keyof typeof toolMounts>) toolMounts[key] = 0;
    vi.stubGlobal("matchMedia", vi.fn(() => ({
      get matches() { return desktop; }, media: "(min-width: 1024px)",
      addEventListener: (_event: string, listener: () => void) => viewportListeners.add(listener),
      removeEventListener: (_event: string, listener: () => void) => viewportListeners.delete(listener),
    })));
    window.history.replaceState(null, "", "/developers");
  });

  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

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
    desktop = false;
    render(<DevelopersPageContent />);

    expect(screen.getByRole("heading", { name: "仅限桌面端" })).toBeInTheDocument();
    expect(screen.getByText(translations.zh.desktopOnlyDescription)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "浏览提示词" })).toHaveAttribute("href", "/prompts");
    expect(screen.getByRole("tablist").closest("[class*=\"lg:flex\"]")).toHaveClass("hidden", "lg:flex");
    expect(screen.getByRole("link", { name: "浏览提示词" }).closest("div")).toHaveClass("lg:hidden");
  });
  it("server-renders a real heading and tab shell without mounting heavy tools", () => {
    const html = renderToString(<DevelopersPageContent />);
    expect(html).toContain('role="tablist"');
    expect(html).toContain('class="sr-only"');
    expect(Object.values(toolMounts).every(count => count === 0)).toBe(true);
    expect(html).not.toContain("Builder panel");
  });

  it("does not mount any heavy editor on a mobile builder deep link", async () => {
    desktop = false;
    window.history.replaceState(null, "", "/developers#builder");
    render(<DevelopersPageContent />);
    await waitFor(() => expect(screen.getByRole("tab", { name: "Typed-Prompts IDE" })).toHaveAttribute("aria-selected", "true"));
    expect(Object.values(toolMounts).every(count => count === 0)).toBe(true);
    expect(screen.queryByText("Builder panel")).not.toBeInTheDocument();
  });

  it("mounts the selected tool on desktop and releases it when viewport becomes mobile", async () => {
    window.history.replaceState(null, "", "/developers#builder");
    render(<DevelopersPageContent />);
    await screen.findByText("Builder panel");
    act(() => { desktop = false; viewportListeners.forEach(listener => listener()); });
    expect(screen.queryByText("Builder panel")).not.toBeInTheDocument();
    act(() => { desktop = true; viewportListeners.forEach(listener => listener()); });
    await screen.findByText("Builder panel");
  });

  it("retains visible focus styles and keyboard tab navigation", async () => {
    const user = userEvent.setup();
    render(<DevelopersPageContent />);
    const first = screen.getAllByRole("tab")[0];
    first.focus();
    for (const tab of screen.getAllByRole("tab")) {
      expect(tab).toHaveClass("focus-visible:ring-2", "focus-visible:ring-primary", "focus-visible:ring-inset");
      expect(tab).not.toHaveClass("focus-visible:ring-0");
    }
    await user.keyboard("{ArrowRight}");
    await waitFor(() => expect(screen.getAllByRole("tab")[1]).toHaveFocus());
    expect(window.location.hash).toBe("#tokenizer");
  });

  it("unsubscribes viewport callbacks on unmount", () => {
    const view = render(<DevelopersPageContent />);
    expect(viewportListeners.size).toBe(1);
    view.unmount();
    expect(viewportListeners.size).toBe(0);
  });

});
