import { z } from "zod";
import type { SceneDocument } from "./contracts";

export const directorSceneIds = ["coast", "oldtown", "alpine"] as const;
export type DirectorSceneId = (typeof directorSceneIds)[number];
export type DirectorAspectRatio = "9:16" | "3:4" | "16:9";

export const DirectorBriefSchema = z.object({
  brief: z.string().trim().min(3).max(800),
  aspectRatio: z.enum(["9:16", "3:4", "16:9"]).optional(),
  peopleCount: z.number().int().min(1).max(4).optional(),
});
export type DirectorBrief = z.infer<typeof DirectorBriefSchema>;

export const ScenePlanSchema = z.object({
  id: z.string().min(1),
  version: z.literal("1.0.0"),
  source: z.literal("director-agent-mock"),
  scene: z.object({
    presetId: z.enum(directorSceneIds),
    title: z.string().min(1),
    atmosphere: z.string().min(1),
  }),
  characters: z.array(z.object({
    role: z.string().min(1),
    position: z.tuple([z.number(), z.number(), z.number()]),
    rotationY: z.number(),
    pose: z.string().min(1),
    outfit: z.string().min(1),
  })).min(1).max(4),
  camera: z.object({
    position: z.tuple([z.number(), z.number(), z.number()]),
    target: z.tuple([z.number(), z.number(), z.number()]),
    fov: z.number().min(18).max(90),
    shotScale: z.string().min(1),
    angle: z.string().min(1),
    aspectRatio: z.enum(["9:16", "3:4", "16:9"]),
  }),
  lighting: z.object({
    direction: z.string().min(1),
    quality: z.string().min(1),
    color: z.string().min(1),
  }),
  constraints: z.array(z.string().min(1)).min(1),
  rationale: z.string().min(1),
});
export type ScenePlan = z.infer<typeof ScenePlanSchema>;

export type DirectorAgentResult = {
  source: "director-agent-mock";
  status: "ready";
  note: "当前为本地规则 Agent，不调用外部模型";
  plans: ScenePlan[];
};

/** Apply one plan to the product SceneDocument without provider-specific fields. */
export function applyScenePlan(scene: SceneDocument, plan: ScenePlan): { scene: SceneDocument; shotId: string } {
  const next = structuredClone(scene);
  next.id = `director-${plan.scene.presetId}`;
  next.title = plan.scene.title;
  next.location = { label: `${plan.scene.title}（非真实地点）` };
  next.provenance = {
    kind: "demo",
    label: "本地规则规划的概念场景",
    precision: "仅构图预演，无地理精度",
    license: "项目基础几何代理，非真实地图数据",
  };
  next.aspectRatio = plan.camera.aspectRatio;
  next.actors = plan.characters.map((character, index) => ({
    id: next.actors[index]?.id ?? `agent-actor-${index + 1}`,
    label: character.role,
    position: [...character.position],
    heightOffset: 0,
    rotationY: character.rotationY,
    pose: character.pose,
    outfit: character.outfit,
  }));

  const shotId = next.shots[0]?.id ?? "agent-shot-1";
  const shot = {
    id: shotId,
    title: `${plan.scene.title} · ${plan.camera.shotScale}`,
    durationSec: next.shots[0]?.durationSec ?? 4,
    camera: { position: [...plan.camera.position], target: [...plan.camera.target], fov: plan.camera.fov },
    shotScale: plan.camera.shotScale,
    cameraAngle: plan.camera.angle,
    action: plan.characters.map((character) => `${character.role}${character.pose}`).join("；"),
    movement: "Fixed previsualization; refine in the director controls before generation",
    lighting: `${plan.lighting.direction}；${plan.lighting.quality}；${plan.lighting.color}`,
    composition: `${plan.camera.aspectRatio} composition reference；${plan.camera.shotScale}；${plan.rationale}`,
    notes: `Director constraints: ${plan.constraints.join("；")}`,
  } satisfies SceneDocument["shots"][number];
  next.shots = [shot, ...next.shots.slice(1)];
  return { scene: next, shotId };
}

const sceneCatalog: Record<DirectorSceneId, { title: string; atmosphere: string }> = {
  coast: { title: "海岸日落", atmosphere: "暖色落日、开阔海面、松弛旅行感" },
  oldtown: { title: "旧城街巷", atmosphere: "石墙街巷、生活感暖光、自然漫游感" },
  alpine: { title: "山野绿意", atmosphere: "柔和自然光、山野层次、轻户外氛围" },
};

