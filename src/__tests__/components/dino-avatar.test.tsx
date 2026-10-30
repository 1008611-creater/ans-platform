import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DinoAvatar } from "@/components/mascot/dino-avatar";
import { writeForm } from "@/lib/mascot/client-store";
import { resetSitePreferences, updateSitePreferences } from "@/lib/site-preferences";

vi.mock("next/image", () => ({ default: ({ className }: { className?: string }) => <span data-testid="static-mascot" className={className} /> }));

let reducedMotion = false;
let documentHidden = false;
const mediaListeners = new Set<() => void>();
const media = {
  get matches() { return reducedMotion; },
  addEventListener: vi.fn((_type: string, listener: () => void) => mediaListeners.add(listener)),
  removeEventListener: vi.fn((_type: string, listener: () => void) => mediaListeners.delete(listener)),
};

beforeEach(() => {
  resetSitePreferences();
  vi.useFakeTimers();
  reducedMotion = false;
  documentHidden = false;
  vi.spyOn(document, "hidden", "get").mockImplementation(() => documentHidden);
  vi.spyOn(document, "visibilityState", "get").mockImplementation(() => documentHidden ? "hidden" : "visible");
  mediaListeners.clear();
  media.addEventListener.mockClear();
  media.removeEventListener.mockClear();
  vi.stubGlobal("matchMedia", vi.fn(() => media));
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

function preference(reduce: boolean) {
  reducedMotion = reduce;
  act(() => { for (const listener of mediaListeners) listener(); });
}
function visibility(hidden: boolean) {
  documentHidden = hidden;
  fireEvent(document, new Event("visibilitychange"));
}
function message(source: Window | null, type: string, origin = window.location.origin) {
  act(() => window.dispatchEvent(new MessageEvent("message", { source, origin, data: { type } })));
}
function mount(open = false) {
  const view = render(<DinoAvatar phase="idle" open />);
  if (!open) view.rerender(<DinoAvatar phase="idle" open={false} />);
  const frame = view.container.querySelector("iframe")!;
  expect(frame).not.toBeNull();
  const source = frame.contentWindow!;
  const send = vi.spyOn(source, "postMessage");
  return { ...view, frame, source, send };
}
function pointer() {
  act(() => vi.advanceTimersByTime(100));
  const event = new MouseEvent("pointermove", { clientX: 200, clientY: 100 });
  Object.defineProperty(event, "pointerType", { value: "mouse" });
  fireEvent(window, event);
}

const offer = { available: true, mode: "free" as const, points: 0 as const, modelId: "mimo-v2.5-tts", policyVersion: "fixture-free", checkedAt: "2026-10-12T00:00:00Z", reviewBy: "2099-01-01T00:00:00Z", cacheHours: 24, maxCharacters: 1200 };

describe("DinoAvatar frame lifecycle", () => {
  it("does not download 3D before the guide is opened and reuses its frame after closing", () => {
    const view = render(<DinoAvatar phase="idle" open={false} />);
    expect(view.container.querySelector("iframe")).toBeNull();
    act(() => vi.advanceTimersByTime(60000));
    expect(view.container.querySelector("iframe")).toBeNull();
    expect(screen.getByTestId("static-mascot")).not.toHaveClass("invisible");
    view.rerender(<DinoAvatar phase="idle" open />);
    const frame = view.container.querySelector("iframe")!;
    expect(frame).not.toBeNull();
    message(frame.contentWindow, "ans-dino-ready");
    view.rerender(<DinoAvatar phase="idle" open={false} />);
    view.rerender(<DinoAvatar phase="idle" open />);
    expect(view.container.querySelector("iframe")).toBe(frame);
    expect(screen.getByTestId("static-mascot")).toHaveClass("invisible");
  });

  it("keeps voice off by default and speaks only after an explicit preference opt-in and fresh reply", () => {
    const view = mount(true);
    view.rerender(<DinoAvatar actor="member" voicePolicy={offer} phase="idle" open speech={{ id: 1, text: "Public guide reply" }} />);
    message(view.source, "ans-dino-ready");
    expect(view.send).toHaveBeenCalledWith({ type: "ans-dino", event: "preferences", voice: false, volume: .65, calm: false }, window.location.origin);
    expect(view.send.mock.calls.filter(call => call[0].event === "speak")).toHaveLength(0);
    act(() => updateSitePreferences({ voice: true }));
    expect(view.send.mock.calls.filter(call => call[0].event === "speak")).toHaveLength(0);
    view.rerender(<DinoAvatar actor="member" voicePolicy={offer} phase="idle" open speech={{ id: 2, text: "Next public reply" }} />);
    expect(view.send).toHaveBeenCalledWith({ type: "ans-dino", event: "speak", text: "Next public reply", actor: "member", policyVersion: offer.policyVersion }, window.location.origin);
    view.send.mockClear();
    act(() => updateSitePreferences({ voice: false }));
    expect(view.send).toHaveBeenCalledWith({ type: "ans-dino", event: "stop-speech" }, window.location.origin);
    view.rerender(<DinoAvatar actor="member" voicePolicy={offer} phase="idle" open speech={{ id: 3, text: "Silent public reply" }} />);
    expect(view.send.mock.calls.filter(call => call[0].event === "speak")).toHaveLength(0);
  });
  it("waits for an authenticated free quote and blocks expired voice policies", () => {
    const view = mount(true); act(() => updateSitePreferences({ voice: true })); message(view.source, "ans-dino-ready");
    view.rerender(<DinoAvatar phase="idle" open speech={{ id: 7, text: "Public" }} />);
    view.rerender(<DinoAvatar actor="member" phase="idle" open speech={{ id: 7, text: "Public" }} />);
    view.rerender(<DinoAvatar actor="member" voicePolicy={{...offer,reviewBy:"2020-01-01T00:00:00Z"}} phase="idle" open speech={{ id: 7, text: "Public" }} />);
    expect(view.send.mock.calls.filter(call => call[0].event === "speak")).toHaveLength(0);
    view.rerender(<DinoAvatar actor="member" voicePolicy={offer} phase="idle" open speech={{ id: 7, text: "Public" }} />);
    expect(view.send.mock.calls.filter(call => call[0].event === "speak")).toHaveLength(1);
  });
  it("starts the requested companion eagerly and keeps its still until ready", () => {
    const view = mount();
    expect(view.frame).toHaveAttribute("loading", "eager");
    expect(view.frame).toHaveAttribute("tabindex", "-1");
    expect(view.frame.parentElement).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByTestId("static-mascot")).not.toHaveClass("invisible");
    expect(view.send).not.toHaveBeenCalled();
    message(view.source, "ans-dino-ready");
    expect(screen.getByTestId("static-mascot")).toHaveClass("invisible");
    expect(view.frame).toHaveClass("opacity-100");
    expect(view.send).toHaveBeenCalledWith({ type: "ans-dino", event: "phase", phase: "idle" }, window.location.origin);
    act(() => vi.advanceTimersByTime(20001));
    expect(view.frame).toBeInTheDocument();
  });

  it("requires both the current frame and same origin for ready or error messages", () => {
    const view = mount();
    for (const type of ["ans-dino-ready", "ans-dino-error"]) {
      message(view.source, type, "https://untrusted.example");
      message(window, type);
      message(null, type);
    }
    expect(view.frame).toBeInTheDocument();
    expect(screen.getByTestId("static-mascot")).not.toHaveClass("invisible");
    expect(view.send).not.toHaveBeenCalled();
    message(view.source, "ans-dino-ready");
    expect(screen.getByTestId("static-mascot")).toHaveClass("invisible");
  });

  it("sends one greeting per opening without restarting it for phase changes", () => {
    const view = mount();
    message(view.source, "ans-dino-ready");
    view.send.mockClear();
    view.rerender(<DinoAvatar phase="idle" open />);
    view.rerender(<DinoAvatar phase="queued" open />);
    view.rerender(<DinoAvatar phase="working" open />);
    message(view.source, "ans-dino-ready");
    expect(view.send.mock.calls.map(call => call[0])).toEqual([
      { type: "ans-dino", event: "stop-speech" },
      { type: "ans-dino", event: "hello" },
      { type: "ans-dino", event: "phase", phase: "queued" },
      { type: "ans-dino", event: "phase", phase: "working" },
    ]);
    view.rerender(<DinoAvatar phase="working" open={false} />);
    view.rerender(<DinoAvatar phase="working" open />);
    expect(view.send.mock.calls.filter(call => call[0].event === "hello")).toHaveLength(2);
  });

  it("greets once after loading if the guide was already opened", () => {
    const view = mount(true);
    view.rerender(<DinoAvatar phase="working" open />);
    expect(view.send).not.toHaveBeenCalled();
    message(view.source, "ans-dino-ready");
    message(view.source, "ans-dino-ready");
    expect(view.send.mock.calls.filter(call => call[0].event === "hello")).toHaveLength(1);
    expect(view.send).toHaveBeenCalledWith({ type: "ans-dino", event: "phase", phase: "working" }, window.location.origin);
  });

  it.each(["reduced", "unsupported"] as const)("keeps only the still for %s motion support", mode => {
    if (mode === "reduced") reducedMotion = true;
    else vi.stubGlobal("matchMedia", undefined);
    const view = render(<DinoAvatar phase="working" open />);
    expect(view.container.querySelector("iframe")).toBeNull();
    expect(screen.getByTestId("static-mascot")).not.toHaveClass("invisible");
  });

  it("removes the live frame and listeners when reduced motion is enabled", () => {
    const removeWindow = vi.spyOn(window, "removeEventListener");
    const removeDocument = vi.spyOn(document, "removeEventListener");
    const view = mount();
    message(view.source, "ans-dino-ready");
    view.send.mockClear();
    preference(true);
    expect(view.frame).not.toBeInTheDocument();
    expect(screen.getByTestId("static-mascot")).not.toHaveClass("invisible");
    expect(removeWindow).toHaveBeenCalledWith("message", expect.any(Function));
    expect(removeWindow).toHaveBeenCalledWith("pointermove", expect.any(Function));
    expect(removeDocument).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
    pointer();
    fireEvent(document, new Event("visibilitychange"));
    expect(view.send).not.toHaveBeenCalled();
    preference(false);
    const replacement = view.container.querySelector("iframe")!;
    expect(replacement).not.toBe(view.frame);
    message(view.source, "ans-dino-ready");
    expect(screen.getByTestId("static-mascot")).not.toHaveClass("invisible");
    message(replacement.contentWindow, "ans-dino-ready");
    expect(screen.getByTestId("static-mascot")).toHaveClass("invisible");
  });

  it("cancels the loading deadline while reduced motion removes the frame", () => {
    const view = mount();
    preference(true);
    act(() => vi.advanceTimersByTime(25000));
    preference(false);
    const replacement = view.container.querySelector("iframe")!;
    expect(replacement).not.toBeNull();
    message(replacement.contentWindow, "ans-dino-ready");
    expect(screen.getByTestId("static-mascot")).toHaveClass("invisible");
  });

  it("falls back after a bounded load and ignores late ready messages", () => {
    const view = mount();
    act(() => vi.advanceTimersByTime(10000));
    view.rerender(<DinoAvatar phase="working" open />);
    act(() => vi.advanceTimersByTime(9999));
    expect(view.frame).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(view.frame).not.toBeInTheDocument();
    expect(view.send.mock.calls.map(call => call[0])).toEqual([{ type: "ans-dino", event: "stop-speech" }]);
    view.send.mockClear();
    message(view.source, "ans-dino-ready");
    expect(screen.getByTestId("static-mascot")).not.toHaveClass("invisible");
    expect(view.send).not.toHaveBeenCalled();
  });

  it("starts its loading budget only when an initially hidden page becomes visible", () => {
    documentHidden = true;
    const view = mount();
    act(() => vi.advanceTimersByTime(25000));
    expect(view.frame).toBeInTheDocument();
    expect(screen.getByTestId("static-mascot")).not.toHaveClass("invisible");
    visibility(false);
    act(() => vi.advanceTimersByTime(19999));
    expect(view.frame).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(view.frame).not.toBeInTheDocument();
    expect(screen.getByTestId("static-mascot")).not.toHaveClass("invisible");
  });

  it("pauses the remaining loading budget while hidden instead of resetting it", () => {
    const view = mount();
    act(() => vi.advanceTimersByTime(10000));
    visibility(true);
    act(() => vi.advanceTimersByTime(25000));
    expect(view.frame).toBeInTheDocument();
    visibility(false);
    act(() => vi.advanceTimersByTime(9999));
    expect(view.frame).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(view.frame).not.toBeInTheDocument();
    expect(screen.getByTestId("static-mascot")).not.toHaveClass("invisible");
  });

  it("handles hidden ready and error messages and cleans up every visibility listener", () => {
    const addDocument = vi.spyOn(document, "addEventListener");
    const removeDocument = vi.spyOn(document, "removeEventListener");
    documentHidden = true;
    const view = mount();
    message(view.source, "ans-dino-ready");
    expect(screen.getByTestId("static-mascot")).toHaveClass("invisible");
    expect(view.send).toHaveBeenCalledWith({ type: "ans-dino", event: "visibility", visible: false }, window.location.origin);
    act(() => vi.advanceTimersByTime(25000));
    visibility(false);
    act(() => vi.advanceTimersByTime(25000));
    expect(view.frame).toBeInTheDocument();
    visibility(true);
    message(view.source, "ans-dino-error");
    expect(view.frame).not.toBeInTheDocument();
    expect(screen.getByTestId("static-mascot")).not.toHaveClass("invisible");
    view.unmount();

    documentHidden = false;
    const scheduleTimeout = vi.spyOn(window, "setTimeout");
    const clearTimeout = vi.spyOn(window, "clearTimeout");
    const pending = mount();
    const deadlineCalls = scheduleTimeout.mock.calls
      .map((call, index) => ({ delay: call[1], handle: scheduleTimeout.mock.results[index].value }))
      .filter(call => call.delay === 20000);
    expect(deadlineCalls).toHaveLength(1);
    pending.unmount();
    expect(clearTimeout).toHaveBeenCalledWith(deadlineCalls[0].handle);
    for (const [type, listener] of addDocument.mock.calls) {
      if (type === "visibilitychange") expect(removeDocument).toHaveBeenCalledWith(type, listener);
    }
    view.send.mockClear();
    pending.send.mockClear();
    visibility(false);
    act(() => vi.advanceTimersByTime(25000));
    expect(view.send).not.toHaveBeenCalled();
    expect(pending.send).not.toHaveBeenCalled();
  });

  it.each([false, true])("falls back on errors and releases listeners (ready=%s)", ready => {
    const removeWindow = vi.spyOn(window, "removeEventListener");
    const removeDocument = vi.spyOn(document, "removeEventListener");
    const view = mount();
    if (ready) message(view.source, "ans-dino-ready");
    view.send.mockClear();
    message(view.source, "ans-dino-error");
    expect(view.frame).not.toBeInTheDocument();
    expect(screen.getByTestId("static-mascot")).not.toHaveClass("invisible");
    expect(removeWindow).toHaveBeenCalledWith("message", expect.any(Function));
    if (ready) {
      expect(removeWindow).toHaveBeenCalledWith("pointermove", expect.any(Function));
      expect(removeDocument).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
    }
    message(view.source, "ans-dino-ready");
    pointer();
    fireEvent(document, new Event("visibilitychange"));
    expect(view.send).not.toHaveBeenCalled();
    expect(screen.getByTestId("static-mascot")).not.toHaveClass("invisible");
  });

  it("forwards only presentation events and cleans up when unmounted", () => {
    const removeWindow = vi.spyOn(window, "removeEventListener");
    const removeDocument = vi.spyOn(document, "removeEventListener");
    const view = mount();
    message(view.source, "ans-dino-ready");
    view.send.mockClear();
    pointer();
    expect(view.send).toHaveBeenCalledWith({ type: "ans-dino", event: "pointer", x: 200 / window.innerWidth * 2 - 1, y: 100 / window.innerHeight * 2 - 1 }, window.location.origin);
    fireEvent(document, new Event("visibilitychange"));
    expect(view.send).toHaveBeenLastCalledWith({ type: "ans-dino", event: "visibility", visible: !document.hidden }, window.location.origin);
    view.unmount();
    expect(removeWindow).toHaveBeenCalledWith("message", expect.any(Function));
    expect(removeWindow).toHaveBeenCalledWith("pointermove", expect.any(Function));
    expect(removeDocument).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
    expect(mediaListeners.size).toBe(0);
    view.send.mockClear();
    pointer();
    fireEvent(document, new Event("visibilitychange"));
    message(view.source, "ans-dino-ready");
    expect(view.send).not.toHaveBeenCalled();
  });

  it("renders pixel sprite before 3D ready and locks to pixel style without 3D iframe when form is 2d", () => {
    const view = mount();
    expect(screen.getByTestId("mascot-pixel-avatar")).toBeInTheDocument();
    message(view.source, "ans-dino-ready");
    expect(screen.queryByTestId("mascot-pixel-avatar")).toBeNull();
    act(() => writeForm("2d"));
    expect(screen.getByTestId("mascot-pixel-avatar")).toBeInTheDocument();
    expect(view.container.querySelector("iframe")).toBeNull();
    act(() => writeForm("3d"));
  });
});
