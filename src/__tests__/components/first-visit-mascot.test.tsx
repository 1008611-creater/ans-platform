import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { FirstVisitMascot, MINTY_ATLAS } from "@/components/homepage/first-visit-mascot";
import { MINTY_CELLS, MintyEngine, spring, stepSpring, SPRING_TUNE, type MintyFrame } from "@/components/homepage/minty-engine";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function run(engine: MintyEngine, from: number, ms: number, seen?: Set<MintyFrame["cell"]>) {
  let frame = engine.tick(from);
  for (let t = from; t <= from + ms; t += 16) {
    frame = engine.tick(t);
    seen?.add(frame.cell);
  }
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

it("用到的每一格都在权威图集里，行号与 manifest 标签一致", () => {
  const manifest = JSON.parse(readFileSync(join(process.cwd(), "public/mascot/pixel/manifest.json"), "utf8")) as {
    cell: number;
    states: Record<string, { row: number; labels: string[] }>;
  };
  const png = readFileSync(join(process.cwd(), "public/mascot/pixel/dino-atlas.png"));
  const [w, h] = [png.readUInt32BE(16), png.readUInt32BE(20)];
  expect([w / manifest.cell, h / manifest.cell]).toEqual([MINTY_ATLAS.cols, MINTY_ATLAS.rows]);
  const label = (row: number, col: number) => Object.values(manifest.states).find(s => s.row === row)?.labels[col];
  const expected = { stand: "站立", blink: "眨眼", tilt: "歪头", wag: "摇尾", hop: "轻跳", jump: "跳起", wave: "挥手", heart: "比心", cheer: "欢呼", laugh: "大笑" };
  for (const [name, [row, col]] of Object.entries(MINTY_CELLS)) {
    expect(row).toBeLessThan(MINTY_ATLAS.rows);
    expect(label(row, col)).toBe(expected[name as keyof typeof expected]);
  }
});

it("出场从舞台下方跳起冒头，约一秒内落定，然后挥手打招呼", () => {
  const engine = new MintyEngine(0, () => 0.5);
  expect(engine.frame().y).toBeGreaterThan(0.4);
  expect(engine.tick(0).cell).toBe("jump");
  const settled = run(engine, 0, 1000);
  expect(Math.abs(settled.y)).toBeLessThan(0.03);
  expect(settled.squash).toBeGreaterThan(0.9);
  expect(settled.squash).toBeLessThan(1.1);
  expect(settled.cell).toBe("wave");
});

it("视线跟随：整只朝指针微倾，左右对称，幅度有上限", () => {
  const engine = new MintyEngine(0, () => 0.5);
  run(engine, 0, 2200);
  engine.setPointer([1, 0]);
  const right = run(engine, 2300, 600);
  expect(right.tilt).toBeGreaterThan(3);
  expect(right.tilt).toBeLessThan(10);
  expect(right.x).toBeGreaterThan(0);
  engine.setPointer([-1, 0]);
  const left = run(engine, 3000, 600);
  expect(left.tilt).toBeLessThan(-3);
  expect(left.x).toBeLessThan(0);
});

it("待机会用图集自己的眨眼格，空闲轮换会换到歪头 / 摇尾 / 轻跳格", () => {
  const engine = new MintyEngine(0, () => 0.5);
  const seen = new Set<MintyFrame["cell"]>();
  run(engine, 0, 40_000, seen);
  for (const cell of ["stand", "blink", "tilt", "wag", "hop"] as const) expect(seen.has(cell)).toBe(true);
});

it("点一下会压扁再回弹，并轮流换开心表情", () => {
  const engine = new MintyEngine(0, () => 0.5);
  run(engine, 0, 2200);
  engine.poke(2300);
  const squashed = run(engine, 2300, 50);
  expect(squashed.squash).toBeLessThan(0.95);
  expect(run(engine, 2351, 200).cell).toBe("laugh");
  const back = run(engine, 2552, 1000);
  expect(Math.abs(back.squash - 1)).toBeLessThan(0.06);
  engine.poke(3600);
  expect(run(engine, 3600, 200).cell).toBe("cheer");
});

it("舞台是纯装饰：aria-hidden、没有可聚焦元素，不会抢焦点", () => {
  render(<FirstVisitMascot />);
  const stage = screen.getByTestId("first-visit-mascot");
  expect(stage.getAttribute("aria-hidden")).toBe("true");
  expect(stage.querySelector("button, a, input, [tabindex]")).toBeNull();
  expect(screen.getByTestId("first-visit-mascot-sprite").dataset.cell).toBe("stand");
});

it("系统要求减少动态效果时只给静态站立格", () => {
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("reduce"), addEventListener() {}, removeEventListener() {} }));
  render(<FirstVisitMascot />);
  expect(screen.getByTestId("first-visit-mascot").getAttribute("data-animated")).toBe("false");
  expect(screen.getByTestId("first-visit-mascot-sprite").style.backgroundPosition).toBe("0% 0%");
});