function chooseScene(brief: string): DirectorSceneId {
  if (/海|沙滩|日落|夕阳|海边/i.test(brief)) return "coast";
  if (/山|森林|草地|户外|绿/i.test(brief)) return "alpine";
  return "oldtown";
}

function peopleCount(brief: DirectorBrief): number {
  if (brief.peopleCount) return brief.peopleCount;
  if (/三人|三个人|3人/.test(brief.brief)) return 3;
  if (/四人|四个人|4人/.test(brief.brief)) return 4;
  if (/情侣|两人|两个人|二人|双人|我们|他们/.test(brief.brief)) return 2;
  return 1;
}

function makeCharacters(count: number, variation: number): ScenePlan["characters"] {
  const poses = variation === 0 ? ["并肩站立", "自然回望", "自然站立", "看向镜头"] : variation === 1 ? ["牵手行走", "侧身靠近", "向前行走", "回头看向镜头"] : ["停下互动", "轻轻依靠", "自然交谈", "看向同伴"];
  return Array.from({ length: count }, (_, index) => ({
    role: `人物 ${String.fromCharCode(65 + index)}`,
    position: [((index - (count - 1) / 2) * 0.72), 0, index % 2 ? 0.05 : 0] as [number, number, number],
    rotationY: index % 2 ? 0.18 : -0.12,
    pose: poses[index] ?? "自然站立",
    outfit: "按客户提供照片与文字描述匹配，保持人物身份和服装连续",
  }));
}

export function planDirectorScene(input: DirectorBrief): DirectorAgentResult {
  input = DirectorBriefSchema.parse(input);
  const count = peopleCount(input);
  const sceneId = chooseScene(input.brief);
  const scene = sceneCatalog[sceneId];
  const ratio: DirectorAspectRatio = input.aspectRatio ?? (/横|宽幅|电影/.test(input.brief) ? "16:9" : /肖像|头像/.test(input.brief) ? "3:4" : "9:16");
  const variants = [
    { shotScale: count > 2 ? "多人关系构图" : count > 1 ? "双人中景" : "半身近景", angle: "平视", fov: 42, camera: [0.3, 1.6, 3.3] as [number, number, number], label: "关系清晰" },
    { shotScale: count > 2 ? "多人环境构图" : count > 1 ? "双人全身" : "人物全身", angle: "略低机位", fov: 48, camera: [1.2, 1.2, 4.6] as [number, number, number], label: "环境叙事" },
    { shotScale: count > 2 ? "多人近距构图" : count > 1 ? "半身近景" : "人物特写", angle: "略高机位", fov: 34, camera: [-0.3, 1.9, 2.8] as [number, number, number], label: "情绪优先" },
  ];
  const plans = variants.map((variant, index): ScenePlan => ({
    id: `director-plan-${sceneId}-${index + 1}`,
    version: "1.0.0",
    source: "director-agent-mock",
    scene: { presetId: sceneId, ...scene },
    characters: makeCharacters(count, index),
    camera: {
      // Fit the cast horizontally with margin; portrait groups need more distance.
      position: [variant.camera[0], variant.camera[1], Math.max(variant.camera[2], ((count - 1) * 0.72 + 0.65) / (2 * Math.tan(variant.fov * Math.PI / 360) * (ratio === "16:9" ? 16 / 9 : ratio === "3:4" ? 3 / 4 : 9 / 16)) * 1.2)],
      target: [0, index === 1 ? 0.9 : 1.3, 0],
      fov: variant.fov,
      shotScale: variant.shotScale,
      angle: variant.angle,
      aspectRatio: ratio,
    },
    lighting: {
      direction: sceneId === "coast" ? "从人物侧后方进入" : "从画面左上方进入",
      quality: index === 2 ? "柔和近距离补光，保留面部细节" : "柔和主光，保留环境层次",
      color: sceneId === "coast" ? "暖金色" : "自然暖白",
    },
    constraints: [
      "人物关系和站位必须清楚",
      "不得把 3D 灰模或黏土材质当作最终成片风格",
      "不得凭空添加客户没有提供的地点事实、品牌或身份信息",
      "保持人物外观、服装和画幅意图一致",
    ],
    rationale: `${variant.label}方案：${scene.title}负责提供${scene.atmosphere}；通过${variant.angle}${variant.shotScale}突出“${input.brief.slice(0, 64)}”。这是导演预演方案，不是最终图片。`,
  }));
  return { source: "director-agent-mock", status: "ready", note: "当前为本地规则 Agent，不调用外部模型", plans };
}
