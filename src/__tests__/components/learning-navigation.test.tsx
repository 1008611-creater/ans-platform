import { render, screen } from "@testing-library/react";
import Link from "next/link";
import { beforeEach, describe, expect, it, vi } from "vitest";
import zh from "../../../messages/learning/zh.json";
import en from "../../../messages/learning/en.json";

vi.mock("@/server/catalog/service", async () => {
  const { CATALOG_PROJECTS } = await import("@/domain/catalog/projects");
  return { listPublishedCatalog: async () => CATALOG_PROJECTS };
});
const state = vi.hoisted(() => ({ pathname: "/", user: null as null | { username: string } }));
vi.mock("next/navigation", () => ({ usePathname: () => state.pathname }));
vi.mock("next-auth/react", () => ({ useSession: () => ({ data: state.user ? { user: state.user } : null }) }));
vi.mock("@/components/providers/route-messages", () => ({ RouteMessages: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("next-intl/server", () => ({ getLocale: async () => "zh", getTranslations: async () => (key: string) => key }));
vi.mock("@/components/catalog/project-card", () => ({ ProjectCard: ({ project }: { project: { slug: string } }) => <article><Link href={`/explore/${project.slug}`}>{project.slug}</Link></article> }));
vi.mock("@/components/catalog/project-preview", () => ({ ProjectPreview: () => <div data-testid="project-preview" /> }));
vi.mock("@/components/homepage/project-coverflow", () => ({ ProjectCoverflow: ({ projects }: { projects: { href: string; title: string }[] }) => <Link data-testid="project-coverflow" href={projects[0].href}>{projects[0].title}</Link> }));
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import HomePage from "@/app/page";
import ExplorePage from "@/app/explore/page";
import { CATALOG_PROJECTS } from "@/domain/catalog/projects";
import { CATALOG_PAGE_SIZE } from "@/domain/catalog/browse";

describe("product discovery entry points", () => {
  beforeEach(() => { state.pathname = "/"; state.user = null; });

  it("uses the six requested primary destinations on mobile", () => {
    render(<MobileTabBar />);
    expect(screen.getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual([
      "/explore", "/hubs", "/community", "/competitions", "/market", "/workspace",
    ]);
    expect(screen.getByRole("link", { name: "nav.explore" })).toHaveAttribute("aria-current", "page");
  });

  it("highlights workspace for private project results without linking individual projects", () => {
    state.pathname = "/projects/project-1";
    state.user = { username: "learner" };
    render(<MobileTabBar />);
    expect(screen.getByRole("link", { name: "nav.workspace" })).toHaveAttribute("aria-current", "page");
    expect(screen.getAllByRole("link")).toHaveLength(6);
    expect(screen.queryByRole("link", { name: /project-1/ })).toBeNull();
  });

  it("offers a complete paged project directory without workflow or promotional sections", async () => {
    render(await HomePage({}));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("home.title");
    expect(screen.queryByRole("link", { name: /exploreAction/ })).toBeNull();
    expect(screen.queryByRole("link", { name: "workflowAction" })).toBeNull();
    expect(screen.getByRole("link", { name: "realProject.submit" })).toHaveAttribute("href", "/explore/submit");
    expect(screen.queryByRole("link", { name: "communityAction" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "workflowTitle" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "stepsTitle" })).toBeNull();
    expect(document.querySelectorAll("article")).toHaveLength(Math.min(CATALOG_PROJECTS.length, CATALOG_PAGE_SIZE));
    expect(screen.getByRole("link", { name: /categories.aigc/ })).toHaveAttribute("href", "/?category=aigc#home-projects-title");
    expect(screen.getByRole("link", { name: "liu-resume" })).toHaveAttribute("href", "/explore/liu-resume");
  });

  it("keeps category selection in the homepage directory and resets paging", async () => {
    render(await HomePage({ searchParams: Promise.resolve({ category: "aigc", page: "999" }) }));
    const expected = CATALOG_PROJECTS.filter(project => project.category === "aigc");
    expect(screen.getByRole("link", { name: /categories.aigc/ })).toHaveAttribute("aria-current", "page");
    expect(document.querySelectorAll("article")).toHaveLength(expected.length % CATALOG_PAGE_SIZE || CATALOG_PAGE_SIZE);
    expect(screen.getByRole("link", { name: /categories.web/ }).getAttribute("href")).not.toContain("page=");
  });

  it("keeps explore as a project-only directory and retains filtered paging links", async () => {
    render(await ExplorePage({ searchParams: Promise.resolve({ page: "2", source: "github" }) }));
    const heading = screen.getByRole("heading", { level: 1 });
    // 权威 A-PLAZA-02：页面名只允许出现在 h1 的 sr-only 前缀里，可见标题必须是品牌主标题。
    const accessiblePrefix = heading.querySelector(".sr-only");
    expect(accessiblePrefix?.textContent).toContain("nav.explore");
    expect(heading).not.toHaveClass("sr-only");
    expect(heading.textContent?.replace(accessiblePrefix?.textContent ?? "", "").trim()).toBe("home.title");
    // 权威 A-PLAZA-01：项目广场必须把公开项目交给轮转封面组件。
    expect(screen.getByTestId("project-coverflow")).toBeTruthy();
    expect(screen.getByRole("link", { name: "realProject.submit" })).toHaveAttribute("href", "/explore/submit");
    expect(screen.queryByRole("link", { name: "market.browse" })).toBeNull();
    expect(screen.queryByRole("link", { name: "market.creator" })).toBeNull();
    for (const link of screen.getAllByRole("link", { name: /categories./ })) expect(link.getAttribute("href")).toContain("source=github");
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
