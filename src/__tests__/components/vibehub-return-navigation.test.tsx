import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useVibeHubReturn, VibeHubReturnNavigation } from "@/components/providers/vibehub-return-navigation";
const route = vi.hoisted(() => ({ pathname: "/explore", params: new URLSearchParams() }));
vi.mock("next/navigation", () => ({ usePathname: () => route.pathname, useSearchParams: () => route.params }));
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); sessionStorage.clear(); });
it("holds the saved position through late layout changes, stops at its deadline, and yields to user scrolling", () => {
  const entry = { href: "/explore", x: 0, y: 720 };
  sessionStorage.setItem("ans:vibehub:entry:v1", JSON.stringify(entry));
  sessionStorage.setItem("ans:vibehub:return:v1", JSON.stringify(entry));
  window.history.replaceState(null, "", "/explore");
  let now = 0, y = 0, id = 0;
  const frames = new Map<number, FrameRequestCallback>();
  vi.spyOn(performance, "now").mockImplementation(() => now);
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => { frames.set(++id, cb); return id; });
  vi.stubGlobal("cancelAnimationFrame", (key: number) => frames.delete(key));
  vi.spyOn(window, "scrollY", "get").mockImplementation(() => y);
  vi.spyOn(window, "scrollX", "get").mockReturnValue(0);
  const scroll = vi.spyOn(window, "scrollTo").mockImplementation(options => { y = (options as ScrollToOptions).top ?? y; });
  const frame = () => { const pending = [...frames.values()]; frames.clear(); act(() => pending.forEach(cb => cb(now))); };
  function ReturnControl() { const target = useVibeHubReturn(); return <button onClick={target.prepare}>Prepare return</button>; }
  function View() { return <><ReturnControl /><VibeHubReturnNavigation /></>; }
  const view = render(<View />);
  for (let n = 0; n < 3; ++n) { now += 16; frame(); }
  expect(y).toBe(720);
  expect(frames.size).toBe(1);
  y += 47; now = 250; frame();
  expect(y).toBe(720);
  expect(frames.size).toBe(1);
  now = 4001; frame();
  expect(frames.size).toBe(0);
  expect(sessionStorage.getItem("ans:vibehub:return:v1")).toBeNull();

  // A fresh return must yield to scrolling and keyboard focus/anchor navigation.
  for (const event of [new Event("wheel"), new KeyboardEvent("keydown", { key: "Tab" }), new KeyboardEvent("keydown", { key: "Enter" })]) {
    route.pathname = "/vibe-hub"; view.rerender(<View />);
    act(() => screen.getByRole("button", { name: "Prepare return" }).click());
    route.pathname = "/explore"; view.rerender(<View />);
    expect(frames.size).toBe(1);
    act(() => window.dispatchEvent(event));
    expect(frames.size).toBe(0);
    const calls = scroll.mock.calls.length; y = 800; now += 16; frame();
    expect(scroll).toHaveBeenCalledTimes(calls);
    expect(y).toBe(800);
  }
});
