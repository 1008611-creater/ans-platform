import type { ComponentProps } from "react";
import { cleanup, act, fireEvent, render, renderHook, screen, within, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { DinoGuide } from "@/components/mascot/dino-guide";
import mascotMessages from "../../../messages/product/zh.json";
import companionMessages from "../../../messages/companion/zh.json";
import { PREFERENCES_KEY, resetSitePreferences } from "@/lib/site-preferences";
import { COMPANION_SIZE_KEY, clampCompanionSize, companionBounds, defaultCompanionSize, useCompanionSize } from "@/components/mascot/use-companion-size";
import type { DinoTaskSnapshot } from "@/components/mascot/dino-task-context";
import { settleSheet, SHEET_CLOSE_PX, SHEET_EXPAND_PX } from "@/components/mascot/use-companion-sheet";

const state = vi.hoisted(() => ({ task: null as DinoTaskSnapshot | null, actor: "member" as string | null, status: "authenticated" }));
vi.mock("@/components/mascot/dino-task-context", () => ({ useDinoTask: () => state.task }));
vi.mock("@/components/mascot/dino-avatar", () => ({ DinoAvatar: () => null }));
vi.mock("@/components/providers/workspace-navigation", () => ({ WorkspaceLink: (props: ComponentProps<"a">) => <a {...props} /> }));
vi.mock("next-auth/react", () => ({ useSession: () => ({ data: state.actor ? { user: { id: state.actor } } : null, status: state.status }) }));
vi.mock("next/navigation", () => ({ usePathname: () => "/explore" }));
vi.mock("next-intl", () => ({ useLocale: () => "zh", useTranslations: (namespace: string) => {
  const source = namespace === "companion" ? companionMessages : mascotMessages.mascot;
  const lookup = (key: string) => key.split(".").reduce<unknown>((value, part) => value && typeof value === "object" ? (value as Record<string, unknown>)[part] : undefined, source);
  const t = (key: string, values?: Record<string, string | number>) => {
    let result = String(lookup(key) ?? key);
    for (const [name, value] of Object.entries(values ?? {})) result = result.split("{" + name + "}").join(String(value));
    return result;
  };
  t.has = (key: string) => typeof lookup(key) === "string";
  return t;
} }));
afterEach(() => { cleanup(); sessionStorage.clear(); state.task = null; state.actor = "member"; state.status = "authenticated"; resetSitePreferences(); localStorage.removeItem(COMPANION_SIZE_KEY); vi.unstubAllGlobals(); });

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
  expect(within(dialog).getByRole("link", { name: new RegExp(companionMessages.actionHubTitle) })).toHaveAttribute("href", "/hubs");
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
  const model = within(dialog).getByRole("combobox", { name: new RegExp(companionMessages.agentModelLabel) });
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
  // 844 - 214(底部恐龙/胶囊留白) - 56(头部 48 + 8) = 574：面板不再压住站点头部。
  expect(clampCompanionSize({ width: 1500, height: 1500 }, 390, 844)).toEqual({ width: 366, height: 574 });
  expect(clampCompanionSize({ width: 1, height: 1 }, 1280, 720)).toEqual({ width: 360, height: 340 });
});
it("never lets the panel reach into the sticky site header", () => {
  for (const [width, height] of [[390, 844], [768, 1024], [1280, 900]] as const) {
    const bounds = companionBounds(width, height);
    const size = clampCompanionSize({ width: 9999, height: 9999 }, width, height);
    expect(bounds.top).toBeGreaterThanOrEqual(56);
    expect(height - bounds.bottom - size.height).toBeGreaterThanOrEqual(bounds.top);
  }
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

it("preserves independent mode drafts and supports undo without submitting them", async () => {
  const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
  render(<DinoGuide />);
  fireEvent.click(screen.getByRole("button", { name: mascotMessages.mascot.open }));
  const dialog = screen.getByRole("dialog");
  fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: "Agent 草稿" } });
  fireEvent.click(within(dialog).getByRole("button", { name: companionMessages.guideMode }));
  expect(within(dialog).getByRole("textbox")).toHaveValue("");
  fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: "向导草稿" } });
  fireEvent.click(within(dialog).getByRole("button", { name: companionMessages.agentMode }));
  expect(within(dialog).getByRole("textbox")).toHaveValue("Agent 草稿");
  fireEvent.click(within(dialog).getByRole("button", { name: companionMessages.newConversation }));
  expect(within(dialog).getByRole("textbox")).toHaveValue("");
  fireEvent.click(within(dialog).getByRole("button", { name: companionMessages.undoClear }));
  expect(within(dialog).getByRole("textbox")).toHaveValue("Agent 草稿");
  expect(fetch).not.toHaveBeenCalled(); vi.unstubAllGlobals();
});
it("keeps the next draft while an answer arrives and offers stop at the composer", async () => {
  let respond: (response: Response) => void = () => {};
  const quote = { ticket: "isolated-local-approval-ticket", requestId: "local-request", model: "deepseek-v4.1-flash", maxPoints: 1, balance: 2, expiresAt: Date.now() + 300000 };
  const fetch = vi.fn().mockResolvedValueOnce(Response.json(quote)).mockImplementationOnce(() => new Promise<Response>(resolve => { respond = resolve; }));
  vi.stubGlobal("fetch", fetch); render(<DinoGuide />);
  fireEvent.click(screen.getByRole("button", { name: mascotMessages.mascot.open }));
  const dialog = screen.getByRole("dialog"), input = within(dialog).getByRole("textbox");
  fireEvent.change(input, { target: { value: "第一句" } });
  fireEvent.click(within(dialog).getByRole("button", { name: companionMessages.sendMessage }));
  await waitFor(() => expect(within(dialog).getByRole("button", { name: companionMessages.agentConfirm })).toBeInTheDocument());
  fireEvent.click(within(dialog).getByRole("button", { name: companionMessages.agentConfirm }));
  const stop = await within(dialog).findByRole("button", { name: companionMessages.agentStop });
  expect(stop.closest("form")).not.toBeNull(); expect(input).toBeEnabled();
  fireEvent.change(input, { target: { value: "下一句的草稿" } });
  respond(new Response([JSON.stringify({ type: "answer", text: "## 第一条建议\n\n真实回复样本", links: [] }), JSON.stringify({ type: "done" })].join("\n")));
  await waitFor(() => expect(within(dialog).getByRole("button", { name: companionMessages.sendMessage })).toBeEnabled());
  expect(input).toHaveValue("下一句的草稿"); expect(fetch).toHaveBeenCalledTimes(2);
  vi.unstubAllGlobals();
});

