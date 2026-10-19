import { describe, expect, it } from "vitest";
import { GenerationRequestSchema } from "./contracts";
import { createCozyClayGenerationRequest, compileCozyClayPrompt, type CozyClayHandoff } from "./cozyclay-handoff";
import { studioTemplates } from "./templates";

const handoff: CozyClayHandoff = {
  source: "cozyclay-user-export",
  frameImported: true,
  frameName: "cozyclay-first-frame.png",
  actionText: "两人并肩回望",
  camera: { fps: 24, startFrame: 1, endFrame: 48 },
  included: ["first.png", "prompt.txt", "camera.json（安全摘要）"],
};

describe("CozyClay handoff contract", () => {
  it("compiles only explicitly exported details, never demo scene or proxy actors", () => {
    const prompt = compileCozyClayPrompt(studioTemplates[0]!, handoff, "黄昏胶片感", false);
    expect(prompt).toContain("CozyClay 导出的动作文字");
    expect(prompt).toContain("仅在本机预览");
    expect(prompt).not.toContain("概念氛围场景");
    expect(prompt).not.toContain("摄影机坐标");
  });

  it("creates a valid snapshot without demo scene or image bytes", () => {
    const request = createCozyClayGenerationRequest({
      requestId: "request-1",
      idempotencyKey: "session-1",
      prompt: "final prompt",
      model: "gpt-image-2.5-sunburst-c",
      aspectRatio: "9:16",
      template: studioTemplates[0]!,
      handoff,
      referenceConfirmed: false,
    });
    expect(GenerationRequestSchema.parse(request)).toEqual(request);
    expect(request.sceneId).toBe("cozyclay-session-handoff");
    expect(request.provenance.license).toBe("unknown");
    expect(request.inputs[0]?.type).toBe("reference-image");
    expect(JSON.stringify(request.directorSnapshot)).not.toContain("base64");
    expect(JSON.stringify(request.directorSnapshot)).not.toContain("概念海岸");
  });
});
