import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";

const state = vi.hoisted(() => ({ pathname: "/hubs/cauhub" }));
vi.mock("next/navigation", () => ({ usePathname: () => state.pathname }));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/components/providers/workspace-navigation", () => ({
  WorkspaceLink: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a>,
}));
afterEach(cleanup);

it.each([
  ["/hubs/cauhub", "/hubs"],
  ["/community", "/community"],
  ["/competitions/agrihackathon", "/competitions"],
  ["/workspace/credits", "/workspace"],
])("renders the six destinations and highlights %s", (pathname, expectedActive) => {
  state.pathname = pathname;
  render(<MobileTabBar />);
  const links = screen.getAllByRole("link");
  expect(links.map(link => link.getAttribute("href"))).toEqual(["/explore", "/hubs", "/community", "/competitions", "/market", "/workspace"]);
  expect(links.filter(link => link.getAttribute("aria-current") === "page").map(link => link.getAttribute("href"))).toEqual([expectedActive]);
  expect(links[0].parentElement).toHaveClass("grid-cols-6");
  for (const link of links) expect(link.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
});