it("fits the visual keyboard viewport without overwriting desktop sizing", () => {
  const width = window.innerWidth, height = window.innerHeight;
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 844 });
  const visual = Object.assign(new EventTarget(), { width: 390, height: 460, offsetLeft: 0, offsetTop: 0 });
  Object.defineProperty(window, "visualViewport", { configurable: true, value: visual });
  localStorage.setItem(COMPANION_SIZE_KEY, JSON.stringify({ width: 800, height: 650 }));
  const view = renderHook(useCompanionSize); act(() => view.result.current.prepare());
  expect(view.result.current.keyboard).toBe(true);
  // 键盘弹出时可视高度 460：460 - 12(底部) - 56(头部留白) = 392。
  expect(view.result.current.style).toEqual({ width: 366, height: 392 });
  expect(view.result.current.anchor.current.getBoundingClientRect().bottom).toBe(448);
  expect(JSON.parse(localStorage.getItem(COMPANION_SIZE_KEY)!)).toEqual({ width: 800, height: 650 });
  view.unmount();
  Object.defineProperty(window, "visualViewport", { configurable: true, value: undefined });
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: height });
});


it("restores both mode drafts and received conversation after a full remount without sending", async () => {
  const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
  let view = render(<DinoGuide />);
  fireEvent.click(screen.getByRole("button", { name: mascotMessages.mascot.open }));
  fireEvent.click(screen.getByRole("button", { name: companionMessages.guideMode }));
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "帮我找工作流" } });
  fireEvent.click(screen.getByRole("button", { name: companionMessages.sendMessage }));
  const reply = document.querySelector(".ans-companion-message.guide")?.textContent;
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "向导未发送" } });
  fireEvent.click(screen.getByRole("button", { name: companionMessages.agentMode }));
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "Agent 未发送" } });
  view.unmount(); view = render(<DinoGuide />);
  fireEvent.click(screen.getByRole("button", { name: mascotMessages.mascot.open }));
  expect(screen.getByRole("textbox")).toHaveValue("Agent 未发送");
  fireEvent.click(screen.getByRole("button", { name: companionMessages.guideMode }));
  expect(screen.getByRole("textbox")).toHaveValue("向导未发送");
  expect(document.querySelector(".ans-companion-message.guide")?.textContent).toBe(reply);
  const ids = [...document.querySelectorAll("[data-message-id]")].map(node => Number(node.getAttribute("data-message-id")));
  fireEvent.click(screen.getByRole("button", { name: companionMessages.sendMessage }));
  const newIds = [...document.querySelectorAll("[data-message-id]")].map(node => Number(node.getAttribute("data-message-id")));
  expect(new Set(newIds).size).toBe(newIds.length); expect(Math.max(...newIds)).toBeGreaterThan(Math.max(...ids));
  expect(fetch).not.toHaveBeenCalled(); vi.unstubAllGlobals();
});
it("preserves a saved conversation while authentication loads and clears it after logout", () => {
  let view = render(<DinoGuide />);
  fireEvent.click(screen.getByRole("button", { name: mascotMessages.mascot.open }));
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "本账号私密草稿" } });
  view.unmount(); state.status = "loading"; state.actor = null;
  view = render(<DinoGuide />);
  expect(sessionStorage.getItem("ans.companion-session.v1:conversation:user%3Amember")).toContain("本账号私密草稿");
  state.actor = "member"; state.status = "authenticated"; view.rerender(<DinoGuide />);
  fireEvent.click(screen.getByRole("button", { name: mascotMessages.mascot.open }));
  expect(screen.getByRole("textbox")).toHaveValue("本账号私密草稿");
  state.actor = null; state.status = "unauthenticated"; view.rerender(<DinoGuide />);
  expect(sessionStorage.getItem("ans.companion-session.v1:conversation:user%3Amember")).toBeNull();
  state.actor = "member"; state.status = "authenticated"; view.rerender(<DinoGuide />);
  fireEvent.click(screen.getByRole("button", { name: mascotMessages.mascot.open }));
  expect(screen.getByRole("textbox")).toHaveValue("");
});

