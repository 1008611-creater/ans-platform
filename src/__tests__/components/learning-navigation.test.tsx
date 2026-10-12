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
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }));
vi.mock("@/components/homepage/homepage-cta-link", () => ({
  HomepageCtaLink: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock("@/components/catalog/project-card", () => ({ ProjectCard: ({ project }: { project: { slug: string } }) => <a href={`/explore/${project.slug}`}>{project.slug}</a> }));
vi.mock("@/components/catalog/official-workflows", () => ({ OfficialWorkflows: () => <Link href="/workflows/toonflow">Toonflow</Link> }));
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import HomePage from "@/app/page";

describe("product discovery entry points", () => {
  beforeEach(() => { state.pathname = "/"; state.user = null; });

  it("uses the same six primary destinations on mobile", () => {
    render(<MobileTabBar />);
    expect(screen.getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual([
      "/explore", "/hubs", "/community", "/competitions", "/market", "/workspace",
    ]);
    expect(screen.getByRole("link", { name: "nav.explore" })).toHaveAttribute("aria-current", "page");
  });

  it("marks project results under workspace without adding a seventh account destination", () => {
    state.pathname = "/projects/project-1";
    state.user = { username: "learner" };
    render(<MobileTabBar />);
    expect(screen.getByRole("link", { name: "nav.workspace" })).toHaveAttribute("aria-current", "page");
    expect(screen.getAllByRole("link")).toHaveLength(6);
  });

  it("offers discovery, workflow, category and community entry points", async () => {
    render(await HomePage());
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("heroTitle");
    expect(screen.getByRole("link", { name: /exploreAction/ })).toHaveAttribute("href", "/explore");
    expect(screen.getByRole("link", { name: "workflowAction" })).toHaveAttribute("href", "/hubs");
    expect(screen.getByRole("link", { name: "communityAction" })).toHaveAttribute("href", "/community");
    expect(screen.getByRole("link", { name: "categories.aigc" })).toHaveAttribute("href", "/explore?category=aigc");
    expect(screen.getByRole("link", { name: "liu-resume" })).toHaveAttribute("href", "/explore/liu-resume");
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
