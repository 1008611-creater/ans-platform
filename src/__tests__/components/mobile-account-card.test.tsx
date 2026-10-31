import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import hubs from "../../../messages/hubs/zh.json";
import { MobileAccountCard } from "@/components/workspace/mobile-account-card";

vi.mock("next-intl/server", () => ({
  getLocale: async () => "zh",
  getTranslations: async () => (key: string) => (hubs.me as Record<string, string>)[key],
}));
vi.mock("@/components/providers/workspace-navigation", () => ({
  WorkspaceLink: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a>,
}));
afterEach(cleanup);

it("shows who is signed in, the real balance and the four shortcuts", async () => {
  render(await MobileAccountCard({ account: { name: "Alice", username: "alice", image: null }, availablePoints: 1020.46 }));
  expect(screen.getByRole("heading", { name: "Alice" })).toBeInTheDocument();
  expect(screen.getByText("@alice")).toBeInTheDocument();
  expect(screen.getByText("1,020.5")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: hubs.me.claim })).toHaveAttribute("href", "/workspace/benefits");
  expect(screen.getByRole("link", { name: hubs.me.ledger })).toHaveAttribute("href", "#credit-ledger-heading");
  const shortcuts = screen.getByRole("navigation", { name: hubs.me.shortcuts });
  expect(within(shortcuts).getAllByRole("link").map(link => link.getAttribute("href"))).toEqual(["/projects", "/teams", "/collection", "/workspace/models"]);
});

it("falls back to the username when no display name is set", async () => {
  render(await MobileAccountCard({ account: { name: null, username: "bob" }, availablePoints: 0 }));
  expect(screen.getByRole("heading", { name: "bob" })).toBeInTheDocument();
});
