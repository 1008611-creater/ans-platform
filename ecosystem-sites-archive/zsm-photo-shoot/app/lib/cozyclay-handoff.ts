import type { GenerationRequest, SceneDocument } from "./contracts";
import type { StudioTemplate } from "./templates";
import type { DirectorPackCamera } from "./director-pack";

export type CozyClayHandoff = {
  source: "cozyclay-user-export";
  frameImported: boolean;
  frameName?: string;
  actionText?: string;
  camera: DirectorPackCamera | null;
  included: string[];
};

export function compileCozyClayPrompt(
  template: StudioTemplate,
  handoff: CozyClayHandoff,
  intent: string,
  referenceConfirmed: boolean,
) {
  const camera = handoff.camera
    ? Object.entries(handoff.camera).map(([key, value]) => `${key}: ${value}`).join("，")
    : "未从 CozyClay 导出相机摘要";

  return [
    ...template.promptBlocks,
    handoff.actionText ? `CozyClay 导出的动作文字（用户主动导入）：${handoff.actionText}` : "",
    `CozyClay 交接状态：${handoff.frameImported ? "已在本机导入一张关键帧" : "未导入关键帧"}。相机摘要：${camera}。`,
    handoff.frameImported
      ? referenceConfirmed
        ? "用户已明确确认将导入的 CozyClay 关键帧随本次真实图片请求发送，作为构图参考；不代表完整 3D 场景已同步。"
        : "关键帧仅在本机预览，尚未授权发送；Mock 任务不会处理或上传该图片。"
      : "CozyClay 场景、人物、镜头与资产未自动同步；提示词不推断未导出的 3D 信息。",
    intent.trim() ? `补充创作意图：${intent.trim()}` : "",
    "输出比例仅代表创作意图，不代表 CozyClay 场景数据或模型实际输出规格。",
  ].filter(Boolean).join("\n\n");
}

export function createCozyClayGenerationRequest(input: {
  requestId: string;
  idempotencyKey: string;
  prompt: string;
  model: string;
  aspectRatio: SceneDocument["aspectRatio"];
  template: StudioTemplate;
  handoff: CozyClayHandoff;
  referenceConfirmed: boolean;
}): GenerationRequest {
  const provenance = {
    kind: "external" as const,
    label: "CozyClay 用户导出交接；来源/许可未知",
    license: "unknown" as const,
  };

  return {
    requestId: input.requestId,
    idempotencyKey: input.idempotencyKey,
    kind: "image",
    sceneId: "cozyclay-session-handoff",
    sceneVersion: "1.1.0",
    shotId: input.handoff.frameImported ? "cozyclay-imported-keyframe" : undefined,
    aspectRatio: input.aspectRatio,
    prompt: input.prompt,
    model: input.model,
    intent: input.handoff.actionText,
    mode: "expert",
    directorSnapshot: structuredClone({
      source: input.handoff.source,
      importedFrame: input.handoff.frameImported
        ? { name: input.handoff.frameName ?? "user-imported-keyframe", binaryIncluded: false }
        : null,
      actionText: input.handoff.actionText ?? null,
      cameraSummary: input.handoff.camera,
      includedFiles: [...input.handoff.included],
      template: { id: input.template.id, version: input.template.version, role: "text-style-reference-only" },
      aspectRatioIntent: input.aspectRatio,
      referenceConfirmed: input.referenceConfirmed,
      mockAssetsProcessed: false,
      synchronizationBoundary: "Only explicitly imported ZIP fields are represented; full CozyClay scene is not synchronized.",
    }),
    referenceConfirmed: input.referenceConfirmed,
    output: {
      aspectRatio: input.aspectRatio,
      format: "webp",
      width: 1024,
      height: 1024,
    },
    inputs: input.handoff.frameImported
      ? [{ id: input.handoff.frameName ?? "cozyclay-keyframe", type: "reference-image", provenance }]
      : [],
    provenance,
  };
}
