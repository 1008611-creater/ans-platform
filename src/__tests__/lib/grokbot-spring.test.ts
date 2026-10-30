// @vitest-environment node
import { expect, it } from "vitest";
import { createSpring, stepSpring } from "@/lib/mascot/grokbot-dino-2d";

// 舞台里实际用到的弹簧参数，眨眼那一档最硬。
const STAGE_SPRINGS: Array<[number, number]> = [[4.2, 0.88], [5.4, 0.86], [10.5, 0.75], [11.5, 0.92], [26, 1], [12, 0.92]];

it("keeps every stage spring finite and settled across frame rates", () => {
  for (const [freq, damping] of STAGE_SPRINGS) {
    for (const dt of [1 / 240, 1 / 60, 0.08]) {
      const spring = createSpring(0);
      spring.target = 1;
      for (let frame = 0; frame < 2000; frame += 1) stepSpring(spring, freq, damping, dt);
      expect(Number.isFinite(spring.x), `${freq}Hz @ ${dt}`).toBe(true);
      expect(spring.x).toBeCloseTo(1, 3);
    }
  }
});

it("recovers instead of writing NaN when an impulse leaves the spring broken", () => {
  const spring = createSpring(1);
  spring.v = Number.NaN;
  stepSpring(spring, 10.5, 0.75, 1 / 60);
  expect(spring).toMatchObject({ x: 1, v: 0 });
});
