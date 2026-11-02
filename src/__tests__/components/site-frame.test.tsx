import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SiteFrame } from "@/components/layout/site-frame";
const route = vi.hoisted(() => ({ pathname: "/vibe-hub" }));
vi.mock("next/navigation", () => ({ usePathname: () => route.pathname }));
afterEach(cleanup);
const view = () => <SiteFrame skipLabel="Skip" header={<nav aria-label="Main navigation">Main</nav>} footer={<footer>Footer</footer>} mobileNavigation={<nav aria-label="Mobile navigation">Mobile</nav>} companion={<button>Dino</button>}><h1>Page content</h1></SiteFrame>;
describe("persistent root frame during real route changes", () => {
  it("restores main navigation, landmarks and companion on returning from knowledge without remounting the root", () => {
    route.pathname = "/vibe-hub/journeys/ans-first-website";
    const root = render(view());
    expect(screen.queryByRole("navigation", { name: "Main navigation" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Page content" })).toBeInTheDocument();
    route.pathname = "/explore"; root.rerender(view());
    expect(screen.getByRole("navigation", { name: "Main navigation" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Mobile navigation" })).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dino" })).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    route.pathname = "/vibe-hub"; root.rerender(view());
    expect(screen.queryByRole("main")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Dino" })).not.toBeInTheDocument();
  });
  it.each(["/embed/prompt", "/kids/start"])("keeps specialized route %s free of the main frame", pathname => {
    route.pathname = "/workspace"; const root = render(view());
    route.pathname = pathname; root.rerender(view());
    expect(screen.queryByRole("navigation", { name: "Main navigation" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Dino" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Page content" })).toBeInTheDocument();
  });
});
describe("mobile tab bar only on tab pages", () => {
  it.each([["/explore", true], ["/competitions/agrihackathon", true], ["/explore/some-project", false], ["/workspace/credits", false]])("on %s shows the tab bar: %s", (pathname, visible) => {
    route.pathname = pathname;
    render(view());
    expect(!!screen.queryByRole("navigation", { name: "Mobile navigation" })).toBe(visible);
    // 工作台占满一屏，不渲染全站页脚
    expect(!!screen.queryByRole("contentinfo")).toBe(!pathname.startsWith("/workspace"));
  });
});
