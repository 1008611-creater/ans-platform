import { afterEach, describe, expect, it, vi } from "vitest";
import { controlUnder, dodgeFor, DODGE_GAP_PX } from "@/components/mascot/use-badge-dodge";

const badge = { top: 700, bottom: 744, left: 330, right: 374 };

describe("dodgeFor", () => {
  it("stays put when nothing is under the badge", () => {
    expect(dodgeFor(badge, { top: 600, bottom: 640, left: 0, right: 390 })).toBe(0);
  });

  it("lifts above a button it covers, with a gap", () => {
    expect(dodgeFor(badge, { top: 720, bottom: 768, left: 16, right: 374 })).toBe(744 - 720 + DODGE_GAP_PX);
  });

  it("fades out instead of climbing to mid-screen behind a tall control", () => {
    expect(dodgeFor(badge, { top: 560, bottom: 760, left: 16, right: 374 })).toBe("hide");
  });
});

describe("controlUnder", () => {
  afterEach(() => { document.body.innerHTML = ""; vi.restoreAllMocks(); });

  function stack(...nodes: Element[]) {
    Object.defineProperty(document, "elementsFromPoint", { configurable: true, value: () => nodes });
  }

  it("finds the page button under the badge and ignores the mascot itself", () => {
    document.body.innerHTML = `<div id="owner"><button id="mine">dino</button></div><button id="cta"><span id="label">提交</span></button>`;
    const owner = document.getElementById("owner")!;
    stack(document.getElementById("mine")!, document.getElementById("label")!);
    expect(controlUnder(badge, owner)?.id).toBe("cta");
  });

  it("does not dodge whole-card links", () => {
    document.body.innerHTML = `<div id="owner"></div><a id="card" href="/p/1"><span id="inner">card</span></a>`;
    const card = document.getElementById("card")!;
    vi.spyOn(card, "getBoundingClientRect").mockReturnValue({ top: 500, bottom: 760, left: 16, right: 374, height: 260, width: 358, x: 16, y: 500, toJSON: () => ({}) });
    stack(document.getElementById("inner")!);
    expect(controlUnder(badge, document.getElementById("owner")!)).toBeNull();
  });
});
