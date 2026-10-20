import { describe, expect, it } from "vitest";
import { ATLAS_COLS, ATLAS_ROWS, DINO_STATES, otherForm, spriteGeometry, type DinoState } from "@/lib/mascot/atlas";

describe("ANS 吉祥物 2D 精灵图集定义", () => {
  it("每个状态的帧数与图集列数一致", () => {
    for (const spec of Object.values(DINO_STATES)) {
      expect(spec.frames).toBe(ATLAS_COLS);
    }
  });

  it("行号唯一且落在图集范围内", () => {
    const rows = Object.values(DINO_STATES).map((spec) => spec.row);
    expect(new Set(rows).size).toBe(rows.length);
    for (const row of rows) {
      expect(row).toBeGreaterThanOrEqual(0);
      expect(row).toBeLessThan(ATLAS_ROWS);
    }
  });

  it("每帧时长是正数", () => {
    for (const spec of Object.values(DINO_STATES)) {
      expect(spec.durationMs).toBeGreaterThan(0);
    }
  });

  it("精灵图定位按行与帧数计算", () => {
    const state: DinoState = "work";
    const cell = 128;
    const geometry = spriteGeometry(state, cell);
    expect(geometry.offsetY).toBe(-DINO_STATES.work.row * cell);
    expect(geometry.travelX).toBe(-DINO_STATES.work.frames * cell);
    expect(geometry.backgroundSize).toBe(cell * ATLAS_COLS + "px " + cell * ATLAS_ROWS + "px");
  });

  it("形态切换在两态之间往返", () => {
    expect(otherForm("2d")).toBe("3d");
    expect(otherForm("3d")).toBe("2d");
  });
});
