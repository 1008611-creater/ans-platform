import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import zh from "../../../messages/learning/zh.json";
import en from "../../../messages/learning/en.json";

const state = vi.hoisted(() => ({ pathname: "/", user: null as null | { username: string } }));
vi.mock("next/navigation", () => ({ usePathname: () => state.pathname }));
vi.mock("next-auth/react", () => ({ useSession: () => ({ data: state.user ? { user: state.user } : null }) }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }));
vi.mock("@/components/homepage/homepage-cta-link", () => ({
  HomepageCtaLink: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import HomePage from "@/app/page";

describe("first-release learning entry points", () => {
  beforeEach(() => { state.pathname = "/"; state.user = null; });

  it("keeps mobile primary navigation on learning, practice and results", () => {
    render(<MobileTabBar />);
    expect(screen.getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual([
      "/#first-lesson", "/projects#new-project", "/projects", "/login",
    ]);
    expect(screen.getByRole("link", { name: "learning.navLearn" })).toHaveAttribute("aria-current", "page");
  });

  it("marks project results active and preserves account access", () => {
    state.pathname = "/projects/project-1";
    state.user = { username: "learner" };
    render(<MobileTabBar />);
    expect(screen.getByRole("link", { name: "learning.navProjects" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "learning.account" })).toHaveAttribute("href", "/@learner");
  });

  it("offers one project start path, a marked lesson, and retained supporting libraries", async () => {
    const { container } = render(await HomePage());
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("heroTitle");
    for (const link of screen.getAllByRole("link", { name: "start" })) {
      expect(link).toHaveAttribute("href", "/projects#new-project");
    }
    expect(screen.getByRole("link", { name: "viewLesson" })).toHaveAttribute("href", "#first-lesson");
    expect(container.querySelector("#first-lesson")).toHaveTextContent("lessonDescription");
    for (const key of ["prompts", "templates", "workflows"]) {
      expect(screen.getByRole("link", { name: key })).toHaveAttribute("href", `/${key}`);
    }
  });

  it("keeps Chinese and English learning keys and placeholders aligned", () => {
    expect(Object.keys(zh).sort()).toEqual(Object.keys(en).sort());
    for (const key of Object.keys(zh) as Array<keyof typeof zh>) {
      expect(zh[key]).not.toContain("????");
      expect(en[key]).not.toBe("");
      expect(zh[key].match(/\{\w+\}/g) ?? []).toEqual(en[key].match(/\{\w+\}/g) ?? []);
    }
  });
});