it("names the dino trigger for what a WebGL browser actually does (close-up stage), not for the chat", () => {
  vi.stubGlobal("WebGLRenderingContext", function WebGLRenderingContext() {});
  const stageClicks: Event[] = [];
  const onClick = (event: Event) => stageClicks.push(event);
  window.addEventListener("ans:dino-stage-click", onClick);
  try {
    render(<DinoGuide />);
    const trigger = screen.getByRole("button", { name: mascotMessages.mascot.openStage });
    expect(screen.queryByRole("button", { name: mascotMessages.mascot.open })).toBeNull();
    fireEvent.click(trigger);
    expect(stageClicks).toHaveLength(1);
    expect(screen.queryByRole("dialog")).toBeNull();
  } finally {
    window.removeEventListener("ans:dino-stage-click", onClick);
  }
});

it("keeps the chat label when the browser cannot own the click (no WebGL)", () => {
  render(<DinoGuide />);
  fireEvent.click(screen.getByRole("button", { name: mascotMessages.mascot.open }));
  expect(screen.getByRole("dialog", { name: mascotMessages.mascot.name })).toBeInTheDocument();
});

function stubPhone(matches = true) {
  vi.stubGlobal("matchMedia", (query: string) => ({ matches, media: query, addEventListener() {}, removeEventListener() {} }));
}

it("settles the phone sheet by drag distance: close from 60%, step down from 80%, expand on pull-up", () => {
  expect(settleSheet("half", SHEET_CLOSE_PX + 1)).toBe("close");
  expect(settleSheet("full", SHEET_CLOSE_PX + 1)).toBe("half");
  expect(settleSheet("half", -SHEET_EXPAND_PX - 1)).toBe("full");
  expect(settleSheet("half", 20)).toBe("half");
  expect(settleSheet("full", -200)).toBe("full");
});

it("opens a bottom sheet from the phone badge even when WebGL owns the desktop click", () => {
  stubPhone();
  vi.stubGlobal("WebGLRenderingContext", function WebGLRenderingContext() {});
  render(<DinoGuide />);
  fireEvent.click(screen.getByRole("button", { name: mascotMessages.mascot.open }));
  const dialog = screen.getByRole("dialog", { name: mascotMessages.mascot.name });
  expect(dialog).toHaveAttribute("data-sheet", "true");
  expect(dialog).toHaveAttribute("data-snap", "half");
  expect(within(dialog).getByRole("button", { name: companionMessages.sheetGrabber })).toBeInTheDocument();
  expect(document.querySelector(".ans-companion-scrim")).not.toBeNull();
  expect(document.body.style.position).toBe("fixed");
});

it("keeps the phone sheet open on outside taps and closes it with the Android back gesture", async () => {
  stubPhone();
  render(<DinoGuide />);
  fireEvent.click(screen.getByRole("button", { name: mascotMessages.mascot.open }));
  expect(history.state?.ansCompanionSheet).toBe(true);
  fireEvent.pointerDown(document.querySelector(".ans-companion-scrim")!);
  expect(screen.getByRole("dialog", { name: mascotMessages.mascot.name })).toBeInTheDocument();
  const grabber = screen.getByRole("button", { name: companionMessages.sheetGrabber });
  fireEvent.keyDown(grabber, { key: "ArrowUp" });
  expect(screen.getByRole("dialog")).toHaveAttribute("data-snap", "full");
  act(() => { window.dispatchEvent(new PopStateEvent("popstate")); });
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(document.body.style.position).toBe("");
  expect(document.querySelector(".ans-companion-scrim")).toBeNull();
});

it("pops its own history entry when the phone sheet is closed with the close button", async () => {
  stubPhone();
  const back = vi.spyOn(history, "back").mockImplementation(() => {});
  try {
    render(<DinoGuide />);
    fireEvent.click(screen.getByRole("button", { name: mascotMessages.mascot.open }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: mascotMessages.mascot.close }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(back).toHaveBeenCalledTimes(1);
  } finally {
    back.mockRestore();
    history.replaceState(null, "");
  }
});

it("keeps the desktop popover when the viewport is wide", () => {
  stubPhone(false);
  render(<DinoGuide />);
  fireEvent.click(screen.getByRole("button", { name: mascotMessages.mascot.open }));
  expect(screen.getByRole("dialog")).not.toHaveAttribute("data-sheet");
  expect(document.querySelector(".ans-companion-scrim")).toBeNull();
});
