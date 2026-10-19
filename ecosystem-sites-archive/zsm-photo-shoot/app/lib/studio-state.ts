import type { SceneDocument } from "./contracts";
import { starterScene } from "./demo-data";
import type { StudioTemplate } from "./templates";

const sceneTitles: Record<StudioTemplate["sceneId"], { title: string; location: string }> = {
  coast: { title: "海边日落 · 双人旅行写真", location: "海岸氛围概念场景（非真实地点）" },
  oldtown: { title: "旧城漫游 · 情侣写真", location: "旧城氛围概念场景（非真实地点）" },
  alpine: { title: "山间来信 · 穿搭写真", location: "山野氛围概念场景（非真实地点）" },
};

export function applyStudioTemplate(template: StudioTemplate, source: SceneDocument = starterScene): SceneDocument {
  const scene = structuredClone(source);
  const identity = sceneTitles[template.sceneId];
  scene.id = `demo-${template.sceneId}`;
  scene.title = identity.title;
  scene.location.label = identity.location;
  scene.provenance = {
    kind: "demo",
    label: "项目程序生成的概念场景",
    precision: "氛围示意，无地理精度",
    license: "项目基础几何代理；非真实地图数据",
  };
  scene.aspectRatio = template.aspectRatio;
  scene.shots = scene.shots.map((shot, index) => ({
    ...shot,
    title: template.shotPreset[index] ?? shot.title,
    composition: `${template.aspectRatio} 构图参考；${shot.composition.replace(/^(?:9:16|3:4|16:9) 构图参考；/, "")}`,
  }));
  if (template.id === "outfit") {
    scene.actors = scene.actors.slice(0, 1).map((actor) => ({ ...actor, outfit: "轻户外机能穿搭", pose: "自然站姿" }));
  } else if (template.id === "couple") {
    scene.actors = scene.actors.map((actor, index) => ({ ...actor, pose: index === 0 ? "并肩漫步" : "回眸微笑" }));
  }
  return scene;
}

export function syncPromptDraft(current: string, generated: string, wasEdited: boolean) {
  return wasEdited ? { prompt: current, edited: true, outOfSync: true } : { prompt: generated, edited: false, outOfSync: false };
}

export function moveShot<T>(items: T[], index: number, offset: -1 | 1): T[] {
  const target = index + offset;
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
