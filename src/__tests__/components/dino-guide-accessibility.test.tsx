import type { ComponentProps } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { DinoGuide } from "@/components/mascot/dino-guide";
import type { DinoTaskSnapshot } from "@/components/mascot/dino-task-context";

const state = vi.hoisted(() => ({ task: null as DinoTaskSnapshot | null }));
vi.mock("@/components/mascot/dino-task-context", () => ({ useDinoTask: () => state.task }));
vi.mock("@/components/mascot/dino-avatar", () => ({ DinoAvatar: () => null }));
vi.mock("@/components/providers/workspace-navigation", () => ({ WorkspaceLink: (props: ComponentProps<"a">) => <a {...props} /> }));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
afterEach(() => { cleanup(); state.task = null; });

it.each([false, true])("names the companion dialog from its visible heading (task=%s)", hasTask => {
  state.task = hasTask ? { phase: "working", step: 2, costPoints: 2 } : null;
  render(<DinoGuide />);
  fireEvent.click(screen.getByRole("button", { name: hasTask ? "taskOpen" : "open" }));
  const title = hasTask ? "taskTitle" : "title";
  const dialog = screen.getByRole("dialog", { name: title });
  expect(dialog).toHaveAttribute("aria-labelledby", within(dialog).getByRole("heading", { name: title }).id);
  expect(within(dialog).getByRole("link", { name: "name · 360°" })).toHaveAttribute("href", "/mascot/3d/preview.html");
  if (!hasTask) expect(within(dialog).getByRole("link", { name: "career" })).toHaveAttribute("href", "/explore?category=career");
});
