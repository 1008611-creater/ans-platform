import type { ComponentProps } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { DinoGuide } from "@/components/mascot/dino-guide";
import mascotMessages from "../../../messages/product/zh.json";
import companionMessages from "../../../messages/companion/zh.json";
import type { DinoTaskSnapshot } from "@/components/mascot/dino-task-context";

const state = vi.hoisted(() => ({ task: null as DinoTaskSnapshot | null }));
vi.mock("@/components/mascot/dino-task-context", () => ({ useDinoTask: () => state.task }));
vi.mock("@/components/mascot/dino-avatar", () => ({ DinoAvatar: () => null }));
vi.mock("@/components/providers/workspace-navigation", () => ({ WorkspaceLink: (props: ComponentProps<"a">) => <a {...props} /> }));
vi.mock("next-auth/react", () => ({ useSession: () => ({ data: { user: { id: "member" } }, status: "authenticated" }) }));
vi.mock("next/navigation", () => ({ usePathname: () => "/explore" }));
vi.mock("next-intl", () => ({ useTranslations: (namespace: string) => (key: string) => {
  const source = namespace === "companion" ? companionMessages : mascotMessages.mascot;
  return key.split(".").reduce<unknown>((value, part) => value && typeof value === "object" ? (value as Record<string, unknown>)[part] : undefined, source) ?? key;
} }));
afterEach(() => { cleanup(); state.task = null; });

it.each([false, true])("names the companion dialog from its visible heading (task=%s)", hasTask => {
  state.task = hasTask ? { phase: "working", step: 2, costPoints: 2 } : null;
  render(<DinoGuide />);
  fireEvent.click(screen.getByRole("button", { name: hasTask ? mascotMessages.mascot.taskOpen : mascotMessages.mascot.open }));
  const title = mascotMessages.mascot.name;
  const dialog = screen.getByRole("dialog", { name: title });
  expect(dialog).toHaveAttribute("aria-labelledby", within(dialog).getByRole("heading", { name: title }).id);
  expect(within(dialog).getByRole("button", { name: companionMessages.openSiteSettings })).toBeInTheDocument();
  expect(within(dialog).getByRole("navigation", { name: companionMessages.suggestedNextSteps })).toBeInTheDocument();
  expect(within(dialog).getByRole("link", { name: new RegExp(companionMessages.actionProjectTitle) })).toHaveAttribute("href", "/projects#new-project");
  expect(within(dialog).getByRole("link", { name: new RegExp(companionMessages.actionVideoTitle) })).toHaveAttribute("href", "/workflows");
  expect(within(dialog).getByRole("button", { name: companionMessages.sendMessage })).toBeDisabled();
});
