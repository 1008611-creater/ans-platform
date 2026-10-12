import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ProjectCoverflow, type ProjectCoverflowProps } from "@/components/homepage/project-coverflow";

const props: ProjectCoverflowProps = {
  projects: ["one", "two", "three"].map(slug => ({ slug, title: slug, href: `/explore/${slug}`, summary: `${slug} summary`, category: "Art", coverUrl: `/covers/${slug}.webp` })),
  labels: { title: "Projects", previous: "Previous", next: "Next", pause: "Pause", play: "Play", open: "Open", select: "Show", carousel: "Carousel" },
};
let reduced = false;
let intersect: (entries: { isIntersecting: boolean; intersectionRatio: number }[]) => void;
beforeEach(() => {
  vi.useFakeTimers(); reduced = false;
  vi.stubGlobal("matchMedia", () => ({ matches: reduced, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  vi.stubGlobal("PointerEvent", class extends MouseEvent { pointerType: string; constructor(type: string, init: PointerEventInit) { super(type, init); this.pointerType = init.pointerType ?? "mouse"; } });
  vi.stubGlobal("IntersectionObserver", class { constructor(callback: typeof intersect) { intersect = callback; } observe() { intersect([{ isIntersecting: true, intersectionRatio: 1 }]); } disconnect() {} });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });
it("rotates real links and pauses on hover, focus and manual selection", () => {
  render(<ProjectCoverflow {...props} />);
  act(() => vi.advanceTimersByTime(5500));
  expect(screen.getByRole("heading")).toHaveTextContent("two");
  expect(screen.getByRole("link", { name: "Open: two" })).toHaveAttribute("href", "/explore/two");
  fireEvent.mouseEnter(screen.getByRole("region"));
  act(() => vi.advanceTimersByTime(11000));
  expect(screen.getByRole("heading")).toHaveTextContent("two");
  fireEvent.mouseLeave(screen.getByRole("region"));
  fireEvent.focus(screen.getByRole("button", { name: "Next" }));
  act(() => vi.advanceTimersByTime(5500));
  expect(screen.getByRole("heading")).toHaveTextContent("two");
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  expect(screen.getByRole("heading")).toHaveTextContent("three");
  fireEvent.click(screen.getByRole("button", { name: "Play" }));
  act(() => vi.advanceTimersByTime(5500));
  expect(screen.getByRole("heading")).toHaveTextContent("one");
});
it("stops outside the viewport and while the document is hidden", () => {
  render(<ProjectCoverflow {...props} />);
  act(() => intersect([{ isIntersecting: false, intersectionRatio: 0 }]));
  act(() => vi.advanceTimersByTime(11000));
  expect(screen.getByRole("heading")).toHaveTextContent("one");
  act(() => intersect([{ isIntersecting: true, intersectionRatio: 1 }]));
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
  fireEvent(document, new Event("visibilitychange"));
  act(() => vi.advanceTimersByTime(11000));
  expect(screen.getByRole("heading")).toHaveTextContent("one");
  vi.restoreAllMocks();
});
it("offers static keyboard navigation for reduced motion", () => {
  reduced = true;
  render(<ProjectCoverflow {...props} />);
  act(() => vi.advanceTimersByTime(22000));
  expect(screen.getByRole("heading")).toHaveTextContent("one");
  expect(screen.queryByRole("button", { name: "Pause" })).toBeNull();
  fireEvent.keyDown(screen.getByRole("region"), { key: "ArrowLeft" });
  expect(screen.getByRole("heading")).toHaveTextContent("three");
});
it("handles empty and single catalogs and replaces failed covers with project identity", () => {
  const { rerender } = render(<ProjectCoverflow {...props} projects={[]} />);
  expect(screen.queryByRole("region")).toBeNull();
  rerender(<ProjectCoverflow {...props} projects={props.projects.slice(0, 1)} />);
  expect(screen.queryByRole("button")).toBeNull();
  fireEvent.error(document.querySelector("img")!);
  expect(document.querySelector("img")).toBeNull();
  expect(screen.getByRole("link", { name: "Open: one" })).toHaveAttribute("href", "/explore/one");
});

it("keeps the explicit pause control stable when focus enters it", () => {
  render(<ProjectCoverflow {...props} />);
  const pause = screen.getByRole("button", { name: "Pause" });
  fireEvent.focus(pause);
  expect(screen.getByRole("button", { name: "Pause" })).toBe(pause);
  fireEvent.click(pause);
  act(() => vi.advanceTimersByTime(11000));
  expect(screen.getByRole("heading")).toHaveTextContent("one");
  expect(screen.getByRole("button", { name: "Play" })).toBe(pause);
});
it("pauses when only a small slice of the showcase is visible", () => {
  render(<ProjectCoverflow {...props} />);
  act(() => intersect([{ isIntersecting: true, intersectionRatio: 0.1 }]));
  act(() => vi.advanceTimersByTime(11000));
  expect(screen.getByRole("heading")).toHaveTextContent("one");
});
it("pauses a touch immediately and suppresses the navigation click after a swipe", () => {
  render(<ProjectCoverflow {...props} />);
  const stage = screen.getByRole("link", { name: "Open: one" }).parentElement!;
  fireEvent.pointerDown(stage, { pointerType: "touch", clientX: 240, clientY: 60 });
  expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
  act(() => vi.advanceTimersByTime(11000));
  expect(screen.getByRole("heading")).toHaveTextContent("one");
  fireEvent.pointerUp(stage, { pointerType: "touch", clientX: 90, clientY: 65 });
  expect(screen.getByRole("heading")).toHaveTextContent("two");
  expect(fireEvent.click(screen.getByRole("link", { name: "Open: two" }))).toBe(false);
});
it("observes a catalog that arrives after an empty render and retries a replacement cover URL", () => {
  const { rerender } = render(<ProjectCoverflow {...props} projects={[]} />);
  rerender(<ProjectCoverflow {...props} />);
  act(() => vi.advanceTimersByTime(5500));
  expect(screen.getByRole("heading")).toHaveTextContent("two");
  const link = screen.getByRole("link", { name: "Open: two" });
  fireEvent.error(link.querySelector("img")!);
  expect(link.querySelector("img")).toBeNull();
  rerender(<ProjectCoverflow {...props} projects={props.projects.map(project => project.slug === "two" ? { ...project, coverUrl: "/covers/replacement.webp" } : project)} />);
  expect(new URL(link.querySelector("img")!.src).pathname).toBe("/covers/replacement.webp");
});
