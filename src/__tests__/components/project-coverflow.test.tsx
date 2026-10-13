import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ProjectCoverflow, type ProjectCoverflowProps } from "@/components/homepage/project-coverflow";

const props: ProjectCoverflowProps = {
  projects: ["one", "two", "three"].map(slug => ({ slug, title: slug, href: `/explore/${slug}`, summary: `${slug} summary`, category: "Art", coverUrl: `/covers/${slug}.webp` })),
  labels: { title: "Projects", open: "Open", carousel: "Carousel", info: "About project", pause: "Pause projects", play: "Play projects" },
};
let reduced = false;
let intersect: (entries: { isIntersecting: boolean; intersectionRatio: number }[]) => void;
const stage = () => screen.getByRole("link", { name: /^Open:/ }).parentElement!;
const wheel = (target: Element, init: WheelEventInit = {}) => fireEvent.wheel(target, { deltaY: 100, cancelable: true, ...init });
beforeEach(() => {
  vi.useFakeTimers(); reduced = false;
  vi.stubGlobal("matchMedia", () => ({ matches: reduced, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  vi.stubGlobal("PointerEvent", class extends MouseEvent { pointerType: string; constructor(type: string, init: PointerEventInit) { super(type, init); this.pointerType = init.pointerType ?? "mouse"; } });
  vi.stubGlobal("IntersectionObserver", class { constructor(callback: typeof intersect) { intersect = callback; } observe() { intersect([{ isIntersecting: true, intersectionRatio: 1 }]); } disconnect() {} });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it("rotates every 2.8 seconds with one pause button and no control strip or position counter", () => {
  render(<ProjectCoverflow {...props} />);
  expect(screen.getByRole("button", { name: "Pause projects" })).toBeVisible();
  expect(screen.queryByRole("button", { name: /Next|Previous/ })).toBeNull();
  expect(screen.queryByText(/01.*03/)).toBeNull();
  act(() => vi.advanceTimersByTime(2799));
  expect(screen.getByRole("heading")).toHaveTextContent("one");
  act(() => vi.advanceTimersByTime(1));
  expect(screen.getByRole("heading")).toHaveTextContent("two");
  expect(screen.getByRole("link", { name: "Open: two" })).toHaveAttribute("href", "/explore/two");
  act(() => vi.advanceTimersByTime(2800));
  expect(screen.getByRole("heading")).toHaveTextContent("three");
});
it("uses vertical wheel in the cover surface and keeps its caption link in sync", () => {
  render(<ProjectCoverflow {...props} />);
  expect(wheel(stage())).toBe(false);
  expect(screen.getByRole("heading")).toHaveTextContent("two");
  expect(screen.getByRole("link", { name: "two Open" })).toHaveAttribute("href", "/explore/two");
  act(() => vi.advanceTimersByTime(500));
  wheel(stage(), { deltaY: -100 });
  expect(screen.getByRole("heading")).toHaveTextContent("one");
});
it("accumulates small touchpad deltas and consumes one step per inertial gesture", () => {
  render(<ProjectCoverflow {...props} />);
  wheel(stage(), { deltaY: 20 });
  expect(screen.getByRole("heading")).toHaveTextContent("one");
  wheel(stage(), { deltaY: 20 });
  expect(screen.getByRole("heading")).toHaveTextContent("two");
  for (let i = 0; i < 10; i++) { act(() => vi.advanceTimersByTime(80)); wheel(stage()); }
  expect(screen.getByRole("heading")).toHaveTextContent("two");
  act(() => vi.advanceTimersByTime(200));
  wheel(stage());
  expect(screen.getByRole("heading")).toHaveTextContent("three");
});
it("dwells for eight seconds after the last wheel input then resumes the faster rhythm", () => {
  render(<ProjectCoverflow {...props} />);
  wheel(stage());
  act(() => vi.advanceTimersByTime(1000));
  wheel(stage(), { deltaY: 10 });
  act(() => vi.advanceTimersByTime(7999));
  expect(screen.getByRole("heading")).toHaveTextContent("two");
  act(() => vi.advanceTimersByTime(1));
  expect(screen.getByRole("heading")).toHaveTextContent("three");
  act(() => vi.advanceTimersByTime(2800));
  expect(screen.getByRole("heading")).toHaveTextContent("one");
});
it("preserves browser zoom, horizontal gestures and page scrolling outside the cover surface", () => {
  render(<ProjectCoverflow {...props} />);
  expect(wheel(stage(), { ctrlKey: true })).toBe(true);
  expect(wheel(stage(), { metaKey: true })).toBe(true);
  expect(wheel(stage(), { deltaX: 120, deltaY: 10 })).toBe(true);
  expect(wheel(stage(), { cancelable: false })).toBe(true);
  expect(wheel(screen.getByRole("heading"))).toBe(true);
  expect(screen.getByRole("heading")).toHaveTextContent("one");
});
it("normalizes line-based wheels and cleans up the native wheel listener on unmount", () => {
  const { unmount } = render(<ProjectCoverflow {...props} />);
  const surface = stage();
  wheel(surface, { deltaMode: 1, deltaY: 3 });
  expect(screen.getByRole("heading")).toHaveTextContent("two");
  unmount();
  expect(wheel(surface)).toBe(true);
});
it("stops outside the viewport and while the document is hidden", () => {
  render(<ProjectCoverflow {...props} />);
  act(() => intersect([{ isIntersecting: false, intersectionRatio: 0 }]));
  act(() => vi.advanceTimersByTime(11000));
  expect(screen.getByRole("heading")).toHaveTextContent("one");
  act(() => intersect([{ isIntersecting: true, intersectionRatio: 1 }]));
  const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
  fireEvent(document, new Event("visibilitychange"));
  act(() => vi.advanceTimersByTime(11000));
  expect(screen.getByRole("heading")).toHaveTextContent("one");
  visibility.mockReturnValue("visible");
  fireEvent(document, new Event("visibilitychange"));
  act(() => vi.advanceTimersByTime(2800));
  expect(screen.getByRole("heading")).toHaveTextContent("two");
});
it("keeps reduced motion static while retaining keyboard and wheel navigation", () => {
  reduced = true;
  render(<ProjectCoverflow {...props} />);
  act(() => vi.advanceTimersByTime(22000));
  expect(screen.getByRole("heading")).toHaveTextContent("one");
  fireEvent.keyDown(screen.getByRole("region"), { key: "ArrowUp" });
  expect(screen.getByRole("heading")).toHaveTextContent("three");
  wheel(stage());
  expect(screen.getByRole("heading")).toHaveTextContent("one");
  act(() => vi.advanceTimersByTime(22000));
  expect(screen.getByRole("heading")).toHaveTextContent("one");
});
it("holds keyboard focus and grants reading time when focus or mouse enters", () => {
  render(<ProjectCoverflow {...props} />);
  fireEvent.mouseEnter(screen.getByRole("region"));
  act(() => vi.advanceTimersByTime(7999));
  expect(screen.getByRole("heading")).toHaveTextContent("one");
  act(() => vi.advanceTimersByTime(1));
  expect(screen.getByRole("heading")).toHaveTextContent("two");
  fireEvent.focus(screen.getByRole("region"));
  act(() => vi.advanceTimersByTime(16000));
  expect(screen.getByRole("heading")).toHaveTextContent("two");
  fireEvent.keyDown(screen.getByRole("region"), { key: "ArrowDown" });
  expect(screen.getByRole("heading")).toHaveTextContent("three");
  fireEvent.blur(screen.getByRole("region"), { relatedTarget: null });
  act(() => vi.advanceTimersByTime(8000));
  expect(screen.getByRole("heading")).toHaveTextContent("one");
});
it("handles empty and single catalogs, without trapping wheel input, and replaces failed covers", () => {
  const { rerender } = render(<ProjectCoverflow {...props} projects={[]} />);
  expect(screen.queryByRole("region")).toBeNull();
  rerender(<ProjectCoverflow {...props} projects={props.projects.slice(0, 1)} />);
  expect(screen.queryByRole("button", { name: /Next|Previous|Pause|Play/ })).toBeNull();
  expect(wheel(stage())).toBe(true);
  fireEvent.error(document.querySelector("img")!);
  expect(document.querySelector("img")).toBeNull();
  expect(screen.getByRole("link", { name: "Open: one" })).toHaveAttribute("href", "/explore/one");
});
it("pauses when only a small slice of the showcase is visible", () => {
  render(<ProjectCoverflow {...props} />);
  act(() => intersect([{ isIntersecting: true, intersectionRatio: 0.1 }]));
  act(() => vi.advanceTimersByTime(11000));
  expect(screen.getByRole("heading")).toHaveTextContent("one");
});
it("holds while touching and suppresses navigation after a swipe", () => {
  render(<ProjectCoverflow {...props} />);
  const surface = stage();
  fireEvent.pointerDown(surface, { pointerType: "touch", clientX: 240, clientY: 60 });
  act(() => vi.advanceTimersByTime(11000));
  expect(screen.getByRole("heading")).toHaveTextContent("one");
  fireEvent.pointerUp(surface, { pointerType: "touch", clientX: 90, clientY: 65 });
  expect(screen.getByRole("heading")).toHaveTextContent("two");
  expect(fireEvent.click(screen.getByRole("link", { name: "Open: two" }))).toBe(false);
  act(() => vi.advanceTimersByTime(8000));
  expect(screen.getByRole("heading")).toHaveTextContent("three");
});
it("observes a catalog arriving after an empty render and retries a replacement cover URL", () => {
  const { rerender } = render(<ProjectCoverflow {...props} projects={[]} />);
  rerender(<ProjectCoverflow {...props} />);
  act(() => vi.advanceTimersByTime(2800));
  expect(screen.getByRole("heading")).toHaveTextContent("two");
  const link = screen.getByRole("link", { name: "Open: two" });
  fireEvent.error(link.querySelector("img")!);
  expect(link.querySelector("img")).toBeNull();
  rerender(<ProjectCoverflow {...props} projects={props.projects.map(project => project.slug === "two" ? { ...project, coverUrl: "/covers/replacement.webp" } : project)} />);
  expect(new URL(link.querySelector("img")!.src).pathname).toBe("/covers/replacement.webp");
});

it("keeps explicit pause through blur, hover, wheel, details, and visibility changes until explicit play", () => {
  render(<ProjectCoverflow {...props} />);
  const region = screen.getByRole("region");
  fireEvent.click(screen.getByRole("button", { name: "Pause projects" }));
  expect(screen.getByRole("button", { name: "Play projects" })).toBeVisible();
  expect(region).toHaveAttribute("data-manually-paused", "true");
  fireEvent.focus(region);
  fireEvent.blur(region, { relatedTarget: null });
  fireEvent.mouseEnter(region);
  wheel(stage());
  expect(screen.getByRole("heading")).toHaveTextContent("two");
  fireEvent.click(screen.getByRole("button", { name: "About project" }));
  fireEvent.keyDown(document, { key: "Escape" });
  act(() => intersect([{ isIntersecting: false, intersectionRatio: 0 }]));
  act(() => intersect([{ isIntersecting: true, intersectionRatio: 1 }]));
  const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
  fireEvent(document, new Event("visibilitychange"));
  visibility.mockReturnValue("visible");
  fireEvent(document, new Event("visibilitychange"));
  act(() => vi.advanceTimersByTime(22000));
  expect(screen.getByRole("heading")).toHaveTextContent("two");
  expect(region).toHaveAttribute("data-manually-paused", "true");
  fireEvent.click(screen.getByRole("button", { name: "Play projects" }));
  expect(region).toHaveAttribute("data-manually-paused", "false");
  act(() => vi.advanceTimersByTime(7999));
  expect(screen.getByRole("heading")).toHaveTextContent("two");
  act(() => vi.advanceTimersByTime(1));
  expect(screen.getByRole("heading")).toHaveTextContent("three");
  act(() => vi.advanceTimersByTime(2800));
  expect(screen.getByRole("heading")).toHaveTextContent("one");
});
it("has no autoplay control in reduced motion and never starts autoplay", () => {
  reduced = true;
  render(<ProjectCoverflow {...props} />);
  expect(screen.queryByRole("button", { name: /Pause projects|Play projects/ })).toBeNull();
  act(() => vi.advanceTimersByTime(22000));
  expect(screen.getByRole("heading")).toHaveTextContent("one");
  wheel(stage());
  expect(screen.getByRole("heading")).toHaveTextContent("two");
  act(() => vi.advanceTimersByTime(22000));
  expect(screen.getByRole("heading")).toHaveTextContent("two");
});

it("keeps the single playback control keyboard accessible and retains pause after focus leaves", () => {
  render(<ProjectCoverflow {...props} />);
  const pause = screen.getByRole("button", { name: "Pause projects" });
  expect(pause.tabIndex).toBe(0);
  fireEvent.focus(pause);
  act(() => vi.advanceTimersByTime(11000));
  expect(screen.getByRole("heading")).toHaveTextContent("one");
  fireEvent.click(pause);
  const play = screen.getByRole("button", { name: "Play projects" });
  expect(play.tabIndex).toBe(0);
  fireEvent.blur(play, { relatedTarget: null });
  act(() => vi.advanceTimersByTime(22000));
  expect(screen.getByRole("heading")).toHaveTextContent("one");
  fireEvent.focus(play);
  fireEvent.click(play);
  act(() => vi.advanceTimersByTime(11000));
  expect(screen.getByRole("heading")).toHaveTextContent("one");
  fireEvent.blur(screen.getByRole("button", { name: "Pause projects" }), { relatedTarget: null });
  act(() => vi.advanceTimersByTime(7999));
  expect(screen.getByRole("heading")).toHaveTextContent("one");
  act(() => vi.advanceTimersByTime(1));
  expect(screen.getByRole("heading")).toHaveTextContent("two");
});
