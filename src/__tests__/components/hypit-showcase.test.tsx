import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HypitShowcase } from "@/components/workspace/hypit-showcase";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: { name?: string }) => values?.name ? `${key} ${values.name}` : key,
}));
vi.mock("next/image", () => ({ default: () => null }));
afterEach(cleanup);

it("moves keyboard focus to close when opening playback and restores it on close", async () => {
  const user = userEvent.setup();
  render(<HypitShowcase />);
  const play = screen.getByRole("button", { name: "watch ranking.title" });
  play.focus();
  await user.keyboard("{Enter}");
  const close = screen.getByRole("button", { name: "close" });
  expect(close).toHaveFocus();
  expect(document.querySelector("video")).toHaveAttribute("controls");
  await user.keyboard("{Enter}");
  expect(screen.getByRole("button", { name: "watch ranking.title" })).toHaveFocus();
  expect(document.querySelector("video")).toBeNull();
});

it("retains switcher focus and updates the selected example while closing playback", async () => {
  const user = userEvent.setup();
  render(<HypitShowcase />);
  await user.click(screen.getByRole("button", { name: "watch ranking.title" }));
  const podcast = screen.getByRole("button", { name: "podcast.short" });
  podcast.focus();
  await user.keyboard("{Enter}");
  expect(podcast).toHaveFocus();
  expect(podcast).toHaveAttribute("aria-pressed", "true");
  expect(document.querySelector("video")).toBeNull();
  expect(screen.getByRole("button", { name: "watch podcast.title" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "source" })).toHaveAttribute("href", "https://github.com/hypit-ai/hypit/tree/main/examples/podcast");
});
