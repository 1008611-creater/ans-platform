import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { IME_ENTER_GRACE_MS, isImeEnter } from "@/lib/ui/ime-enter-guard";
import { distanceFromBottom, FOLLOW_THRESHOLD_PX, JUMP_THRESHOLD_PX } from "@/lib/ui/follow-bottom";
import { MiddleEllipsis, splitFileName } from "@/lib/ui/middle-ellipsis";
import { COLLAPSE_RIGHT_AT, ResizableSplit, settleRatio } from "@/lib/ui/resizable-split";
import { rehypeStreamChars, streamDelay, STREAM_MAX_DELAY_MS } from "@/lib/ui/stream-chars";
import { FEEDBACK_VISIBLE_MS, useCopyFeedback } from "@/lib/ui/copy-feedback";

describe("输入法守卫", () => {
  it("blocks Enter while composing, for keyCode 229, and within 500ms after composition ends", () => {
    expect(isImeEnter({ isComposing: true }, false, -Infinity, 0)).toBe(true);
    expect(isImeEnter({ keyCode: 229 }, false, -Infinity, 0)).toBe(true);
    expect(isImeEnter({}, true, -Infinity, 0)).toBe(true);
    expect(isImeEnter({}, false, 1000, 1000 + IME_ENTER_GRACE_MS - 1)).toBe(true);
    expect(isImeEnter({}, false, 1000, 1000 + IME_ENTER_GRACE_MS)).toBe(false);
    expect(isImeEnter({ keyCode: 13 }, false, -Infinity, 5000)).toBe(false);
  });
});

it("measures distance from the bottom with the 40/120 thresholds", () => {
  expect(FOLLOW_THRESHOLD_PX).toBe(40);
  expect(JUMP_THRESHOLD_PX).toBe(120);
  expect(distanceFromBottom({ scrollHeight: 1000, scrollTop: 560, clientHeight: 400 })).toBe(40);
  expect(distanceFromBottom({ scrollHeight: 1000, scrollTop: 700, clientHeight: 400 })).toBe(0);
});

describe("长文件名中间省略", () => {
  it("keeps the extension and the last characters intact", () => {
    expect(splitFileName("quarterly-sales-report-final.pdf")).toEqual({ head: "quarterly-sales-report", tail: "-final.pdf" });
    expect(splitFileName("a.md")).toEqual({ head: "a", tail: ".md" });
    expect(splitFileName("README")).toEqual({ head: "README", tail: "" });
  });

  it("puts the full name in the title", () => {
    render(<MiddleEllipsis name="quarterly-sales-report-final.pdf" />);
    expect(screen.getByTitle("quarterly-sales-report-final.pdf").textContent).toBe("quarterly-sales-report-final.pdf");
  });
});

describe("分栏", () => {
  it("collapses the right pane past 82% and clamps the ratio", () => {
    expect(COLLAPSE_RIGHT_AT).toBe(0.82);
    expect(settleRatio(0.83)).toEqual({ ratio: 0.83, collapsed: true });
    expect(settleRatio(0.6)).toEqual({ ratio: 0.6, collapsed: false });
    expect(settleRatio(0.05).ratio).toBe(0.2);
  });

  it("shields the preview while dragging, restores on Esc, and resets to 50/50 on double-click", () => {
    render(<ResizableSplit label="分隔" reopenLabel="展开" initialRatio={0.4} left={<p>chat</p>} right={<iframe title="preview" />} />);
    const handle = screen.getByRole("separator");
    handle.setPointerCapture = vi.fn(); handle.releasePointerCapture = vi.fn();
    expect(handle.getAttribute("aria-valuenow")).toBe("40");
    fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientX: 400 });
    expect(screen.getByTestId("split-shield")).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByTestId("split-shield")).toBeNull();
    expect(handle.getAttribute("aria-valuenow")).toBe("40");
    fireEvent.keyDown(handle, { key: "ArrowRight" });
    expect(handle.getAttribute("aria-valuenow")).toBe("42");
    fireEvent.doubleClick(handle);
    expect(handle.getAttribute("aria-valuenow")).toBe("50");
  });
});

describe("流式打字", () => {
  it("staggers characters by 30ms and caps the wait for long replies", () => {
    expect(streamDelay(0)).toBe(0);
    expect(streamDelay(3)).toBe(90);
    expect(streamDelay(10_000)).toBe(STREAM_MAX_DELAY_MS);
  });

  it("splits prose into characters but leaves code alone", () => {
    const tree = { type: "root", children: [
      { type: "element", tagName: "p", children: [{ type: "text", value: "你好 ok" }] },
      { type: "element", tagName: "pre", children: [{ type: "element", tagName: "code", children: [{ type: "text", value: "npm run" }] }] },
    ] };
    rehypeStreamChars()(tree);
    const paragraph = tree.children[0].children as Array<{ type: string; value?: string; properties?: { style: string } }>;
    expect(paragraph.filter((node) => node.type === "element")).toHaveLength(4);
    expect(paragraph[1].properties?.style).toBe("animation-delay:30ms");
    expect(paragraph[2]).toEqual({ type: "text", value: " " });
    const code = tree.children[1].children[0] as { children: unknown };
    expect(code.children).toEqual([{ type: "text", value: "npm run" }]);
  });
});

it("fades the copy check out after 2.5s", async () => {
  vi.useFakeTimers();
  Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
  const { result } = renderHook(() => useCopyFeedback());
  await act(async () => { await result.current.copy("hi"); });
  expect(result.current.state).toBe("done");
  act(() => { vi.advanceTimersByTime(FEEDBACK_VISIBLE_MS); });
  expect(result.current.state).toBe("leaving");
  act(() => { vi.advanceTimersByTime(200); });
  expect(result.current.state).toBe("idle");
  vi.useRealTimers();
});
