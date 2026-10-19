import { describe, expect, it, vi } from "vitest";
import { planDirectorScene } from "./director-agent";
import { captureMatchesProject, createCozyClayProject } from "./cozyclay-project";
// Test the real pinned upstream readers without changing their source.
// @ts-expect-error Upstream JavaScript intentionally has no local declaration shim.
import { readProjectDocument } from "../../vendor/CozyClay/src/project.js";
// @ts-expect-error Upstream JavaScript.
import { readSceneDocument } from "../../vendor/CozyClay/src/scenes.js";
// @ts-expect-error Upstream JavaScript.
import { readShotAuthoringDocument } from "../../vendor/CozyClay/src/shot-authoring.js";

describe("CozyClay native project execution", () => {
  for (const brief of ["海边日落合影", "旧城街巷漫步", "山野森林旅行"]) for (const count of [1, 2, 3, 4]) {
    it(`round trips ${brief}, ${count} cast members through real native readers`, () => {
      for (const aspectRatio of ["9:16", "16:9"] as const) for (const plan of planDirectorScene({ brief, peopleCount: count, aspectRatio }).plans) {
        const { serialized, project } = createCozyClayProject(plan, "test-123");
        const opened = readProjectDocument(serialized);
        expect(opened.ok).toBe(true);
        const sceneDoc = readSceneDocument(JSON.stringify(opened.project.scenesDocument));
        expect(sceneDoc.status).toBe("valid");
        expect(sceneDoc.dropped).toBe(0);
        const scene = sceneDoc.document.scenes[0];
        expect(scene.stage.characters).toHaveLength(count);
        expect(scene.stage.shotAspect).toBe(aspectRatio);
        expect(scene.objects.length).toBeGreaterThan(2);
        expect(scene.stage.characters[0].rot).toBeCloseTo(plan.characters[0].rotationY * 180 / Math.PI);
        const shots = readShotAuthoringDocument(scene.shotDocument);
        expect(shots.status).toBe("valid");
        expect(shots.state.shots).toHaveLength(1);
        expect(shots.state.shots[0].cameraKeys).toEqual(project.scenes.scenes[0].shotDocument.shots[0].cameraKeys);
      }
    });
  }
  it("rejects unsupported aspect, malformed ids, invalid coordinates and degenerate camera", () => {
    const plan = planDirectorScene({ brief: "海边合影", aspectRatio: "3:4" }).plans[0];
    expect(() => createCozyClayProject(plan, "test")).toThrow("不支持 3:4");
    plan.camera.aspectRatio = "9:16";
    expect(() => createCozyClayProject(plan, "../oops")).toThrow();
    plan.camera.position = [...plan.camera.target];
    expect(() => createCozyClayProject(plan, "test")).toThrow("重合");
    plan.camera.position[0] = 500;
    expect(() => createCozyClayProject(plan, "test")).toThrow("安全范围");
  });
  it("detaches the submitted plan and matches capture provenance, not just iframe load", () => {
    const plan = planDirectorScene({ brief: "四个人海边旅行", peopleCount: 4, aspectRatio: "9:16" }).plans[0];
    expect(plan.camera.shotScale).not.toContain("双人");
    const prepared = createCozyClayProject(plan, "test");
    plan.characters[0].position[0] = 99;
    expect(prepared.plan.characters[0].position[0]).not.toBe(99);
    const meta = { shotTitle: prepared.shotTitle, aspect: "9:16", cast: [{}, {}, {}, {}] };
    expect(captureMatchesProject(meta, prepared)).toBe(true);
    expect(captureMatchesProject({ ...meta, shotTitle: "old shot" }, prepared)).toBe(false);
    expect(captureMatchesProject({ ...meta, cast: [{}] }, prepared)).toBe(false);
    expect(captureMatchesProject({ ...meta, aspect: "16:9" }, prepared)).toBe(false);
    expect(captureMatchesProject(null, prepared)).toBe(false);
  });
  it("planning and compilation make no network calls and include no reference binaries", () => {
    const fetcher = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network forbidden"));
    try {
      const value = createCozyClayProject(planDirectorScene({ brief: "海边合影", aspectRatio: "9:16" }).plans[0], "test");
      expect(fetcher).not.toHaveBeenCalled();
      expect(value.project.resources).toEqual({ assets: [], motions: [] });
      expect(value.serialized).not.toContain("base64");
    } finally { fetcher.mockRestore(); }
  });
});
