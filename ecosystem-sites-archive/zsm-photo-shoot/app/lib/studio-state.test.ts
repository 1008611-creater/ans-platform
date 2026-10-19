import { describe, expect, it } from "vitest";
import { starterScene } from "./demo-data";
import { moveShot, applyStudioTemplate, syncPromptDraft } from "./studio-state";
import { studioTemplates } from "./templates";

describe("shared studio state helpers", () => {
  it("applies template scene, aspect ratio, shot presets and concept provenance", () => {
    const scene = applyStudioTemplate(studioTemplates.find((item) => item.id === "couple")!);
    expect(scene.location.label).toContain("非真实地点");
    expect(scene.aspectRatio).toBe("3:4");
    expect(scene.shots[0]?.title).toBe(studioTemplates[1]?.shotPreset[0]);
    expect(scene.provenance.kind).toBe("demo");
    expect(starterScene.aspectRatio).toBe("9:16");
  });

  it("does not stack stale aspect-ratio prefixes when reapplying templates", () => {
    const first = applyStudioTemplate(studioTemplates.find((item) => item.id === "couple")!);
    const second = applyStudioTemplate(studioTemplates.find((item) => item.id === "travel")!, first);
    expect(second.shots[0]?.composition.match(/构图参考/g)).toHaveLength(1);
  });

  it("refreshes an untouched prompt and preserves a manually edited one with mismatch", () => {
    expect(syncPromptDraft("old", "new", false)).toEqual({ prompt: "new", edited: false, outOfSync: false });
    expect(syncPromptDraft("mine", "new", true)).toEqual({ prompt: "mine", edited: true, outOfSync: true });
  });

  it("moves shot order without mutating the previous list", () => {
    const shots = ["a", "b", "c"];
    expect(moveShot(shots, 1, -1)).toEqual(["b", "a", "c"]);
    expect(shots).toEqual(["a", "b", "c"]);
  });
});
