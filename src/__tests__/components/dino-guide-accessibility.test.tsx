import type { ComponentProps } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { DinoGuide } from "@/components/mascot/dino-guide";
import mascotMessages from "../../../messages/product/zh.json";
import companionMessages from "../../../messages/companion/zh.json";
import { PREFERENCES_KEY, resetSitePreferences } from "@/lib/site-preferences";
import { COMPANION_SIZE_KEY, clampCompanionSize, defaultCompanionSize } from "@/components/mascot/use-companion-size";
import type { DinoTaskSnapshot } from "@/components/mascot/dino-task-context";

const state = vi.hoisted(() => ({ task: null as DinoTaskSnapshot | null }));
vi.mock("@/components/mascot/dino-task-context", () => ({ useDinoTask: () => state.task }));
vi.mock("@/components/mascot/dino-avatar", () => ({ DinoAvatar: () => null }));
vi.mock("@/components/providers/workspace-navigation", () => ({ WorkspaceLink: (props: ComponentProps<"a">) => <a {...props} /> }));
vi.mock("next-auth/react", () => ({ useSession: () => ({ data: { user: { id: "member" } }, status: "authenticated" }) }));
vi.mock("next/navigation", () => ({ usePathname: () => "/explore" }));
vi.mock("next-intl", () => ({ useLocale: () => "zh", useTranslations: (namespace: string) => (key: string) => {
  const source = namespace === "companion" ? companionMessages : mascotMessages.mascot;
  return key.split(".").reduce<unknown>((value, part) => value && typeof value === "object" ? (value as Record<string, unknown>)[part] : undefined, source) ?? key;
} }));
afterEach(() => { cleanup(); state.task = null; resetSitePreferences(); localStorage.removeItem(COMPANION_SIZE_KEY); });

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

it("places the direct voice toggle in the header and places the model selector immediately before send", () => {
  render(<DinoGuide />);
  fireEvent.click(screen.getByRole("button", { name: mascotMessages.mascot.open }));
  const dialog = screen.getByRole("dialog", { name: mascotMessages.mascot.name });
  const voice = within(dialog).getByRole("button", { name: companionMessages.enableDinoVoice });
  expect(voice.closest("header")).not.toBeNull();
  expect(voice).toHaveAttribute("aria-pressed", "false");
  expect(within(dialog).queryByText(companionMessages.agentMetered)).not.toBeInTheDocument();
  expect(within(dialog).queryByText(companionMessages.voiceOff)).not.toBeInTheDocument();
  const model = within(dialog).getByRole("combobox", { name: companionMessages.agentModelLabel });
  expect(model.closest("footer")).toBeNull();
  expect(model.parentElement).toBe(within(dialog).getByRole("button", { name: companionMessages.sendMessage }).parentElement);
  expect(model.parentElement?.lastElementChild).toBe(within(dialog).getByRole("button", { name: companionMessages.sendMessage }));
  fireEvent.click(voice);
  expect(within(dialog).getByRole("button", { name: companionMessages.disableDinoVoice })).toHaveAttribute("aria-pressed", "true");
  expect(JSON.parse(localStorage.getItem(PREFERENCES_KEY)!).voice).toBe(true);
  expect(screen.getByRole("dialog", { name: mascotMessages.mascot.name })).toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole("button", { name: companionMessages.disableDinoVoice }));
  expect(within(dialog).getByRole("button", { name: companionMessages.enableDinoVoice })).toHaveAttribute("aria-pressed", "false");
  expect(JSON.parse(localStorage.getItem(PREFERENCES_KEY)!).voice).toBe(false);
});

it("bounds saved sizing to small screens and restores large desktop defaults", () => {
  expect(defaultCompanionSize(1280, 720)).toEqual({ width: 717, height: 605 });
  expect(clampCompanionSize({ width: 1500, height: 1500 }, 390, 844)).toEqual({ width: 366, height: 694 });
  expect(clampCompanionSize({ width: 1, height: 1 }, 1280, 720)).toEqual({ width: 360, height: 340 });
});
it("persists keyboard resizing and allows reset without clearing conversation", () => {
  render(<DinoGuide />);
  fireEvent.click(screen.getByRole("button", { name: mascotMessages.mascot.open }));
  const dialog = screen.getByRole("dialog", { name: mascotMessages.mascot.name });
  const handle = within(dialog).getByRole("button", { name: companionMessages.resizeChat });
  const before = parseFloat(dialog.style.width);
  fireEvent.keyDown(handle, { key: "ArrowRight" });
  expect(parseFloat(dialog.style.width)).toBe(before - 24);
  expect(JSON.parse(localStorage.getItem(COMPANION_SIZE_KEY)!).width).toBe(before - 24);
  fireEvent.click(within(dialog).getByRole("button", { name: companionMessages.resetChatSize }));
  expect(parseFloat(dialog.style.width)).toBe(before);
  expect(localStorage.getItem(COMPANION_SIZE_KEY)).toBeNull();
});
