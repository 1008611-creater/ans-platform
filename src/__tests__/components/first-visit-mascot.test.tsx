import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { FirstVisitMascot } from "@/components/homepage/first-visit-mascot";
import { MintyEngine, spring, stepSpring, SPRING_TUNE } from "@/components/homepage/minty-engine";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function run(engine: MintyEngine, from: number, ms: number) {
  let frame = engine.tick(from);
  for (let t = from; t <= from + ms; t += 16) frame = engine.tick(t);
  return frame;
}

it("弹簧收敛到目标且不发散", () => {
  const s = spring(0);
  s.t = 1;
  for (let i = 0; i < 240; i++) stepSpring(s, SPRING_TUNE.squash, 1 / 120);
  expect(Math.abs(s.x - 1)).toBeLessThan(0.01);
  s.v = Number.NaN;
  stepSpring(s, SPRING_TUNE.squash, 1 / 120);
  expect(s.x).toBe(1);
});

it("出场从舞台下方冒头，约一秒内落定到位", () => {
  const engine = new MintyEngine(0, () => 0.5);
  expect(engine.frame().y).toBeGreaterThan(0.4);
  const settled = run(engine, 0, 1000);
  expect(Math.abs(settled.y)).toBeLessThan(0.03);
  expect(settled.squash).toBeGreaterThan(0.9);
  expect(settled.squash).toBeLessThan(1.1);
});

it("视线跟随指针，但始终留在脸内", () => {
  const engine = new MintyEngine(0, () => 0.5);
  run(engine, 0, 1200);
  engine.setPointer([1, 1]);
  const right = run(engine, 1300, 600);
  expect(right.gazeX).toBeGreaterThan(0.02);
  expect(right.gazeX).toBeLessThanOrEqual(0.035);
  expect(right.gazeY).toBeLessThanOrEqual(0.024);
  engine.setPointer([-1, 0]);
  expect(run(engine, 2000, 600).gazeX).toBeLessThan(-0.02);
});

it("点一下会压扁再回弹，并眨眼", () => {
  const engine = new MintyEngine(0, () => 0.5);
  run(engine, 0, 1200);
  engine.poke(1300);
  const squashed = run(engine, 1300, 50);
  expect(squashed.squash).toBeLessThan(0.95);
  const blinking = run(engine, 1351, 80);
  expect(blinking.lid).toBeLessThan(0.6);
  const back = run(engine, 1432, 1000);
  expect(Math.abs(back.squash - 1)).toBeLessThan(0.06);
});

it("舞台是纯装饰：aria-hidden、没有可聚焦元素，不会抢焦点", () => {
  render(<FirstVisitMascot />);
  const stage = screen.getByTestId("first-visit-mascot");
  expect(stage.getAttribute("aria-hidden")).toBe("true");
  expect(stage.querySelector("button, a, input, [tabindex]")).toBeNull();
  expect(stage.querySelectorAll("img")).toHaveLength(3);
});

it("系统要求减少动态效果时只给静态立绘", () => {
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("reduce"), addEventListener() {}, removeEventListener() {} }));
  render(<FirstVisitMascot />);
  expect(screen.getByTestId("first-visit-mascot").getAttribute("data-animated")).toBe("false");
});
